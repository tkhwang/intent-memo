import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkspaceDocument } from "@/hooks/useLibraryWorkspace";

type TabBarProps = {
  readonly activePath: string | null;
  readonly documents: readonly WorkspaceDocument[];
  readonly leadingAction: ReactNode;
  readonly onClose: (path: string) => Promise<void>;
  readonly onSelect: (path: string) => void;
  readonly trailingActions: ReactNode;
};

export function TabBar({
  activePath,
  documents,
  leadingAction,
  onClose,
  onSelect,
  trailingActions,
}: TabBarProps) {
  return (
    <div className="tab-bar">
      <div className="tab-bar-leading">{leadingAction}</div>
      <div aria-label="열린 문서" className="tab-list" role="tablist">
        {documents.map((document) => (
          <div
            className={`tab-item ${activePath === document.path ? "active" : ""}`}
            key={document.path}
            role="presentation"
          >
            <button
              aria-selected={activePath === document.path}
              className="tab-select"
              onClick={() => onSelect(document.path)}
              role="tab"
              title={document.path}
              type="button"
            >
              <span>{document.title}</span>
              {document.saveStatus === "dirty" ||
              document.saveStatus === "saving" ? (
                <>
                  <span aria-hidden="true" className="tab-dirty" />
                  <span className="sr-only">저장되지 않은 변경</span>
                </>
              ) : null}
              {document.saveStatus === "error" ? (
                <>
                  <span aria-hidden="true" className="tab-error">
                    !
                  </span>
                  <span className="sr-only">저장 실패</span>
                </>
              ) : null}
            </button>
            <button
              aria-label={`${document.title} tab 닫기`}
              className="tab-close"
              onClick={() => void onClose(document.path)}
              type="button"
            >
              <X aria-hidden="true" size={13} />
            </button>
          </div>
        ))}
      </div>
      <div className="tab-bar-actions">{trailingActions}</div>
    </div>
  );
}
