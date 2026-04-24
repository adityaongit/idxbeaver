import { cn } from "@/lib/utils";

type Cell =
  | { type: "str"; v: string }
  | { type: "num"; v: number }
  | { type: "null" };

type Row = {
  n: number;
  kind: Cell;
  title: Cell;
  date: Cell;
  seats: Cell;
  selected?: boolean;
};

const ROWS: Row[] = [
  { n: 1, kind: { type: "str", v: "standup" }, title: { type: "str", v: "Eng weekly sync" }, date: { type: "str", v: "2026-04-14" }, seats: { type: "num", v: 12 } },
  { n: 2, kind: { type: "str", v: "review" }, title: { type: "str", v: "Q2 architecture review" }, date: { type: "str", v: "2026-04-15" }, seats: { type: "num", v: 8 }, selected: true },
  { n: 3, kind: { type: "str", v: "1:1" }, title: { type: "str", v: "Priya ↔ Marcus" }, date: { type: "str", v: "2026-04-15" }, seats: { type: "num", v: 2 } },
  { n: 4, kind: { type: "str", v: "demo" }, title: { type: "str", v: "Platform demo" }, date: { type: "str", v: "2026-04-16" }, seats: { type: "num", v: 24 } },
  { n: 5, kind: { type: "str", v: "standup" }, title: { type: "str", v: "Frontend sync" }, date: { type: "str", v: "2026-04-17" }, seats: { type: "num", v: 7 } },
  { n: 6, kind: { type: "str", v: "offsite" }, title: { type: "str", v: "Design offsite · day 1" }, date: { type: "str", v: "2026-04-18" }, seats: { type: "num", v: 32 } },
  { n: 7, kind: { type: "str", v: "1:1" }, title: { type: "str", v: "Elena ↔ Roshan" }, date: { type: "str", v: "2026-04-18" }, seats: { type: "num", v: 2 } },
  { n: 8, kind: { type: "null" }, title: { type: "str", v: "Unsaved draft…" }, date: { type: "null" }, seats: { type: "null" } },
  { n: 9, kind: { type: "str", v: "review" }, title: { type: "str", v: "Security review — auth" }, date: { type: "str", v: "2026-04-21" }, seats: { type: "num", v: 6 } },
  { n: 10, kind: { type: "str", v: "demo" }, title: { type: "str", v: "Customer: Nordstrum" }, date: { type: "str", v: "2026-04-22" }, seats: { type: "num", v: 14 } },
  { n: 11, kind: { type: "str", v: "standup" }, title: { type: "str", v: "Platform sync" }, date: { type: "str", v: "2026-04-23" }, seats: { type: "num", v: 9 } },
  { n: 12, kind: { type: "str", v: "review" }, title: { type: "str", v: "Design review · mobile" }, date: { type: "str", v: "2026-04-24" }, seats: { type: "num", v: 5 } },
];

function CellContent({ c, align }: { c: Cell; align?: "right" }) {
  if (c.type === "null") {
    return <span className="italic text-[var(--color-ink-mute)]">null</span>;
  }
  if (c.type === "num") {
    return <span className="block text-right text-[#A5C2E8]">{c.v}</span>;
  }
  return <span className={cn("text-[#E6A3D7]", align === "right" && "text-right")}>{`"${c.v}"`}</span>;
}

export function MockGrid() {
  return (
    <div className="overflow-hidden bg-[var(--color-bg)]">
      {/* horizontal scroll wrapper for narrow viewports */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[560px]">
          {/* header */}
          <div
            className="mono grid h-[28px] items-center border-b border-[var(--color-hair)] bg-white/[.015] text-[11px] text-[var(--color-ink-mute)]"
            style={{ gridTemplateColumns: "40px 110px 1fr 100px 80px" }}
          >
            <div className="border-r border-[var(--color-hair)] px-[10px]">#</div>
            <div className="border-r border-[var(--color-hair)] px-[10px]">kind</div>
            <div className="border-r border-[var(--color-hair)] px-[10px]">title</div>
            <div className="border-r border-[var(--color-hair)] px-[10px]">date ↓</div>
            <div className="px-[10px]">seats</div>
          </div>
          {/* rows */}
          {ROWS.map((r) => (
            <div
              key={r.n}
              className={cn(
                "mono grid h-[24px] items-center border-b border-white/[.025] text-[11.5px] text-[var(--color-ink-2)] hover:bg-white/[.02]",
                r.selected && "bg-[rgba(244,114,182,.08)] shadow-[inset_2px_0_0_var(--color-ir-2)] hover:bg-[rgba(244,114,182,.08)]"
              )}
              style={{ gridTemplateColumns: "40px 110px 1fr 100px 80px" }}
            >
              <div className="truncate border-r border-white/[.02] px-[10px] text-[var(--color-ink-mute)]">
                {r.n}
              </div>
              <div className="truncate border-r border-white/[.02] px-[10px]">
                <CellContent c={r.kind} />
              </div>
              <div className="truncate border-r border-white/[.02] px-[10px]">
                <CellContent c={r.title} />
              </div>
              <div className="truncate border-r border-white/[.02] px-[10px]">
                <CellContent c={r.date} />
              </div>
              <div className="truncate px-[10px]">
                <CellContent c={r.seats} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
