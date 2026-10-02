"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Coordinates controlled React state with the platform's modal dialog.
 * The browser supplies modality, Escape handling, and focus containment;
 * this hook adds deterministic initial focus and restores the invoker.
 */
export function useNativeDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }

    const invoker = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]")?.focus();

    return () => {
      if (invoker?.isConnected) invoker.focus();
    };
  }, [open]);

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const handleDialogClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  return { dialogRef, closeDialog, handleDialogClose };
}
