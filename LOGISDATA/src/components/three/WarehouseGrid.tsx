"use client";

import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { presentationCopy, warehouseBins } from "@/lib/data";
import { text } from "@/lib/i18n";
import type { Language, ThemeMode } from "@/lib/types";
import { easeApproach, getSectionApproach } from "@/lib/sceneFocus";
import { FocusFadeText } from "./FocusFadeText";

const SECTION_INDEX = 4;
const UPRIGHT_X = [-4.2, -2.1, 0, 2.1, 4.2] as const;
const RACK_DEPTHS = [-1.85, 0.85] as const;
const BEAM_X = [-3.15, -1.05, 1.05, 3.15] as const;
const BEAM_LEVELS = [-1.15, 0.35, 1.85] as const;

interface WarehouseGridProps {
  language: Language;
  theme: ThemeMode;
}

export function WarehouseGrid({ language, theme }: WarehouseGridProps) {
  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const palletsRef = useRef<THREE.InstancedMesh>(null);
  const uprightsRef = useRef<THREE.InstancedMesh>(null);
  const beamsRef = useRef<THREE.InstancedMesh>(null);
  const scanRef = useRef<THREE.Mesh>(null);
  const forkliftRef = useRef<THREE.Group>(null);
  const liftRef = useRef<THREE.Group>(null);
  const scroll = useScroll();
  const frameColor = theme === "dark" ? "#3a5b6d" : "#66838b";
  const floorColor = theme === "dark" ? "#172b38" : "#c7d5d5";
  const mismatchColor = useMemo(() => new THREE.Color("#fb5b5b"), []);
  const auditedColor = useMemo(() => new THREE.Color("#4de1c1"), []);
  const problemBins = useMemo(
    () => warehouseBins.filter((bin) => bin.status === "mismatch").slice(0, 3),
    [],
  );

  // Shared unit geometry keeps all repeated inventory and rack members
  // instanced. The expanded interior adds detail without multiplying draw calls.
  const unitBox = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const inventoryMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.94,
      roughness: 0.48,
      metalness: 0.2,
    }),
    [],
  );
  const palletMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8b765a", roughness: 0.88 }),
    [],
  );
  const uprightMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.64, roughness: 0.36 }),
    [frameColor],
  );
  const beamMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d5a548", metalness: 0.48, roughness: 0.42 }),
    [],
  );

  useEffect(() => () => {
    unitBox.dispose();
    inventoryMaterial.dispose();
    palletMaterial.dispose();
    uprightMaterial.dispose();
    beamMaterial.dispose();
  }, [beamMaterial, inventoryMaterial, palletMaterial, unitBox, uprightMaterial]);

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const cargo = boxesRef.current;
    const pallets = palletsRef.current;
    const uprights = uprightsRef.current;
    const beams = beamsRef.current;

    if (cargo) {
      warehouseBins.forEach((bin, index) => {
        matrix.compose(
          position.set(bin.x, bin.y, bin.z),
          rotation,
          scale.set(0.82, 0.62, 0.72),
        );
        cargo.setMatrixAt(index, matrix);
        cargo.setColorAt(index, bin.status === "mismatch" ? mismatchColor : auditedColor);
      });
      cargo.instanceMatrix.needsUpdate = true;
      if (cargo.instanceColor) cargo.instanceColor.needsUpdate = true;
    }

    if (pallets) {
      warehouseBins.forEach((bin, index) => {
        matrix.compose(
          position.set(bin.x, bin.y - 0.37, bin.z),
          rotation,
          scale.set(0.94, 0.12, 0.84),
        );
        pallets.setMatrixAt(index, matrix);
      });
      pallets.instanceMatrix.needsUpdate = true;
    }

    if (uprights) {
      let index = 0;
      for (const z of RACK_DEPTHS) {
        for (const x of UPRIGHT_X) {
          matrix.compose(
            position.set(x, -0.05, z),
            rotation,
            scale.set(0.1, 4.55, 0.1),
          );
          uprights.setMatrixAt(index, matrix);
          index += 1;
        }
      }
      uprights.instanceMatrix.needsUpdate = true;
    }

    if (beams) {
      let index = 0;
      for (const z of RACK_DEPTHS) {
        for (const y of BEAM_LEVELS) {
          for (const x of BEAM_X) {
            matrix.compose(
              position.set(x, y, z),
              rotation,
              scale.set(2.1, 0.09, 0.14),
            );
            beams.setMatrixAt(index, matrix);
            index += 1;
          }
        }
      }
      beams.instanceMatrix.needsUpdate = true;
    }
  }, [auditedColor, mismatchColor]);

  useFrame((_, delta) => {
    const progress = easeApproach(getSectionApproach(scroll.offset, SECTION_INDEX));
    const step = Math.min(delta, 1 / 20);

    // The forklift and scan pass are driven only by chapter scroll progress.
    // They settle at the selected point and do not run an idle animation.
    if (forkliftRef.current) {
      forkliftRef.current.position.x = THREE.MathUtils.lerp(-3.5, 2.45, progress);
    }
    if (liftRef.current) {
      liftRef.current.position.y = 0.24 + progress * 0.78;
    }
    if (scanRef.current) {
      const targetY = THREE.MathUtils.lerp(-2.25, 2.25, progress);
      scanRef.current.position.y = THREE.MathUtils.damp(scanRef.current.position.y, targetY, 5.5, step);
      const material = scanRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = THREE.MathUtils.lerp(0.06, 0.18, progress);
    }
  });

  return (
    <group position={[0, 0.05, 0]} rotation={[0, 0.12, 0]}>
      {/* Concrete slab and painted aisle/safety markings. */}
      <mesh position={[0, -2.34, -0.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.8, 5.7]} />
        <meshStandardMaterial color={floorColor} roughness={0.92} metalness={0.04} />
      </mesh>
      {[-2.06, -0.43, 1.16].map((z) => (
        <mesh key={`aisle-line-${z}`} position={[0, -2.325, z]}>
          <boxGeometry args={[9.4, 0.012, 0.035]} />
          <meshBasicMaterial color="#d8a63d" transparent opacity={0.78} />
        </mesh>
      ))}

      {/* Rear warehouse wall, loading bays, and overhead service lights. */}
      <mesh position={[0, 0.24, -2.58]}>
        <boxGeometry args={[10, 5.15, 0.16]} />
        <meshStandardMaterial color={theme === "dark" ? "#102330" : "#b4c7c9"} roughness={0.86} />
      </mesh>
      {[-3.1, 0, 3.1].map((x) => (
        <group key={`dock-${x}`} position={[x, -0.72, -2.475]}>
          <mesh>
            <boxGeometry args={[1.58, 2.9, 0.045]} />
            <meshStandardMaterial color={theme === "dark" ? "#07131c" : "#738992"} roughness={0.68} />
          </mesh>
          <mesh position={[0, 1.52, 0.035]}>
            <boxGeometry args={[1.72, 0.12, 0.08]} />
            <meshStandardMaterial color={frameColor} metalness={0.55} roughness={0.42} />
          </mesh>
          {[-0.67, 0.67].map((side) => (
            <mesh key={`dock-jamb-${side}`} position={[side, 0, 0.035]}>
              <boxGeometry args={[0.1, 2.95, 0.08]} />
              <meshStandardMaterial color={frameColor} metalness={0.55} roughness={0.42} />
            </mesh>
          ))}
        </group>
      ))}
      {[-1.55, -0.15, 1.25].map((z) => (
        <group key={`light-bar-${z}`} position={[0, 2.43, z]}>
          <mesh>
            <boxGeometry args={[7.4, 0.045, 0.12]} />
            <meshBasicMaterial color={theme === "dark" ? "#d6f4ff" : "#f8ffff"} />
          </mesh>
          <mesh position={[0, -0.055, 0]}>
            <boxGeometry args={[7.4, 0.018, 0.2]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={0.28} />
          </mesh>
        </group>
      ))}

      {/* Full double-sided rack frames, cross-beams and individually tracked pallets. */}
      <instancedMesh ref={uprightsRef} args={[unitBox, uprightMaterial, UPRIGHT_X.length * RACK_DEPTHS.length]} />
      <instancedMesh ref={beamsRef} args={[unitBox, beamMaterial, BEAM_X.length * BEAM_LEVELS.length * RACK_DEPTHS.length]} />
      <instancedMesh ref={palletsRef} args={[unitBox, palletMaterial, warehouseBins.length]} />
      <instancedMesh ref={boxesRef} args={[unitBox, inventoryMaterial, warehouseBins.length]} frustumCulled />

      {/* Scroll-driven electric reach truck: it travels the aisle and raises
          its forks toward the audited rack level, then stops with the scroll. */}
      <group ref={forkliftRef} position={[-3.5, -2.22, 2.12]}>
        <mesh position={[0, 0.26, 0.1]}>
          <boxGeometry args={[0.78, 0.34, 0.72]} />
          <meshStandardMaterial color="#d9932e" metalness={0.22} roughness={0.5} />
        </mesh>
        <mesh position={[-0.12, 0.57, 0.18]}>
          <boxGeometry args={[0.48, 0.34, 0.38]} />
          <meshStandardMaterial color="#253b48" metalness={0.24} roughness={0.46} />
        </mesh>
        <mesh position={[-0.12, 0.78, 0.18]}>
          <boxGeometry args={[0.42, 0.035, 0.34]} />
          <meshStandardMaterial color="#78a2ad" metalness={0.58} roughness={0.3} transparent opacity={0.72} />
        </mesh>
        <group position={[0.28, 0, -0.25]}>
          <mesh position={[-0.08, 1.16, 0]}>
            <boxGeometry args={[0.055, 2.32, 0.07]} />
            <meshStandardMaterial color="#526c78" metalness={0.72} roughness={0.34} />
          </mesh>
          <mesh position={[0.08, 1.16, 0]}>
            <boxGeometry args={[0.055, 2.32, 0.07]} />
            <meshStandardMaterial color="#526c78" metalness={0.72} roughness={0.34} />
          </mesh>
          <group ref={liftRef} position={[0, 0.24, -0.02]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.3, 0.1, 0.09]} />
              <meshStandardMaterial color="#d9932e" metalness={0.32} roughness={0.45} />
            </mesh>
            {[-0.1, 0.1].map((x) => (
              <mesh key={`fork-${x}`} position={[x, -0.045, -0.52]}>
                <boxGeometry args={[0.045, 0.035, 1.08]} />
                <meshStandardMaterial color="#c3d0d5" metalness={0.76} roughness={0.27} />
              </mesh>
            ))}
          </group>
        </group>
        {[-0.24, 0.28].map((x) => (
          <mesh key={`wheel-${x}`} position={[x, 0.12, 0.37]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.1, 12]} />
            <meshStandardMaterial color="#17232b" roughness={0.82} />
          </mesh>
        ))}
        {[-0.24, 0.28].map((x) => (
          <mesh key={`rear-wheel-${x}`} position={[x, 0.12, -0.19]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.1, 12]} />
            <meshStandardMaterial color="#17232b" roughness={0.82} />
          </mesh>
        ))}
        <mesh position={[-0.12, 0.84, 0.18]}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      </group>

      {/* Scanning sheet remains a single lightweight pass over the audited rack. */}
      <mesh ref={scanRef} position={[0, -2.25, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 2.8, 1, 1]} />
        <meshBasicMaterial color="#4de1c1" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.25, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 2.8, 1, 1]} />
        <meshBasicMaterial color="#4de1c1" wireframe transparent opacity={0.09} side={THREE.DoubleSide} />
      </mesh>

      {problemBins.map((bin) => (
        <FocusFadeText
          key={bin.id}
          position={[bin.x, bin.y + 0.45, bin.z - 0.2]}
          sectionIndex={SECTION_INDEX}
          fontSize={0.16}
          color="#fb5b5b"
          outlineWidth={0.01}
          outlineColor="#06121d"
          textAlign="center"
        >
          {text(bin.sku, language)}
          {"\n"}
          {text(presentationCopy.warehouse.callout, language)}
        </FocusFadeText>
      ))}

      <FocusFadeText
        position={[4.4, 2.35, 0]}
        sectionIndex={SECTION_INDEX}
        fontSize={0.18}
        color="#4de1c1"
        outlineWidth={0.012}
        outlineColor="#06121d"
      >
        {text(presentationCopy.warehouse.scanLabel, language)}
      </FocusFadeText>
    </group>
  );
}
