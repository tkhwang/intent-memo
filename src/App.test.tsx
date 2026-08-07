// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SaveStatus,
  useLibraryWorkspace,
  WorkspaceDocument,
} from "@/hooks/useLibraryWorkspace";
import type { EditorMode } from "@/types/library";

type WorkspaceState = ReturnType<typeof useLibraryWorkspace>;
type MediaListener = () => void;
type MediaQueryListState = {
  readonly registrations: Map<MediaListener, number>;
  readonly removals: Map<MediaListener, number>;
};

const testState = vi.hoisted(() => {
  const openDocuments: WorkspaceDocument[] = [];
  const activePath: string | null = null;
  const activeDocument: WorkspaceDocument | null = null;
  const saveStatus: SaveStatus = "idle";

  const workspace: WorkspaceState = {
    snapshot: {
      folders: [
        { path: "projects", parent: "", name: "projects" },
        {
          path: "projects/current",
          parent: "projects",
          name: "current",
        },
        {
          path: "projects/current/child",
          parent: "projects/current",
          name: "child",
        },
        {
          path: "projects/sibling",
          parent: "projects",
          name: "sibling",
        },
        { path: "other", parent: "", name: "other" },
      ],
      documents: [],
    },
    visibleDocuments: [],
    visibleSnippets: new Map<string, string>(),
    selectedFolder: "",
    openDocuments,
    activePath,
    activeDocument,
    loading: false,
    errorMessage: null,
    saveStatus,
    setSelectedFolder: vi.fn(),
    setActiveDocument: vi.fn(),
    openDocument: vi.fn(),
    closeDocument: vi.fn(),
    updateBody: vi.fn(),
    setMode: vi.fn(),
    addDocument: vi.fn(),
    addFolder: vi.fn(),
    renameActive: vi.fn(),
    renameFolderAt: vi.fn(),
    moveActive: vi.fn(),
    moveFolderAt: vi.fn(),
    removeActive: vi.fn(),
    removeFolderAt: vi.fn(),
    persistCurrent: vi.fn(),
    persistAllOpenDocuments: vi.fn(),
    clearError: vi.fn(),
  };

  return {
    settings: {
      libraryRoot: "/intent" as string | null,
      docsRoot: "/docs" as string | null,
      activeSpace: "intent",
      folderPaneOpen: true,
      listPaneOpen: true,
      theme: "light" as "light" | "charcoal" | "dark" | "system",
      tabSessions: {
        intent: { paths: [], activePath: null },
        docs: { paths: [], activePath: null },
      },
    },
    workspace,
  };
});

const dialog = vi.hoisted(() => ({
  confirm: vi.fn(),
  open: vi.fn(),
}));

const mediaState = vi.hoisted(() => {
  const lists: MediaQueryListState[] = [];
  return {
    matches: false,
    lists,
  };
});

function setWorkspaceMode(mode: EditorMode): void {
  const activeDocument = testState.workspace.activeDocument;
  if (!activeDocument) throw new TypeError("Active document is required");
  const nextDocument = { ...activeDocument, mode };
  testState.workspace.activeDocument = nextDocument;
  testState.workspace.openDocuments = [nextDocument];
}

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    destroy: vi.fn(),
    onCloseRequested: vi.fn().mockResolvedValue(vi.fn()),
  }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => dialog);

vi.mock("@/hooks/useLibraryWorkspace", () => ({
  runCloseBarrier: vi.fn(),
  useLibraryWorkspace: () => testState.workspace,
}));

vi.mock("@/lib/settings", () => ({
  loadSettings: vi.fn(() => Promise.resolve(testState.settings)),
  nextPaneLayout: vi.fn(),
  saveSettings: vi.fn(),
}));

import { saveSettings } from "@/lib/settings";
import { App } from "./App";

afterEach(cleanup);

