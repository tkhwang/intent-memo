// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  createDocument: vi.fn(),
  createFolder: vi.fn(),
  moveEntry: vi.fn(),
  readDocument: vi.fn(),
  renameDocument: vi.fn(),
  renameFolder: vi.fn(),
  saveDocument: vi.fn(),
  scanLibrary: vi.fn(),
  trashEntry: vi.fn(),
}));

vi.mock("@/lib/native", () => native);

import windowCapabilities from "../../src-tauri/capabilities/default.json";
import { runCloseBarrier, useLibraryWorkspace } from "./useLibraryWorkspace";

const content = (body: string) =>
  `---\ncreated: 2026-08-05T00:00:00.000Z\nupdated: 2026-08-05T00:00:00.000Z\n---\n${body}`;

const documents = [
  { path: "a.md", parent: "", title: "a", updatedMs: 1 },
  { path: "b.md", parent: "", title: "b", updatedMs: 1 },
  { path: "folder/c.md", parent: "folder", title: "c", updatedMs: 1 },
];

describe("useLibraryWorkspace tabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.scanLibrary.mockResolvedValue({
      folders: [{ path: "folder", parent: "", name: "folder" }],
      documents,
    });
    native.readDocument.mockImplementation((_root: string, path: string) =>
      Promise.resolve({ path, content: content(path), mtimeMs: 1 }),
    );
    native.saveDocument.mockImplementation(
      (_root: string, path: string, markdown: string) =>
        Promise.resolve({ path, content: markdown, mtimeMs: 2 }),
    );
    native.renameFolder.mockResolvedValue({ path: "renamed" });
  });

  it("keeps body, mode, and background save state independent per tab", async () => {
    const { result } = renderHook(() =>
      useLibraryWorkspace("/root", { defaultMode: "edit" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openDocument("a.md");
      await result.current.openDocument("b.md");
      await result.current.openDocument("folder/c.md");
    });
    act(() => {
      result.current.setActiveDocument("a.md");
      result.current.updateBody("changed A");
      result.current.setMode("view");
      result.current.setActiveDocument("b.md");
    });

    await waitFor(() =>
      expect(native.saveDocument).toHaveBeenCalledWith(
        "/root",
        "a.md",
        expect.stringContaining("changed A"),
        1,
      ),
    );
    expect(result.current.openDocuments.map((entry) => entry.path)).toEqual([
      "a.md",
      "b.md",
      "folder/c.md",
    ]);
    await waitFor(() =>
      expect(
        result.current.openDocuments.find((entry) => entry.path === "a.md"),
      ).toMatchObject({ body: "changed A", mode: "view", saveStatus: "saved" }),
    );
    expect(result.current.activeDocument).toMatchObject({
      path: "b.md",
      mode: "edit",
    });
  });

  it("blocks an aggregate transition when one dirty tab fails without dropping buffers", async () => {
    native.saveDocument.mockImplementation(
      (_root: string, path: string, markdown: string) =>
        path === "b.md"
          ? Promise.reject(new Error("conflict"))
          : Promise.resolve({ path, content: markdown, mtimeMs: 2 }),
    );
    const { result } = renderHook(() =>
      useLibraryWorkspace("/root", { defaultMode: "edit" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.openDocument("a.md");
      await result.current.openDocument("b.md");
    });
    act(() => {
      result.current.setActiveDocument("a.md");
      result.current.updateBody("buffer A");
      result.current.setActiveDocument("b.md");
      result.current.updateBody("buffer B");
    });

    await act(async () => {
      await expect(result.current.persistAllOpenDocuments()).resolves.toBe(
        false,
      );
    });

    expect(result.current.openDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "a.md", body: "buffer A" }),
        expect.objectContaining({
          path: "b.md",
          body: "buffer B",
          saveStatus: "error",
        }),
      ]),
    );
  });

  it("rebases open tab paths for folder rename and filters missing restore paths", async () => {
    const { result } = renderHook(() =>
      useLibraryWorkspace("/root", {
        defaultMode: "view",
        initialSession: {
          paths: ["missing.md", "folder/c.md", "a.md"],
          activePath: "folder/c.md",
        },
      }),
    );
    await waitFor(() =>
      expect(result.current.openDocuments.map((entry) => entry.path)).toEqual([
        "folder/c.md",
        "a.md",
      ]),
    );
    expect(result.current.activeDocument?.path).toBe("folder/c.md");

    await act(async () => {
      await result.current.renameFolderAt("folder", "renamed");
    });

    expect(result.current.openDocuments.map((entry) => entry.path)).toEqual([
      "renamed/c.md",
      "a.md",
    ]);
    expect(result.current.activeDocument?.path).toBe("renamed/c.md");
  });
});

describe("window close barrier", () => {
  it("grants the force-close command used after the save barrier", () => {
    expect(windowCapabilities.permissions).toContain(
      "core:window:allow-destroy",
    );
  });

  it("destroys the window only after every open document is saved", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);

    await expect(
      runCloseBarrier(() => Promise.resolve(false), destroy),
    ).resolves.toBe(false);
    expect(destroy).not.toHaveBeenCalled();

    await expect(
      runCloseBarrier(() => Promise.resolve(true), destroy),
    ).resolves.toBe(true);
    expect(destroy).toHaveBeenCalledOnce();
  });
});
