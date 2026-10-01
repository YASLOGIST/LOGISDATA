"use client";

import { Html, Line, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { presentationCopy } from "@/lib/data";
import { text } from "@/lib/i18n";
import type { Language, ThemeMode } from "@/lib/types";
import { getSectionApproach } from "@/lib/sceneFocus";
import { FocusFadeLabel } from "./FocusFadeLabel";

const SECTION_INDEX = 3;

interface RouteTerrainProps {
  language: Language;
  theme: ThemeMode;
}

type Point3 = [number, number, number];

const optimizedPath: Point3[] = [
  [-4.25, 0.18, 1.3],
  [-3.25, 0.38, 0.7],
  [-2.2, 0.24, 0.18],
  [-1.1, 0.48, -0.4],
  [0, 0.38, -0.7],
  [1.1, 0.58, -0.3],
  [2.25, 0.36, 0.28],
  [3.35, 0.3, 0.7],
  [4.15, 0.22, 1.08],
];

const detourPath: Point3[] = [
  [-4.25, 0.2, 1.3],
  [-3.35, 0.7, 1.75],
  [-2.7, 0.46, 1.6],
  [-2.1, 0.85, 1.9],
  [-1.35, 0.3, 1.45],
  [-0.55, 0.6, 1.9],
  [0.4, 0.28, 1.2],
  [1.2, 0.75, 1.62],
  [2.15, 0.35, 1.2],
  [3.15, 0.66, 1.5],
  [4.15, 0.22, 1.08],
];

export function RouteTerrain({ language, theme }: RouteTerrainProps) {
  const terrainRef = useRef<THREE.Group>(null);
  const scroll = useScroll();
  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(10, 5.6, 12, 8);
    const position = geometry.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const height = Math.sin(x * 1.1) * 0.09 + Math.cos(y * 1.7) * 0.08 + Math.sin((x + y) * 2.2) * 0.04;
      position.setZ(index, height);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  // Userland geometry must be disposed explicitly or it leaks GPU memory.
  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry]);
  const terrainColor = theme === "dark" ? "#142f40" : "#d6e5e5";
  const gridColor = theme === "dark" ? "#446274" : "#8aa8a8";

  useFrame((_, delta) => {
    if (!terrainRef.current) return;
    const step = Math.min(delta, 1 / 20);
    const sectionProgress = getSectionApproach(scroll.offset, SECTION_INDEX);
    const orbit = Math.sin(sectionProgress * Math.PI) * 0.17;
    terrainRef.current.rotation.y = THREE.MathUtils.damp(terrainRef.current.rotation.y, orbit, 3.5, step);
    terrainRef.current.rotation.x = THREE.MathUtils.damp(terrainRef.current.rotation.x, -0.13 + Math.cos(sectionProgress * Math.PI) * 0.025, 3.5, step);
  });

  return (
    <group ref={terrainRef} position={[0, -0.9, 0]}>
      <mesh geometry={terrainGeometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={terrainColor} wireframe={false} flatShading roughness={0.88} metalness={0.08} />
      </mesh>
      <gridHelper args={[10, 12, gridColor, gridColor]} position={[0, -0.02, 0]} rotation={[0, 0, 0]} />
      <Line points={optimizedPath} color="#4de1c1" transparent opacity={0.96} lineWidth={1.7} />
      <Line points={detourPath} color="#fb5b5b" transparent opacity={0.66} lineWidth={1} dashed dashSize={0.14} gapSize={0.1} />
      <mesh position={optimizedPath[4]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#4de1c1" emissive="#4de1c1" emissiveIntensity={2} />
      </mesh>
      <mesh position={detourPath[5]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#fb5b5b" emissive="#fb5b5b" emissiveIntensity={2} />
      </mesh>
      <Html position={[-3.45, 1.05, 0.9]} center distanceFactor={8}>
        <FocusFadeLabel sectionIndex={SECTION_INDEX} className="scene-label scene-label-good"><span className="scene-label-dot" /><span>{text(presentationCopy.routes.optimized, language)}</span></FocusFadeLabel>
      </Html>
      <Html position={[1.65, 1.3, 1.35]} center distanceFactor={8}>
        <FocusFadeLabel sectionIndex={SECTION_INDEX} className="scene-label scene-label-warning"><span className="scene-label-dot" /><span>{text(presentationCopy.routes.detour, language)}</span></FocusFadeLabel>
      </Html>
    </group>
  );
}
