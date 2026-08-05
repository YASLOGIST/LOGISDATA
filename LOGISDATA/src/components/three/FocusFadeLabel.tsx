"use client";

import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import { applyLabelFocus, getSectionFocus } from "@/lib/sceneFocus";

interface FocusFadeLabelProps {
  /** Index (0–4) of the presentation section this label belongs to. */
  sectionIndex: number;
  className: string;
  children: ReactNode;
}

/**
 * Wraps a scene-label's content in a div whose opacity/visibility tracks
 * how "in focus" its parent section currently is. All five 3D scenes stay
 * mounted simultaneously and are only scaled/repositioned during scroll —
 * without this, out-of-focus labels stayed at full opacity and visually
 * piled up on top of the active section's labels during transitions.
 */
export function FocusFadeLabel({ sectionIndex, className, children }: FocusFadeLabelProps) {
  const scroll = useScroll();
  const ref = useRef<HTMLDivElement>(null);

  useFrame(() => {
    applyLabelFocus(ref.current, getSectionFocus(scroll.offset, sectionIndex));
  });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
