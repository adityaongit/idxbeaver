export function MockFooter() {
  return (
    <div className="mono flex h-[32px] items-center gap-2 overflow-hidden border-t border-[var(--color-hair)] bg-white/[.01] px-[14px] text-[11px] text-[var(--color-ink-dim)]">
      <span className="text-[var(--color-ink-mute)]">›</span>
      <span className="truncate">
        <span style={{ color: "#A5C2E8" }}>{"{ "}</span>
        <span style={{ color: "#A5C2E8" }}>{'"store"'}</span>: <span style={{ color: "#E6A3D7" }}>{'"events"'}</span>,{" "}
        <span style={{ color: "#A5C2E8" }}>{'"filter"'}</span>: {"{ "}
        <span style={{ color: "#A5C2E8" }}>{'"date"'}</span>: {"{ "}
        <span style={{ color: "#C5B5FD" }}>{'"$gte"'}</span>: <span style={{ color: "#E6A3D7" }}>{'"2026-04-14"'}</span>
        {" } } }"}
        <span className="hero-cursor" />
      </span>
      <span className="ml-auto hidden shrink-0 text-[var(--color-ink-mute)] md:inline">
        plan · idx(date) · 12ms
      </span>
    </div>
  );
}
