#!/usr/bin/env node
// Zip dist/ into releases/idxbeaver-<version>.zip for Chrome Web Store upload.
// Assumes `npm run build` has already produced dist/.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(root, "dist");
const releasesDir = resolve(root, "releases");

if (!existsSync(dist)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const zipName = `idxbeaver-${version}.zip`;
const zipPath = resolve(releasesDir, zipName);

mkdirSync(releasesDir, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath);

execFileSync("zip", ["-r", zipPath, "."], { cwd: dist, stdio: "inherit" });

console.log(`\n✓ ${zipName} → releases/`);
console.log(`  Upload at: https://chrome.google.com/webstore/devconsole`);
