import { cn } from "@/lib/utils";

type Row = {
  label: string;
  count?: string;
  active?: boolean;
  ico: "db" | "store";
  storeColor?: string;
};

function MkRow({ row }: { row: Row }) {
  return (
    <div
      className={cn(
        "mono relative flex h-[24px] items-center gap-2 rounded-[5px] px-2 text-[11.5px] text-[var(--color-ink-2)]",
        row.active && "bg-white/[.04] text-[var(--color-ink)]"
      )}
    >
      {row.active && (
        <span
          aria-hidden="true"
          className="absolute top-[5px] bottom-[5px] left-[-1px] w-[2px] rounded-[1px]"
          style={{
            background: "linear-gradient(180deg, var(--color-ir-1), var(--color-ir-2))",
          }}
        />
      )}
      <span
        className={cn(
          "h-[8px] w-[8px] shrink-0",
          row.ico === "db"
            ? "rounded-full"
            : "rounded-[2px]"
        )}
        style={{
          background:
            row.ico === "db"
              ? "var(--color-ink-faint)"
              : row.storeColor,
        }}
      />
      <span className="truncate">{row.label}</span>
      {row.count && (
        <span className="ml-auto text-[10.5px] text-[var(--color-ink-mute)]">{row.count}</span>
      )}
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <>
      <div className="mono px-[6px] pt-[10px] pb-[6px] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
        {title}
      </div>
      {rows.map((r) => (
        <MkRow key={r.label} row={r} />
      ))}
    </>
  );
}

export function MockSidebar() {
  return (
    <div className="border-r border-[var(--color-hair)] bg-white/[.01] px-2 py-3">
      <Section
        title="Databases"
        rows={[
          { label: "auth-cache", count: "2", ico: "db" },
          { label: "calendar-db", count: "7", ico: "db", active: true },
          { label: "inbox-sync", count: "5", ico: "db" },
        ]}
      />
      <Section
        title="Stores"
        rows={[
          { label: "attendees", count: "41k", ico: "store", storeColor: "#8A5CF6" },
          { label: "events", count: "24k", ico: "store", storeColor: "#F472B6", active: true },
          { label: "reminders", count: "7k", ico: "store", storeColor: "#FB923C" },
          { label: "rsvp", count: "18k", ico: "store", storeColor: "#3FB950" },
        ]}
      />
      <Section
        title="Other"
        rows={[
          { label: "LocalStorage", ico: "store", storeColor: "#D29922" },
          { label: "Cookies", ico: "store", storeColor: "#F85149" },
          { label: "Cache", ico: "store", storeColor: "#6E7681" },
        ]}
      />
    </div>
  );
}
