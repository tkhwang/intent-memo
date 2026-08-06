import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, confirm as showConfirmation } from "@tauri-apps/plugin-dialog";
import {
  Files,
  FolderCog,
  NotebookPen,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
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
import { loadSettings, nextPaneLayout, saveSettings } from "@/lib/settings";
import type { LayoutSettings, Space, TabSession } from "@/types/library";

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

export function App() {
  if (new URLSearchParams(window.location.search).has("showcase")) {
    return <PrimitiveShowcase />;
  }

  return <RuntimeApp />;
}

function RuntimeApp() {
  const [settings, setSettings] = useState<LayoutSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  if (loadError) return <FatalScreen message={loadError} />;

  if (!settings) {
    return <LoadingScreen />;
  }

  if (!settings.libraryRoot) {
    return (
      <WelcomeScreen
        onChoose={async () => {
          const root = await chooseLibrary("Intent library 선택");
          if (!root) return;
          const next = { ...settings, libraryRoot: root };
          setSettings(next);
          await saveSettings(next);
        }}
      />
    );
  }

  const updateSettings = async (next: LayoutSettings) => {
    setSettings(next);
    await saveSettings(next);
  };

  if (settings.activeSpace === "docs" && !settings.docsRoot) {
    return (
      <DocsWelcomeScreen
        onChoose={async () => {
          const root = await chooseLibrary("Docs folder 선택");
          if (!root) return;
          await updateSettings({ ...settings, docsRoot: root });
        }}
        onSpaceChange={async (space) => {
          await updateSettings({ ...settings, activeSpace: space });
        }}
      />
    );
  }

  const root =
    settings.activeSpace === "intent"
      ? settings.libraryRoot
      : settings.docsRoot;

  return (
    <LibraryApp
      key={`${settings.activeSpace}:${root}`}
      onSettingsChange={updateSettings}
      root={root ?? settings.libraryRoot}
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
};

function WelcomeScreen({ onChoose }: WelcomeScreenProps) {
  return (
    <main className="welcome-screen">
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
        Markdown library 선택
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
    <main className="docs-welcome-screen">
      <div className="docs-welcome-switcher">
        <SpaceSwitcher activeSpace="docs" onChange={onSpaceChange} />
      </div>
      <div className="docs-welcome-copy">
        <p className="eyebrow">Docs · 참고 문서</p>
        <h1>계속 읽고 다듬을 Markdown 폴더를 연결하세요.</h1>
        <p>
          AI 결과나 프로젝트 문서를 참고하는 별도 공간입니다. 원본 파일은 선택한
          폴더에 그대로 유지됩니다.
        </p>
        <button
          className="primary-button welcome-action"
          onClick={() => void onChoose()}
          type="button"
        >
          Docs folder 선택
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
        count: 1,
        label: "현재 content-only · 클릭하면 3-pane 열기",
        state: "focus",
      }
    : folderVisible
      ? {
          count: 3,
          label: "현재 3-pane · 클릭하면 folder pane 닫기",
          state: "full",
        }
      : {
          count: 2,
          label: "현재 2-pane · 클릭하면 content-only 전환",
          state: "compact",
        };

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
    () => [{ path: "", name: "Library" }, ...workspace.snapshot.folders],
    [workspace.snapshot.folders],
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
      space === "intent" ? "Intent library 선택" : "Docs folder 선택",
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

  if (workspace.loading) return <LoadingScreen />;

  return (
    <main
      className={`app-shell ${folderVisible ? "has-folders" : ""} ${settings.listPaneOpen ? "has-list" : "content-only"}`}
    >
      {folderVisible && (
        <aside className="pane folder-pane">
          <div className="space-header">
            <SpaceSwitcher
              activeSpace={settings.activeSpace}
              onChange={changeSpace}
            />
            <span className="shortcut-hint">⌘1</span>
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
          <fieldset className="base-folder-list">
            <legend className="sr-only">Base folders</legend>
            <button
              aria-label={`Intent base folder 변경: ${settings.libraryRoot ?? "선택 안 됨"}`}
              className="base-folder-row"
              data-active={settings.activeSpace === "intent"}
              onClick={() => void handleRootChange("intent")}
              type="button"
            >
              <NotebookPen aria-hidden="true" size={14} />
              <span className="base-folder-copy">
                <strong>Intent</strong>
                <span title={settings.libraryRoot ?? "선택 안 됨"}>
                  {settings.libraryRoot ?? "선택 안 됨"}
                </span>
              </span>
            </button>
            <button
              aria-label={`Docs base folder 변경: ${settings.docsRoot ?? "선택 안 됨"}`}
              className="base-folder-row"
              data-active={settings.activeSpace === "docs"}
              onClick={() => void handleRootChange("docs")}
              type="button"
            >
              <Files aria-hidden="true" size={14} />
              <span className="base-folder-copy">
                <strong>Docs</strong>
                <span title={settings.docsRoot ?? "선택 안 됨"}>
                  {settings.docsRoot ?? "선택 안 됨"}
                </span>
              </span>
            </button>
          </fieldset>
        </aside>
      )}

      {settings.listPaneOpen && (
        <section className="pane list-pane">
          <header className="pane-header">
            <div>
              <strong>{folderLabel(workspace.selectedFolder)}</strong>
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
            onTrash={(path, origin) => void confirmTrashDocument(path, origin)}
            selectedPath={workspace.activePath}
          />
        </section>
      )}

      <section className="content-pane">
        <TabBar
          activePath={workspace.activePath}
          documents={workspace.openDocuments}
          onClose={async (path) => {
            await workspace.closeDocument(path);
          }}
          onSelect={workspace.setActiveDocument}
        />
        <header className="content-header">
          <div className="layout-controls">
            {!folderVisible && (
              <SpaceSwitcher
                activeSpace={settings.activeSpace}
                compact
                onChange={changeSpace}
              />
            )}
            <button
              aria-label={layoutControl.label}
              className="icon-button layout-cycle-button"
              data-layout={layoutControl.state}
              onClick={() => updateLayout(nextPaneLayout(settings))}
              title={layoutControl.label}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={14} />
              <span aria-hidden="true">{layoutControl.count}</span>
            </button>
          </div>
          <button
            aria-label={`${settings.activeSpace === "intent" ? "Intent" : "Docs"} base folder 변경: ${root}`}
            className="active-root"
            onClick={() => void handleRootChange(settings.activeSpace)}
            title={root}
            type="button"
          >
            <FolderCog aria-hidden="true" size={14} />
            <strong>
              {settings.activeSpace === "intent" ? "Intent" : "Docs"}
            </strong>
            <span>{root}</span>
          </button>
          {workspace.activeDocument ? (
            <div className="content-actions">
              <span className={`save-status ${workspace.saveStatus}`}>
                {saveLabel(workspace.saveStatus)}
              </span>
              <fieldset className="mode-switch">
                <legend className="sr-only">문서 보기 모드</legend>
                <button
                  aria-pressed={workspace.activeDocument.mode === "edit"}
                  onClick={() => workspace.setMode("edit")}
                  type="button"
                >
                  Edit
                </button>
                <button
                  aria-pressed={workspace.activeDocument.mode === "view"}
                  onClick={() => workspace.setMode("view")}
                  type="button"
                >
                  View
                </button>
              </fieldset>
            </div>
          ) : null}
        </header>

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
          <>
            <div
              className={`editor-surface ${workspace.activeDocument.mode === "edit" ? "" : "is-hidden"}`}
            >
              <MarkdownEditor
                documentKey={workspace.activeDocument.path}
                onChange={workspace.updateBody}
                openDocumentKeys={workspace.openDocuments.map(
                  (document) => document.path,
                )}
                value={workspace.activeDocument.body}
                visible={workspace.activeDocument.mode === "edit"}
              />
            </div>
            {workspace.activeDocument.mode === "view" && (
              <MarkdownView body={workspace.activeDocument.body} />
            )}
          </>
        ) : (
          <div className="content-empty">
            {settings.activeSpace === "intent" ? (
              <p>
                목적·배경·제약·완료 조건을
                <br />한 줄부터 남겨보세요.
              </p>
            ) : (
              <p>
                계속 참고할 문서를
                <br />
                선택하거나 새로 만드세요.
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
          if (dialog === "rename-document") await workspace.renameActive(value);
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
  if (path === "") return "Library";
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
