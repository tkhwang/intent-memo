import { open, confirm as showConfirmation } from "@tauri-apps/plugin-dialog";
import {
  FolderCog,
  FolderInput,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DocumentList } from "@/components/DocumentList";
import { FolderTree } from "@/components/FolderTree";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { MarkdownView } from "@/components/MarkdownView";
import { NameDialog } from "@/components/NameDialog";
import { PrimitiveShowcase } from "@/components/PrimitiveShowcase";
import { useLibraryWorkspace } from "@/hooks/useLibraryWorkspace";
import { loadSettings, saveSettings } from "@/lib/settings";
import type { EditorMode, LayoutSettings } from "@/types/library";

type DialogKind = "document" | "folder" | "rename-folder" | null;

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
          const root = await chooseLibrary();
          if (!root) return;
          const next = { ...settings, libraryRoot: root };
          setSettings(next);
          await saveSettings(next);
        }}
      />
    );
  }

  return (
    <LibraryApp
      settings={{ ...settings, libraryRoot: settings.libraryRoot }}
      onSettingsChange={async (next) => {
        setSettings(next);
        await saveSettings(next);
      }}
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

type LibraryAppProps = {
  readonly settings: LayoutSettings & { readonly libraryRoot: string };
  readonly onSettingsChange: (settings: LayoutSettings) => Promise<void>;
};

function LibraryApp({ settings, onSettingsChange }: LibraryAppProps) {
  const workspace = useLibraryWorkspace(settings.libraryRoot);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [documentDestination, setDocumentDestination] = useState("");
  const [folderDestination, setFolderDestination] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const folderVisible = settings.listPaneOpen && settings.folderPaneOpen;

  useEffect(() => {
    setTitleDraft(workspace.activeDocument?.title ?? "");
  }, [workspace.activeDocument?.title]);

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

  const folderMoveOptions = folderOptions.filter(
    (folder) =>
      folder.path !== workspace.selectedFolder &&
      !folder.path.startsWith(`${workspace.selectedFolder}/`),
  );

  const handleLibraryChange = async () => {
    if (!(await workspace.persistCurrent())) return;
    const root = await chooseLibrary();
    if (!root) return;
    await onSettingsChange({ ...settings, libraryRoot: root });
  };

  const confirmTrashDocument = async () => {
    if (!workspace.activeDocument) return;
    const approved = await showConfirmation(
      `“${workspace.activeDocument.title}” 메모를 시스템 휴지통으로 이동할까요?`,
      { title: "메모 삭제", kind: "warning" },
    );
    if (approved) await workspace.removeActive();
  };

  const confirmTrashFolder = async () => {
    if (workspace.selectedFolder === "") return;
    const approved = await showConfirmation(
      "선택한 폴더와 안의 모든 메모를 시스템 휴지통으로 이동할까요?",
      { title: "폴더 삭제", kind: "warning" },
    );
    if (approved) await workspace.removeSelectedFolder();
  };

  if (workspace.loading) return <LoadingScreen />;

  return (
    <main
      className={`app-shell ${folderVisible ? "has-folders" : ""} ${settings.listPaneOpen ? "has-list" : "content-only"}`}
    >
      {folderVisible && (
        <aside className="pane folder-pane">
          <header className="pane-header brand-header">
            <div>
              <span className="brand-name">Intent Memo</span>
              <span className="shortcut-hint">⌘1</span>
            </div>
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
            onSelect={workspace.setSelectedFolder}
            selectedPath={workspace.selectedFolder}
          />
          {workspace.selectedFolder !== "" && (
            <div className="pane-tools folder-tools">
              <button
                className="icon-button"
                aria-label="폴더 이름 변경"
                onClick={() => setDialog("rename-folder")}
                type="button"
              >
                <Pencil size={14} />
              </button>
              <select
                aria-label="폴더 이동 대상"
                onChange={(event) => setFolderDestination(event.target.value)}
                value={folderDestination}
              >
                <option value="">이동…</option>
                {folderMoveOptions.map((folder) => (
                  <option key={folder.path || "root"} value={folder.path}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <button
                className="icon-button"
                aria-label="폴더 이동"
                disabled={folderDestination === ""}
                onClick={() =>
                  void workspace.moveSelectedFolder(folderDestination)
                }
                type="button"
              >
                <FolderInput size={14} />
              </button>
              <button
                className="icon-button danger"
                aria-label="폴더를 휴지통으로 이동"
                onClick={() => void confirmTrashFolder()}
                type="button"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          <button
            className="library-path"
            onClick={() => void handleLibraryChange()}
            type="button"
          >
            <FolderCog size={14} />
            <span>{settings.libraryRoot}</span>
          </button>
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
            onSelect={(path) => void workspace.openDocument(path)}
            selectedPath={workspace.activeDocument?.path ?? null}
          />
        </section>
      )}

      <section className="content-pane">
        <header className="content-header">
          <div className="layout-controls">
            <button
              className="icon-button"
              aria-label={folderVisible ? "폴더 pane 닫기" : "폴더 pane 열기"}
              disabled={!settings.listPaneOpen}
              onClick={() =>
                updateLayout({ folderPaneOpen: !settings.folderPaneOpen })
              }
              type="button"
            >
              {folderVisible ? (
                <PanelLeftClose size={15} />
              ) : (
                <PanelLeftOpen size={15} />
              )}
            </button>
            <button
              className="icon-button"
              aria-label={
                settings.listPaneOpen ? "문서 pane 닫기" : "문서 pane 열기"
              }
              onClick={() =>
                updateLayout({ listPaneOpen: !settings.listPaneOpen })
              }
              type="button"
            >
              {settings.listPaneOpen ? (
                <PanelRightClose size={15} />
              ) : (
                <PanelRightOpen size={15} />
              )}
            </button>
          </div>
          {workspace.activeDocument ? (
            <>
              <form
                className="title-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (titleDraft !== workspace.activeDocument?.title) {
                    void workspace.renameActive(titleDraft);
                  }
                }}
              >
                <input
                  aria-label="문서 제목"
                  onBlur={() => {
                    if (titleDraft !== workspace.activeDocument?.title) {
                      void workspace.renameActive(titleDraft);
                    }
                  }}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  value={titleDraft}
                />
              </form>
              <div className="content-actions">
                <span className={`save-status ${workspace.saveStatus}`}>
                  {saveLabel(workspace.saveStatus)}
                </span>
                <fieldset className="mode-switch">
                  <legend className="sr-only">문서 보기 모드</legend>
                  <button
                    aria-pressed={mode === "edit"}
                    onClick={() => setMode("edit")}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    aria-pressed={mode === "view"}
                    onClick={() => setMode("view")}
                    type="button"
                  >
                    View
                  </button>
                </fieldset>
                <select
                  aria-label="메모 이동 대상"
                  onChange={(event) =>
                    setDocumentDestination(event.target.value)
                  }
                  value={documentDestination}
                >
                  <option value="">이동…</option>
                  {folderOptions
                    .filter(
                      (folder) =>
                        folder.path !==
                        workspace.activeDocument?.path
                          .split("/")
                          .slice(0, -1)
                          .join("/"),
                    )
                    .map((folder) => (
                      <option key={folder.path || "root"} value={folder.path}>
                        {folder.name}
                      </option>
                    ))}
                </select>
                <button
                  className="icon-button"
                  aria-label="메모 이동"
                  disabled={documentDestination === ""}
                  onClick={() => void workspace.moveActive(documentDestination)}
                  type="button"
                >
                  <FolderInput size={14} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label="메모를 휴지통으로 이동"
                  onClick={() => void confirmTrashDocument()}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </>
          ) : (
            <span className="content-header-placeholder">
              Intent Memo · 의도 메모
            </span>
          )}
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
          mode === "edit" ? (
            <MarkdownEditor
              key={workspace.activeDocument.path}
              onChange={workspace.updateBody}
              value={workspace.activeDocument.body}
            />
          ) : (
            <MarkdownView body={workspace.activeDocument.body} />
          )
        ) : (
          <div className="content-empty">
            <p>
              당신의 의도를
              <br />한 줄부터 남겨보세요.
            </p>
            <button
              className="primary-button"
              onClick={() => setDialog("document")}
              type="button"
            >
              새 메모
            </button>
          </div>
        )}
      </section>

      <NameDialog
        initialValue={
          dialog === "rename-folder"
            ? folderLabel(workspace.selectedFolder)
            : ""
        }
        label={dialog === "document" ? "파일명이 될 제목" : "폴더 이름"}
        onCancel={() => setDialog(null)}
        onSubmit={async (value) => {
          if (dialog === "document") await workspace.addDocument(value);
          if (dialog === "folder") await workspace.addFolder(value);
          if (dialog === "rename-folder")
            await workspace.renameSelectedFolder(value);
          setDialog(null);
        }}
        open={dialog !== null}
        submitLabel={dialog === "rename-folder" ? "이름 변경" : "만들기"}
        title={
          dialog === "document"
            ? "새 메모"
            : dialog === "rename-folder"
              ? "폴더 이름 변경"
              : "새 폴더"
        }
      />
    </main>
  );
}

async function chooseLibrary(): Promise<string | null> {
  const selected = await open({
    title: "Intent Memo library 선택",
    directory: true,
    multiple: false,
  });
  return typeof selected === "string" ? selected : null;
}

function folderLabel(path: string): string {
  if (path === "") return "Library";
  return path.split("/").at(-1) ?? path;
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
