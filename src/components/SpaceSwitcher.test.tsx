// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpaceSwitcher } from "@/components/SpaceSwitcher";

afterEach(cleanup);

describe("SpaceSwitcher", () => {
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
