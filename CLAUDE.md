# CLAUDE.md

## Product Contract

Intent Memo is a greenfield Tauri desktop Markdown editor for human-authored intentions. The selected `libraryRoot` remains canonical Intent source data; optional `docsRoot` is a separate user-selected read-write reference-document space. Do not add migration adapters for the former PromptPad product. LLM runtime, automatically managed AI folders, search, tags, toolbar, images, and wiki features are outside v0.2.

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
├── components/                     # folder, document, editor, view, space/tab/menu primitives, dialogs
├── hooks/useLibraryWorkspace.ts    # workspace state and autosave boundary
├── lib/markdown.ts                 # canonical frontmatter parse/serialize
├── lib/native.ts                   # validated Tauri IPC adapter
└── lib/settings.ts                 # roots + active space/tab + pane layout persistence
src-tauri/src/
├── lib.rs                          # Tauri plugins and command registration
└── library.rs                      # recursive filesystem model and safety rules
```

The filesystem is the database. Filenames are document titles. Frontmatter contains only immutable `created` and save-updated `updated`. Native writes use a same-directory temporary file and mtime conflict detection. All paths must remain canonicalized inside the active root (`libraryRoot` or `docsRoot`); hidden paths and symlink traversal stay excluded. Delete actions use system Trash.

## UI Contract

- Three panes: folders, documents, content, with user-facing `Human | AI` space switching (`intent`/`docs` internal keys remain unchanged).
- Clean settings leave both `libraryRoot` and `docsRoot` unset. Onboarding lets the user choose Human or AI first, then select only that space's folder. Both roots are independently persisted, read-write, and cycle `Edit → View → Split(Edit | View)`; Human opens in Edit and AI in View.
- The content pane has one top row: an icon-only pane control, scrollable per-space tabs, save status, and a far-right icon-only mode control; no second header.
- The macOS overlay titlebar keeps native traffic lights, shows `Intent Memo` at the left, and centers the active document title over the whole window. It contains no document actions.
- Rename, move, and Trash live in keyboard-accessible document/folder context menus.
- Human/AI switching lives only in the sidebar so the writing surface does not repeat the current space.
- An icon-only pane button immediately before the tabs cycles three panes, two panes, and content-only. The sidebar alone owns the active root display and folder picker.
- The folder tree root and root move destination use the selected directory basename; never present a hardcoded `Library` default.
- `⌘1` toggles folders while the list is visible; `⌘2` toggles list plus folders.
- The document list uses content-height rows with title, up to two snippet lines, and updated date; folder rows have no numeric counts.
- Appearance offers Light (default), Charcoal, Dark, and System themes; System follows the OS color mode.
- Reuse tokens and primitives from `DESIGN.md`. The development showcase is `?showcase=1`.

## Change Rules

- Keep diffs small; add no dependencies without explicit authorization.
- Run targeted tests, then `pnpm check`, `pnpm build`, Rust format/clippy/tests, and a real Tauri smoke test.
- Do not create commits or push. The user handles Git operations.
