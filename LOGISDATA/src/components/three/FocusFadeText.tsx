"use client";

import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { getSectionFocus } from "@/lib/sceneFocus";

interface FocusFadeTextProps {
  /** Index (0-4) of the presentation section this label belongs to. */
  sectionIndex: number;
  children: ReactNode;
  position?: [number, number, number];
  fontSize?: number;
  color?: string;
  outlineColor?: string;
  outlineWidth?: number;
  textAlign?: CanvasTextAlign;
}

/**
 * Canvas-native scene annotation with no DOM portal and no worker lifecycle.
 *
 * The original SDF implementation delegated glyph preparation to Troika's
 * module worker. That produced a late worker error when a presenter left the
 * control room while the font job was still resolving, especially on mobile.
 * A small CanvasTexture keeps labels inside the owning R3F tree, preserves
 * the visual annotations, and lets route teardown be synchronous and boring.
 * The accessible prose remains in the sibling HTML briefing.
 */
export function FocusFadeText({
  sectionIndex,
  children,
  position = [0, 0, 0],
  fontSize = 0.16,
  color = "#c4d6e3",
  outlineColor = "#06121d",
  outlineWidth = 0.01,
  textAlign = "center",
}: FocusFadeTextProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const scroll = useScroll();
  const label = useMemo(
    () =>
      String(
        Array.isArray(children)
          ? children.map((child) => (typeof child === "string" || typeof child === "number" ? child : "")).join("")
          : typeof children === "string" || typeof children === "number"
            ? children
            : "",
      ),
    [children],
  );
  const canvas = useMemo(() => document.createElement("canvas"), []);
  const texture = useMemo(() => {
    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.minFilter = THREE.LinearFilter;
    next.magFilter = THREE.LinearFilter;
    return next;
  }, [canvas]);
  const dimensions = useRef({ width: fontSize * 2, height: fontSize * 1.2 });

  // Canvas and texture are imperative rendering resources. Their mutation is
  // isolated to this effect so React never observes a partially drawn label.
  /* eslint-disable react-hooks/immutability */
  useLayoutEffect(() => {
    const lines = label.split("\n");
    const pixelFontSize = 64;
    const lineHeight = pixelFontSize * 1.2;
    const measureCanvas = document.createElement("canvas");
    const measure = measureCanvas.getContext("2d");
    if (!measure) return;

    measure.font = `700 ${pixelFontSize}px Cairo, Arial, sans-serif`;
    const maxWidth = Math.max(1, ...lines.map((line) => measure.measureText(line).width));
    const padding = Math.max(12, outlineWidth / fontSize * pixelFontSize * 2);
    canvas.width = Math.ceil(maxWidth + padding * 2);
    canvas.height = Math.ceil(lineHeight * lines.length + padding * 2);

    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `700 ${pixelFontSize}px Cairo, Arial, sans-serif`;
    context.textAlign = textAlign;
    context.textBaseline = "middle";
    const x = textAlign === "left" ? padding : textAlign === "right" ? canvas.width - padding : canvas.width / 2;
    const firstY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      const y = firstY + index * lineHeight;
      if (outlineWidth > 0) {
        context.lineWidth = Math.max(2, (outlineWidth / fontSize) * pixelFontSize);
        context.strokeStyle = outlineColor;
        context.strokeText(line, x, y);
      }
      context.fillStyle = color;
      context.fillText(line, x, y);
    });

    dimensions.current = {
      width: (canvas.width / pixelFontSize) * fontSize,
      height: (canvas.height / pixelFontSize) * fontSize,
    };
    texture.needsUpdate = true;
  }, [canvas, color, fontSize, label, outlineColor, outlineWidth, textAlign, texture]);
  /* eslint-enable react-hooks/immutability */

  useLayoutEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;

    const focus = getSectionFocus(scroll.offset, sectionIndex);
    sprite.scale.set(dimensions.current.width, dimensions.current.height, 1);
    const material = sprite.material as THREE.SpriteMaterial;
    sprite.visible = focus >= 0.05;
    material.opacity = focus;
    material.depthWrite = focus > 0.5;
  });

  return (
    <sprite ref={spriteRef} position={position} scale={[1, 1, 1]}>
      <spriteMaterial map={texture} transparent depthTest depthWrite toneMapped={false} />
    </sprite>
  );
}
