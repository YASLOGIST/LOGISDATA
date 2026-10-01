"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { DeviceProfile } from "@/lib/device";
import type { ThemeMode } from "@/lib/types";

interface DataStreamFieldProps {
  device: DeviceProfile;
  theme: ThemeMode;
}

/**
 * Ambient "data in motion" depth layer.
 *
 * Design intent: the deck argues that supply-chain data is constantly
 * flowing and mostly unobserved. A slow parallax field of signal points
 * behind the models makes the camera moves read as travel through a system
 * instead of a cut between five static props.
 *
 * Performance contract:
 *  - ONE draw call: a single `THREE.Points` with a static BufferGeometry.
 *  - Zero per-frame allocation; only two uniforms (`uTime`, `uOpacity`) are
 *    written per frame and all motion happens on the GPU in the vertex
 *    shader, so the CPU cost is independent of the point count.
 *  - Point count comes from the device tier budget (900 / 420 / 0) and is
 *    0 under `prefers-reduced-motion`, where the component renders nothing.
 *  - `depthWrite: false` + additive blending keeps it out of the depth
 *    buffer so it can never occlude the audit geometry or text.
 */
export function DataStreamField({ device, theme }: DataStreamFieldProps) {
  const count = device.particleBudget;
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    // Deterministic pseudo-random layout: identical on every load, so the
    // scene is reproducible for visual regression snapshots.
    let state = 0x2f6e2b1;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0xffffffff;
    };
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - 0.5) * 26;
      positions[index * 3 + 1] = (random() - 0.5) * 14;
      positions[index * 3 + 2] = -6 - random() * 18;
      seeds[index] = random();
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    buffer.computeBoundingSphere();
    return buffer;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(theme === "dark" ? "#7dd3fc" : "#2f6f88") },
      uSize: { value: theme === "dark" ? 2.4 : 2.0 },
    }),
    [theme],
  );

  useEffect(() => {
    uniforms.uColor.value.set(theme === "dark" ? "#7dd3fc" : "#2f6f88");
  }, [theme, uniforms]);

  // Explicit disposal: R3F disposes objects it created, but this geometry is
  // built in userland and would otherwise leak GPU memory on theme/tier change.
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value += delta;
    // Fade in rather than popping when the tier upgrades mid-session.
    material.uniforms.uOpacity.value = THREE.MathUtils.damp(
      material.uniforms.uOpacity.value,
      theme === "dark" ? 0.55 : 0.32,
      2.2,
      delta,
    );
  });

  if (count === 0) return null;

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-1}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
      />
    </points>
  );
}

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute float aSeed;
  varying float vFade;

  void main() {
    vec3 transformed = position;
    // Slow vertical drift that wraps, plus a tiny lateral sway. All of it
    // runs on the GPU; the CPU never touches the position buffer.
    float speed = 0.35 + aSeed * 0.55;
    transformed.y = mod(transformed.y + uTime * speed + 7.0, 14.0) - 7.0;
    transformed.x += sin(uTime * 0.25 + aSeed * 12.0) * 0.35;

    vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = uSize * (14.0 / -viewPosition.z);
    // Fade near the frame edges so points never hard-clip into the UI.
    vFade = smoothstep(0.0, 2.0, 7.0 - abs(transformed.y)) * (0.35 + aSeed * 0.65);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;

  void main() {
    // Round, soft-edged point without a texture fetch.
    vec2 offset = gl_PointCoord - vec2(0.5);
    float distance = dot(offset, offset);
    if (distance > 0.25) discard;
    float alpha = (1.0 - distance * 4.0) * vFade * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;
