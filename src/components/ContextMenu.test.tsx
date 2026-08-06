// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextMenu } from "@/components/ContextMenu";

afterEach(cleanup);

const items = [
  { id: "rename", label: "Rename…", onSelect: vi.fn() },
  { id: "move", label: "Move…", onSelect: vi.fn() },
  {
    id: "trash",
    label: "Move to Trash",
    danger: true,
    onSelect: vi.fn(),
  },
] as const;

describe("ContextMenu", () => {
  it("opens from Shift+F10 and moves focus with menu keys", () => {
    render(
      <ContextMenu items={items} label="메모 동작">
        {(triggerProps) => (
          <button type="button" {...triggerProps}>
            메모
          </button>
        )}
      </ContextMenu>,
    );

    const trigger = screen.getByRole("button", { name: "메모" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "F10", shiftKey: true });

    const menuItems = screen.getAllByRole("menuitem");
    expect(document.activeElement).toBe(menuItems[0]);

    fireEvent.keyDown(menuItems[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(menuItems[1]);

    fireEvent.keyDown(menuItems[1], { key: "End" });
    expect(document.activeElement).toBe(menuItems[2]);

    fireEvent.keyDown(menuItems[2], { key: "Home" });
    expect(document.activeElement).toBe(menuItems[0]);
  });

  it("closes with Escape and restores focus to the trigger", () => {
    render(
      <ContextMenu items={items} label="메모 동작">
        {(triggerProps) => (
          <button type="button" {...triggerProps}>
            메모
          </button>
        )}
      </ContextMenu>,
    );

    const trigger = screen.getByRole("button", { name: "메모" });
    fireEvent.contextMenu(trigger, { clientX: 24, clientY: 32 });
    const firstItem = screen.getAllByRole("menuitem")[0];
    fireEvent.keyDown(firstItem, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("executes the focused item with Enter and closes", () => {
    const onRename = vi.fn();
    render(
      <ContextMenu
        items={[{ id: "rename", label: "Rename…", onSelect: onRename }]}
        label="메모 동작"
      >
        {(triggerProps) => (
          <button type="button" {...triggerProps}>
            메모
          </button>
        )}
      </ContextMenu>,
    );

    const trigger = screen.getByRole("button", { name: "메모" });
    fireEvent.contextMenu(trigger, { clientX: 24, clientY: 32 });
    fireEvent.keyDown(screen.getByRole("menuitem"), { key: "Enter" });

    expect(onRename).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
