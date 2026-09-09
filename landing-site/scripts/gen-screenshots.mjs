import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Masters live outside public/ so the 2940px originals never ship in the bundle.
const SRC = new URL("../assets/screenshots/", import.meta.url).pathname;
const OUT = new URL("../public/screenshots/", import.meta.url).pathname;

// Top step is the widest surface the asset appears on, doubled for 2x displays:
// the compare slider caps at 1256 CSS px, content-page figures at 920.
const WIDTHS = [960, 1920, 2560];
const TOP_WIDTH = { dark: 2560, light: 2560, query: 1920 };

await mkdir(OUT, { recursive: true });

for (const [name, top] of Object.entries(TOP_WIDTH)) {
  const widths = WIDTHS.filter((w) => w <= top);
  for (const width of widths) {
    const resized = sharp(join(SRC, `${name}.png`)).resize({ width, kernel: "lanczos3" });
    await resized.clone().avif({ quality: 42, effort: 6 }).toFile(join(OUT, `${name}-${width}.avif`));
    await resized.clone().webp({ quality: 80 }).toFile(join(OUT, `${name}-${width}.webp`));
  }
  console.log(`${name}: ${widths.join(", ")}`);
}
