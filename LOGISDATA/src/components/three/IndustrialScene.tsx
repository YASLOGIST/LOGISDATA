"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SECTION_COUNT, pagePositionFromOffset } from "@/lib/sections";
import type { DeviceProfile } from "@/lib/device";
import type { Language, ThemeMode } from "@/lib/types";
import { AuditScanner } from "./AuditScanner";
import { DataStreamField } from "./DataStreamField";
import { DemandMatrix } from "./DemandMatrix";
import { RouteTerrain } from "./RouteTerrain";
import { SupplyNetwork } from "./SupplyNetwork";
import { WarehouseGrid } from "./WarehouseGrid";

interface IndustrialSceneProps {
  language: Language;
  theme: ThemeMode;
  device: DeviceProfile;
}

/** Camera position per section, in scene units. */
const CAMERA_TARGETS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1.25, 10.5],
  [3.8, 0.7, 7.7],
  [-3.2, 0.55, 8.2],
  [2.8, 0.45, 6.8],
  [0.4, 0.8, 7.4],
];

/** Camera look-at target per section. */
const LOOK_TARGETS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0.4, 0],
  [0.2, 0.3, 0],
  [0, 0.15, 0],
  [0, -0.2, 0],
  [0, -0.1, 0],
];

if (CAMERA_TARGETS.length !== SECTION_COUNT || LOOK_TARGETS.length !== SECTION_COUNT) {
  throw new Error("Camera rig must define one position and one look-at per section");
}

const CAMERA_VECTORS = CAMERA_TARGETS.map((target) => new THREE.Vector3(...target));
const LOOK_VECTORS = LOOK_TARGETS.map((target) => new THREE.Vector3(...target));

const FOCUS_SPREAD = 1.08;
const BASE_SCALE = 0.56;
const FOCUS_SCALE = 0.44;
const DEPTH_STEP = 2.2;

const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
const smoothStep = (value: number) => value * value * (3 - 2 * value);

function SceneRig({ language, theme, device }: IndustrialSceneProps) {
  const scroll = useScroll();
  const invalidate = useThree((state) => state.invalidate);
  const heroRef = useRef<THREE.Group>(null);
  const auditRef = useRef<THREE.Group>(null);
  const demandRef = useRef<THREE.Group>(null);
  const routeRef = useRef<THREE.Group>(null);
  const warehouseRef = useRef<THREE.Group>(null);
  const cameraPosition = useRef(CAMERA_VECTORS[0].clone());
  const lookPosition = useRef(LOOK_VECTORS[0].clone());
  const cameraDesired = useRef(new THREE.Vector3());
  const lookDesired = useRef(new THREE.Vector3());

  const groups = useMemo(
    () => [heroRef, auditRef, demandRef, routeRef, warehouseRef] as const,
    [],
  );

  /**
   * In `frameloop="demand"` (reduced motion) R3F only renders when something
   * asks it to. Scrolling must therefore request a frame explicitly,
   * otherwise the scene freezes on the first paint.
   */
  useEffect(() => {
    if (!device.reducedMotion) return;
    const element = scroll.el;
    const onScroll = () => invalidate();
    element.addEventListener("scroll", onScroll, { passive: true });
    invalidate();
    return () => element.removeEventListener("scroll", onScroll);
  }, [device.reducedMotion, invalidate, scroll.el]);

  useFrame((state, delta) => {
    // Clamp delta so a backgrounded tab resuming after minutes does not
    // teleport the rig (damp(x, y, lambda, 10) snaps instantly).
    const step = Math.min(delta, 1 / 20);
    const pagePosition = pagePositionFromOffset(scroll.offset);
    const currentSection = Math.min(SECTION_COUNT - 1, Math.floor(pagePosition));
    const nextSection = Math.min(SECTION_COUNT - 1, currentSection + 1);
    const transitionT = smoothStep(clamp01(pagePosition - currentSection));

    cameraDesired.current.copy(CAMERA_VECTORS[currentSection]).lerp(CAMERA_VECTORS[nextSection], transitionT);
    lookDesired.current.copy(LOOK_VECTORS[currentSection]).lerp(LOOK_VECTORS[nextSection], transitionT);
    cameraPosition.current.lerp(cameraDesired.current, 1 - Math.exp(-4.6 * step));
    lookPosition.current.lerp(lookDesired.current, 1 - Math.exp(-5.2 * step));
    state.camera.position.copy(cameraPosition.current);
    state.camera.lookAt(lookPosition.current);

    // Warehouse "explode" progress, shared by position and scale below.
    const warehouseT = smoothStep(clamp01((pagePosition - (SECTION_COUNT - 2)) / 1));

    groups.forEach((ref, index) => {
      const group = ref.current;
      if (!group) return;
      const distance = Math.abs(pagePosition - index);
      const focus = clamp01(1 - distance / FOCUS_SPREAD);
      // FIXED: the warehouse group previously had its X/Z scale written
      // twice per frame (once in this loop, once in a trailing block) with
      // two different damp targets, so it fought itself and never settled.
      const explode = index === SECTION_COUNT - 1 ? 1 + warehouseT * 0.12 : 1;
      const scale = (BASE_SCALE + focus * FOCUS_SCALE) * explode;
      const depth = (index - pagePosition) * DEPTH_STEP;
      const targetX = index === 1 ? THREE.MathUtils.lerp(-0.95, 0, clamp01(pagePosition - 0.6)) : 0;
      const targetY = index === 4 ? THREE.MathUtils.lerp(-0.18, 0.18, warehouseT) : 0;
      const targetRotationY =
        index === 4 ? warehouseT * 0.12
          : index === 3 ? Math.sin((pagePosition / (SECTION_COUNT - 1)) * Math.PI) * 0.08
            : 0;

      group.position.x = THREE.MathUtils.damp(group.position.x, targetX, 5.5, step);
      group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 5.5, step);
      group.position.z = THREE.MathUtils.damp(group.position.z, depth, 4.5, step);
      const dampedScale = THREE.MathUtils.damp(group.scale.x, scale, 6.5, step);
      group.scale.setScalar(dampedScale);
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetRotationY, 3.5, step);

      // Culling: a scene scaled to ~0.56 and 2+ pages away contributes
      // nothing visible but still costs draw calls and shader binds.
      group.visible = focus > 0.001 || distance < 1.9;
    });
  });

  return (
    <>
      <color attach="background" args={[theme === "dark" ? "#06121d" : "#f8fafc"]} />
      <fogExp2 attach="fog" args={[theme === "dark" ? "#06121d" : "#f8fafc", 0.022]} />
      <ambientLight intensity={theme === "dark" ? 0.72 : 1.15} />
      <directionalLight position={[4, 7, 5]} intensity={theme === "dark" ? 1.35 : 1.05} />
      {device.effects && <DataStreamField device={device} theme={theme} />}
      <group ref={heroRef}><SupplyNetwork language={language} theme={theme} animate={device.effects} /></group>
      <group ref={auditRef}><AuditScanner language={language} theme={theme} animate={device.effects} /></group>
      <group ref={demandRef}><DemandMatrix language={language} theme={theme} /></group>
      <group ref={routeRef}><RouteTerrain language={language} theme={theme} /></group>
      <group ref={warehouseRef}><WarehouseGrid language={language} theme={theme} /></group>
    </>
  );
}

export function IndustrialScene(props: IndustrialSceneProps) {
  return <SceneRig {...props} />;
}
