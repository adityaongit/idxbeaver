// Format writers for export (Plan 16).

export function toNdjson(rows: unknown[]): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

export function toSqlInsert(storeName: string, rows: unknown[]): string {
  if (rows.length === 0) return `-- No rows in "${storeName}"\n`;
  const lines: string[] = [`-- ${storeName} (${rows.length} rows)\n`];
  for (const row of rows) {
    const obj = row && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : { value: row };
    const cols = Object.keys(obj).map((k) => `"${k.replace(/"/g, '""')}"`).join(", ");
    const vals = Object.values(obj).map((v) => {
      if (v === null) return "NULL";
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      const str = typeof v === "string" ? v : JSON.stringify(v);
      return `'${str.replace(/'/g, "''")}'`;
    }).join(", ");
    lines.push(`INSERT INTO "${storeName}" (${cols}) VALUES (${vals});`);
  }
  return lines.join("\n");
}

// --- Minimal uncompressed ZIP implementation ---

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const arr of arrays) {
    out.set(arr, pos);
    pos += arr.length;
  }
  return out;
}

export interface ZipFile {
  name: string;
  data: Uint8Array;
}

export function makeZip(files: ZipFile[]): Uint8Array {
  const enc = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralDirs: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const size = file.data.length;
    const crc = crc32(file.data);

    // Local file header (30 + name)
    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true); // STORE compression
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);

    localParts.push(lh, file.data);

    // Central directory entry (46 + name)
    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, localOffset, true);
    cd.set(nameBytes, 46);
    centralDirs.push(cd);

    localOffset += 30 + nameBytes.length + size;
  }

  const cdBytes = concatUint8Arrays(centralDirs);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdBytes.length, true);
  ev.setUint32(16, localOffset, true);
  ev.setUint16(20, 0, true);

  return concatUint8Arrays([...localParts, cdBytes, eocd]);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
