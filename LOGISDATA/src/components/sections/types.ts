import type { Language } from "@/lib/types";

/** Props shared by every scroll section. */
export interface SectionProps {
  language: Language;
  /** True when this section currently fills the viewport. */
  active: boolean;
  /** Mirrors `prefers-reduced-motion`; collapses entrance animation. */
  reduced: boolean;
}
