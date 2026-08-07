import { describe, expect, it } from "vitest";
import { formatRootDisplay } from "@/lib/rootDisplay";

describe("formatRootDisplay", () => {
  it("collapses a deep path to its final parent and leaf", () => {
    expect(
      formatRootDisplay("/Users/x/dev/side-projects/claude-outputs"),
    ).toEqual({ parent: "…/side-projects/", leaf: "claude-outputs" });
  });

  it("keeps a two-level path intact", () => {
    expect(formatRootDisplay("/memo/intents")).toEqual({
      parent: "/memo/",
      leaf: "intents",
    });
  });

  it("keeps only the filesystem root for a one-level path", () => {
    expect(formatRootDisplay("/intents")).toEqual({
      parent: "/",
      leaf: "intents",
    });
  });

  it("does not duplicate the filesystem root slash", () => {
    expect(formatRootDisplay("/")).toEqual({ parent: "", leaf: "/" });
  });
});
