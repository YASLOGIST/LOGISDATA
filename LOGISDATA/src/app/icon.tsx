import { ImageResponse } from "next/og";

/**
 * Generated favicon. Kept as code rather than a binary so the mark stays in
 * sync with the design tokens and costs nothing to version.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b1220 0%, #122032 100%)",
          color: "#38bdf8",
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: -1,
          borderRadius: 6,
        }}
      >
        LD
      </div>
    ),
    size,
  );
}
