"use client";

import { useFrame, type RootState } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import type { Language, ThemeMode } from "@/lib/types";
import { AuditScanner } from "./AuditScanner";
import { DemandMatrix } from "./DemandMatrix";
import { RouteTerrain } from "./RouteTerrain";
import { SupplyNetwork } from "./SupplyNetwork";
import { WarehouseGrid } from "./WarehouseGrid";

interface IndustrialSceneProps {
  language: Language;
  theme: ThemeMode;
  onSectionChange: (section: number) => void;
}

interface SceneRigProps extends IndustrialSceneProps {
  onCameraUpdate?: (state: RootState) => void;
}

const CAMERA_TARGETS: Array<[number, number, number]> = [
  [0, 1.25, 10.5],
  [3.8, 0.7, 7.7],
  [-3.2, 0.55, 8.2],
  [2.8, 0.45, 6.8],
  [0.4, 0.8, 7.4],
];

const LOOK_TARGETS: Array<[number, number, number]> = [
  [0, 0.4, 0],
  [0.2, 0.3, 0],
  [0, 0.15, 0],
  [0, -0.2, 0],
  [0, -0.1, 0],
];

const CAMERA_VECTORS = CAMERA_TARGETS.map((target) => new THREE.Vector3(...target));
const LOOK_VECTORS = LOOK_TARGETS.map((target) => new THREE.Vector3(...target));

const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
const smoothStep = (value: number) => value * value * (3 - 2 * value);

function SceneRig({ language, theme, onSectionChange }: SceneRigProps) {
  const scroll = useScroll();
  const heroRef = useRef<THREE.Group>(null);
  const auditRef = useRef<THREE.Group>(null);
  const demandRef = useRef<THREE.Group>(null);
  const routeRef = useRef<THREE.Group>(null);
  const warehouseRef = useRef<THREE.Group>(null);
  const lastSection = useRef(-1);
  const cameraPosition = useRef(CAMERA_VECTORS[0].clone());
  const lookPosition = useRef(LOOK_VECTORS[0].clone());
  const cameraDesired = useRef(new THREE.Vector3());
  const lookDesired = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const pagePosition = scroll.offset * 5;
    const currentSection = Math.min(4, Math.floor(pagePosition));
    const localProgress = pagePosition - currentSection;
    const nextSection = Math.min(4, currentSection + 1);
    const transition = smoothStep(clamp01(localProgress));

    if (lastSection.current !== currentSection) {
      lastSection.current = currentSection;
      onSectionChange(currentSection);
    }

    cameraDesired.current.copy(CAMERA_VECTORS[currentSection]).lerp(CAMERA_VECTORS[nextSection], transition);
    lookDesired.current.copy(LOOK_VECTORS[currentSection]).lerp(LOOK_VECTORS[nextSection], transition);
    cameraPosition.current.lerp(cameraDesired.current, 1 - Math.exp(-4.6 * delta));
    lookPosition.current.lerp(lookDesired.current, 1 - Math.exp(-5.2 * delta));
    state.camera.position.copy(cameraPosition.current);
    state.camera.lookAt(lookPosition.current);

    const refs = [heroRef.current, auditRef.current, demandRef.current, routeRef.current, warehouseRef.current];
    refs.forEach((group, index) => {
      if (!group) return;
      const sectionCenter = index + 0.5;
      const distance = Math.abs(pagePosition - sectionCenter);
      const focus = clamp01(1 - distance / 1.08);
      const scale = 0.56 + focus * 0.44;
      const depth = (index - pagePosition) * 2.2;
      const targetX = index === 1 ? THREE.MathUtils.lerp(-0.95, 0, clamp01((scroll.offset - 0.2) / 0.2)) : 0;
      const targetY = index === 4 ? THREE.MathUtils.lerp(-0.18, 0.18, smoothStep(clamp01((scroll.offset - 0.8) / 0.2))) : 0;
      group.position.x = THREE.MathUtils.damp(group.position.x, targetX, 5.5, delta);
      group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 5.5, delta);
      group.position.z = THREE.MathUtils.damp(group.position.z, depth, 4.5, delta);
      group.scale.x = THREE.MathUtils.damp(group.scale.x, scale, 6.5, delta);
      group.scale.y = THREE.MathUtils.damp(group.scale.y, scale, 6.5, delta);
      group.scale.z = THREE.MathUtils.damp(group.scale.z, scale, 6.5, delta);
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, index === 4 ? smoothStep(clamp01((scroll.offset - 0.8) / 0.2)) * 0.12 : index === 3 ? Math.sin(scroll.offset * Math.PI) * 0.08 : 0, 3.5, delta);
    });

    if (warehouseRef.current) {
      const warehouseTransition = smoothStep(clamp01((scroll.offset - 0.8) / 0.2));
      const explode = 1 + warehouseTransition * 0.12;
      warehouseRef.current.scale.x = THREE.MathUtils.damp(warehouseRef.current.scale.x, (0.56 + clamp01(1 - Math.abs(pagePosition - 4.5) / 1.08) * 0.44) * explode, 6.5, delta);
      warehouseRef.current.scale.z = THREE.MathUtils.damp(warehouseRef.current.scale.z, (0.56 + clamp01(1 - Math.abs(pagePosition - 4.5) / 1.08) * 0.44) * explode, 6.5, delta);
    }
  });

  return (
    <>
      <color attach="background" args={[theme === "dark" ? "#06121d" : "#f8fafc"]} />
      <ambientLight intensity={theme === "dark" ? 0.72 : 1.15} />
      <directionalLight position={[4, 7, 5]} intensity={theme === "dark" ? 1.35 : 1.05} />
      <group ref={heroRef}><SupplyNetwork language={language} theme={theme} /></group>
      <group ref={auditRef}><AuditScanner language={language} theme={theme} /></group>
      <group ref={demandRef}><DemandMatrix language={language} theme={theme} /></group>
      <group ref={routeRef}><RouteTerrain language={language} theme={theme} /></group>
      <group ref={warehouseRef}><WarehouseGrid language={language} theme={theme} /></group>
    </>
  );
}

export function IndustrialScene({ language, theme, onSectionChange }: IndustrialSceneProps) {
  return <SceneRig language={language} theme={theme} onSectionChange={onSectionChange} />;
}
