import { ImageResponse } from "next/og";

// Shared by every guide's opengraph-image.tsx (src/app/guides/*/opengraph-image.tsx)
// — same dark-gradient/brand-mark treatment as the site-wide app/opengraph-image.tsx,
// just parameterized on title/subtitle instead of the fixed homepage copy, so a
// guide shared on Reddit/HN/Twitter shows its own headline rather than the
// generic site card.
export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

export function renderGuideOgImage(title: string, subtitle: string) {
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
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 8, textTransform: "uppercase", color: "#9aa39e" }}>
            Getrive Guide
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 600, lineHeight: 1.15, maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 28, marginTop: 32, color: "#9aa39e", maxWidth: 900 }}>
          {subtitle}
        </div>
      </div>
    ),
    { ...ogImageSize }
  );
}
