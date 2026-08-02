# CLAUDE.md

## Product Contract

Intent Memo is a greenfield Tauri desktop Markdown editor for human-authored intentions. The selected `libraryRoot` is canonical source data. Do not add migration adapters for the former PromptPad product. LLM runtime, AI-managed folders, search, tags, toolbar, images, and wiki features are outside v0.1.

Read `docs/specs/intent-memo.md` and `DESIGN.md` before changing product behavior or UI.

## Commands

```bash
pnpm tauri:dev       # Vite + native desktop app
pnpm build           # TypeScript build + production web bundle
pnpm check           # non-mutating Biome check
pnpm test            # Vitest
pnpm tauri:build     # production desktop bundle
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
```

## Architecture

```text
src/
├── App.tsx                         # onboarding + 3-pane workspace orchestration
├── components/                     # folder, document, editor, view, dialogs
├── hooks/useLibraryWorkspace.ts    # workspace state and autosave boundary
├── lib/markdown.ts                 # canonical frontmatter parse/serialize
├── lib/native.ts                   # validated Tauri IPC adapter
└── lib/settings.ts                 # libraryRoot + pane layout persistence
src-tauri/src/
├── lib.rs                          # Tauri plugins and command registration
└── library.rs                      # recursive filesystem model and safety rules
```

The filesystem is the database. Filenames are document titles. Frontmatter contains only immutable `created` and save-updated `updated`. Native writes use a same-directory temporary file and mtime conflict detection. All paths must remain canonicalized inside `libraryRoot`; hidden paths and symlink traversal stay excluded. Delete actions use system Trash.

## UI Contract

- Three panes: folders, documents, content.
- The content pane is `Edit | View`; no hybrid preview or toolbar.
- `⌘1` toggles folders while the list is visible; `⌘2` toggles list plus folders.
- OS color mode and product typography are fixed; only library location is configurable.
- Reuse tokens and primitives from `DESIGN.md`. The development showcase is `?showcase=1`.

## Change Rules

- Keep diffs small; add no dependencies without explicit authorization.
- Run targeted tests, then `pnpm check`, `pnpm build`, Rust format/clippy/tests, and a real Tauri smoke test.
- Do not create commits or push. The user handles Git operations.