beforeEach(() => {
  testState.settings.libraryRoot = "/intent";
  testState.settings.docsRoot = "/docs";
  testState.settings.theme = "light";
  testState.settings.activeSpace = "intent";
  testState.settings.folderPaneOpen = true;
  testState.settings.listPaneOpen = true;
  testState.workspace.openDocuments = [];
  testState.workspace.activePath = null;
  testState.workspace.activeDocument = null;
  testState.workspace.saveStatus = "idle";
  mediaState.matches = false;
  mediaState.lists.length = 0;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => {
      const list: MediaQueryListState = {
        registrations: new Map<MediaListener, number>(),
        removals: new Map<MediaListener, number>(),
      };
      mediaState.lists.push(list);
      return {
        get matches() {
          return mediaState.matches;
        },
        addEventListener: vi.fn((_: string, listener: MediaListener) => {
          list.registrations.set(
            listener,
            (list.registrations.get(listener) ?? 0) + 1,
          );
        }),
        removeEventListener: vi.fn((_: string, listener: MediaListener) => {
          list.removals.set(listener, (list.removals.get(listener) ?? 0) + 1);
        }),
      };
    }),
  });
});

describe("root selection onboarding", () => {
  it("lets the user choose either space before a root is configured", async () => {
    // Given: a first launch with no Human or AI root.
    testState.settings.libraryRoot = null;
    testState.settings.docsRoot = null;
    const user = userEvent.setup();

    // When: the user switches from the default Human setup to AI.
    render(<App />);
    await user.click(
      await screen.findByRole("radio", {
        name: /AI/,
      }),
    );

    // Then: AI asks for its own folder and neither root is invented.
    expect(
      await screen.findByRole("button", { name: "AI folder 선택" }),
    ).toBeDefined();
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        activeSpace: "docs",
        libraryRoot: null,
        docsRoot: null,
      }),
    );
  });
});

describe("runtime theme", () => {
  it.each([
    "light",
    "charcoal",
    "dark",
  ] as const)("applies the %s theme to the document", async (theme) => {
    testState.settings.theme = theme;

    render(<App />);

    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe(theme),
    );
  });

  it("tracks OS preference changes for the system theme", async () => {
    testState.settings.theme = "system";
    const { unmount } = render(<App />);

    await waitFor(() =>
      expect(
        mediaState.lists.map((list) => [...list.registrations.values()]),
      ).toEqual([[1], [1]]),
    );
    expect(document.documentElement.dataset.theme).toBe("light");
    mediaState.matches = true;
    for (const list of mediaState.lists) {
      for (const [listener, registrations] of list.registrations) {
        if (registrations > (list.removals.get(listener) ?? 0)) listener();
      }
    }
    expect(document.documentElement.dataset.theme).toBe("dark");

    expect(mediaState.lists.map((list) => [...list.removals.values()])).toEqual(
      [[1], []],
    );
    unmount();
    expect(mediaState.lists.map((list) => [...list.removals.values()])).toEqual(
      [[1], [1]],
    );
  });
});

describe("folder move destinations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes the current parent, self, and descendants while preserving other folders", async () => {
    const user = userEvent.setup();
    render(<App />);
    const currentFolder = await screen.findByRole("button", {
      name: "current",
    });

    fireEvent.contextMenu(currentFolder);
    await user.click(screen.getByRole("menuitem", { name: "Move…" }));

    expect(screen.queryByRole("option", { name: "projects" })).toBeNull();
    expect(screen.queryByRole("option", { name: "current" })).toBeNull();
    expect(screen.queryByRole("option", { name: "child" })).toBeNull();
    expect(screen.getByRole("option", { name: "intent" })).toBeDefined();
    expect(screen.getByRole("option", { name: "sibling" })).toBeDefined();
    expect(screen.getByRole("option", { name: "other" })).toBeDefined();
  });
});

