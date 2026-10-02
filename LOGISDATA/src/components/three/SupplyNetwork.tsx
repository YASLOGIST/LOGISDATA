"use client";

import { Float, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { supplyEdges, supplyNodes, presentationCopy } from "@/lib/data";
import { text } from "@/lib/i18n";
import type { Language, ThemeMode } from "@/lib/types";
import { FocusFadeText } from "./FocusFadeText";

const SECTION_INDEX = 0;

const NODE_CAGE_GEOMETRY = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.33, 0.33, 0.33));
const BEACON_RING_GEOMETRY = new THREE.RingGeometry(0.18, 0.22, 16);

interface SupplyNetworkProps {
  language: Language;
  theme: ThemeMode;
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
  const beaconRef = useRef<THREE.Mesh>(null);
  const isLeak = node.status === "leak";
  const isPhantom = node.status === "phantom";
  const color = node.status === "verified" ? "#4de1c1" : isPhantom ? "#f59e0b" : "#fb5b5b";
  const structural = theme === "dark" ? "#dbeafe" : "#0f2942";

  useFrame(({ clock }) => {
    if (!animate) return;
    const time = clock.elapsedTime;
    if (meshRef.current) {
      const pulse = isLeak ? 1 + Math.sin(time * 3 + node.position[0]) * 0.12 : 1;
      meshRef.current.scale.setScalar(pulse);
      meshRef.current.rotation.y += 0.003;
    }
    if (beaconRef.current) {
      const ringScale = 1 + (time * (isLeak ? 1.5 : 0.8) + node.position[1]) % 1.5;
      beaconRef.current.scale.setScalar(ringScale);
      (beaconRef.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(
        1.5 - ringScale,
        0,
        0.5,
      );
    }
  });

  return (
    <Float
      speed={animate ? (isLeak ? 1.4 : 0.8) : 0}
      rotationIntensity={animate ? 0.12 : 0}
      floatIntensity={animate ? 0.18 : 0}
    >
      <group position={node.position}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[isLeak ? 0.15 : 0.12, 12, 10]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isLeak ? 2.6 : 1.2}
            roughness={0.3}
            metalness={0.25}
          />
        </mesh>
        <mesh ref={beaconRef} geometry={BEACON_RING_GEOMETRY} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments geometry={NODE_CAGE_GEOMETRY}>
          <lineBasicMaterial color={structural} transparent opacity={0.2} />
        </lineSegments>
        {node.id === "yard" && (
          <FocusFadeText
            position={[0, 0.38, 0]}
            sectionIndex={SECTION_INDEX}
            fontSize={0.16}
            color="#f59e0b"
            outlineWidth={0.01}
            outlineColor="#06121d"
          >
            {text(presentationCopy.hero.networkLabel, language)}
          </FocusFadeText>
        )}
      </group>
    </Float>
  );
}

function EdgePulse({
  from,
  to,
  speed,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  speed: number;
  color: string;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const pFrom = useMemo(() => new THREE.Vector3(...from), [from]);
  const pTo = useMemo(() => new THREE.Vector3(...to), [to]);

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    const progress = (clock.elapsedTime * speed) % 1;
    pulseRef.current.position.lerpVectors(pFrom, pTo, progress);
  });

  return (
    <mesh ref={pulseRef}>
      <sphereGeometry args={[0.045, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

export function SupplyNetwork({ language, theme, animate = true }: SupplyNetworkProps) {
  const nodeMap = useMemo(() => new Map(supplyNodes.map((node) => [node.id, node])), []);
  const edgePoints = useMemo<Array<Array<[number, number, number]>>>(
    () =>
      supplyEdges.map(([from, to]) => {
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
        <Line
          key={`edge-${index}`}
          points={points}
          color={lineColor}
          transparent
          opacity={0.65}
          lineWidth={0.8}
        />
      ))}
      {animate &&
        edgePoints.map((points, index) => (
          <EdgePulse
            key={`pulse-${index}`}
            from={points[0]}
            to={points[1]}
            speed={0.35 + (index % 4) * 0.1}
            color={index % 2 === 0 ? "#4de1c1" : "#7dd3fc"}
          />
        ))}
      {supplyNodes.map((node) => (
        <SupplyNodeMesh
          key={node.id}
          node={node}
          theme={theme}
          language={language}
          animate={animate}
        />
      ))}
      <FocusFadeText
        position={[-3.7, 1.65, 0]}
        sectionIndex={SECTION_INDEX}
        fontSize={0.16}
        color={theme === "dark" ? "#c4d6e3" : "#0f2942"}
        outlineWidth={0.01}
        outlineColor="#06121d"
      >
        {text(supplyNodes[0].label, language)} / {text(presentationCopy.hero.verifiedLabel, language)}
      </FocusFadeText>
    </group>
  );
}
