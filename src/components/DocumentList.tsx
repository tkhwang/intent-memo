import { FileText } from "lucide-react";
import { ContextMenu } from "@/components/ContextMenu";
import type { DocumentEntry } from "@/types/library";

type DocumentListProps = {
  readonly documents: readonly DocumentEntry[];
  readonly selectedPath: string | null;
  readonly onSelect: (path: string) => void;
  readonly onMove: (path: string, origin: HTMLElement) => void;
  readonly onRename: (path: string, origin: HTMLElement) => void;
  readonly onTrash: (path: string, origin: HTMLElement) => void;
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function DocumentList({
  documents,
  selectedPath,
  onSelect,
  onMove,
  onRename,
  onTrash,
}: DocumentListProps) {
  if (documents.length === 0) {
    return <p className="pane-empty">이 폴더에는 Markdown 메모가 없습니다.</p>;
  }

  return (
    <div
      aria-label="Markdown documents"
      className="document-list"
      role="listbox"
    >
      {documents.map((document) => (
        <ContextMenu
          items={[
            {
              id: "rename",
              label: "Rename…",
              onSelect: (origin) => onRename(document.path, origin),
            },
            {
              id: "move",
              label: "Move…",
              onSelect: (origin) => onMove(document.path, origin),
            },
            {
              id: "trash",
              label: "Move to Trash",
              danger: true,
              onSelect: (origin) => onTrash(document.path, origin),
            },
          ]}
          key={document.path}
          label={`${document.title} 동작`}
        >
          {(triggerProps) => (
            <button
              aria-selected={selectedPath === document.path}
              className="document-row"
              onClick={() => onSelect(document.path)}
              role="option"
              type="button"
              {...triggerProps}
            >
              <FileText aria-hidden="true" size={15} strokeWidth={1.6} />
              <span className="document-copy">
                <strong>{document.title}</strong>
                <time dateTime={new Date(document.updatedMs).toISOString()}>
                  {dateFormatter.format(document.updatedMs)}
                </time>
              </span>
            </button>
          )}
        </ContextMenu>
      ))}
    </div>
  );
}
