// The published lucide-react@1.28.0 tarball ships a "typings" field
// (dist/lucide-react.d.ts) that isn't actually included in the package,
// which breaks `tsc`/`next build` type-checking for every icon import in
// this project. This ambient declaration restores a working (loosely
// typed) module shape so the build can type-check successfully without
// pinning a different icon library version.
declare module "lucide-react" {
  import type { FC, SVGProps } from "react";

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = FC<LucideProps>;

  export const ArrowDown: LucideIcon;
  export const ArrowDownRight: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Activity: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Boxes: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const FileCheck2: LucideIcon;
  export const Fuel: LucideIcon;
  export const Languages: LucideIcon;
  export const Map: LucideIcon;
  export const Moon: LucideIcon;
  export const Network: LucideIcon;
  export const Route: LucideIcon;
  export const ScanBarcode: LucideIcon;
  export const ScanLine: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Sun: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const TriangleAlert: LucideIcon;

  const lucideReact: Record<string, LucideIcon>;
  export default lucideReact;
}
