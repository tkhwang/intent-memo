import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, confirm as showConfirmation } from "@tauri-apps/plugin-dialog";
import type { LucideIcon } from "lucide-react";
import { Columns2, Eye, PanelLeft, PencilLine, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocumentList } from "@/components/DocumentList";
import { FolderTree } from "@/components/FolderTree";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { MarkdownView } from "@/components/MarkdownView";
import { MoveDialog } from "@/components/MoveDialog";
import { NameDialog } from "@/components/NameDialog";
import { PrimitiveShowcase } from "@/components/PrimitiveShowcase";
import { SpaceSwitcher } from "@/components/SpaceSwitcher";
import { TabBar } from "@/components/TabBar";
import {
  runCloseBarrier,
  useLibraryWorkspace,
} from "@/hooks/useLibraryWorkspace";
import { formatRootDisplay } from "@/lib/rootDisplay";
import { loadSettings, nextPaneLayout, saveSettings } from "@/lib/settings";
import { applyResolvedTheme, resolveTheme } from "@/lib/theme";
import type {
  EditorMode,
  LayoutSettings,
  Space,
  TabSession,
  Theme,
} from "@/types/library";

type DialogKind =
  | "document"
  | "folder"
  | "rename-document"
  | "rename-folder"
  | null;

type MoveTarget = {
  readonly kind: "document" | "folder";
  readonly path: string;
};

type ModeControl = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly next: EditorMode;
};

const MODE_CONTROLS = {
  edit: {
    icon: PencilLine,
    label: "현재 Edit · 클릭하면 View",
    next: "view",
  },
  view: {
    icon: Eye,
    label: "현재 View · 클릭하면 Edit | View 분할",
    next: "split",
  },
  split: {
    icon: Columns2,
    label: "현재 Edit | View 분할 · 클릭하면 Edit",
    next: "edit",
  },
} satisfies Record<EditorMode, ModeControl>;

type WindowFrameProps = {
  readonly children: ReactNode;
  readonly documentTitle?: string;
};

function WindowFrame({ children, documentTitle }: WindowFrameProps) {
  return (
    <div className="window-frame">
      <header className="window-titlebar" data-tauri-drag-region>
        <strong className="window-titlebar-service" data-tauri-drag-region>
          Intent Memo
        </strong>
        {documentTitle ? (
          <span className="window-titlebar-document" data-tauri-drag-region>
            {documentTitle}
          </span>
        ) : null}
      </header>
      <div className="window-content">{children}</div>
    </div>
  );
}

export function App() {
  if (new URLSearchParams(window.location.search).has("showcase")) {
    return <PrimitiveShowcase />;
  }

  return <RuntimeApp />;
}

function RuntimeApp() {
  const [settings, setSettings] = useState<LayoutSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const theme = settings?.theme ?? "light";

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyResolvedTheme(resolveTheme(theme, media.matches));
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch((cause: unknown) => {
        setLoadError(
          cause instanceof Error
            ? cause.message
            : "설정을 불러오지 못했습니다.",
        );
      });
  }, []);

  if (loadError) {
    return (
      <WindowFrame>
        <FatalScreen message={loadError} />
      </WindowFrame>
    );
  }

  if (!settings) {
    return (
      <WindowFrame>
        <LoadingScreen />
      </WindowFrame>
    );
  }

  const updateSettings = async (next: LayoutSettings) => {
    setSettings(next);
    await saveSettings(next);
  };
  const root =
    settings.activeSpace === "intent"
      ? settings.libraryRoot
      : settings.docsRoot;

  if (!root && settings.activeSpace === "intent") {
    return (
      <WindowFrame>
        <WelcomeScreen
          onChoose={async () => {
            const root = await chooseLibrary("Human folder 선택");
            if (!root) return;
            await updateSettings({ ...settings, libraryRoot: root });
          }}
          onSpaceChange={async (space) => {
            await updateSettings({ ...settings, activeSpace: space });
          }}
        />
      </WindowFrame>
    );
  }

  if (!root) {
    return (
      <WindowFrame>
        <DocsWelcomeScreen
          onChoose={async () => {
            const root = await chooseLibrary("AI folder 선택");
            if (!root) return;
            await updateSettings({ ...settings, docsRoot: root });
          }}
          onSpaceChange={async (space) => {
            await updateSettings({ ...settings, activeSpace: space });
          }}
        />
      </WindowFrame>
    );
  }

  return (
    <LibraryApp
      key={`${settings.activeSpace}:${root}`}
      onSettingsChange={updateSettings}
      root={root}
      settings={settings}
    />
  );
}

