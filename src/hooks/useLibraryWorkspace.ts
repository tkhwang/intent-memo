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
import type {
  EditorMode,
  LibrarySnapshot,
  OpenDocument,
  TabSession,
} from "@/types/library";

const emptySnapshot: LibrarySnapshot = { folders: [], documents: [] };

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type WorkspaceDocument = OpenDocument & {
  readonly mode: EditorMode;
  readonly saveStatus: SaveStatus;
};

type InternalDocument = WorkspaceDocument & {
  readonly dirty: boolean;
  readonly revision: number;
};

type WorkspaceOptions = {
  readonly defaultMode: EditorMode;
  readonly initialSession?: TabSession;
  readonly onSessionChange?: (session: TabSession) => void;
};

const defaultSession: TabSession = { paths: [], activePath: null };

export async function runCloseBarrier(
  persistAll: () => Promise<boolean>,
  destroyWindow: () => Promise<void>,
): Promise<boolean> {
  if (!(await persistAll())) return false;
  await destroyWindow();
  return true;
}

export function useLibraryWorkspace(
  root: string,
  options: WorkspaceOptions = { defaultMode: "edit" },
) {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(emptySnapshot);
  const [selectedFolder, setSelectedFolderState] = useState("");
  const [documents, setDocuments] = useState<Map<string, InternalDocument>>(
    new Map(),
  );
  const [activePath, setActivePathState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const documentsRef = useRef(documents);
  const activePathRef = useRef(activePath);
  const savePromisesRef = useRef(new Map<string, Promise<boolean>>());
  const defaultModeRef = useRef(options.defaultMode);
  const initialSessionRef = useRef(options.initialSession ?? defaultSession);
  const onSessionChangeRef = useRef(options.onSessionChange);
  onSessionChangeRef.current = options.onSessionChange;

  const commitDocuments = useCallback((next: Map<string, InternalDocument>) => {
    documentsRef.current = next;
    setDocuments(next);
  }, []);

  const setActivePath = useCallback((path: string | null) => {
    activePathRef.current = path;
    setActivePathState(path);
  }, []);

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
    }
  }, [root]);

  useEffect(() => {
    let cancelled = false;
    setSnapshot(emptySnapshot);
    setSelectedFolderState("");
    commitDocuments(new Map());
    setActivePath(null);
    setLoading(true);
    setErrorMessage(null);
    savePromisesRef.current.clear();

    const restore = async () => {
      const nextSnapshot = await refresh();
      if (!nextSnapshot || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      const existingPaths = new Set(
        nextSnapshot.documents.map((document) => document.path),
      );
      const paths = initialSessionRef.current.paths.filter((path) =>
        existingPaths.has(path),
      );
      const restored = await Promise.all(
        paths.map(async (path) => {
          try {
            const payload = await readDocument(root, path);
            return toInternalDocument(
              payload.path,
              payload.mtimeMs,
              parseMarkdown(payload.content),
              defaultModeRef.current,
            );
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const nextDocuments = new Map<string, InternalDocument>();
      for (const document of restored) {
        if (document) nextDocuments.set(document.path, document);
      }
      commitDocuments(nextDocuments);
      const requestedActive = initialSessionRef.current.activePath;
      setActivePath(
        requestedActive && nextDocuments.has(requestedActive)
          ? requestedActive
          : (nextDocuments.keys().next().value ?? null),
      );
      setLoading(false);
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [commitDocuments, refresh, root, setActivePath]);

  useEffect(() => {
    if (loading) return;
    onSessionChangeRef.current?.({
      paths: [...documents.keys()],
      activePath,
    });
  }, [activePath, documents, loading]);

  const updateDocument = useCallback(
    (path: string, update: (current: InternalDocument) => InternalDocument) => {
      const current = documentsRef.current.get(path);
      if (!current) return;
      const next = new Map(documentsRef.current);
      next.set(path, update(current));
      commitDocuments(next);
    },
    [commitDocuments],
  );

  const persistDocument = useCallback(
    async (path: string): Promise<boolean> => {
      const pending = savePromisesRef.current.get(path);
      if (pending) {
        const saved = await pending;
        const latest = documentsRef.current.get(path);
        if (!saved || !latest?.dirty) return saved;
      }

      const current = documentsRef.current.get(path);
      if (!current || !current.dirty) return true;
      const timestamp = new Date().toISOString();
      const markdown = withUpdatedBody(current, current.body, timestamp);
      updateDocument(path, (latest) => ({ ...latest, saveStatus: "saving" }));

      const savePromise = saveDocument(
        root,
        path,
        serializeMarkdown(markdown),
        current.mtimeMs,
      )
        .then((payload) => {
          const parsed = parseMarkdown(payload.content);
          updateDocument(path, (latest) => {
            const unchanged = latest.revision === current.revision;
            return {
              ...latest,
              created: parsed.created,
              updated: parsed.updated,
              mtimeMs: payload.mtimeMs,
              dirty: !unchanged,
              saveStatus: unchanged ? "saved" : "dirty",
            };
          });
          setErrorMessage(null);
          return true;
        })
        .catch((cause: unknown) => {
          updateDocument(path, (latest) => ({
            ...latest,
            saveStatus: "error",
          }));
          setErrorMessage(messageFrom(cause));
          return false;
        })
        .finally(() => {
          if (savePromisesRef.current.get(path) === savePromise) {
            savePromisesRef.current.delete(path);
          }
        });

      savePromisesRef.current.set(path, savePromise);
      return await savePromise;
    },
    [root, updateDocument],
  );

  const persistAllOpenDocuments = useCallback(async (): Promise<boolean> => {
    const paths = [...documentsRef.current.keys()];
    const results = await Promise.all(paths.map(persistDocument));
    return results.every(Boolean);
  }, [persistDocument]);

  useEffect(() => {
    const dirtyPaths = [...documents.values()]
      .filter((document) => document.dirty && document.saveStatus === "dirty")
      .map((document) => document.path);
    if (dirtyPaths.length === 0) return;
    const timer = window.setTimeout(() => {
      for (const path of dirtyPaths) void persistDocument(path);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [documents, persistDocument]);

  const setActiveDocument = useCallback(
    (path: string) => {
      if (!documentsRef.current.has(path) || activePathRef.current === path)
        return;
      const previous = activePathRef.current;
      setActivePath(path);
      if (previous) void persistDocument(previous);
    },
    [persistDocument, setActivePath],
  );

  const openDocument = useCallback(
    async (path: string) => {
      if (documentsRef.current.has(path)) {
        setActiveDocument(path);
        return true;
      }
      try {
        const payload = await readDocument(root, path);
        const opened = toInternalDocument(
          payload.path,
          payload.mtimeMs,
          parseMarkdown(payload.content),
          defaultModeRef.current,
        );
        const next = new Map(documentsRef.current);
        next.set(opened.path, opened);
        commitDocuments(next);
        const previous = activePathRef.current;
        setActivePath(opened.path);
        if (previous) void persistDocument(previous);
        setErrorMessage(null);
        return true;
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
        return false;
      }
    },
    [commitDocuments, persistDocument, root, setActiveDocument, setActivePath],
  );

  const closeDocument = useCallback(
    async (path: string): Promise<boolean> => {
      if (!(await persistDocument(path))) return false;
      const paths = [...documentsRef.current.keys()];
      const index = paths.indexOf(path);
      const next = new Map(documentsRef.current);
      next.delete(path);
      commitDocuments(next);
      if (activePathRef.current === path) {
        setActivePath(paths[index + 1] ?? paths[index - 1] ?? null);
      }
      return true;
    },
    [commitDocuments, persistDocument, setActivePath],
  );

  const updateBody = useCallback(
    (body: string) => {
      const path = activePathRef.current;
      if (!path) return;
      updateDocument(path, (current) => ({
        ...current,
        body,
        dirty: true,
        revision: current.revision + 1,
        saveStatus: "dirty",
      }));
    },
    [updateDocument],
  );

  const setMode = useCallback(
    (mode: EditorMode) => {
      const path = activePathRef.current;
      if (!path) return;
      updateDocument(path, (current) => ({ ...current, mode }));
    },
    [updateDocument],
  );

  const addDocument = useCallback(
    async (title: string) => {
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
        const opened = toInternalDocument(
          payload.path,
          payload.mtimeMs,
          parseMarkdown(payload.content),
          defaultModeRef.current,
        );
        const next = new Map(documentsRef.current);
        next.set(opened.path, opened);
        commitDocuments(next);
        const previous = activePathRef.current;
        setActivePath(opened.path);
        if (previous) void persistDocument(previous);
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [
      commitDocuments,
      persistDocument,
      refresh,
      root,
      selectedFolder,
      setActivePath,
    ],
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
      const path = activePathRef.current;
      if (!path || !(await persistDocument(path))) return;
      const current = documentsRef.current.get(path);
      if (!current) return;
      const timestamp = new Date().toISOString();
      try {
        const payload = await renameDocument(
          root,
          path,
          title,
          serializeMarkdown(withUpdatedBody(current, current.body, timestamp)),
          current.mtimeMs,
        );
        const renamed = {
          ...toInternalDocument(
            payload.path,
            payload.mtimeMs,
            parseMarkdown(payload.content),
            current.mode,
          ),
          saveStatus: "saved" as const,
        };
        replaceDocumentPath(
          path,
          renamed,
          documentsRef.current,
          commitDocuments,
        );
        setActivePath(renamed.path);
        await refresh();
        setErrorMessage(null);
      } catch (cause) {
        updateDocument(path, (latest) => ({ ...latest, saveStatus: "error" }));
        setErrorMessage(messageFrom(cause));
      }
    },
    [
      commitDocuments,
      persistDocument,
      refresh,
      root,
      setActivePath,
      updateDocument,
    ],
  );

  const renameFolderAt = useCallback(
    async (path: string, name: string) => {
      if (path === "" || !(await persistAllOpenDocuments())) return;
      try {
        const mutation = await renameFolder(root, path, name);
        rebaseDocuments(
          path,
          mutation.path,
          documentsRef.current,
          commitDocuments,
        );
        setSelectedFolderState(mutation.path);
        if (activePathRef.current && isWithin(activePathRef.current, path)) {
          setActivePath(rebasePath(activePathRef.current, path, mutation.path));
        }
        await refresh();
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [commitDocuments, persistAllOpenDocuments, refresh, root, setActivePath],
  );

  const moveActive = useCallback(
    async (destination: string) => {
      const path = activePathRef.current;
      if (!path || !(await persistDocument(path))) return;
      try {
        const mutation = await moveEntry(root, path, destination);
        const current = documentsRef.current.get(path);
        if (current) {
          replaceDocumentPath(
            path,
            { ...current, path: mutation.path },
            documentsRef.current,
            commitDocuments,
          );
          setActivePath(mutation.path);
        }
        setSelectedFolderState(destination);
        await refresh();
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [commitDocuments, persistDocument, refresh, root, setActivePath],
  );

  const moveFolderAt = useCallback(
    async (path: string, destination: string) => {
      if (path === "" || !(await persistAllOpenDocuments())) return;
      try {
        const mutation = await moveEntry(root, path, destination);
        rebaseDocuments(
          path,
          mutation.path,
          documentsRef.current,
          commitDocuments,
        );
        if (activePathRef.current && isWithin(activePathRef.current, path)) {
          setActivePath(rebasePath(activePathRef.current, path, mutation.path));
        }
        setSelectedFolderState(mutation.path);
        await refresh();
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [commitDocuments, persistAllOpenDocuments, refresh, root, setActivePath],
  );

  const removeActive = useCallback(async () => {
    const path = activePathRef.current;
    if (!path) return;
    try {
      await trashEntry(root, path);
      const paths = [...documentsRef.current.keys()];
      const index = paths.indexOf(path);
      const next = new Map(documentsRef.current);
      next.delete(path);
      commitDocuments(next);
      setActivePath(paths[index + 1] ?? paths[index - 1] ?? null);
      await refresh();
      setErrorMessage(null);
    } catch (cause) {
      setErrorMessage(messageFrom(cause));
    }
  }, [commitDocuments, refresh, root, setActivePath]);

  const removeFolderAt = useCallback(
    async (path: string) => {
      if (path === "") return;
      try {
        await trashEntry(root, path);
        const next = new Map(
          [...documentsRef.current].filter(
            ([documentPath]) => !isWithin(documentPath, path),
          ),
        );
        commitDocuments(next);
        if (activePathRef.current && isWithin(activePathRef.current, path)) {
          setActivePath(next.keys().next().value ?? null);
        }
        setSelectedFolderState("");
        await refresh();
        setErrorMessage(null);
      } catch (cause) {
        setErrorMessage(messageFrom(cause));
      }
    },
    [commitDocuments, refresh, root, setActivePath],
  );

  const openDocuments = useMemo<readonly WorkspaceDocument[]>(
    () =>
      [...documents.values()].map(({ dirty, revision, ...document }) => {
        void dirty;
        void revision;
        return document;
      }),
    [documents],
  );
  const activeDocument = activePath
    ? (openDocuments.find((document) => document.path === activePath) ?? null)
    : null;
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
    openDocuments,
    activePath,
    activeDocument,
    loading,
    errorMessage,
    saveStatus: activeDocument?.saveStatus ?? "idle",
    setSelectedFolder: setSelectedFolderState,
    setActiveDocument,
    openDocument,
    closeDocument,
    updateBody,
    setMode,
    addDocument,
    addFolder,
    renameActive,
    renameFolderAt,
    moveActive,
    moveFolderAt,
    removeActive,
    removeFolderAt,
    persistCurrent: async () =>
      activePathRef.current
        ? await persistDocument(activePathRef.current)
        : true,
    persistAllOpenDocuments,
    clearError: () => setErrorMessage(null),
  };
}

function toInternalDocument(
  path: string,
  mtimeMs: number,
  document: ReturnType<typeof parseMarkdown>,
  mode: EditorMode,
): InternalDocument {
  return {
    path,
    title: titleFromPath(path),
    created: document.created,
    updated: document.updated,
    body: document.body,
    mtimeMs,
    mode,
    saveStatus: "idle",
    dirty: false,
    revision: 0,
  };
}

function replaceDocumentPath(
  from: string,
  replacement: InternalDocument,
  documents: Map<string, InternalDocument>,
  commit: (documents: Map<string, InternalDocument>) => void,
) {
  const next = new Map<string, InternalDocument>();
  for (const [path, document] of documents) {
    next.set(
      path === from ? replacement.path : path,
      path === from ? replacement : document,
    );
  }
  commit(next);
}

function rebaseDocuments(
  from: string,
  to: string,
  documents: Map<string, InternalDocument>,
  commit: (documents: Map<string, InternalDocument>) => void,
) {
  const next = new Map<string, InternalDocument>();
  for (const [path, document] of documents) {
    if (isWithin(path, from)) {
      const rebased = rebasePath(path, from, to);
      next.set(rebased, { ...document, path: rebased });
    } else {
      next.set(path, document);
    }
  }
  commit(next);
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
