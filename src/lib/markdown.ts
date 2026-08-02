import { JSON_SCHEMA, load } from "js-yaml";

export type MarkdownDocument = {
  readonly created: string;
  readonly updated: string;
  readonly body: string;
};

const FRONTMATTER_PATTERN =
  /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?(?:\r?\n)?([\s\S]*)$/;
const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function parseMarkdown(
  content: string,
  fallbackTimestamp = new Date().toISOString(),
): MarkdownDocument {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    return {
      created: fallbackTimestamp,
      updated: fallbackTimestamp,
      body: content,
    };
  }

  const yaml = match[1] ?? "";
  const body = match[2] ?? "";
  const parsed = load(yaml, { schema: JSON_SCHEMA });
  if (!isRecord(parsed)) {
    throw new MarkdownFormatError("Frontmatter must be a YAML object");
  }

  const created = parseTimestamp(parsed.created, fallbackTimestamp);
  const updated = parseTimestamp(parsed.updated, fallbackTimestamp);

  return { created, updated, body };
}

export function serializeMarkdown(document: MarkdownDocument): string {
  assertUtcTimestamp(document.created);
  assertUtcTimestamp(document.updated);
  const body = document.body.endsWith("\n")
    ? document.body
    : `${document.body}\n`;

  return `---\ncreated: ${document.created}\nupdated: ${document.updated}\n---\n\n${body}`;
}

export function withUpdatedBody(
  document: MarkdownDocument,
  body: string,
  timestamp = new Date().toISOString(),
): MarkdownDocument {
  return {
    created: document.created,
    updated: timestamp,
    body,
  };
}

export class MarkdownFormatError extends Error {
  readonly name = "MarkdownFormatError";
}

function parseTimestamp(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string") {
    throw new MarkdownFormatError("Frontmatter timestamps must be strings");
  }
  assertUtcTimestamp(value);
  return value;
}

function assertUtcTimestamp(value: string): void {
  if (!UTC_ISO_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new MarkdownFormatError(
      "Frontmatter timestamps must use UTC ISO 8601",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
