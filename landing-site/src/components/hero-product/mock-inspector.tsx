export function MockInspector() {
  return (
    <div className="border-l border-[var(--color-hair)] bg-white/[.01] p-[14px]">
      <div className="mono mb-[10px] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
        Record · row 2
      </div>

      {[
        ["id", "evt_9f3c…a210", "mono"],
        ["kind", '"review"', "s"],
        ["title", '"Q2 architecture"', "s"],
        ["date", '"2026-04-15"', "s"],
        ["seats", "8", "n"],
      ].map(([k, v, kind]) => (
        <div
          key={k}
          className="mono flex items-center justify-between gap-[10px] border-b border-dashed border-[var(--color-hair)] py-[5px] text-[11.5px]"
        >
          <span className="text-[var(--color-ink-dim)]">{k}</span>
          <span
            className="truncate"
            style={{
              color:
                kind === "s"
                  ? "#E6A3D7"
                  : kind === "n"
                    ? "#A5C2E8"
                    : "var(--color-ink-2)",
              maxWidth: "60%",
            }}
          >
            {v}
          </span>
        </div>
      ))}

      <pre className="mono mt-[12px] rounded-[6px] border border-[var(--color-hair)] bg-black/30 p-[10px] text-[11px] leading-[1.7]">
        <span className="text-[var(--color-ink-mute)]">{"{"}</span>
        {"\n  "}
        <span className="font-medium text-[#A5C2E8]">{'"attendees"'}</span>
        <span className="text-[var(--color-ink-mute)]">{": ["}</span>
        {"\n    "}
        <span className="text-[#E6A3D7]">{'"priya@"'}</span>
        <span className="text-[var(--color-ink-mute)]">,</span>
        {"\n    "}
        <span className="text-[#E6A3D7]">{'"marcus@"'}</span>
        {"\n  "}
        <span className="text-[var(--color-ink-mute)]">{"]"}</span>
        {"\n"}
        <span className="text-[var(--color-ink-mute)]">{"}"}</span>
      </pre>
    </div>
  );
}
