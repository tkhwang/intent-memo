import { beforeEach, describe, expect, it, vi } from "vitest";

const storedValues = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    get(key: string) {
      return Promise.resolve(storedValues.get(key));
    }

    set(key: string, value: unknown) {
      storedValues.set(key, value);
      return Promise.resolve();
    }

    save() {
      return Promise.resolve();
    }
  },
}));

import { loadSettings, nextPaneLayout, saveSettings } from "./settings";

describe("settings", () => {
  beforeEach(() => storedValues.clear());

  it("loads a v0.1 store into the Intent space without moving its library", async () => {
    storedValues.set("libraryRoot", "/memo/intent");
    storedValues.set("folderPaneOpen", false);
    storedValues.set("listPaneOpen", true);

    await expect(loadSettings()).resolves.toEqual({
      libraryRoot: "/memo/intent",
      docsRoot: null,
      activeSpace: "intent",
      folderPaneOpen: false,
      listPaneOpen: true,
      tabSessions: {
        intent: { paths: [], activePath: null },
        docs: { paths: [], activePath: null },
      },
    });
  });

  it("round-trips the independent Docs root and active space", async () => {
    await saveSettings({
      libraryRoot: "/memo/intent",
      docsRoot: "/memo/docs",
      activeSpace: "docs",
      folderPaneOpen: true,
      listPaneOpen: false,
      tabSessions: {
        intent: { paths: ["purpose.md"], activePath: "purpose.md" },
        docs: { paths: ["reference.md"], activePath: "reference.md" },
      },
    });

    await expect(loadSettings()).resolves.toEqual({
      libraryRoot: "/memo/intent",
      docsRoot: "/memo/docs",
      activeSpace: "docs",
      folderPaneOpen: true,
      listPaneOpen: false,
      tabSessions: {
        intent: { paths: ["purpose.md"], activePath: "purpose.md" },
        docs: { paths: ["reference.md"], activePath: "reference.md" },
      },
    });
  });

  it("cycles full to compact to focus and back to full", () => {
    // Given: each valid pane layout state.
    const full = { folderPaneOpen: true, listPaneOpen: true };
    const compact = { folderPaneOpen: false, listPaneOpen: true };
    const focus = { folderPaneOpen: false, listPaneOpen: false };

    // When / Then: one action advances to the next visible layout.
    expect(nextPaneLayout(full)).toEqual(compact);
    expect(nextPaneLayout(compact)).toEqual(focus);
    expect(nextPaneLayout(focus)).toEqual(full);
  });
});
