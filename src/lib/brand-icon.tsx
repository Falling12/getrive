import { ImageResponse } from "next/og";

// Shared by app/icon.tsx and app/apple-icon.tsx — redraws the AuthMark
// 4-bar "signal" glyph (see auth-mark.tsx) as a generated favicon/app icon
// instead of duplicating the shape per file convention.
export function renderBrandIcon(size: number) {
  const barHeight = Math.max(2, Math.round(size * 0.09));
  const gap = Math.max(1, Math.round(size * 0.07));
  const glyphWidth = Math.round(size * 0.56);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1211",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: glyphWidth,
            gap,
          }}
        >
          <div
            style={{
              height: barHeight,
              width: "100%",
              borderRadius: barHeight,
              background: "#6be0a4",
            }}
          />
          <div
            style={{
              height: barHeight,
              width: "100%",
              borderRadius: barHeight,
              background: "#6be0a4",
            }}
          />
          <div style={{ display: "flex", width: "100%", gap }}>
            <div
              style={{
                height: barHeight,
                width: "62%",
                borderRadius: barHeight,
                background: "#6be0a4",
              }}
            />
            <div
              style={{
                height: barHeight,
                flex: 1,
                borderRadius: barHeight,
                background: "#6be0a4",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
