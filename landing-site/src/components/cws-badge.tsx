/* eslint-disable @next/next/no-img-element */
import { CHROME_WEB_STORE_URL } from "@/lib/brand";

type Size = "small" | "medium" | "large";

const SOURCES: Record<Size, { src: string; w: number; h: number }> = {
  small: { src: "/brand/chrome-store-badge-small.png", w: 206, h: 58 },
  medium: { src: "/brand/chrome-store-badge-medium.png", w: 340, h: 96 },
  large: { src: "/brand/chrome-store-badge-large.png", w: 496, h: 150 },
};

/**
 * Official "Available in the Chrome Web Store" badge.
 * Bordered variant — Google's branding guidelines require the bordered
 * version on colored / dark backgrounds.
 *
 * https://developer.chrome.com/docs/webstore/branding
 */
export function CwsBadge({
  size = "small",
  height,
  className,
}: {
  size?: Size;
  /** Render height in px. Width is derived from the badge's aspect ratio. */
  height?: number;
  className?: string;
}) {
  const asset = SOURCES[size];
  const renderHeight = height ?? asset.h;
  const renderWidth = Math.round((asset.w / asset.h) * renderHeight);
  return (
    <a
      href={CHROME_WEB_STORE_URL}
      target="_blank"
      rel="noopener"
      aria-label="Available in the Chrome Web Store — install IdxBeaver"
      className={[
        "inline-flex items-center transition-opacity hover:opacity-90",
        className ?? "",
      ].join(" ")}
    >
      <img
        src={asset.src}
        alt="Available in the Chrome Web Store"
        width={renderWidth}
        height={renderHeight}
        decoding="async"
        className="select-none"
        draggable={false}
      />
    </a>
  );
}
