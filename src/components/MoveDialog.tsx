import { useEffect, useId, useRef, useState } from "react";

export type MoveDestination = {
  readonly name: string;
  readonly path: string;
};

type MoveDialogProps = {
  readonly destinations: readonly MoveDestination[];
  readonly onCancel: () => void;
  readonly onSubmit: (destination: string) => Promise<void>;
  readonly open: boolean;
  readonly title: string;
};

export function MoveDialog({
  destinations,
  onCancel,
  onSubmit,
  open,
  title,
}: MoveDialogProps) {
  const [destinationIndex, setDestinationIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!open) return;
    setDestinationIndex(null);
    selectRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="name-dialog move-dialog"
        role="dialog"
      >
        <h2 id={titleId}>{title}</h2>
        <label htmlFor={`${titleId}-destination`}>이동할 폴더</label>
        <select
          id={`${titleId}-destination`}
          onChange={(event) =>
            setDestinationIndex(
              event.target.value === "" ? null : Number(event.target.value),
            )
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
          }}
          ref={selectRef}
          value={destinationIndex ?? ""}
        >
          <option value="">대상 폴더 선택</option>
          {destinations.map((entry, index) => (
            <option key={entry.path || "root"} value={index}>
              {entry.name}
            </option>
          ))}
        </select>
        <div className="dialog-actions">
          <button className="text-button" onClick={onCancel} type="button">
            취소
          </button>
          <button
            className="primary-button"
            disabled={submitting || destinationIndex === null}
            onClick={() => {
              if (destinationIndex === null) return;
              const destination = destinations[destinationIndex];
              if (!destination) return;
              setSubmitting(true);
              onSubmit(destination.path).finally(() => setSubmitting(false));
            }}
            type="button"
          >
            이동
          </button>
        </div>
      </section>
    </div>
  );
}
