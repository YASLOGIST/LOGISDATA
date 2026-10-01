"use client";

import { Float, Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { supplyEdges, supplyNodes, presentationCopy } from "@/lib/data";
import { text } from "@/lib/i18n";
import type { Language, ThemeMode } from "@/lib/types";
import { FocusFadeLabel } from "./FocusFadeLabel";

const SECTION_INDEX = 0;

/**
 * Shared, module-level geometry.
 *
 * The previous implementation built `new THREE.BoxGeometry(...)` inline in
 * JSX for all eight nodes, so every React re-render (theme toggle, language
 * toggle) allocated eight boxes plus eight `EdgesGeometry` derivations and
 * orphaned the previous ones on the GPU.
 */
const NODE_CAGE_GEOMETRY = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.33, 0.33, 0.33));

interface SupplyNetworkProps {
  language: Language;
  theme: ThemeMode;
  /** When false, continuous idle animation is skipped (low tier / reduced motion). */
  animate?: boolean;
}

interface SupplyNodeMeshProps {
  node: (typeof supplyNodes)[number];
  theme: ThemeMode;
  language: Language;
  animate: boolean;
}

function SupplyNodeMesh({ node, theme, language, animate }: SupplyNodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isLeak = node.status !== "verified";
  const color = node.status === "verified" ? "#4de1c1" : node.status === "phantom" ? "#f59e0b" : "#fb5b5b";
  const structural = theme === "dark" ? "#dbeafe" : "#0f2942";

  useFrame(({ clock }) => {
    if (!animate || !meshRef.current) return;
    const pulse = isLeak ? 1 + Math.sin(clock.elapsedTime * 2.5 + node.position[0]) * 0.11 : 1;
    meshRef.current.scale.setScalar(pulse);
    meshRef.current.rotation.y += 0.002;
  });

  return (
    <Float speed={animate ? (isLeak ? 1.4 : 0.8) : 0} rotationIntensity={animate ? 0.12 : 0} floatIntensity={animate ? 0.18 : 0}>
      <group position={node.position}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[isLeak ? 0.14 : 0.11, 10, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isLeak ? 2.4 : 1.1} roughness={0.32} metalness={0.25} />
        </mesh>
        <mesh scale={isLeak ? 1.7 : 1.35}>
          <ringGeometry args={[0.13, 0.15, 12]} />
          <meshBasicMaterial color={color} transparent opacity={isLeak ? 0.62 : 0.3} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments geometry={NODE_CAGE_GEOMETRY}>
          <lineBasicMaterial color={structural} transparent opacity={0.18} />
        </lineSegments>
        {node.id === "yard" && (
          <Html center distanceFactor={8} position={[0, 0.35, 0]}>
            <FocusFadeLabel sectionIndex={SECTION_INDEX} className="scene-label scene-label-warning">
              <span className="scene-label-dot" />
              <span>{text(presentationCopy.hero.networkLabel, language)}</span>
            </FocusFadeLabel>
          </Html>
        )}
      </group>
    </Float>
  );
}

export function SupplyNetwork({ language, theme, animate = true }: SupplyNetworkProps) {
  const nodeMap = useMemo(() => new Map(supplyNodes.map((node) => [node.id, node])), []);
  const edgePoints = useMemo<Array<Array<[number, number, number]>>>(
    () => supplyEdges.map(([from, to]) => {
      const fromPosition: [number, number, number] = nodeMap.get(from)?.position ?? [0, 0, 0];
      const toPosition: [number, number, number] = nodeMap.get(to)?.position ?? [0, 0, 0];
      return [fromPosition, toPosition];
    }),
    [nodeMap],
  );
  const lineColor = theme === "dark" ? "#27445d" : "#8ca9bd";

  return (
    <group rotation={[0.06, 0, -0.08]}>
      {edgePoints.map((points, index) => (
        <Line key={`edge-${index}`} points={points} color={lineColor} transparent opacity={0.65} lineWidth={0.8} />
      ))}
      {supplyNodes.map((node) => <SupplyNodeMesh key={node.id} node={node} theme={theme} language={language} animate={animate} />)}
      <Html position={[-3.7, 1.65, 0]} center distanceFactor={8}>
        <FocusFadeLabel sectionIndex={SECTION_INDEX} className="scene-label scene-label-muted">
          <span>{text(supplyNodes[0].label, language)}</span><span className="scene-label-value">/ {text(presentationCopy.hero.verifiedLabel, language)}</span>
        </FocusFadeLabel>
      </Html>
    </group>
  );
}
