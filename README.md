<p align="center">English | <a href="./README.ko.md">한글</a></p>

<p align="center">
  <img src="https://img.shields.io/badge/v0.1.0-pre--release-C1734B?style=flat-square&labelColor=322F29" alt="v0.1.0 pre-release">
  <img src="https://img.shields.io/badge/macOS-322F29?style=flat-square&logo=apple&logoColor=F4EEE2" alt="macOS">
  <img src="https://img.shields.io/badge/Tauri_2-322F29?style=flat-square&logo=tauri&logoColor=F4EEE2" alt="Tauri 2">
  <img src="https://img.shields.io/badge/React_19-322F29?style=flat-square&logo=react&logoColor=F4EEE2" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-322F29?style=flat-square&logo=typescript&logoColor=F4EEE2" alt="TypeScript">
  <img src="https://img.shields.io/badge/Rust-322F29?style=flat-square&logo=rust&logoColor=F4EEE2" alt="Rust">
  <img src="https://img.shields.io/badge/CodeMirror_6-322F29?style=flat-square&logo=codemirror&logoColor=F4EEE2" alt="CodeMirror 6">
</p>

<p align="center">
  <img src="./assets/readme/hero-en.svg" width="100%" alt="Intent Memo — a minimal Markdown desktop app for capturing your thinking and intent before handing work to AI. A 3-pane workspace: folders, document list, and content.">
</p>

**Intent Memo (의도 메모)** is a minimal Markdown desktop app for writing down your own thinking and intent before handing anything to AI. The Markdown files in the folder you choose are the originals; the app focuses on writing and reading those originals quickly and safely.

## Why intent, not prompts

Intent Memo pivoted from PromptPad, a tool for composing and copying finished AI prompts. What you need before a good prompt is intent — what you want, and why. Intent Memo focuses on that pre-prompt record.

<p align="center">
  <img src="./assets/readme/original-first-en.svg" width="100%" alt="You write your thinking and intent down; it becomes the local Markdown original you own. AI features arrive only in later versions as a derived layer that never replaces the original.">
</p>

- It starts from Markdown editor fundamentals: fast and safe writing, autosave, and local originals you own.
- On top of that, it gradually adds writing conveniences that help make intent concrete — purpose, background, constraints, and completion criteria.
- AI features will be considered only in later versions, as a derived layer that never replaces what a human wrote.

## v0.2

- Two distinct read-write Markdown spaces: **Intent** for your purpose and **Docs** for reference material
- Independent local roots for each space, with a visible left-pane switcher and compact fallback when the pane is hidden
- Multiple document tabs with space-specific session restore and per-tab `Edit` / rendered `View` mode
- Create, rename, and move documents and folders; delete to the system Trash
- Keyboard-accessible context menus for rename, move, and Trash actions
- CodeMirror 6 Markdown syntax highlighting
- Per-document 500 ms autosave, atomic writes, external-change conflict protection, and save barriers before space switch or app close
- `⌘1` folder pane toggle, `⌘2` content-only mode
- OS light/dark and fixed CJK typography

Search, tags, a Markdown toolbar, images, wiki/backlinks, an LLM runtime, and AI-managed folders are follow-up scope.

## Data

On first run you pick the Intent `libraryRoot`; the Docs `docsRoot` is chosen when you first enter Docs. The filename is the source of truth for a document's title, and new documents start with minimal frontmatter and an empty body.

```markdown
---
created: 2026-08-02T00:00:00.000Z
updated: 2026-08-02T00:00:00.000Z
---
```

Hidden paths and symlinks are not traversed. Deletion uses the operating system Trash instead of permanent deletion. Settings are stored as `settings.json` in the OS app-data location for bundle ID `app.tkbetter.intentmemo`.

## Development

Prerequisites: Node.js 18+, pnpm, Rust, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
pnpm install
pnpm tauri:dev
```

```bash
pnpm check
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri:build
```

`pnpm check` is non-mutating. Use `pnpm biome check --write .` when formatting is intended.

## Release

The first Intent Memo release is `v0.1.0`. The legacy PromptPad releases and `v0.1.x` tags are deleted from this repository before tagging, so the greenfield `0.1.0` line starts clean. The sources already carry `0.1.0`; tag the first release directly without running `pnpm release`. From the second release on, use `pnpm release patch`, `pnpm release minor`, or `pnpm release major`.

A `v*` tag triggers the signed macOS release workflow. Publishing the draft release triggers `.github/workflows/homebrew-bump.yml`, which renders `distribution/homebrew/intent-memo.rb` with release checksums and updates `tkhwang/homebrew-tap`. The repository secret `TAP_GITHUB_TOKEN` must have Contents write access to that tap.

## Stack

- Tauri 2 / Rust
- React 19 / TypeScript
- CodeMirror 6
- react-markdown + remark-gfm
- Biome / Vitest
