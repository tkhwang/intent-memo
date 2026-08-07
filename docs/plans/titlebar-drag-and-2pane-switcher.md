# Plan: Titlebar 드래그 수리 + 2-pane Human↔AI 스위처 노출

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

작성일: 2026-08-07
상태: 구현 및 검증 완료
브랜치: `feat-update-0807`
관련: `docs/specs/intent-memo.md` §5.2 · `DESIGN.md` SpaceSwitcher/ActiveRoot · `CLAUDE.md` UI Contract

**Goal:** (1) overlay titlebar를 드래그해 창을 이동할 수 있게 하고, (2) 제품의 핵심인 Human↔AI 전환을 folder pane이 접힌 2-pane 상태에서도 사이드바(문서 목록 pane) 상단에 노출한다.

## 원인 분석 (조사 완료)

### 문제 1 — titlebar 드래그가 안 됨

- markup은 정상: `App.tsx` `WindowFrame`의 header·자식 요소 모두 `data-tauri-drag-region` 보유, `tauri.conf.json`은 `titleBarStyle: "Overlay"`.
- 실제 원인은 **권한 누락**. Tauri가 주입하는 drag 스크립트는 mousedown 시 `plugin:window|start_dragging`을 invoke하는데, 잠긴 tauri 2.10.2의 `core:window:default` 권한 세트에는 `allow-internal-toggle-maximize`(더블클릭 최대화)만 있고 **`allow-start-dragging`이 없다**. 현재 capabilities는 `core:default`만 사용하므로 invoke가 ACL에서 거부되어 드래그만 조용히 실패한다(더블클릭 최대화는 동작 — "잘 안 됨" 증상과 일치).

### 문제 2 — Human↔AI 스위처가 3-pane에서만 보임

- `SpaceSwitcher`(full)는 folder pane의 `.space-header`에만 렌더된다. `PanelLeft` 순환으로 2-pane(`listPaneOpen && !folderPaneOpen`)이 되면 전환 UI가 완전히 사라진다.
- content-only(1-column)는 이번 스코프에서 제외한다(사용자 합의: "1 column은 어렵더라도 2 column에서는").

## Decision Gates

- [x] **2-pane active root 소유권**
  - Impact: 사용자-visible navigation 계약과 backing folder 확인·변경 동선.
  - Current evidence: `SpaceSwitcher`는 `root` prop이 없으면 root row를 렌더하지 않으며, 기존 `DESIGN.md`/`CLAUDE.md`는 active root 표시·변경을 folder pane 소유로 둔다.
  - Resolved: **2-pane 문서 목록 pane에는 full Human/AI 전환만 제공하고, active root 표시·변경은 folder pane 전용으로 유지한다.**
  - Rationale: 핵심 문제인 2-pane 공간 전환 부재만 최소 수정하고, `⌘1`로 folder pane을 복원해 root를 확인·변경하는 기존 동선을 보존한다. content pane에는 공간·root label을 추가하지 않는다.

## 수정 방안

### Task 1 — 드래그 권한 추가

- [x] `src-tauri/capabilities/default.json` permissions에 `core:window:allow-start-dragging` 추가.
- [x] Tauri build가 갱신하는 tracked snapshot `src-tauri/gen/schemas/capabilities.json`에 동일 권한이 반영됐는지 확인하고 diff에 포함.
- [x] production app 스모크: titlebar 빈 영역·`Intent Memo` 텍스트·중앙 문서 제목 위에서 드래그로 창 이동, 더블클릭 최대화/복원 확인.

### Task 2 — 2-pane에서 SpaceSwitcher 노출

- [x] `App.tsx`: `settings.listPaneOpen && !folderVisible`일 때 list pane 최상단에 `.space-header` 블록 렌더.
  - full `SpaceSwitcher` 사용(`activeSpace` + `onChange={changeSpace}`), **root row는 넘기지 않음** — active root 표시·변경은 folder pane 단독 소유라는 기존 계약 유지.
  - switcher segment 위의 `⌘1` badge는 제거하고 keyboard shortcut 동작만 유지.
  - 3-pane에서는 folder pane 쪽 스위처만 렌더되므로 radio group 중복 없음.
- [x] `src/index.css`: `.list-pane .space-header`에서 `--sidebar-border`/`--sidebar-muted`를 `--border`/`--muted`로 remap. (charcoal 테마는 sidebar만 어둡고 list pane은 밝으므로 sidebar 토큰을 그대로 쓰면 색이 깨진다. light/dark에서는 no-op.)
- [x] `src/App.test.tsx`: pane별 switcher/root 소유권과 space 전환 저장 barrier를 회귀 테스트로 고정.
  - 2-pane(`folderPaneOpen: false, listPaneOpen: true`): radiogroup 정확히 1개, `.list-pane .root-row` 없음, `⌘1` badge 없음.
  - 3-pane: radiogroup 정확히 1개, folder pane의 `.root-row` 존재.
  - content-only: radiogroup 0개, `.root-row` 없음.
  - AI 선택 성공 경로에서는 `persistAllOpenDocuments()`를 `true`로 mock하고 저장 barrier 호출 후 `onSettingsChange`가 실행되는지 확인.
  - 저장 barrier가 `false`를 반환하면 active space와 settings가 변경되지 않는지 확인.

