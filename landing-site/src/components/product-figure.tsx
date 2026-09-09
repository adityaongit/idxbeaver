/* eslint-disable @next/next/no-img-element */
import {
  screenshotFallback,
  screenshotSrcSet,
  type ScreenshotAsset,
} from "@/lib/screenshots";

const SIZES = "(min-width: 984px) 920px, 100vw";

export function ProductFigure({
  asset,
  alt,
  caption,
}: {
  asset: ScreenshotAsset;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="my-10 ml-0">
      <picture>
        <source srcSet={screenshotSrcSet(asset, "avif")} sizes={SIZES} type="image/avif" />
        <img
          src={screenshotFallback(asset)}
          srcSet={screenshotSrcSet(asset, "webp")}
          sizes={SIZES}
          alt={alt}
          width={1920}
          height={1128}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="w-full rounded-[14px] outline outline-1 -outline-offset-1 outline-[rgba(255,255,255,.1)]"
        />
      </picture>
      <figcaption className="mt-3 text-[13.5px] leading-[1.55] text-[var(--color-ink-mute)]">
        {caption}
      </figcaption>
    </figure>
  );
}
