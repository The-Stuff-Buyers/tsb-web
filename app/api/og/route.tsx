import { ImageResponse } from "next/og";

// =============================================================================
// DYNAMIC OG IMAGE GENERATOR
// =============================================================================
// Generates branded Open Graph images on-the-fly for social sharing.
// Served at /api/og?title=...&subtitle=...
// =============================================================================

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title") || "We Buy Stuff.";
  const subtitle =
    searchParams.get("subtitle") || "The stuff you can't sell.";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#1a1a1a",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Gold accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #C9A84C, #D4AF37, #C9A84C)",
          }}
        />

        {/* Company name */}
        <div
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#C9A84C",
            letterSpacing: "4px",
            textTransform: "uppercase",
            marginBottom: "32px",
          }}
        >
          THE STUFF BUYERS
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1.1,
            maxWidth: "900px",
            marginBottom: "20px",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "28px",
            color: "#999999",
            maxWidth: "700px",
          }}
        >
          {subtitle}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "80px",
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div style={{ fontSize: "18px", color: "#666666" }}>
            thestuffbuyers.com
          </div>
          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: "#C9A84C",
            }}
          />
          <div style={{ fontSize: "18px", color: "#666666" }}>
            888-987-2927
          </div>
          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: "#C9A84C",
            }}
          />
          <div style={{ fontSize: "18px", color: "#666666" }}>
            quotes@thestuffbuyers.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
