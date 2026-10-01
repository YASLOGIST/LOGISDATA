"use client";

import { Html, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { demandTiers, presentationCopy } from "@/lib/data";
import { text } from "@/lib/i18n";
import type { DemandTier, Language, ThemeMode } from "@/lib/types";
import { easeApproach, getSectionApproach } from "@/lib/sceneFocus";
import { FocusFadeLabel } from "./FocusFadeLabel";

const SECTION_INDEX = 2;

interface DemandMatrixProps {
  language: Language;
  theme: ThemeMode;
}

type DemandSeries = "actual" | "distorted" | "audited";

interface DemandBarProps {
  tier: DemandTier;
  index: number;
  series: DemandSeries;
  theme: ThemeMode;
}

function DemandBar({ tier, index, series, theme }: DemandBarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scroll = useScroll();
  const initialValue = tier[series];
  const color = series === "actual" ? "#7dd3fc" : series === "distorted" ? "#f59e0b" : "#4de1c1";
  const baseFloor = -1.65;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const step = Math.min(delta, 1 / 20);
    const easedProgress = easeApproach(getSectionApproach(scroll.offset, SECTION_INDEX));
    const targetValue = series === "distorted" ? THREE.MathUtils.lerp(tier.distorted, tier.audited, easedProgress) : initialValue;
    const targetHeight = targetValue / 40;
    groupRef.current.scale.y = THREE.MathUtils.damp(groupRef.current.scale.y, targetHeight, 7, step);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, baseFloor + targetHeight / 2, 7, step);
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, Math.sin(scroll.offset * 4 + index) * 0.04, 3, step);
  });

  return (
    <group ref={groupRef} position={[0, baseFloor + initialValue / 80, 0]} scale={[1, initialValue / 40, 1]}>
      <mesh>
        <boxGeometry args={[0.46, 1, 0.46]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={series === "distorted" ? 1.1 : 0.6} transparent opacity={theme === "dark" ? 0.86 : 0.9} metalness={0.3} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.51, 0]}>
        <boxGeometry args={[0.5, 0.035, 0.5]} />
        <meshBasicMaterial color={color} transparent opacity={0.82} />
      </mesh>
    </group>
  );
}

export function DemandMatrix({ language, theme }: DemandMatrixProps) {
  return (
    <group rotation={[0, -0.12, 0]} position={[0, -0.05, 0]}>
      <mesh position={[0, -1.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.2, 4.7, 1, 1]} />
        <meshStandardMaterial color={theme === "dark" ? "#10283a" : "#d8e8ed"} transparent opacity={0.9} roughness={0.7} />
      </mesh>
      {demandTiers.map((tier, index) => {
        const x = (index - (demandTiers.length - 1) / 2) * 1.5;
        return (
          <group key={tier.id} position={[x, 0, 0]}>
            <DemandBar tier={tier} index={index} series="actual" theme={theme} />
            <group position={[0.52, 0, 0]}><DemandBar tier={tier} index={index} series="distorted" theme={theme} /></group>
            <group position={[1.04, 0, 0]}><DemandBar tier={tier} index={index} series="audited" theme={theme} /></group>
            <Html position={[0.52, -2.05, 0]} center distanceFactor={8}>
              <FocusFadeLabel sectionIndex={SECTION_INDEX} className="scene-label scene-label-muted">
                <span>{text(tier.label, language)}</span>
              </FocusFadeLabel>
            </Html>
          </group>
        );
      })}
      <Html position={[3.7, 2.05, 0]} center distanceFactor={8}>
        <FocusFadeLabel sectionIndex={SECTION_INDEX} className="scene-label scene-label-good">
          <span className="scene-label-dot" />
          <span>{text(presentationCopy.demand.smoothingLabel, language)}</span>
          <strong>{text(presentationCopy.demand.chartAudited, language)}</strong>
        </FocusFadeLabel>
      </Html>
    </group>
  );
}
