import { describe, expect, it } from "vitest";
import { parseMarkdown, serializeMarkdown } from "./markdown";

describe("canonical Markdown", () => {
  it("round-trips created, updated, and the body without legacy metadata", () => {
    const document = {
      created: "2026-08-02T03:04:05.000Z",
      updated: "2026-08-02T04:05:06.000Z",
      body: "# 의도\n\n내가 선택하려는 방향입니다.\n",
    };

    const serialized = serializeMarkdown(document);

    expect(serialized).toBe(
      "---\ncreated: 2026-08-02T03:04:05.000Z\nupdated: 2026-08-02T04:05:06.000Z\n---\n\n# 의도\n\n내가 선택하려는 방향입니다.\n",
    );
    expect(parseMarkdown(serialized)).toEqual(document);
    expect(serialized).not.toContain("title:");
    expect(serialized).not.toContain("tags:");
  });

  it("uses fallback timestamps for a new plain Markdown file", () => {
    const parsed = parseMarkdown("# 새 메모", "2026-08-02T05:06:07.000Z");

    expect(parsed).toEqual({
      created: "2026-08-02T05:06:07.000Z",
      updated: "2026-08-02T05:06:07.000Z",
      body: "# 새 메모",
    });
  });

  it("rejects non-UTC frontmatter timestamps", () => {
    const content = "---\ncreated: yesterday\nupdated: now\n---\n\nbody";

    expect(() => parseMarkdown(content)).toThrow("UTC ISO 8601");
  });
});
