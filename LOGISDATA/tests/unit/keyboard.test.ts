import { describe, expect, it } from "vitest";
import { shouldIgnorePresentationShortcut } from "@/lib/keyboard";

const event = (overrides: Partial<Parameters<typeof shouldIgnorePresentationShortcut>[0]> = {}) => ({
  defaultPrevented: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  isComposing: false,
  ...overrides,
});

describe("presentation keyboard boundary", () => {
  it.each([
    "button",
    "a",
    "input",
    "select",
    "textarea",
    "[contenteditable]",
    "[role='radio']",
  ])("protects focused interactive target %s", (selector) => {
    document.body.innerHTML = `
      <button><span>Button child</span></button>
      <a href="/handout">Link</a>
      <input>
      <select><option>One</option></select>
      <textarea></textarea>
      <div contenteditable="true"></div>
      <div role="radio" tabindex="0"></div>
    `;
    const target = selector === "button"
      ? document.querySelector("button span")
      : document.querySelector(selector);
    expect(shouldIgnorePresentationShortcut(event(), target, false)).toBe(true);
  });

  it("protects native modal, handled, modified, and composing events", () => {
    expect(shouldIgnorePresentationShortcut(event(), document.body, true)).toBe(true);
    expect(shouldIgnorePresentationShortcut(event({ defaultPrevented: true }), document.body, false)).toBe(true);
    expect(shouldIgnorePresentationShortcut(event({ altKey: true }), document.body, false)).toBe(true);
    expect(shouldIgnorePresentationShortcut(event({ ctrlKey: true }), document.body, false)).toBe(true);
    expect(shouldIgnorePresentationShortcut(event({ metaKey: true }), document.body, false)).toBe(true);
    expect(shouldIgnorePresentationShortcut(event({ isComposing: true }), document.body, false)).toBe(true);
  });

  it("allows unmodified shortcuts from the document surface", () => {
    expect(shouldIgnorePresentationShortcut(event(), document.body, false)).toBe(false);
  });
});
