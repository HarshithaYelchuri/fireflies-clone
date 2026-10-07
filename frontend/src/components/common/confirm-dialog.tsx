"use client";

import { Sparkles, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  /** Shown on the confirm button while `onConfirm` runs. */
  busyLabel?: string;
  /** "destructive" (red, default) for deletes; "primary" for other confirmations. */
  tone?: "destructive" | "primary";
  /** Resolve to close the dialog; reject to keep it open (the caller shows the error). */
  onConfirm: () => Promise<unknown>;
}

/** Confirmation modal: destructive (delete) by default, or a primary action such as regenerating notes. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  busyLabel = "Deleting…",
  tone = "destructive",
  onConfirm,
}: ConfirmDialogProps) {
  const destructive = tone === "destructive";
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // keep the dialog open so the user can retry
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {destructive ? (
            <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-red-50 ring-6 ring-red-50/50">
              <TriangleAlert className="size-5 text-red-600" />
            </span>
          ) : (
            <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-brand-50 ring-6 ring-brand-25">
              <Sparkles className="size-5 text-brand-600" />
            </span>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction className={destructive ? "bg-red-600 text-white hover:bg-red-700" : undefined} disabled={busy} onClick={confirm}>
            {busy ? busyLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