describe("content toolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.settings.activeSpace = "intent";
    testState.settings.folderPaneOpen = true;
    testState.settings.listPaneOpen = true;
    const document = {
      path: "hybrid.md",
      title: "hybrid",
      created: "2026-08-07T00:00:00.000Z",
      updated: "2026-08-07T00:00:00.000Z",
      body: "Human intent",
      mtimeMs: 1,
      mode: "edit" as const,
      saveStatus: "saved" as const,
    };
    testState.workspace.openDocuments = [document];
    testState.workspace.activePath = document.path;
    testState.workspace.activeDocument = document;
    testState.workspace.saveStatus = "saved";
  });

  it("keeps the pane control before tabs and cycles mode from the far right", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const modeButton = await screen.findByRole("button", {
      name: "현재 Edit · 클릭하면 View",
    });
    const tab = screen.getByRole("tab", { name: "hybrid" });
    const closeButton = screen.getByRole("button", { name: "hybrid tab 닫기" });
    const tabBar = container.querySelector(".tab-bar");
    const actions = container.querySelector(".tab-bar-actions");
    const leading = container.querySelector(".tab-bar-leading");
    const layoutButton = screen.getByRole("button", {
      name: "현재 3-pane · 클릭하면 folder pane 닫기",
    });

    expect(tabBar).not.toBeNull();
    expect(leading?.parentElement).toBe(tabBar);
    expect(leading?.nextElementSibling?.classList.contains("tab-list")).toBe(
      true,
    );
    expect(layoutButton.parentElement).toBe(leading);
    expect(actions?.parentElement).toBe(tabBar);
    expect(actions?.lastElementChild).toBe(modeButton);
    expect(actions?.children).toHaveLength(1);
    expect(leading?.children).toHaveLength(1);
    expect(layoutButton.classList.contains("header-cycle-button")).toBe(true);
    expect(modeButton.classList.contains("header-cycle-button")).toBe(true);
    expect(actions?.querySelector(".save-status")).toBeNull();
    expect(tab.parentElement?.getAttribute("role")).toBe("presentation");
    expect(closeButton.parentElement).toBe(tab.parentElement);
    expect(layoutButton.textContent).toBe("");
    expect(modeButton.textContent).toBe("");
    expect(tabBar?.querySelector(".space-switcher-compact")).toBeNull();
    expect(
      container.querySelector(".window-titlebar-service")?.textContent,
    ).toBe("Intent Memo");
    expect(
      container.querySelector(".window-titlebar-document")?.textContent,
    ).toBe("hybrid");

    await user.click(modeButton);
    expect(testState.workspace.setMode).toHaveBeenCalledWith("view");
  });

  it("shows save status only while the document needs attention", async () => {
    // Given: the active document is being saved.
    testState.workspace.saveStatus = "saving";

    // When: the content toolbar renders.
    const { container } = render(<App />);
    await screen.findByRole("button", {
      name: "현재 Edit · 클릭하면 View",
    });

    // Then: the transient status remains visible outside the fixed cycle cell.
    expect(container.querySelector(".save-status")?.textContent).toBe(
      "저장 중",
    );
  });

  it("does not add space or root labels when navigation panes are hidden", async () => {
    testState.settings.folderPaneOpen = false;
    testState.settings.listPaneOpen = false;
    const { container } = render(<App />);

    await screen.findByRole("button", { name: "현재 Edit · 클릭하면 View" });
    expect(container.querySelector(".active-root")).toBeNull();
    expect(container.querySelector(".space-switcher-compact")).toBeNull();
  });

  it.each([
    {
      mode: "view",
      label: "현재 View · 클릭하면 Edit | View 분할",
      next: "split",
    },
    {
      mode: "split",
      label: "현재 Edit | View 분할 · 클릭하면 Edit",
      next: "edit",
    },
  ] satisfies readonly {
    readonly mode: EditorMode;
    readonly label: string;
    readonly next: EditorMode;
  }[])("cycles $mode mode to $next", async ({ mode, label, next }) => {
    const user = userEvent.setup();
    setWorkspaceMode(mode);
    render(<App />);

    await user.click(await screen.findByRole("button", { name: label }));
    expect(testState.workspace.setMode).toHaveBeenCalledWith(next);
  });

  it("renders editor and view as two columns in split mode", async () => {
    setWorkspaceMode("split");
    const { container } = render(<App />);

    await screen.findByLabelText("Markdown 본문");
    expect(
      container.querySelector(".document-surface.is-split"),
    ).not.toBeNull();
    expect(container.querySelector(".editor-surface")).not.toBeNull();
    expect(container.querySelector(".markdown-view")?.textContent).toContain(
      "Human intent",
    );
  });
});

