/* eslint-disable @next/next/no-img-element */
import { CHROME_WEB_STORE_URL } from "@/lib/brand";

const FONT_STACK = '"Google Sans", "Helvetica Neue", Arial, sans-serif';

/**
 * Hero install CTA, modeled on Google's official "Available in the Chrome
 * Web Store" badge but rebuilt from the SVG mark + Google Sans so it scales
 * crisply at any DPI. Sits at h-[52px] to line up with sibling outline
 * buttons. Reused on the home page; safe to drop in anywhere a primary
 * install affordance is needed.
 */
export function CwsInstallButton({ className }: { className?: string }) {
  return (
    <a
      href={CHROME_WEB_STORE_URL}
      target="_blank"
      rel="noopener"
      aria-label="Available in the Chrome Web Store — install IdxBeaver"
      className={[
        "group inline-flex h-[52px] items-center gap-3 rounded-[8px]",
        "border border-[#dadce0] bg-white px-4 text-[#3c4043]",
        "transition-colors hover:bg-[#f8f9fa] active:translate-y-px",
        className ?? "",
      ].join(" ")}
    >
      <img
        src="/brand/chrome-web-store-icon.svg"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 select-none"
        draggable={false}
      />
      <span
        className="flex flex-col items-start gap-[2px] leading-none text-[#3c4043]"
        style={{ fontFamily: FONT_STACK }}
      >
        <span className="text-[11px] font-normal">Available in the</span>
        <span className="text-[15px] font-medium tracking-[-0.005em]">
          Chrome Web Store
        </span>
      </span>
    </a>
  );
}
