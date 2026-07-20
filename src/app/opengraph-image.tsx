import { ImageResponse } from "next/og";
import { SITE_TITLE } from "@/lib/seo";

export const alt = SITE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "96px",
          background: "linear-gradient(135deg, #0a1211 0%, #0f1a17 55%, #0a1211 100%)",
          color: "#eae7e0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 34, gap: 5 }}>
            <div style={{ height: 8, width: "100%", borderRadius: 8, background: "#6be0a4" }} />
            <div style={{ height: 8, width: "100%", borderRadius: 8, background: "#6be0a4" }} />
            <div style={{ display: "flex", width: "100%", gap: 5 }}>
              <div style={{ height: 8, width: "62%", borderRadius: 8, background: "#6be0a4" }} />
              <div style={{ height: 8, flex: 1, borderRadius: 8, background: "#6be0a4" }} />
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 32, letterSpacing: 8, textTransform: "uppercase", color: "#eae7e0" }}>
            Getrive
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 600, lineHeight: 1.15, maxWidth: 980 }}>
          Find your first users without cold-pitching
        </div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 32, color: "#9aa39e", maxWidth: 880 }}>
          Listens across Reddit, Hacker News & more for people already describing your exact problem.
        </div>
      </div>
    ),
    { ...size }
  );
}
