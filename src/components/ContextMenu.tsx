import type {
  AriaAttributes,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
  RefCallback,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type ContextMenuItem = {
  readonly id: string;
  readonly label: string;
  readonly danger?: boolean;
  readonly onSelect: (trigger: HTMLElement) => void;
};

export type ContextMenuTriggerProps = {
  readonly "aria-expanded": AriaAttributes["aria-expanded"];
  readonly "aria-haspopup": "menu";
  readonly onContextMenu: MouseEventHandler<HTMLElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
  readonly ref: RefCallback<HTMLElement>;
};

type ContextMenuProps = {
  readonly children: (props: ContextMenuTriggerProps) => ReactNode;
  readonly items: readonly ContextMenuItem[];
  readonly label: string;
};

type MenuPosition = {
  readonly left: number;
  readonly top: number;
};

export function ContextMenu({ children, items, label }: ContextMenuProps) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => {
    setPosition(null);
    triggerRef.current?.focus();
  }, []);

  const openAt = useCallback((left: number, top: number) => {
    setPosition({
      left: Math.max(8, Math.min(left, window.innerWidth - 200)),
      top: Math.max(8, Math.min(top, window.innerHeight - 156)),
    });
  }, []);

  useEffect(() => {
    if (!position) return;
    itemRefs.current[0]?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        menuRef.current?.contains(event.target) ||
        triggerRef.current?.contains(event.target)
      ) {
        return;
      }
      close();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [close, position]);

  const focusItem = (index: number) => {
    const item = itemRefs.current[index];
    item?.focus();
  };

  const handleMenuKeyDown: KeyboardEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    const currentIndex = itemRefs.current.indexOf(event.currentTarget);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem((currentIndex + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem((currentIndex - 1 + items.length) % items.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(items.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const trigger = triggerRef.current;
      if (trigger) items[currentIndex]?.onSelect(trigger);
      close();
    }
  };

  const triggerProps: ContextMenuTriggerProps = {
    "aria-expanded": position !== null,
    "aria-haspopup": "menu",
    onContextMenu: (event) => {
      event.preventDefault();
      openAt(event.clientX, event.clientY);
    },
    onKeyDown: (event) => {
      if (
        event.key !== "ContextMenu" &&
        !(event.shiftKey && event.key === "F10")
      ) {
        return;
      }
      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();
      openAt(bounds.left + 12, bounds.bottom + 4);
    },
    ref: (node) => {
      triggerRef.current = node;
    },
  };

  return (
    <>
      {children(triggerProps)}
      {position && (
        <div
          aria-label={label}
          className="context-menu"
          ref={menuRef}
          role="menu"
          style={{ left: position.left, top: position.top }}
        >
          {items.map((item, index) => (
            <button
              className={item.danger ? "danger" : undefined}
              key={item.id}
              onClick={() => {
                const trigger = triggerRef.current;
                if (trigger) item.onSelect(trigger);
                close();
              }}
              onKeyDown={handleMenuKeyDown}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              role="menuitem"
              tabIndex={-1}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
