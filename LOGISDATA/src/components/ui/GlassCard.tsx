import type { ReactNode } from "react";
import type { AccentTone } from "@/lib/types";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  tone?: AccentTone;
  as?: "div" | "article";
}

export function GlassCard({ children, className = "", tone = "cyan", as = "div" }: GlassCardProps) {
  const Component = as;
  return (
    <Component className={`glass-card glass-card-${tone} ${className}`.trim()}>
      {children}
    </Component>
  );
}
