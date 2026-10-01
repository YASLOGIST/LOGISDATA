import { ImageResponse } from "next/og";

/**
 * Social preview card, generated at build time. Mirrors the cover screen so a
 * shared link reads as the same artefact.
 */
export const alt = "LOGISDATA — Supply Chain Control Room";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 88px",
          background: "linear-gradient(135deg, #060b14 0%, #0b1220 45%, #112437 100%)",
          color: "#e6edf7",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#38bdf8",
          }}
        >
          AAST · Supply Chain Audit
        </div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>
          LOGISDATA
        </div>
        <div style={{ display: "flex", fontSize: 40, marginTop: 8, color: "#9fb3c8" }}>
          Supply Chain Control Room
        </div>
        <div style={{ display: "flex", fontSize: 28, marginTop: 40, color: "#7f93a8" }}>
          Freight billing · Demand signal · Route intelligence · Warehouse control
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            gap: 48,
            fontSize: 26,
            color: "#38bdf8",
          }}
        >
          <span>60% of audited freight invoices flagged</span>
          <span>$1.82M optimised routing savings</span>
        </div>
      </div>
    ),
    size,
  );
}
