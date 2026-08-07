// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpaceSwitcher } from "@/components/SpaceSwitcher";
import type { Space } from "@/types/library";

afterEach(cleanup);

describe("SpaceSwitcher", () => {
  it("keeps multiple radio groups independent", async () => {
    // Given: two switchers with different controlled active spaces.
    function Harness() {
      const [firstSpace, setFirstSpace] = useState<Space>("intent");
      const [secondSpace, setSecondSpace] = useState<Space>("docs");
      return (
        <>
          <SpaceSwitcher
            activeSpace={firstSpace}
            onChange={async (space) => setFirstSpace(space)}
          />
          <SpaceSwitcher
            activeSpace={secondSpace}
            onChange={async (space) => setSecondSpace(space)}
          />
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    const groups = screen.getAllByRole("radiogroup", { name: "공간 선택" });
    const firstGroup = groups.at(0);
    const secondGroup = groups.at(1);
    if (!firstGroup || !secondGroup) {
      throw new TypeError("Two space switchers are required");
    }
    const firstAI = within(firstGroup).getByRole("radio", { name: /AI/ });
    const secondAI = within(secondGroup).getByRole("radio", { name: /AI/ });
    if (
      !(firstAI instanceof HTMLInputElement) ||
      !(secondAI instanceof HTMLInputElement)
    ) {
      throw new TypeError("Space options must be radio inputs");
    }

    // When: AI is selected in the first switcher.
    await user.click(firstAI);

    // Then: each switcher keeps its own native radio group and active value.
    expect(firstAI.getAttribute("name")).not.toBe(
      secondAI.getAttribute("name"),
    );
    expect(firstAI.checked).toBe(true);
    expect(secondAI.checked).toBe(true);
  });

  it("shows Human and AI as a radio group with the active space", () => {
    render(<SpaceSwitcher activeSpace="intent" onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "공간 선택" })).toBeDefined();
    expect(
      screen.getByRole("radio", { name: /Human/ }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("radio", { name: /AI/ }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("calls onChange when the inactive space is selected", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<SpaceSwitcher activeSpace="intent" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: /AI/ }));
    expect(onChange).toHaveBeenCalledWith("docs");
  });

  it("moves focus and switches with an arrow key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<SpaceSwitcher activeSpace="intent" onChange={onChange} />);
    screen.getByRole("radio", { name: /Human/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /AI/ })).toBe(
      document.activeElement,
    );
    expect(onChange).toHaveBeenCalledWith("docs");
  });

  it("keeps the focused radio enabled while an async switch is pending", async () => {
    // Given: a space change that remains pending after keyboard selection.
    let resolveChange: () => void = () => undefined;
    const pendingChange = new Promise<void>((resolve) => {
      resolveChange = () => resolve();
    });
    const onChange = vi.fn(() => pendingChange);
    const user = userEvent.setup();
    render(<SpaceSwitcher activeSpace="intent" onChange={onChange} />);
    const human = screen.getByRole("radio", { name: /Human/ });
    const ai = screen.getByRole("radio", { name: /AI/ });
    if (
      !(human instanceof HTMLInputElement) ||
      !(ai instanceof HTMLInputElement)
    ) {
      throw new TypeError("Space options must be radio inputs");
    }
    human.focus();

    // When: keyboard navigation starts the asynchronous switch.
    await user.keyboard("{ArrowRight}");

    try {
      // Then: focus remains on an enabled radio and re-selection is ignored.
      expect(ai).toBe(document.activeElement);
      expect(ai.disabled).toBe(false);
      await user.click(ai);
      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => {
        resolveChange();
        await pendingChange;
      });
    }
  });

  it("shows the active label and target label in compact mode", () => {
    render(<SpaceSwitcher activeSpace="docs" compact onChange={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Human 공간으로 전환" });
    expect(button.textContent).toContain("AI");
  });

  it("emphasizes the root leaf and requests a root change", async () => {
    const onRootChange = vi.fn();
    render(
      <SpaceSwitcher
        activeSpace="intent"
        onChange={vi.fn()}
        onRootChange={onRootChange}
        root="/Users/x/memo/intents"
      />,
    );
    const row = screen.getByRole("button", { name: /intents/ });
    expect(row.title).toBe("/Users/x/memo/intents");
    await userEvent.click(row);
    expect(onRootChange).toHaveBeenCalledTimes(1);
  });
});
