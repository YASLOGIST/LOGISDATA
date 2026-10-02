"use client";

import { Text, useScroll, type TextProps } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { getSectionFocus } from "@/lib/sceneFocus";

interface FocusFadeTextProps extends Omit<TextProps, "children"> {
  /** Index (0-4) of the presentation section this label belongs to. */
  sectionIndex: number;
  children: ReactNode;
}

/**
 * Canvas-native replacement for drei's HTML label portal.
 *
 * `drei/Html` creates a ReactDOM root for every label. On unmount, React 19
 * can race that secondary root with Canvas teardown and report that hooks are
 * being used outside the Canvas. SDF text keeps the same visual annotation in
 * the existing R3F tree, so there is one React root and one ownership model.
 * The accessible prose remains in the sibling HTML deck.
 */
export function FocusFadeText({ sectionIndex, children, ...props }: FocusFadeTextProps) {
  const textRef = useRef<THREE.Mesh>(null);
  const scroll = useScroll();

  useFrame(() => {
    const mesh = textRef.current;
    if (!mesh) return;

    const focus = getSectionFocus(scroll.offset, sectionIndex);
    const hidden = focus < 0.05;
    mesh.visible = !hidden;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      material.transparent = true;
      material.opacity = focus;
      material.depthWrite = focus > 0.5;
    }
  });

  return (
    <Text
      ref={textRef}
      {...props}
      fillOpacity={1}
      anchorX={props.anchorX ?? "center"}
      anchorY={props.anchorY ?? "middle"}
    >
      {children}
    </Text>
  );
}
