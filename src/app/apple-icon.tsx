import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, rgba(103, 146, 255, 0.18), transparent 42%), linear-gradient(180deg, #f8fbff 0%, #edf2fb 100%)",
        color: "#0f172a",
        fontSize: 64,
        fontWeight: 700,
        letterSpacing: "-0.12em",
      }}
    >
      <div
        style={{
          display: "flex",
          height: 128,
          width: 128,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          border: "1px solid rgba(15, 23, 42, 0.08)",
          background: "rgba(255, 255, 255, 0.72)",
        }}
      >
        Ru
      </div>
    </div>,
    size,
  );
}
