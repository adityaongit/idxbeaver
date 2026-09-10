#!/usr/bin/env node
// Zip dist/ into releases/idxbeaver-<version>.zip for Chrome Web Store upload,
// or with --target=firefox into idxbeaver-<version>-firefox.zip for AMO.
// Assumes `npm run build` has already produced dist/.
//
// The archive is written by hand rather than shelling out to `zip` or
// PowerShell's Compress-Archive:
//   - `zip` is absent on a stock Windows / Git-Bash box, which is where this
//     gets run most often — execFileSync("zip") just threw ENOENT there.
//   - Compress-Archive emits entry names with backslash separators. The ZIP
//     spec (APPNOTE 4.4.17.1) requires forward slashes, and such an archive
//     extracts as literal "assets\panel.js" filenames on non-Windows hosts.
//
// The store wants the *contents* of dist/ at the archive root — a zip with
// everything nested under a dist/ folder is rejected for a missing manifest.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const firefoxDist = join(root, "dist-firefox");
const releasesDir = join(root, "releases");

const TARGETS = ["chrome", "firefox"];
const target = process.argv.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "chrome";
if (!TARGETS.includes(target)) {
  console.error(`Unknown --target=${target}. Use one of: ${TARGETS.join(", ")}.`);
  process.exit(1);
}

if (!existsSync(dist)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}
if (typeof crc32 !== "function") {
  console.error("node:zlib.crc32 unavailable — needs Node 20.15+ / 22+.");
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const zipName = target === "firefox" ? `idxbeaver-${version}-firefox.zip` : `idxbeaver-${version}.zip`;
const zipPath = join(releasesDir, zipName);

// Firefox will not load the Chrome build as-is, so re-stamp a copy rather than
// branching src/manifest.ts — @crxjs owns manifest emission and hashes the
// asset names, so the only stable place to diverge is after the build.
//
//   - background.service_worker is unimplemented in Firefox; it needs an event
//     page (`scripts`). The crxjs loader is already an ES module, so type stays
//     "module" (Firefox 112+).
//   - world: "MAIN" injection, which every storage read depends on, landed in
//     Firefox 128, so that is the real floor. strict_min_version is 140 anyway
//     because data_collection_permissions below is unknown before it, and 140
//     is the current ESR — claiming 128 only earns two lint warnings.
//   - use_dynamic_url is Chromium-only and unrecognised keys make AMO's linter
//     noisy.
//   - data_collection_permissions is mandatory for new AMO listings. We read
//     page storage but never transmit it, hence "none".
function stampFirefoxDist() {
  rmSync(firefoxDist, { recursive: true, force: true });
  cpSync(dist, firefoxDist, { recursive: true });

  const manifestPath = join(firefoxDist, "manifest.json");
  const { minimum_chrome_version: _chromeOnly, ...manifest } = JSON.parse(readFileSync(manifestPath, "utf8"));

  const worker = manifest.background?.service_worker;
  if (!worker) {
    console.error("dist/manifest.json has no background.service_worker to convert — did the build change?");
    process.exit(1);
  }
  manifest.background = { scripts: [worker], type: manifest.background.type ?? "module" };
  manifest.browser_specific_settings = {
    gecko: {
      id: "idxbeaver@portlabs.in",
      strict_min_version: "140.0",
      data_collection_permissions: { required: ["none"] }
    }
  };
  manifest.web_accessible_resources = manifest.web_accessible_resources?.map(
    ({ use_dynamic_url: _chromeOnlyToo, ...entry }) => entry
  );

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return firefoxDist;
}

const source = target === "firefox" ? stampFirefoxDist() : dist;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

const files = walk(source)
  .map((abs) => ({ abs, name: relative(source, abs).split("\\").join("/") }))
  .sort((a, b) => (a.name < b.name ? -1 : 1));

if (!files.some((f) => f.name === "manifest.json")) {
  console.error("No manifest.json at the build root — the store would reject this build.");
  process.exit(1);
}

const locals = [];
const centrals = [];
let offset = 0;

for (const { abs, name } of files) {
  const raw = readFileSync(abs);
  const deflated = deflateRawSync(raw, { level: 9 });
  // Only claim deflate if it actually helped; otherwise store verbatim.
  const useDeflate = deflated.length < raw.length;
  const body = useDeflate ? deflated : raw;
  const method = useDeflate ? 8 : 0;
  const crc = crc32(raw);
  const nameBuf = Buffer.from(name, "utf8");

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed to extract
  local.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(0, 10); // mod time — fixed, for reproducible archives
  local.writeUInt16LE(0x0021, 12); // mod date — 1980-01-01
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28); // extra field length
  locals.push(local, nameBuf, body);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(method, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0x0021, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(raw.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30); // extra field length
  central.writeUInt16LE(0, 32); // file comment length
  central.writeUInt16LE(0, 34); // disk number start
  central.writeUInt16LE(0, 36); // internal attributes
  central.writeUInt32LE(0, 38); // external attributes
  central.writeUInt32LE(offset, 42);
  centrals.push(central, nameBuf);

  offset += local.length + nameBuf.length + body.length;
}

const centralBuf = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4); // this disk number
end.writeUInt16LE(0, 6); // disk with central directory
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20); // archive comment length

const zip = Buffer.concat([...locals, centralBuf, end]);
mkdirSync(releasesDir, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath);
writeFileSync(zipPath, zip);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`\n✓ ${zipName} → releases/`);
console.log(`  ${files.length} entries, ${kb(zip.length)} (store limit 10 MB)`);
console.log(`  sha256 ${createHash("sha256").update(zip).digest("hex").slice(0, 16)}`);

// Surface the biggest payloads — an unexpected entry here usually means a
// stray asset landed in public/ and is now shipping to every user.
const biggest = files
  .map((f) => ({ name: f.name, size: statSync(f.abs).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 3);
console.log(`  largest: ${biggest.map((f) => `${f.name} ${kb(f.size)}`).join(", ")}`);
if (target === "firefox") {
  console.log(`  Lint first: npx web-ext lint --source-dir dist-firefox`);
  console.log(`  Load unpacked: about:debugging → This Firefox → Load Temporary Add-on → dist-firefox/manifest.json`);
  console.log(`  Upload at: https://addons.mozilla.org/developers/addon/submit/distribution`);
} else {
  console.log(`  Upload at: https://chrome.google.com/webstore/devconsole`);
}
