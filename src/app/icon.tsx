import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, rgba(103, 146, 255, 0.25), transparent 42%), linear-gradient(180deg, #f8fbff 0%, #edf2fb 100%)",
          color: "#0f172a",
          fontSize: 176,
          fontWeight: 700,
          letterSpacing: "-0.12em",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 340,
            width: 340,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 108,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            background: "rgba(255, 255, 255, 0.72)",
            boxShadow: "0 30px 80px rgba(15, 23, 42, 0.12)",
          }}
        >
          Ru
        </div>
      </div>
    ),
    size,
  );
}
