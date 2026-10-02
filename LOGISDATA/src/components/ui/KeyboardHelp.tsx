"use client";

import { X } from "lucide-react";
import { t } from "@/lib/i18n";
import { useNativeDialog } from "@/lib/useNativeDialog";
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
  const { dialogRef, closeDialog, handleDialogClose } = useNativeDialog(open, onClose);

  return (
    <dialog ref={dialogRef} className="shortcut-dialog" onClose={handleDialogClose} aria-labelledby="shortcut-title">
      <div className="shortcut-dialog-head">
        <h2 id="shortcut-title">{t("shortcuts", language)}</h2>
        <button
          type="button"
          className="control-button"
          onClick={closeDialog}
          aria-label={t("closeDialog", language)}
          data-dialog-initial-focus
        >
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
