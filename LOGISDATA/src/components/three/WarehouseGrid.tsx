"use client";

import { Html, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { presentationCopy, warehouseBins } from "@/lib/data";
import { text } from "@/lib/i18n";
import type { Language, ThemeMode } from "@/lib/types";
import { easeApproach, getSectionApproach } from "@/lib/sceneFocus";
import { FocusFadeLabel } from "./FocusFadeLabel";

const SECTION_INDEX = 4;

interface WarehouseGridProps {
  language: Language;
  theme: ThemeMode;
}

export function WarehouseGrid({ language, theme }: WarehouseGridProps) {
  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const scanRef = useRef<THREE.Mesh>(null);
  const scroll = useScroll();
  const frameColor = theme === "dark" ? "#2e5265" : "#73989c";
  const problemBins = useMemo(() => warehouseBins.filter((bin) => bin.status === "mismatch").slice(0, 3), []);
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const boxMaterial = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.92, roughness: 0.48, metalness: 0.2 }), []);

  useEffect(() => () => {
    boxGeometry.dispose();
    boxMaterial.dispose();
  }, [boxGeometry, boxMaterial]);

  useLayoutEffect(() => {
    const mesh = boxesRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3(0.82, 0.62, 0.72);
    const position = new THREE.Vector3();
    const mismatchColor = new THREE.Color("#fb5b5b");
    const auditedColor = new THREE.Color("#4de1c1");
    warehouseBins.forEach((bin, index) => {
      matrix.compose(position.set(bin.x, bin.y, bin.z), rotation, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, bin.status === "mismatch" ? mismatchColor : auditedColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    if (!scanRef.current) return;
    const step = Math.min(delta, 1 / 20);
    const sectionProgress = getSectionApproach(scroll.offset, SECTION_INDEX);
    const easedProgress = easeApproach(sectionProgress);
    const targetY = THREE.MathUtils.lerp(-2.25, 2.25, easedProgress);
    scanRef.current.position.y = THREE.MathUtils.damp(scanRef.current.position.y, targetY, 5.5, step);
    const material = scanRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = THREE.MathUtils.lerp(0.08, 0.2, Math.sin(sectionProgress * Math.PI));
  });

  return (
    <group position={[0, 0.05, 0]} rotation={[0, 0.12, 0]}>
      <instancedMesh ref={boxesRef} args={[boxGeometry, boxMaterial, warehouseBins.length]} frustumCulled />
      <group>
        {[-4.2, -2.1, 0, 2.1, 4.2].map((x) => (
          <mesh key={`post-${x}`} position={[x, 0, -0.35]}>
            <boxGeometry args={[0.08, 4.2, 0.08]} />
            <meshStandardMaterial color={frameColor} roughness={0.58} metalness={0.34} />
          </mesh>
        ))}
        {[-2.25, -0.75, 0.75, 2.25].map((y) => (
          <mesh key={`shelf-front-${y}`} position={[0, y, -0.35]}>
            <boxGeometry args={[8.5, 0.055, 0.1]} />
            <meshStandardMaterial color={frameColor} roughness={0.58} metalness={0.34} />
          </mesh>
        ))}
        {[-1.4, 0.6].map((z) => (
          <mesh key={`shelf-depth-${z}`} position={[0, -2.25, z]} rotation={[0, 0, 0]}>
            <boxGeometry args={[8.5, 0.055, 0.1]} />
            <meshStandardMaterial color={frameColor} roughness={0.58} metalness={0.34} />
          </mesh>
        ))}
      </group>
      <mesh ref={scanRef} position={[0, -2.25, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 2.8, 1, 1]} />
        <meshBasicMaterial color="#4de1c1" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.25, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 2.8, 1, 1]} />
        <meshBasicMaterial color="#4de1c1" wireframe transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {problemBins.map((bin) => (
        <Html key={bin.id} position={[bin.x, bin.y + 0.45, bin.z - 0.2]} distanceFactor={8} center>
          <FocusFadeLabel sectionIndex={SECTION_INDEX} className="scene-label scene-label-warning scene-label-shelf">
            <span className="scene-label-dot" />
            <span>{text(bin.sku, language)}</span>
            <strong>{text(presentationCopy.warehouse.callout, language)}</strong>
          </FocusFadeLabel>
        </Html>
      ))}
      <Html position={[4.4, 2.35, 0]} center distanceFactor={8}>
        <FocusFadeLabel sectionIndex={SECTION_INDEX} className="scene-label scene-label-good"><span className="scene-label-dot" /><span>{text(presentationCopy.warehouse.scanLabel, language)}</span></FocusFadeLabel>
      </Html>
    </group>
  );
}
