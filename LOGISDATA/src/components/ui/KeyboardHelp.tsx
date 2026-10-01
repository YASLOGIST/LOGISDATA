"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";
import type { Language } from "@/lib/types";

interface KeyboardHelpProps {
  open: boolean;
  language: Language;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["↓", "→", "PageDn", "Space"], label: "shortcutNext" },
  { keys: ["↑", "←", "PageUp"], label: "shortcutPrev" },
  { keys: ["Home"], label: "shortcutFirst" },
  { keys: ["End"], label: "shortcutLast" },
  { keys: ["1", "…", "5"], label: "shortcutJump" },
  { keys: ["T"], label: "shortcutTheme" },
  { keys: ["L"], label: "shortcutLanguage" },
  { keys: ["?"], label: "shortcutHelp" },
] as const;

/**
 * Discoverability for the keyboard navigation that already existed but was
 * completely undocumented in the UI.
 *
 * Implemented with a native `<dialog>` so focus trapping, Escape handling
 * and the top-layer stacking context come from the platform instead of
 * hand-rolled (and usually incorrect) JavaScript.
 */
export function KeyboardHelp({ open, language, onClose }: KeyboardHelpProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="shortcut-dialog" onClose={onClose} aria-labelledby="shortcut-title">
      <div className="shortcut-dialog-head">
        <h2 id="shortcut-title">{t("shortcuts", language)}</h2>
        <button type="button" className="control-button" onClick={onClose} aria-label={t("closeDialog", language)}>
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <ul className="shortcut-list">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.label}>
            <span className="shortcut-keys" dir="ltr">
              {shortcut.keys.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </span>
            <span>{t(shortcut.label, language)}</span>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
