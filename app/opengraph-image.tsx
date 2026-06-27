import { ImageResponse } from "next/og";

export const alt = "AI Product Research Copilot";
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
          padding: "80px",
          backgroundColor: "#16150f",
          color: "#ece8df",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#db8160",
          }}
        >
          AI Product Research
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            marginTop: 12,
            lineHeight: 1.05,
          }}
        >
          Research Copilot
        </div>
        <div
          style={{
            fontSize: 32,
            marginTop: 28,
            maxWidth: 820,
            color: "#a8a394",
          }}
        >
          Describe a product problem — get a synthesized report with patterns,
          UX insights, and prioritized recommendations.
        </div>
      </div>
    ),
    { ...size },
  );
}
