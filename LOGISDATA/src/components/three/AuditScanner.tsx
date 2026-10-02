"use client";

import { Line, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { presentationCopy } from "@/lib/data";
import { text } from "@/lib/i18n";
import { easeApproach, getSectionApproach } from "@/lib/sceneFocus";
import type { Language, ThemeMode } from "@/lib/types";
import { FocusFadeText } from "./FocusFadeText";

const SECTION_INDEX = 1;

interface AuditScannerProps {
  language: Language;
  theme: ThemeMode;
  /** When false, continuous idle animation is skipped (low tier / reduced motion). */
  animate?: boolean;
}

/** Stable colour instances: previously re-allocated on every React render. */
const WARNING_COLOR = new THREE.Color("#f59e0b");
const VERIFIED_COLOR = new THREE.Color("#4de1c1");

const scannerXs = [-2.7, -1.8, -0.9, 0, 0.9, 1.8, 2.7];

export function AuditScanner({ language, theme, animate = true }: AuditScannerProps) {
  const scroll = useScroll();
  const beamRef = useRef<THREE.Group>(null);
  const beamMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [isVerified, setIsVerified] = useState(false);
  const frameColor = useMemo(() => (theme === "dark" ? "#c4d6e3" : "#0f2942"), [theme]);

  useFrame((_, delta) => {
    if (!beamRef.current) return;
    const step = Math.min(delta, 1 / 20);
    const sectionProgress = getSectionApproach(scroll.offset, SECTION_INDEX);
    const easedProgress = easeApproach(sectionProgress);
    const targetX = THREE.MathUtils.lerp(-2.55, 2.55, easedProgress);
    beamRef.current.position.x = THREE.MathUtils.damp(beamRef.current.position.x, targetX, 6, step);
    const bob = animate ? Math.sin(scroll.offset * 12) * 0.03 : 0;
    beamRef.current.position.y = THREE.MathUtils.damp(beamRef.current.position.y, 0.25 + bob, 4, step);
    if (beamMaterialRef.current) {
      beamMaterialRef.current.color.lerpColors(WARNING_COLOR, VERIFIED_COLOR, easedProgress);
      beamMaterialRef.current.emissive.lerpColors(WARNING_COLOR, VERIFIED_COLOR, easedProgress);
      beamMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(1.3, 2.5, easedProgress);
    }
    const nextVerified = sectionProgress > 0.68;
    setIsVerified((previous) => previous === nextVerified ? previous : nextVerified);
  });

  return (
    <group position={[0, -0.1, 0]} rotation={[0, 0.03, 0]}>
      <group>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[4.5, 0.34, 1.55]} />
          <meshStandardMaterial color={theme === "dark" ? "#193248" : "#d5e2e9"} metalness={0.65} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[3.3, 0.28, 1.22]} />
          <meshStandardMaterial color={theme === "dark" ? "#234960" : "#b9ced7"} metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[-1.65, 0.82, 0]}>
          <boxGeometry args={[0.62, 0.55, 1.05]} />
          <meshStandardMaterial color={theme === "dark" ? "#345b6c" : "#9bb5c2"} metalness={0.45} roughness={0.42} />
        </mesh>
        {[-1.4, 1.4].map((x) => (
          <mesh key={`wheel-${x}`} position={[x, -0.06, 0.68]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.18, 12]} />
            <meshStandardMaterial color="#162b3a" metalness={0.5} roughness={0.65} />
          </mesh>
        ))}
        {[-1.4, 1.4].map((x) => (
          <mesh key={`wheel-back-${x}`} position={[x, -0.06, -0.68]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.18, 12]} />
            <meshStandardMaterial color="#162b3a" metalness={0.5} roughness={0.65} />
          </mesh>
        ))}
      </group>

      <group position={[0, 0.2, 0]}>
        {scannerXs.map((x) => (
          <Line key={`scanner-x-${x}`} points={[[x, -1.5, -1.35], [x, 2.4, -1.35]]} color={frameColor} transparent opacity={0.26} lineWidth={0.7} />
        ))}
        {[-1.25, -0.55, 0.15, 0.85, 1.55].map((y) => (
          <Line key={`scanner-y-${y}`} points={[[-3.1, y, -1.35], [3.1, y, -1.35]]} color={frameColor} transparent opacity={0.25} lineWidth={0.7} />
        ))}
        <Line points={[[-3.15, -1.55, -1.36], [3.15, -1.55, -1.36]]} color="#f59e0b" transparent opacity={0.62} lineWidth={1} />
        <Line points={[[-3.15, 2.38, -1.36], [3.15, 2.38, -1.36]]} color="#4de1c1" transparent opacity={0.45} lineWidth={1} />
      </group>

      <group ref={beamRef} position={[-2.55, 0.25, 1.05]}>
        <mesh>
          <boxGeometry args={[0.055, 3.55, 2.8]} />
          <meshStandardMaterial ref={beamMaterialRef} color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.6} transparent opacity={0.22} />
        </mesh>
        <mesh position={[0, 0, -1.38]}>
          <boxGeometry args={[0.08, 3.55, 0.04]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      </group>

      <FocusFadeText
        position={[0, 2.75, 0]}
        sectionIndex={SECTION_INDEX}
        fontSize={0.18}
        color={isVerified ? "#4de1c1" : "#f59e0b"}
        outlineWidth={0.012}
        outlineColor="#06121d"
        textAlign="center"
      >
        {text(presentationCopy.audit.scannerLabel, language)}{"\n"}
        {isVerified ? text(presentationCopy.audit.verified, language) : text(presentationCopy.audit.warning, language)}
      </FocusFadeText>
    </group>
  );
}
