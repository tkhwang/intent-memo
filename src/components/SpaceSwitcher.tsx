import { Files, NotebookPen } from "lucide-react";
import { useState } from "react";
import type { Space } from "@/types/library";

type SpaceSwitcherProps = {
  readonly activeSpace: Space;
  readonly compact?: boolean;
  readonly onChange: (space: Space) => Promise<void>;
};

const spaceCopy = {
  intent: { label: "Intent", description: "나의 의도", icon: NotebookPen },
  docs: { label: "Docs", description: "참고 문서", icon: Files },
} as const;

export function SpaceSwitcher({
  activeSpace,
  compact = false,
  onChange,
}: SpaceSwitcherProps) {
  const [switching, setSwitching] = useState(false);

  const selectSpace = async (space: Space) => {
    if (space === activeSpace || switching) return;
    setSwitching(true);
    await onChange(space).finally(() => setSwitching(false));
  };

  if (compact) {
    const current = spaceCopy[activeSpace];
    const targetSpace = activeSpace === "intent" ? "docs" : "intent";
    const Icon = current.icon;
    return (
      <button
        aria-label={`${spaceCopy[targetSpace].label} 공간으로 전환`}
        className="space-switcher-compact"
        disabled={switching}
        onClick={() => void selectSpace(targetSpace)}
        type="button"
      >
        <Icon aria-hidden="true" size={15} />
        <span>{current.label}</span>
      </button>
    );
  }

  return (
    <div className="space-switcher">
      <fieldset className="space-segments">
        <legend className="sr-only">공간 선택</legend>
        {(["intent", "docs"] as const).map((space) => {
          const entry = spaceCopy[space];
          const Icon = entry.icon;
          return (
            <button
              aria-pressed={activeSpace === space}
              disabled={switching}
              key={space}
              onClick={() => void selectSpace(space)}
              type="button"
            >
              <Icon aria-hidden="true" size={15} />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </fieldset>
      <span className="space-description">
        {spaceCopy[activeSpace].description}
      </span>
    </div>
  );
}
