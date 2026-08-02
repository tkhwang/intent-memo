export type FolderEntry = {
  readonly path: string;
  readonly parent: string;
  readonly name: string;
};

export type DocumentEntry = {
  readonly path: string;
  readonly parent: string;
  readonly title: string;
  readonly updatedMs: number;
};

export type LibrarySnapshot = {
  readonly folders: readonly FolderEntry[];
  readonly documents: readonly DocumentEntry[];
};

export type DocumentPayload = {
  readonly path: string;
  readonly content: string;
  readonly mtimeMs: number;
};

export type EntryMutation = {
  readonly path: string;
};

export type OpenDocument = {
  readonly path: string;
  readonly title: string;
  readonly created: string;
  readonly updated: string;
  readonly body: string;
  readonly mtimeMs: number;
};

export type LayoutSettings = {
  readonly libraryRoot: string | null;
  readonly folderPaneOpen: boolean;
  readonly listPaneOpen: boolean;
};

export const EDITOR_MODES = ["edit", "view"] as const;
export type EditorMode = (typeof EDITOR_MODES)[number];
