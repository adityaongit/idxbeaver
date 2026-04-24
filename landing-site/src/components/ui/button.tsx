import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-[7px] rounded-[8px] font-sans text-[13px] font-medium tracking-[-.005em] transition-all outline-none select-none whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-[#F472B6]/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-[var(--color-ink)] border border-transparent hover:bg-white/[.05] hover:border-[var(--color-hair)]",
        outline:
          "bg-white/[.02] text-[var(--color-ink)] border border-[var(--color-hair-2)] shadow-[inset_0_1px_0_rgba(255,255,255,.06)] hover:bg-white/[.06] hover:border-[var(--color-hair-3)]",
        primary:
          "text-[#09090B] bg-gradient-to-b from-white to-zinc-200 border border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,.9),inset_0_-1px_0_rgba(0,0,0,.1),0_1px_0_rgba(0,0,0,.6),0_4px_14px_-2px_rgba(0,0,0,.5)] hover:from-white hover:to-zinc-200 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,.9),inset_0_-1px_0_rgba(0,0,0,.1),0_1px_0_rgba(0,0,0,.6),0_8px_20px_-4px_rgba(0,0,0,.6)] active:translate-y-0",
      },
      size: {
        default: "h-[34px] px-[14px]",
        lg: "h-[42px] px-[18px] text-[14px] rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  }
);

type BaseBtnProps = VariantProps<typeof buttonVariants> & {
  className?: string;
};

type ButtonAsButton = BaseBtnProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };

type ButtonAsAnchor = BaseBtnProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a"; href: string };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

function Button(props: ButtonProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = props as any;
  const { variant, size, className, as, ...rest } = p;
  const mergedClass = cn(buttonVariants({ variant, size }), className);

  if (as === "a") {
    return <a className={mergedClass} {...rest} />;
  }
  return (
    <button
      className={mergedClass}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    />
  );
}

export { Button, buttonVariants };
