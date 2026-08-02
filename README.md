# Intent Memo

**의도 메모**는 AI 시대에 인간이 자신의 생각과 의도를 직접 기록하는 미니멀 Markdown 데스크톱 앱입니다. 선택한 폴더의 Markdown 파일이 원본이며, 앱은 그 원본을 편집하고 읽는 데 집중합니다.

## v0.1

- 단일 Markdown library와 임의 깊이의 폴더
- 문서·폴더 생성, 이름 변경, 이동, 시스템 휴지통 이동
- CodeMirror 6 Markdown syntax highlighting
- 500ms autosave, atomic write, 외부 변경 충돌 보호
- 동일 문서의 `Edit` / rendered `View`
- `⌘1` 폴더 pane, `⌘2` content-only 전환
- OS light/dark와 고정 CJK typography

검색, tags, Markdown toolbar, 이미지, wiki/backlink, LLM runtime과 AI 관리 폴더는 후속 범위입니다.

## Data

첫 실행에서 사용자가 `libraryRoot`를 선택합니다. 파일명은 제목의 source of truth이며, 새 문서는 최소 frontmatter만 가집니다.

```markdown
---
created: 2026-08-02T00:00:00.000Z
updated: 2026-08-02T00:00:00.000Z
---

나의 의도와 생각
```

숨김 경로와 symlink는 탐색하지 않습니다. 삭제는 영구 삭제 대신 운영체제 휴지통을 사용합니다. 설정은 bundle ID `app.tkbetter.intentmemo`의 OS app-data 위치에 `settings.json`으로 저장됩니다.

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

```bash
pnpm release patch
```

A `v*` tag triggers the signed macOS release workflow. Publishing the draft release triggers `.github/workflows/homebrew-bump.yml`, which renders `distribution/homebrew/intent-memo.rb` with release checksums and updates `tkhwang/homebrew-tap`. The repository secret `TAP_GITHUB_TOKEN` must have Contents write access to that tap.

## Stack

- Tauri 2 / Rust
- React 19 / TypeScript
- CodeMirror 6
- react-markdown + remark-gfm
- Biome / Vitest
