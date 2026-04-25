import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";
export const alt = "IdxBeaver — A database client for browser storage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(
    join(process.cwd(), "public", "brand", "logo-mark-512.png"),
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "80px",
          background:
            "radial-gradient(circle at 20% 20%, #1a0e2e 0%, #08090a 60%)",
          color: "#fafafa",
          fontFamily: "Geist",
        }}
      >
        <img
          src={logoSrc}
          width={360}
          height={360}
          alt=""
          style={{ marginRight: 56, flexShrink: 0 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            <span style={{ color: "#a78bfa" }}>idx</span>
            <span>beaver</span>
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#a3a3a3",
              lineHeight: 1.3,
              maxWidth: 600,
              letterSpacing: "-0.01em",
            }}
          >
            Browser storage, managed like a database.
          </div>
          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 32,
              fontSize: 22,
              color: "#737373",
              fontFamily: "monospace",
            }}
          >
            <span>IndexedDB</span>
            <span>·</span>
            <span>LocalStorage</span>
            <span>·</span>
            <span>Cookies</span>
            <span>·</span>
            <span>Cache</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