type FatalScreenProps = {
  readonly message: string;
};

function FatalScreen({ message }: FatalScreenProps) {
  return (
    <main className="center-screen" role="alert">
      <p>{message}</p>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="center-screen">
      <p>Intent Memo를 여는 중입니다.</p>
    </main>
  );
}

type WelcomeScreenProps = {
  readonly onChoose: () => Promise<void>;
  readonly onSpaceChange: (space: Space) => Promise<void>;
};

function WelcomeScreen({ onChoose, onSpaceChange }: WelcomeScreenProps) {
  return (
    <main className="welcome-screen" data-space="intent">
      <div className="welcome-switcher">
        <SpaceSwitcher activeSpace="intent" onChange={onSpaceChange} />
      </div>
      <div className="welcome-mark">IM</div>
      <p className="eyebrow">Intent Memo · 의도 메모</p>
      <h1>
        당신의 생각이 머무는
        <br />
        Markdown 폴더를 선택하세요.
      </h1>
      <p>
        파일은 선택한 폴더에 그대로 저장됩니다. Intent Memo는 그 원본을 편집하고
        읽는 일만 합니다.
      </p>
      <button
        className="primary-button welcome-action"
        onClick={() => void onChoose()}
        type="button"
      >
        Human folder 선택
      </button>
    </main>
  );
}

type DocsWelcomeScreenProps = {
  readonly onChoose: () => Promise<void>;
  readonly onSpaceChange: (space: Space) => Promise<void>;
};

function DocsWelcomeScreen({
  onChoose,
  onSpaceChange,
}: DocsWelcomeScreenProps) {
  return (
    <main className="docs-welcome-screen" data-space="docs">
      <div className="welcome-switcher">
        <SpaceSwitcher activeSpace="docs" onChange={onSpaceChange} />
      </div>
      <div className="docs-welcome-copy">
        <p className="eyebrow">AI · 구현 결과</p>
        <h1>AI가 만든 Markdown 결과를 읽을 폴더를 연결하세요.</h1>
        <p>
          내 의도와 취향으로 AI가 만든 결과를 읽는 공간입니다. 원본 파일은
          선택한 폴더에 그대로 유지됩니다.
        </p>
        <button
          className="primary-button welcome-action"
          onClick={() => void onChoose()}
          type="button"
        >
          AI folder 선택
        </button>
      </div>
    </main>
  );
}

type LibraryAppProps = {
  readonly root: string;
  readonly settings: LayoutSettings;
  readonly onSettingsChange: (settings: LayoutSettings) => Promise<void>;
};

