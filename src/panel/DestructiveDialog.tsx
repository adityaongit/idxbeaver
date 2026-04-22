import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type DestructivePlan = {
  title: string;
  verb: "delete" | "clear" | "nuke" | "replace";
  noun: string;
  /** Text user must type to enable Confirm. Empty string = no typing required. */
  confirmText: string;
  preview: { label: string; value: string | number }[];
  snapshotOffer?: {
    defaultEnabled: boolean;
    snapshotScope: "store" | "database" | "origin";
    onSnapshot: () => Promise<void>;
  };
  execute: () => Promise<void>;
};

interface DestructiveDialogProps {
  plan: DestructivePlan | null;
  busy: boolean;
  requireTypedConfirm: boolean;
  onClose: () => void;
  onExecute: (plan: DestructivePlan, snapshotFirst: boolean) => void;
}

export function DestructiveDialog({ plan, busy, requireTypedConfirm, onClose, onExecute }: DestructiveDialogProps) {
  const [typed, setTyped] = useState("");
  const [snapshotFirst, setSnapshotFirst] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (plan) {
      setTyped("");
      setSnapshotFirst(plan.snapshotOffer?.defaultEnabled ?? false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [plan]);

  if (!plan) return null;

  const showTypeInput = requireTypedConfirm && plan.confirmText.length > 0;
  const confirmed = !showTypeInput || typed === plan.confirmText;

  const handleConfirm = () => {
    if (!confirmed || busy) return;
    onExecute(plan, snapshotFirst);
  };

  const verbLabel =
    plan.verb === "delete" ? "Delete"
    : plan.verb === "clear" ? "Clear"
    : plan.verb === "nuke" ? "Nuke"
    : "Replace";

  return (
    <Dialog open={Boolean(plan)} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent
        className="max-w-[min(400px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-md border-border bg-card p-0 text-card-foreground shadow-2xl"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{plan.title}</DialogTitle>
          <DialogDescription>Confirm destructive action: {plan.noun}</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="space-y-1 border-b border-border px-3 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium tracking-tight text-foreground">{plan.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Preview table */}
        {plan.preview.length > 0 && (
          <div className="border-b border-border px-3 py-2">
            <dl className="space-y-0.5">
              {plan.preview.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <dt className="text-[11px] text-muted-foreground">{row.label}</dt>
                  <dd className="font-mono text-[11px] tabular-nums text-foreground">
                    {typeof row.value === "number" ? row.value.toLocaleString() : row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Typed confirmation input */}
        {showTypeInput && (
          <div className="border-b border-border px-3 py-2 space-y-1.5">
            <p className="text-[11px] text-muted-foreground">
              Type <span className="font-mono font-medium text-foreground">{plan.confirmText}</span> to confirm.
            </p>
            <Input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && confirmed) handleConfirm(); }}
              className="h-7 text-[12px] font-mono"
              placeholder={plan.confirmText}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        {/* Snapshot offer */}
        {plan.snapshotOffer && (
          <div className="border-b border-border px-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={snapshotFirst}
                onChange={(e) => setSnapshotFirst(e.target.checked)}
                className="size-3.5 accent-primary"
              />
              <span className="text-[11px] text-muted-foreground">
                Take snapshot of{" "}
                <span className="text-foreground">{plan.snapshotOffer.snapshotScope}</span> first
              </span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-1.5 px-3 py-2">
          <Button variant="outline" size="xs" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="xs"
            onClick={handleConfirm}
            disabled={!confirmed || busy}
          >
            <Trash2 className="size-3" />
            {busy ? "Working…" : verbLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
