import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FigColumn({
  number,
  title,
  description,
  children,
  className,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fig-col r relative flex min-h-[520px] flex-col border-b border-[var(--color-hair)] px-7 pt-12 pb-12 last:border-b-0 lg:min-h-[620px] lg:border-r lg:border-b-0 lg:px-11 lg:pt-14 lg:pb-13 lg:last:border-r-0",
        className
      )}
    >
      <div className="mono mb-10 flex items-center gap-[10px] text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-mute)] lg:mb-11">
        <span>{number}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-hair)]" />
      </div>
      <div className="relative flex flex-1 items-center justify-center px-0 pt-5 pb-10">
        <div className="w-full max-w-[340px]">{children}</div>
      </div>
      <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-ink)] lg:text-[22px]">
        {title}
      </h3>
      <p className="mt-[10px] max-w-[320px] text-[14.5px] leading-[1.55] text-[var(--color-ink-dim)]">
        {description}
      </p>
    </div>
  );
}
