import { FileText } from "lucide-react";
import type { DocumentEntry } from "@/types/library";

type DocumentListProps = {
  readonly documents: readonly DocumentEntry[];
  readonly selectedPath: string | null;
  readonly onSelect: (path: string) => void;
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
        <button
          aria-selected={selectedPath === document.path}
          className="document-row"
          key={document.path}
          onClick={() => onSelect(document.path)}
          role="option"
          type="button"
        >
          <FileText aria-hidden="true" size={15} strokeWidth={1.6} />
          <span className="document-copy">
            <strong>{document.title}</strong>
            <time dateTime={new Date(document.updatedMs).toISOString()}>
              {dateFormatter.format(document.updatedMs)}
            </time>
          </span>
        </button>
      ))}
    </div>
  );
}