### Task 3 — 문서 동기화

- [x] `docs/specs/intent-memo.md` §5.2-7: "Human/AI 전환과 active root 확인·변경은 folder pane에서만 제공한다" → 전환은 folder pane이 접힌 2-pane에서 문서 목록 pane 상단에도 제공하되, root 표시·변경은 folder pane 전용으로 유지한다고 수정.
- [x] `docs/specs/intent-memo.md` §11의 stale `content-only compact space toggle·active root` 검증 문구를 현재 계약으로 교체.
  - 3-pane/2-pane에는 Human/AI switcher가 정확히 하나 존재한다.
  - 2-pane에는 active root를 반복하지 않고, content-only에는 switcher/root를 노출하지 않는다.
  - Light·Charcoal·Dark·System에서 위 pane별 계약과 가독성을 확인한다.
- [x] `DESIGN.md` SpaceSwitcher 절: "Human/AI 전환은 sidebar에만 둔다" 문구에 2-pane fallback(문서 목록 pane 상단) 명시. content pane에 공간 label을 반복하지 않는 원칙은 그대로.
- [x] `DESIGN.md` ActiveRoot 절: 2-pane fallback에는 root를 넘기지 않으며 `⌘1`로 folder pane을 복원해 root를 확인·변경한다는 소유권 명시.
- [x] `CLAUDE.md` UI Contract의 "Human/AI switching lives only in the sidebar" 줄을 동일 취지로 갱신.

### Task 4 — Human/AI 아이콘 갱신

- [x] `SpaceSwitcher`를 `Human Brain · Bot AI` 순서로 배치하고 가운데 화살표를 active space에서 target space로 향하도록 전환(Human `→`, AI `←`).
- [x] `SpaceSwitcher.test.tsx`에서 두 아이콘 계약을 회귀 테스트로 고정.
- [x] `docs/specs/intent-memo.md`와 `DESIGN.md`의 switcher anatomy를 동일 아이콘으로 동기화.

### Task 5 — 앱 아이콘 갱신

- [x] 기존 cream paper squircle 스타일을 유지하고 위 `Brain`/`Robot`, 아래 `Memo`를 `Brain ↓ Memo ↑ Robot` U자 흐름으로 연결한 2행 앱 아이콘 생성.
- [x] `pnpm exec tauri icon <generated-master>`로 macOS/Windows/iOS/Android icon assets 전체 갱신.
- [x] `DESIGN.md`에 앱 아이콘 anatomy와 32px 가독성 원칙 기록.

## 검증

- [x] Targeted: `pnpm exec vitest run src/App.test.tsx src/components/SpaceSwitcher.test.tsx src/lib/settings.test.ts` → 30/30.
- [x] Frontend: `pnpm test` → 61/61, `pnpm check`, `pnpm build` 통과.
- [x] Native: `cargo fmt --manifest-path src-tauri/Cargo.toml --check` → `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings` → `cargo test --manifest-path src-tauri/Cargo.toml`(9/9) 통과.
- [x] Production/config: updater signing credential가 필요하지 않은 app/DMG 검증을 위해 `pnpm exec tauri build --config '{"bundle":{"createUpdaterArtifacts":false}}'` 실행. capability identifier, generated snapshot, macOS app, DMG 생성 확인.
- [x] Diff hygiene: `git diff --check` 및 의도한 파일만 변경됐는지 `git status --short`로 확인.
- [x] production app 수동 스모크:
  - titlebar 빈 영역·`Intent Memo` 텍스트·중앙 문서 제목에서 실제 창 드래그 이동, 더블클릭 최대화/복원.
  - `PanelLeft`로 3-pane → 2-pane → content-only 순환: switcher 수가 각각 1 → 1 → 0이고, root row는 folder pane이 열린 3-pane에만 존재.
  - 2-pane Human↔AI 전환 전에 dirty/pending 문서가 저장되고 전환 후 대상 공간이 정상 로드됨. 저장 실패 차단 경로는 App 회귀 테스트로 검증.
  - 새로 연 Human 문서는 Edit, AI 문서는 View로 시작하며 사용자가 변경한 mode는 해당 tab이 열려 있는 동안 유지됨.
  - Light·Charcoal·Dark·System 각각에서 2-pane switcher의 공간색, border/muted 대비, 한글 조판, 좁은 list pane overflow 확인.
- [x] 최신 production 캡처 독립 시각 QA 2-pass: design-system/functional integrity `PASS`, visual fidelity/CJK precision `PASS`, blocking 0건.

## Global Constraints

- diff 최소 유지, 의존성 추가 없음. Rust 코드 변경 없음(권한 JSON만).
- 커밋·푸시는 사용자가 직접 수행한다.
