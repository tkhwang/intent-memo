import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseMarkdown,
  serializeMarkdown,
  withUpdatedBody,
} from "@/lib/markdown";
import {
  createDocument,
  createFolder,
  moveEntry,
  readDocument,
  renameDocument,
  renameFolder,
  saveDocument,
  scanLibrary,
  trashEntry,
} from "@/lib/native";
import type { LibrarySnapshot, OpenDocument } from "@/types/library";

const emptySnapshot: LibrarySnapshot = { folders: [], documents: [] };

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function useLibraryWorkspace(root: string) {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(emptySnapshot);
  const [selectedFolder, setSelectedFolderState] = useState("");
  const [activeDocument, setActiveDocument] = useState<OpenDocument | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const activeRef = useRef(activeDocument);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  activeRef.current = activeDocument;

  const refresh = useCallback(async () => {
    try {
      const next = await scanLibrary(root);
      setSnapshot(next);
      setSelectedFolderState((current) => {
        if (
          current === "" ||
          next.folders.some((folder) => folder.path === current)
        ) {
          return current;
        }
        return "";
      });
      setErrorMessage(null);
      return next;
    } catch (cause) {
      setErrorMessage(messageFrom(cause));
      return null;
    } finally {
      setLoading(false);
    }
  }, [root]);

  useEffect(() => {
    setSnapshot(emptySnapshot);
    setSelectedFolderState("");
    setActiveDocument(null);
    setLoading(true);
    dirtyRef.current = false;
    revisionRef.current = 0;
    setSaveStatus("idle");
    void refresh();
  }, [refresh]);

  const persistCurrent = useCallback(async (): Promise<boolean> => {
    if (savePromiseRef.current) {
      const previousSaved = await savePromiseRef.current;
      if (!previousSaved || !dirtyRef.current) return previousSaved;
    }

    const current = activeRef.current;
    if (!current || !dirtyRef.current) return true;
    const revision = revisionRef.current;
    const timestamp = new Date().toISOString();
    const markdown = withUpdatedBody(current, current.body, timestamp);
    setSaveStatus("saving");

    const savePromise = saveDocument(
      root,
      current.path,
      serializeMarkdown(markdown),
      current.mtimeMs,
    )
      .then((payload) => {
        const parsed = parseMarkdown(payload.content);
        setActiveDocument((latest) => {
          if (!latest || latest.path !== current.path) return latest;
          return {
            ...latest,
            created: parsed.created,
            updated: parsed.updated,
            mtimeMs: payload.mtimeMs,
          };
        });
        if (revisionRef.current === revision) {
          dirtyRef.current = false;
          setSaveStatus("saved");
        } else {
          setSaveStatus("dirty");
        }
        setErrorMessage(null);
        return true;
      })
      .catch((cause: unknown) => {
        setSaveStatus("error");
        setErrorMessage(messageFrom(cause));
        return false;
      })
      .finally(() => {
        savePromiseRef.current = null;
      });

    savePromiseRef.current = savePromise;
    return await savePromise;
  }, [root]);

  useEffect(() => {
    if (saveStatus !== "dirty") return;
    const timer = window.setTimeout(() => {
      void persistCurrent();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [persistCurrent, saveStatus]);

  const openDocument = useCallback(
    async (path: string) => {
      if (!(await persistCurrent())) return;
      try {
        const payload = await readDocument(root, path);
        const parsed = parseMarkdown(payload.content);
        const opened = toOpenDocument(payload.path, payload.mtimeMs, parsed);
        setActiveDocument(opened);
        activeRef.current = opened;
        dirtyRef.current = false;
        revisionRef.current += 1;
        setSaveStatus("idle");
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [persistCurrent, root],
  );

  const updateBody = useCallback((body: string) => {
    revisionRef.current += 1;
    dirtyRef.current = true;
    setSaveStatus("dirty");
    setActiveDocument((current) => (current ? { ...current, body } : current));
  }, []);

  const addDocument = useCallback(
    async (title: string) => {
      if (!(await persistCurrent())) return;
      const timestamp = new Date().toISOString();
      try {
        const payload = await createDocument(
          root,
          selectedFolder,
          title,
          serializeMarkdown({
            created: timestamp,
            updated: timestamp,
            body: "",
          }),
        );
        await refresh();
        const parsed = parseMarkdown(payload.content);
        const opened = toOpenDocument(payload.path, payload.mtimeMs, parsed);
        setActiveDocument(opened);
        activeRef.current = opened;
        dirtyRef.current = false;
        revisionRef.current += 1;
        setSaveStatus("idle");
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [persistCurrent, refresh, root, selectedFolder],
  );

  const addFolder = useCallback(
    async (name: string) => {
      try {
        await createFolder(root, selectedFolder, name);
        await refresh();
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [refresh, root, selectedFolder],
  );

  const renameActive = useCallback(
    async (title: string) => {
      const current = activeRef.current;
      if (!current) return;
      const timestamp = new Date().toISOString();
      try {
        const payload = await renameDocument(
          root,
          current.path,
          title,
          serializeMarkdown(withUpdatedBody(current, current.body, timestamp)),
          current.mtimeMs,
        );
        const parsed = parseMarkdown(payload.content);
        const opened = toOpenDocument(payload.path, payload.mtimeMs, parsed);
        setActiveDocument(opened);
        activeRef.current = opened;
        dirtyRef.current = false;
        revisionRef.current += 1;
        setSaveStatus("saved");
        await refresh();
        setErrorMessage(null);
      } catch (cause) {
        setSaveStatus("error");
        setErrorMessage(messageFrom(cause));
      }
    },
    [refresh, root],
  );

  const renameSelectedFolder = useCallback(
    async (name: string) => {
      if (selectedFolder === "" || !(await persistCurrent())) return;
      try {
        const mutation = await renameFolder(root, selectedFolder, name);
        const current = activeRef.current;
        setSelectedFolderState(mutation.path);
        await refresh();
        if (current && isWithin(current.path, selectedFolder)) {
          await openDocument(
            rebasePath(current.path, selectedFolder, mutation.path),
          );
        }
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [openDocument, persistCurrent, refresh, root, selectedFolder],
  );

  const moveActive = useCallback(
    async (destination: string) => {
      const current = activeRef.current;
      if (!current || !(await persistCurrent())) return;
      try {
        const mutation = await moveEntry(root, current.path, destination);
        await refresh();
        await openDocument(mutation.path);
        setSelectedFolderState(destination);
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [openDocument, persistCurrent, refresh, root],
  );

  const moveSelectedFolder = useCallback(
    async (destination: string) => {
      if (selectedFolder === "" || !(await persistCurrent())) return;
      try {
        const current = activeRef.current;
        const mutation = await moveEntry(root, selectedFolder, destination);
        await refresh();
        setSelectedFolderState(mutation.path);
        if (current && isWithin(current.path, selectedFolder)) {
          await openDocument(
            rebasePath(current.path, selectedFolder, mutation.path),
          );
        }
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [openDocument, persistCurrent, refresh, root, selectedFolder],
  );

  const removeActive = useCallback(async () => {
    const current = activeRef.current;
    if (!current) return;
    try {
      await trashEntry(root, current.path);
      setActiveDocument(null);
      activeRef.current = null;
      dirtyRef.current = false;
      setSaveStatus("idle");
      await refresh();
      setErrorMessage(null);
    } catch (cause) {
      setErrorMessage(messageFrom(cause));
    }
  }, [refresh, root]);

  const removeSelectedFolder = useCallback(async () => {
    if (selectedFolder === "") return;
    try {
      await trashEntry(root, selectedFolder);
      const current = activeRef.current;
      if (current && isWithin(current.path, selectedFolder)) {
        setActiveDocument(null);
        activeRef.current = null;
        dirtyRef.current = false;
        setSaveStatus("idle");
      }
      setSelectedFolderState("");
      await refresh();
      setErrorMessage(null);
    } catch (cause) {
      setErrorMessage(messageFrom(cause));
    }
  }, [refresh, root, selectedFolder]);

  const setSelectedFolder = useCallback((path: string) => {
    setSelectedFolderState(path);
  }, []);

  const visibleDocuments = useMemo(
    () =>
      snapshot.documents.filter(
        (document) => document.parent === selectedFolder,
      ),
    [selectedFolder, snapshot.documents],
  );

  return {
    snapshot,
    visibleDocuments,
    selectedFolder,
    activeDocument,
    loading,
    errorMessage,
    saveStatus,
    setSelectedFolder,
    openDocument,
    updateBody,
    addDocument,
    addFolder,
    renameActive,
    renameSelectedFolder,
    moveActive,
    moveSelectedFolder,
    removeActive,
    removeSelectedFolder,
    persistCurrent,
    clearError: () => setErrorMessage(null),
  };
}

function toOpenDocument(
  path: string,
  mtimeMs: number,
  document: ReturnType<typeof parseMarkdown>,
): OpenDocument {
  return {
    path,
    title: titleFromPath(path),
    created: document.created,
    updated: document.updated,
    body: document.body,
    mtimeMs,
  };
}

function titleFromPath(path: string): string {
  const fileName = path.split("/").at(-1) ?? path;
  return fileName.endsWith(".md") ? fileName.slice(0, -3) : fileName;
}

function isWithin(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`);
}

function rebasePath(path: string, from: string, to: string): string {
  if (path === from) return to;
  return `${to}${path.slice(from.length)}`;
}

function messageFrom(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string") return cause;
  return "알 수 없는 파일시스템 오류가 발생했습니다.";
}