describe("pane navigation contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows one switcher without a root row in two-pane mode and switches after saving", async () => {
    // Given: the document list is visible while the folder pane is collapsed.
    testState.settings.folderPaneOpen = false;
    testState.settings.listPaneOpen = true;
    const calls: string[] = [];
    vi.mocked(testState.workspace.persistAllOpenDocuments).mockImplementation(
      async () => {
        calls.push("persist");
        return true;
      },
    );
    vi.mocked(saveSettings).mockImplementation(async () => {
      calls.push("settings");
    });
    const user = userEvent.setup();
    const { container } = render(<App />);

    // When: the user switches from Human to AI.
    const switcher = await screen.findByRole("radiogroup", {
      name: "공간 선택",
    });
    await user.click(screen.getByRole("radio", { name: /AI/ }));

    // Then: the fallback stays navigation-only and saves before switching.
    expect(
      screen.getAllByRole("radiogroup", { name: "공간 선택" }),
    ).toHaveLength(1);
    expect(switcher.closest(".list-pane")).not.toBeNull();
    expect(container.querySelector(".list-pane .root-row")).toBeNull();
    expect(screen.queryByText("⌘1")).toBeNull();
    await waitFor(() => expect(calls).toEqual(["persist", "settings"]));
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ activeSpace: "docs" }),
    );
  });

  it("keeps the current space when saving fails in two-pane mode", async () => {
    // Given: the document list is visible and open documents cannot be saved.
    testState.settings.folderPaneOpen = false;
    testState.settings.listPaneOpen = true;
    vi.mocked(testState.workspace.persistAllOpenDocuments).mockResolvedValue(
      false,
    );
    const user = userEvent.setup();
    render(<App />);

    // When: the user requests the AI space.
    await user.click(
      await screen.findByRole("radio", {
        name: /AI/,
      }),
    );

    // Then: the save barrier blocks the settings transition.
    await waitFor(() =>
      expect(
        testState.workspace.persistAllOpenDocuments,
      ).toHaveBeenCalledOnce(),
    );
    expect(saveSettings).not.toHaveBeenCalled();
    expect(
      screen.getByRole<HTMLInputElement>("radio", { name: /Human/ }).checked,
    ).toBe(true);
  });

  it("keeps one switcher and the root row in three-pane mode", async () => {
    // Given: both navigation panes are visible.
    testState.settings.folderPaneOpen = true;
    testState.settings.listPaneOpen = true;
    const { container } = render(<App />);

    // When: the workspace finishes rendering.
    await screen.findByRole("radiogroup", { name: "공간 선택" });

    // Then: the folder pane owns the sole switcher and active root row.
    expect(
      screen.getAllByRole("radiogroup", { name: "공간 선택" }),
    ).toHaveLength(1);
    expect(container.querySelector(".folder-pane .root-row")).not.toBeNull();
  });

  it("hides switcher and root controls in content-only mode", async () => {
    // Given: both navigation panes are collapsed.
    testState.settings.folderPaneOpen = false;
    testState.settings.listPaneOpen = false;
    const { container } = render(<App />);

    // When: the content-only workspace finishes rendering.
    await screen.findByRole("button", {
      name: "현재 content-only · 클릭하면 3-pane 열기",
    });

    // Then: navigation controls are not repeated in the content pane.
    expect(
      screen.queryAllByRole("radiogroup", { name: "공간 선택" }),
    ).toHaveLength(0);
    expect(container.querySelector(".root-row")).toBeNull();
  });
});

describe("folder Trash persistence barrier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dialog.confirm.mockResolvedValue(true);
  });

  it("persists open documents before trashing an approved folder", async () => {
    const calls: string[] = [];
    vi.mocked(testState.workspace.persistAllOpenDocuments).mockImplementation(
      async () => {
        calls.push("persist");
        return true;
      },
    );
    vi.mocked(testState.workspace.removeFolderAt).mockImplementation(
      async () => {
        calls.push("remove");
      },
    );
    const user = userEvent.setup();
    render(<App />);
    const currentFolder = await screen.findByRole("button", {
      name: "current",
    });

    fireEvent.contextMenu(currentFolder);
    await user.click(screen.getByRole("menuitem", { name: "Move to Trash" }));

    await waitFor(() => expect(calls).toEqual(["persist", "remove"]));
    expect(testState.workspace.removeFolderAt).toHaveBeenCalledWith(
      "projects/current",
    );
    expect(document.activeElement).toBe(currentFolder);
  });

  it("keeps the folder when persisting an open document fails", async () => {
    vi.mocked(testState.workspace.persistAllOpenDocuments).mockResolvedValue(
      false,
    );
    const user = userEvent.setup();
    render(<App />);
    const currentFolder = await screen.findByRole("button", {
      name: "current",
    });

    fireEvent.contextMenu(currentFolder);
    await user.click(screen.getByRole("menuitem", { name: "Move to Trash" }));

    await waitFor(() =>
      expect(
        testState.workspace.persistAllOpenDocuments,
      ).toHaveBeenCalledOnce(),
    );
    expect(testState.workspace.removeFolderAt).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(currentFolder);
  });
});