function LibraryApp({ root, settings, onSettingsChange }: LibraryAppProps) {
  const rootName = formatRootDisplay(root).leaf;
  const defaultMode = settings.activeSpace === "docs" ? "view" : "edit";
  const persistTabSession = useCallback(
    (session: TabSession) => {
      const current = settings.tabSessions[settings.activeSpace];
      if (sameSession(current, session)) return;
      void onSettingsChange({
        ...settings,
        tabSessions: {
          ...settings.tabSessions,
          [settings.activeSpace]: session,
        },
      });
    },
    [onSettingsChange, settings],
  );
  const workspace = useLibraryWorkspace(root, {
    defaultMode,
    initialSession: settings.tabSessions[settings.activeSpace],
    onSessionChange: persistTabSession,
  });
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogTargetPath, setDialogTargetPath] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const actionOriginRef = useRef<HTMLElement | null>(null);
  const folderVisible = settings.listPaneOpen && settings.folderPaneOpen;
  const layoutControl = !settings.listPaneOpen
    ? {
        label: "현재 content-only · 클릭하면 3-pane 열기",
        state: "focus",
      }
    : folderVisible
      ? {
          label: "현재 3-pane · 클릭하면 folder pane 닫기",
          state: "full",
        }
      : {
          label: "현재 2-pane · 클릭하면 content-only 전환",
          state: "compact",
        };
  const modeControl = workspace.activeDocument
    ? MODE_CONTROLS[workspace.activeDocument.mode]
    : null;
  const ModeIcon = modeControl?.icon ?? PencilLine;

  const updateLayout = useCallback(
    (partial: Partial<LayoutSettings>) => {
      void onSettingsChange({ ...settings, ...partial });
    },
    [onSettingsChange, settings],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || event.shiftKey || event.altKey || event.ctrlKey)
        return;
      if (event.key === "1") {
        event.preventDefault();
        if (settings.listPaneOpen) {
          updateLayout({ folderPaneOpen: !settings.folderPaneOpen });
        }
      }
      if (event.key === "2") {
        event.preventDefault();
        updateLayout({ listPaneOpen: !settings.listPaneOpen });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settings.folderPaneOpen, settings.listPaneOpen, updateLayout]);

  const folderOptions = useMemo(
    () => [{ path: "", name: rootName }, ...workspace.snapshot.folders],
    [rootName, workspace.snapshot.folders],
  );

  const moveDestinations = useMemo(() => {
    if (!moveTarget) return [];
    if (moveTarget.kind === "document") {
      const currentParent = parentPath(moveTarget.path);
      return folderOptions.filter((folder) => folder.path !== currentParent);
    }
    return folderOptions.filter(
      (folder) =>
        folder.path !== parentPath(moveTarget.path) &&
        folder.path !== moveTarget.path &&
        !folder.path.startsWith(`${moveTarget.path}/`),
    );
  }, [folderOptions, moveTarget]);

  const restoreActionFocus = useCallback(() => {
    const origin = actionOriginRef.current;
    actionOriginRef.current = null;
    window.requestAnimationFrame(() => {
      if (origin?.isConnected) origin.focus();
    });
  }, []);

  const closeActionDialog = useCallback(() => {
    setDialog(null);
    setDialogTargetPath(null);
    setMoveTarget(null);
    restoreActionFocus();
  }, [restoreActionFocus]);

  const handleRootChange = async (space: Space) => {
    if (!(await workspace.persistAllOpenDocuments())) return;
    const nextRoot = await chooseLibrary(
      space === "intent" ? "Human folder 선택" : "AI folder 선택",
    );
    if (!nextRoot) return;
    await onSettingsChange(
      space === "intent"
        ? { ...settings, libraryRoot: nextRoot }
        : { ...settings, docsRoot: nextRoot },
    );
  };

  const changeSpace = async (space: Space) => {
    if (space === settings.activeSpace) return;
    if (!(await workspace.persistAllOpenDocuments())) return;
    await onSettingsChange({ ...settings, activeSpace: space });
  };

  useEffect(() => {
    let closing = false;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const appWindow = getCurrentWindow();
    void appWindow
      .onCloseRequested(async (event) => {
        event.preventDefault();
        if (closing) return;
        closing = true;
        const closed = await runCloseBarrier(
          workspace.persistAllOpenDocuments,
          () => appWindow.destroy(),
        );
        if (!closed) closing = false;
      })
      .then((stopListening) => {
        if (disposed) stopListening();
        else unlisten = stopListening;
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [workspace.persistAllOpenDocuments]);

  const confirmTrashDocument = async (path: string, origin: HTMLElement) => {
    actionOriginRef.current = origin;
    if (!(await workspace.openDocument(path))) return;
    const approved = await showConfirmation(
      `“${titleFromPath(path)}” 메모를 시스템 휴지통으로 이동할까요?`,
      { title: "메모 삭제", kind: "warning" },
    );
    if (approved) await workspace.removeActive();
    restoreActionFocus();
  };

  const confirmTrashFolder = async (path: string, origin: HTMLElement) => {
    actionOriginRef.current = origin;
    const approved = await showConfirmation(
      "선택한 폴더와 안의 모든 메모를 시스템 휴지통으로 이동할까요?",
      { title: "폴더 삭제", kind: "warning" },
    );
    if (approved && (await workspace.persistAllOpenDocuments())) {
      await workspace.removeFolderAt(path);
    }
    restoreActionFocus();
  };

  if (workspace.loading) {
    return (
      <WindowFrame>
        <LoadingScreen />
      </WindowFrame>
    );
  }

  return (
    <WindowFrame documentTitle={workspace.activeDocument?.title}>
      <main
        className={`app-shell ${folderVisible ? "has-folders" : ""} ${settings.listPaneOpen ? "has-list" : "content-only"}`}
        data-space={settings.activeSpace}
      >
        {folderVisible && (
          <aside className="pane folder-pane">
            <div className="space-header">
              <SpaceSwitcher
                activeSpace={settings.activeSpace}
                onChange={changeSpace}
                onRootChange={() => void handleRootChange(settings.activeSpace)}
                root={root}
              />
            </div>
            <header className="pane-header folder-header">
              <strong>Folders</strong>
              <button
                className="icon-button"
                aria-label="새 폴더"
                onClick={() => setDialog("folder")}
                type="button"
              >
                <Plus size={15} />
              </button>
            </header>
            <FolderTree
              folders={workspace.snapshot.folders}
              rootName={rootName}
              onMove={(path, origin) => {
                actionOriginRef.current = origin;
                workspace.setSelectedFolder(path);
                setMoveTarget({ kind: "folder", path });
              }}
              onRename={(path, origin) => {
                actionOriginRef.current = origin;
                workspace.setSelectedFolder(path);
                setDialogTargetPath(path);
                setDialog("rename-folder");
              }}
              onSelect={workspace.setSelectedFolder}
              onTrash={(path, origin) => void confirmTrashFolder(path, origin)}
              selectedPath={workspace.selectedFolder}
            />
            <label className="theme-picker">
              <span>테마</span>
              <select
                onChange={(event) =>
                  updateLayout({ theme: event.currentTarget.value as Theme })
                }
                value={settings.theme}
              >
                <option value="light">Light</option>
                <option value="charcoal">Charcoal</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>
          </aside>
        )}

        {settings.listPaneOpen && (
          <section className="pane list-pane">
            {!folderVisible && (
              <div className="space-header">
                <SpaceSwitcher
                  activeSpace={settings.activeSpace}
                  onChange={changeSpace}
                />
              </div>
            )}
            <header className="pane-header">
              <div>
                <strong>
                  {workspace.selectedFolder === ""
                    ? rootName
                    : folderLabel(workspace.selectedFolder)}
                </strong>
                <span>{workspace.visibleDocuments.length} notes</span>
              </div>
              <button
                className="icon-button"
                aria-label="새 메모"
                onClick={() => setDialog("document")}
                type="button"
              >
                <Plus size={15} />
              </button>
            </header>
            <DocumentList
              documents={workspace.visibleDocuments}
              snippets={workspace.visibleSnippets}
              onMove={(path, origin) => {
                actionOriginRef.current = origin;
                void workspace.openDocument(path).then((opened) => {
                  if (opened) setMoveTarget({ kind: "document", path });
                });
              }}
              onRename={(path, origin) => {
                actionOriginRef.current = origin;
                void workspace.openDocument(path).then((opened) => {
                  if (opened) setDialog("rename-document");
                });
              }}
              onSelect={(path) => void workspace.openDocument(path)}
              onTrash={(path, origin) =>
                void confirmTrashDocument(path, origin)
              }
              selectedPath={workspace.activePath}
            />
          </section>
        )}

        <section className="content-pane">
          <TabBar
            activePath={workspace.activePath}
            documents={workspace.openDocuments}
            leadingAction={
              <button
                aria-label={layoutControl.label}
                className="icon-button header-cycle-button layout-cycle-button"
                data-layout={layoutControl.state}
                onClick={() => updateLayout(nextPaneLayout(settings))}
                title={layoutControl.label}
                type="button"
              >
                <PanelLeft aria-hidden="true" size={16} />
              </button>
            }
            onClose={async (path) => {
              await workspace.closeDocument(path);
            }}
            onSelect={workspace.setActiveDocument}
            trailingActions={
              modeControl ? (
                <>
                  {workspace.saveStatus === "dirty" ||
                  workspace.saveStatus === "saving" ||
                  workspace.saveStatus === "error" ? (
                    <span className={`save-status ${workspace.saveStatus}`}>
                      {saveLabel(workspace.saveStatus)}
                    </span>
                  ) : null}
                  <button
                    aria-label={modeControl.label}
                    className="icon-button header-cycle-button mode-cycle-button"
                    data-mode={workspace.activeDocument?.mode}
                    onClick={() => workspace.setMode(modeControl.next)}
                    title={modeControl.label}
                    type="button"
                  >
                    <ModeIcon aria-hidden="true" size={16} />
                  </button>
                </>
              ) : null
            }
          />

          {workspace.errorMessage && (
            <div className="inline-notice" role="alert">
              <span>{workspace.errorMessage}</span>
              <button
                className="icon-button"
                aria-label="오류 닫기"
                onClick={workspace.clearError}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {workspace.activeDocument ? (
            <div
              className={`document-surface ${workspace.activeDocument.mode === "split" ? "is-split" : ""}`}
              data-mode={workspace.activeDocument.mode}
            >
              <div
                className={`editor-surface ${workspace.activeDocument.mode === "view" ? "is-hidden" : ""}`}
              >
                <MarkdownEditor
                  documentKey={workspace.activeDocument.path}
                  onChange={workspace.updateBody}
                  openDocumentKeys={workspace.openDocuments.map(
                    (document) => document.path,
                  )}
                  value={workspace.activeDocument.body}
                  visible={workspace.activeDocument.mode !== "view"}
                />
              </div>
              {workspace.activeDocument.mode !== "edit" && (
                <MarkdownView body={workspace.activeDocument.body} />
              )}
            </div>
          ) : (
            <div className="content-empty">
              {settings.activeSpace === "intent" ? (
                <p>
                  내가 남기는 의도와 취향,
                  <br />
                  AI 요청의 출발점입니다
                </p>
              ) : (
                <p>
                  내 의도와 취향으로
                  <br />
                  AI가 만든 결과입니다
                </p>
              )}
              <button
                className="primary-button"
                onClick={() => setDialog("document")}
                type="button"
              >
                {settings.activeSpace === "intent" ? "새 메모" : "새 문서"}
              </button>
            </div>
          )}
        </section>

        <NameDialog
          initialValue={
            dialog === "rename-document"
              ? workspace.activeDocument?.title
              : dialog === "rename-folder"
                ? folderLabel(dialogTargetPath ?? "")
                : ""
          }
          label={
            dialog === "document" || dialog === "rename-document"
              ? "파일명이 될 제목"
              : "폴더 이름"
          }
          onCancel={closeActionDialog}
          onSubmit={async (value) => {
            if (dialog === "document") await workspace.addDocument(value);
            if (dialog === "folder") await workspace.addFolder(value);
            if (dialog === "rename-document")
              await workspace.renameActive(value);
            if (dialog === "rename-folder" && dialogTargetPath)
              await workspace.renameFolderAt(dialogTargetPath, value);
            closeActionDialog();
          }}
          open={dialog !== null}
          submitLabel={
            dialog === "rename-document" || dialog === "rename-folder"
              ? "이름 변경"
              : "만들기"
          }
          title={
            dialog === "document"
              ? "새 메모"
              : dialog === "rename-document"
                ? "메모 이름 변경"
                : dialog === "rename-folder"
                  ? "폴더 이름 변경"
                  : "새 폴더"
          }
        />
        <MoveDialog
          destinations={moveDestinations}
          onCancel={closeActionDialog}
          onSubmit={async (destination) => {
            if (moveTarget?.kind === "document") {
              await workspace.moveActive(destination);
            }
            if (moveTarget?.kind === "folder") {
              await workspace.moveFolderAt(moveTarget.path, destination);
            }
            closeActionDialog();
          }}
          open={moveTarget !== null}
          title={moveTarget?.kind === "folder" ? "폴더 이동" : "메모 이동"}
        />
      </main>
    </WindowFrame>
  );
}

async function chooseLibrary(title: string): Promise<string | null> {
  const selected = await open({
    title,
    directory: true,
    multiple: false,
  });
  return typeof selected === "string" ? selected : null;
}

function folderLabel(path: string): string {
  return path.split("/").at(-1) ?? path;
}

function parentPath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

function titleFromPath(path: string): string {
  const name = path.split("/").at(-1) ?? path;
  return name.endsWith(".md") ? name.slice(0, -3) : name;
}

function saveLabel(
  status: ReturnType<typeof useLibraryWorkspace>["saveStatus"],
): string {
  if (status === "dirty") return "편집 중";
  if (status === "saving") return "저장 중";
  if (status === "saved") return "저장됨";
  if (status === "error") return "저장 실패";
  return "";
}

function sameSession(left: TabSession, right: TabSession): boolean {
  return (
    left.activePath === right.activePath &&
    left.paths.length === right.paths.length &&
    left.paths.every((path, index) => path === right.paths[index])
  );
}
