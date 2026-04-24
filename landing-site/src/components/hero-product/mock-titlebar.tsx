export function MockTitlebar() {
  return (
    <div className="flex items-center gap-[10px] border-b border-[var(--color-hair)] bg-white/[.015] px-[14px] py-[10px]">
      <div className="flex gap-[6px]">
        <span className="h-[10px] w-[10px] rounded-full bg-[#FF5F57]" />
        <span className="h-[10px] w-[10px] rounded-full bg-[#FEBC2E]" />
        <span className="h-[10px] w-[10px] rounded-full bg-[#28C840]" />
      </div>
      <div className="mono mx-auto hidden text-[11px] text-[var(--color-ink-mute)] sm:block">
        idxbeaver · devtools · app.acme.com
      </div>
      <div className="hidden items-center gap-[6px] sm:flex">
        <span className="mono rounded-[4px] border border-[var(--color-hair)] bg-white/[.03] px-[8px] py-[3px] text-[10.5px] text-[var(--color-ink-dim)]">
          calendar-db
        </span>
        <span className="mono hidden rounded-[4px] border border-[var(--color-hair)] bg-white/[.03] px-[8px] py-[3px] text-[10.5px] text-[var(--color-ink-dim)] md:inline-block">
          24,918 rows
        </span>
      </div>
    </div>
  );
}
