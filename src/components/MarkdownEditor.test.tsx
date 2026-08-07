// @vitest-environment jsdom

import { EditorView } from "@codemirror/view";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Suspense, startTransition, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "@/components/MarkdownEditor";

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const pending = new Promise<never>(() => {});

function PendingRender({
  active,
  onRender,
}: {
  readonly active: boolean;
  readonly onRender: () => void;
}) {
  if (active) {
    onRender();
    throw pending;
  }
  return null;
}

describe("MarkdownEditor", () => {
  it("marks Markdown syntax markers without coloring content text", async () => {
    const { container } = render(
      <MarkdownEditor
        documentKey="markers.md"
        openDocumentKeys={["markers.md"]}
        visible
        value={"# Heading\n\n- Item\n\n> Quote\n\n```ts\ncode\n```\n\n---"}
        onChange={() => undefined}
      />,
    );

    await screen.findByLabelText("Markdown 본문");
    const markers = [...container.querySelectorAll(".cm-space-mark")].map(
      (element) => element.textContent,
    );

    expect(markers).toEqual(
      expect.arrayContaining(["#", "-", ">", "```", "---"]),
    );
    expect(
      [...container.querySelectorAll(".cm-space-mark")].some((element) =>
        /Heading|Item|Quote|code/.test(element.textContent ?? ""),
      ),
    ).toBe(false);
  });

  it("keeps using the committed onChange while a callback update is pending", async () => {
    const committedOnChange = vi.fn();
    const pendingOnChange = vi.fn();
    const pendingRender = vi.fn();

    function Harness() {
      const [onChange, setOnChange] = useState(() => committedOnChange);
      const [isPending, setIsPending] = useState(false);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              startTransition(() => {
                setOnChange(() => pendingOnChange);
                setIsPending(true);
              });
            }}
          >
            Change callback
          </button>
          <Suspense fallback={null}>
            <MarkdownEditor
              documentKey="memo.md"
              openDocumentKeys={["memo.md"]}
              visible
              value="Initial"
              onChange={onChange}
            />
            <PendingRender active={isPending} onRender={pendingRender} />
          </Suspense>
        </>
      );
    }

    render(<Harness />);
    const content = await screen.findByLabelText("Markdown 본문");
    const view = EditorView.findFromDOM(content);
    expect(view).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Change callback" }));
    await waitFor(() => expect(pendingRender).toHaveBeenCalled());

    view?.dispatch({ changes: { from: view.state.doc.length, insert: "!" } });

    expect(pendingOnChange).not.toHaveBeenCalled();
    expect(committedOnChange).toHaveBeenCalledWith("Initial!");
  });
});
