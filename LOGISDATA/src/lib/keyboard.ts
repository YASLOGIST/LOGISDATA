const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[contenteditable='true']",
  "[role='button']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='slider']",
  "[role='switch']",
  "[role='tab']",
].join(", ");

interface ShortcutEventState {
  defaultPrevented: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  isComposing: boolean;
}

/**
 * Global presentation shortcuts must never steal keyboard input from a
 * focused control, an IME composition, or a modal dialog. In particular,
 * Space belongs to a focused button before it belongs to section navigation.
 */
export function shouldIgnorePresentationShortcut(
  event: ShortcutEventState,
  activeElement: Element | null,
  modalOpen: boolean,
): boolean {
  return event.defaultPrevented
    || event.altKey
    || event.ctrlKey
    || event.metaKey
    || event.isComposing
    || modalOpen
    || Boolean(activeElement?.closest(INTERACTIVE_SELECTOR));
}
