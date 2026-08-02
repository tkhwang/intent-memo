import { ChevronRight, Folder, Library } from "lucide-react";
import { useMemo } from "react";
import type { FolderEntry } from "@/types/library";

type FolderTreeProps = {
  readonly folders: readonly FolderEntry[];
  readonly selectedPath: string;
  readonly onSelect: (path: string) => void;
};

export function FolderTree({
  folders,
  selectedPath,
  onSelect,
}: FolderTreeProps) {
  const children = useMemo(() => {
    const grouped = new Map<string, FolderEntry[]>();
    for (const folder of folders) {
      const entries = grouped.get(folder.parent) ?? [];
      entries.push(folder);
      grouped.set(folder.parent, entries);
    }
    for (const entries of grouped.values()) {
      entries.sort((left, right) => left.name.localeCompare(right.name));
    }
    return grouped;
  }, [folders]);

  return (
    <nav aria-label="Library folders" className="folder-tree">
      <FolderButton
        depth={0}
        icon="library"
        name="Library"
        onSelect={onSelect}
        path=""
        selectedPath={selectedPath}
      />
      <FolderChildren
        childrenByParent={children}
        depth={1}
        onSelect={onSelect}
        parent=""
        selectedPath={selectedPath}
      />
    </nav>
  );
}

type FolderChildrenProps = {
  readonly childrenByParent: ReadonlyMap<string, readonly FolderEntry[]>;
  readonly depth: number;
  readonly onSelect: (path: string) => void;
  readonly parent: string;
  readonly selectedPath: string;
};

function FolderChildren({
  childrenByParent,
  depth,
  onSelect,
  parent,
  selectedPath,
}: FolderChildrenProps) {
  const children = childrenByParent.get(parent) ?? [];
  return children.map((folder) => (
    <div key={folder.path}>
      <FolderButton
        depth={depth}
        icon="folder"
        name={folder.name}
        onSelect={onSelect}
        path={folder.path}
        selectedPath={selectedPath}
      />
      <FolderChildren
        childrenByParent={childrenByParent}
        depth={depth + 1}
        onSelect={onSelect}
        parent={folder.path}
        selectedPath={selectedPath}
      />
    </div>
  ));
}

type FolderButtonProps = {
  readonly depth: number;
  readonly icon: "folder" | "library";
  readonly name: string;
  readonly onSelect: (path: string) => void;
  readonly path: string;
  readonly selectedPath: string;
};

function FolderButton({
  depth,
  icon,
  name,
  onSelect,
  path,
  selectedPath,
}: FolderButtonProps) {
  const Icon = icon === "library" ? Library : Folder;
  return (
    <button
      aria-current={selectedPath === path ? "page" : undefined}
      className="folder-row"
      onClick={() => onSelect(path)}
      style={{ paddingInlineStart: `${8 + depth * 14}px` }}
      type="button"
    >
      <ChevronRight aria-hidden="true" className="folder-chevron" size={12} />
      <Icon aria-hidden="true" size={15} strokeWidth={1.7} />
      <span>{name}</span>
    </button>
  );
}
