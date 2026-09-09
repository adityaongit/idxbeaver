/**
 * A cell of "yes" / "no" / "none" / "n/a" renders as an icon; anything else
 * renders as prose, so a row can qualify an answer instead of flattening it
 * to a tick. The first product column is styled as "ours".
 */
export type ComparisonRow = [capability: string, ...cells: string[]];

export function ComparisonTable({
  products,
  rows,
  capabilityLabel = "Capability",
}: {
  products: string[];
  rows: ComparisonRow[];
  capabilityLabel?: string;
}) {
  const capWidth = products.length > 2 ? 26 : 32;
  const cellWidth = (100 - capWidth) / products.length;

  return (
    <div className="-mx-2 overflow-x-auto">
      <table
        className="w-full border-collapse rounded-lg text-left text-[14px] [&_td]:border [&_td]:border-[var(--color-hair)] [&_th]:border [&_th]:border-[var(--color-hair)]"
        style={{ minWidth: products.length > 2 ? 820 : 560 }}
      >
        <colgroup>
          <col style={{ width: `${capWidth}%` }} />
          {products.map((p) => (
            <col key={p} style={{ width: `${cellWidth}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
            <th className="px-3 py-4 align-bottom">{capabilityLabel}</th>
            {products.map((p, i) => (
              <th
                key={p}
                className={[
                  "px-3 py-4 align-bottom",
                  i === 0 ? "text-[var(--color-ink)]" : "",
                ].join(" ")}
              >
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([capability, ...cells], rowIndex) => (
            <tr
              key={capability}
              className={["align-top", rowIndex % 2 === 1 ? "bg-white/[.015]" : ""].join(" ")}
            >
              <td className="px-3 py-4 font-medium text-[var(--color-ink)]">{capability}</td>
              {products.map((product, i) => (
                <td key={product} className="px-3 py-4">
                  <ComparisonCell value={cells[i] ?? ""} positive={i === 0} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonCell({ value, positive }: { value: string; positive?: boolean }) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "no" || trimmed === "none" || trimmed === "n/a") {
    return (
      <span className="flex h-full items-center justify-center">
        <NoIcon />
      </span>
    );
  }
  if (trimmed === "yes") {
    return (
      <span className="flex h-full items-center justify-center">
        <YesIcon />
      </span>
    );
  }
  return (
    <span
      className={[
        "leading-[1.55]",
        positive ? "text-[var(--color-ink)]" : "text-[var(--color-ink-dim)]",
      ].join(" ")}
    >
      {value}
    </span>
  );
}

function NoIcon() {
  return (
    <span
      role="img"
      aria-label="not supported"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(244,114,182,.12)] text-[#f472b6] ring-1 ring-inset ring-[rgba(244,114,182,.35)]"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function YesIcon() {
  return (
    <span
      role="img"
      aria-label="supported"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(167,139,250,.14)] text-[var(--color-brand)] ring-1 ring-inset ring-[rgba(167,139,250,.35)]"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path
          d="M2.5 6.8l2.6 2.6 5.4-5.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
