import type { AuditScenario, Language } from "@/lib/types";

/** Props shared by every scroll section. */
export interface SectionProps {
  language: Language;
  /** True when this section currently fills the viewport. */
  active: boolean;
  /** Mirrors `prefers-reduced-motion`; collapses entrance animation. */
  reduced: boolean;
  /** Active audit simulation scenario */
  scenario?: AuditScenario;
  /** Callback when user clicks a node to inspect telemetry */
  onSelectNode?: (nodeId: string) => void;
  /** Callback to open the Executive Recovery Calculator */
  onOpenCalculator?: () => void;
}
