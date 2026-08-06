# Plan: Docs/Intent 이원 공간 + Tab + UI 단순화

작성일: 2026-08-05
상태: 구현·검증 완료
브랜치: `feat/edit-view-mode`
관련: 제품 스펙 `docs/specs/intent-memo.md` · `DESIGN.md` · 선행 plan `docs/plans/pivot-markdown-editor.md`

## 목표

v0.1의 단일 library 3-pane 에디터를 AI 협업 워크플로에 맞는 두 공간(Space)으로 확장한다.

- **Docs 공간**: 사용자가 별도로 지정하는 폴더(`docsRoot`) 기준의 read-write Markdown 문서 공간. AI가 작성한 결과나 프로젝트 문서를 계속 참고하고 필요하면 수정하는 용도로, 문서는 View mode로 먼저 열리고 `View | Edit` toggle은 현재 파일 기준으로 동작한다.
- **Intent 공간**: 기존 `libraryRoot`를 그대로 사용하는 인간 원본 공간. 현재 제품의 canonical source-of-truth 의미론과 기존 문서를 유지하며, 자신의 목적·배경·제약·완료 조건을 먼저 기록하도록 문서는 Edit mode로 열린다.
- 두 공간 모두 익숙한 `View | Edit` Markdown UI를 제공한다. 제품의 차별점은 편집 가능 여부가 아니라, 참고할 문서(Docs)와 사용자가 직접 정리하는 의도(Intent)의 목적을 UI에서 명확히 구분하는 데 있다.
- 두 공간의 전환은 중요한 전환이므로 left pane 상단에 icon·label을 함께 사용하는 눈에 띄는 segmented toggle을 제공한다. 전체 theme은 공유하고 전환 control과 공간별 문구로 목적을 구분한다.
- content pane에 tab bar를 도입해 여러 문서를 동시에 열어 참고한다.
- markdownpreview.app 수준의 단순함을 기준으로 header의 icon을 정리하고, 이동·삭제·이름 변경은 context menu로 옮긴다.

참고 UI: https://markdownpreview.app/ — chrome을 최소화한 content-first 화면.

## 확정된 결정

| 결정 | 요지 |
|---|---|
| 분리 모델 | 하나의 앱 안에서 Docs/Intent 두 공간을 전환한다. 분할 패널이나 별도 창은 사용하지 않는다. |
| Intent 공간 데이터 | 기존 `libraryRoot`를 그대로 사용한다. v0.1의 인간 원본·canonical source-of-truth 의미론과 기존 설정·문서를 유지한다. |
| Docs 공간 데이터 | 설정에 새 독립 경로 `docsRoot`를 저장하는 사용자 선택형 read-write 보조 문서 공간이다. `libraryRoot` 내부/외부 제한을 두지 않되, 파일시스템 안전 계약(경계 canonicalize, symlink·숨김 제외, atomic save, mtime conflict)은 각 root에 동일하게 적용한다. 자동 생성·자동 갱신되는 read-only AI 관리 계층과는 구분한다. |
| 전환 UI | 전체 theme은 공유한다. left pane(folder pane) 최상단에 icon+label 조합의 `Intent | Docs` segment toggle을 두고, 보조 문구 `나의 의도` / `참고 문서`와 empty state로 목적을 구분한다. active segment는 `--accent`, 전환은 180ms 표준 timing, DESIGN.md 토큰만 사용한다. |
| 공간별 기본 mode | Docs에서 문서를 열면 `view`, Intent에서 열면 `edit`이 기본이다. 사용자가 toggle하면 그 문서(tab)가 열려 있는 동안 유지한다. |
| Tab | content pane 상단 tab bar. 목록에서 문서 클릭 시 이미 열린 tab이 있으면 활성화, 없으면 새 tab을 추가한다. tab set은 공간별로 독립이며 재시작 시 복원한다. |
| 아이콘 단순화 | content header에는 tab bar, `View \| Edit` toggle, 저장 상태만 남긴다. 문서·폴더의 이동/휴지통/이름 변경은 목록 항목의 context menu로 이동하고, keyboard 접근 경로를 함께 제공한다. |
| native 계층 | 변경 없음. `scanLibrary` 등 모든 command가 이미 root를 파라미터로 받으므로 dual-root는 frontend + settings 변경만으로 구현한다. |
| 첫 실행 | 기존 onboarding(`libraryRoot` 선택)은 Intent 공간 onboarding으로 유지한다. Docs 공간에 처음 진입할 때 `docsRoot`가 없으면 공간 안에서 폴더 선택을 요구하고, 선택 전에는 Docs workspace를 열지 않는다. |
| 설정 호환 | 기존 `settings.json`의 `libraryRoot`·pane 필드는 이름과 의미를 유지한다. 신규 `docsRoot`는 `null`, `activeSpace`는 `intent`를 default로 채워 migration adapter 없이 로드한다. |
| 후속 pane control | pane icon 두 개를 하나의 cyclic control로 통합한다. `3-pane → folder가 접힌 2-pane → content-only → 3-pane` 순환이며 `⌘1`·`⌘2`는 유지한다. |
| base folder 위치 | folder pane 하단에서 Intent·Docs 두 root를 동시에 확인·개별 변경하고, pane이 숨겨져도 content header에서 현재 root를 확인·변경한다. |

## 결정 Gate

- [x] **기존 `libraryRoot` 귀속** — 기존 `libraryRoot`는 Intent 공간의 인간 원본·canonical source-of-truth로 유지한다. Docs는 신규 `docsRoot`를 사용하며 기존 문서를 재분류하거나 이동하지 않는다.
- [x] **Docs write authority** — Docs도 사용자 선택형 read-write Markdown 공간으로 제공하고 `View | Edit` 및 CRUD를 허용한다. Intent와의 차이는 권한이 아니라 목적과 기본 mode이며, 자동 관리되는 read-only AI 파생 계층은 후속 범위로 남긴다.
- [x] **공간 UI 구분 강도** — Docs/Intent에 별도 theme을 적용하지 않는다. left pane 상단의 icon+label segmented toggle, 공간별 보조 문구·empty state, 기본 mode로 목적을 명확히 구분한다.
- [x] **접힌 layout의 공간 전환** — folder pane이 숨겨지면 content header 좌측에 현재 space의 icon+label을 보여 주는 compact binary toggle을 노출한다. 활성화하면 동일한 저장 gate를 거쳐 다른 space로 직접 전환하며, left pane을 다시 열 필요가 없다.
- [x] **공간 전환·앱 종료 시 편집 buffer 보존** — Slice 2의 단일 문서 단계에서는 `persistCurrent`, Slice 3 완료 후에는 `persistAllOpenDocuments`를 공통 transition barrier로 사용한다. 모든 pending save를 기다리고 모든 dirty 문서 저장이 성공한 경우에만 공간 전환·앱 종료를 진행한다. 하나라도 실패하면 현재 공간·탭·buffer를 유지하고 실패한 tab에 오류를 표시한다. discard 경로는 v0.2에 제공하지 않는다.
- [x] **Context menu action surface** — context menu는 `Rename…`, `Move…`, `Move to Trash` 명령만 제공한다. Rename은 기존 `src/components/NameDialog.tsx`를 재사용하고, Move는 문서·폴더가 공유하는 신규 `src/components/MoveDialog.tsx`에서 대상 폴더를 선택한다. 중첩 destination submenu는 구현하지 않는다.
- [x] **pane layout 공유 범위** — `folderPaneOpen`·`listPaneOpen`은 두 공간이 공유한다(설정 단순화). 공간별 분리는 실사용 후 필요 시 후속.
- [x] **단축키** — space 전환 단축키는 v0.2에 추가하지 않는다. visible control(스위처)이 있으므로 스펙 계약을 만족하며, `⌘1`·`⌘2`는 그대로 둔다. tab 전환·닫기 단축키(`⌘W` 등)는 macOS 창 닫기와 충돌 검토가 필요해 후속으로 미룬다.
- [x] **tab 상한** — 인위적 상한을 두지 않는다. tab bar는 overflow 시 가로 스크롤한다.
- [x] **space 이름 표기** — main label은 `Intent` / `Docs`로 고정하고 icon을 함께 사용한다. left pane 보조 문구는 각각 `나의 의도` / `참고 문서`로 제공한다. 두 공간 모두 Markdown `View | Edit`를 지원하므로 `Markdown`을 space 이름으로 사용하지 않는다.
- [x] **신규 component·test 경로** — UI primitive는 `src/components/SpaceSwitcher.tsx`, `TabBar.tsx`, `ContextMenu.tsx`, `MoveDialog.tsx`로 분리한다. 핵심 regression test는 `src/hooks/useLibraryWorkspace.test.tsx`, `src/components/ContextMenu.test.tsx`, `src/lib/settings.test.ts`에 둔다.

## Step 0 — 스펙·디자인 문서 델타

구현 전 계약 문서를 갱신한다.

- `docs/specs/intent-memo.md`: v0.2 델타 — 두 read-write 공간과 `docsRoot`, 공간별 목적·기본 mode, tab, context menu 이동을 포함·제외 범위와 5장 정보 구조에 반영. §9(장기 확장 경계)의 dual-folder 방향과의 관계를 명시(Intent의 기존 `libraryRoot`는 human 원본이고 Docs는 사용자 선택형 보조 문서 공간이며, 자동 관리되는 read-only AI 파생 계층은 여전히 후속).
- `DESIGN.md`: `SpaceSwitcher`, `TabBar`/`TabItem`, `ContextMenu` 컴포넌트 항목 추가(상태·토큰·접근성). `SpaceSwitcher`는 동일 theme 안에서 icon+label을 함께 사용하고 active segment만 `--accent`로 표시한다. `?showcase=1`에 세 primitive의 상태를 추가한다.
- `CLAUDE.md`: UI Contract의 "Three panes"·"content pane은 Edit | View" 항목을 두 공간·tab 구조로 갱신.

검증: 스펙 문서 안에 미결정 placeholder가 없고, 아래 slice가 스펙 문장으로 역참조 가능하다.

## Slice 1 — Header/아이콘 단순화 + Context Menu

가장 독립적이고 리스크가 낮은 정리를 먼저 한다.

- 두 공간의 문서 목록 항목·폴더 트리 항목에 context menu(우클릭 + keyboard 진입) 도입: `Rename…`, `Move…`, `Move to Trash`.
- 공유 primitive는 `src/components/ContextMenu.tsx`에 구현한다.
- Rename은 기존 `src/components/NameDialog.tsx`를 문서·폴더에 재사용한다. Move는 신규 `src/components/MoveDialog.tsx`를 추가해 문서·폴더 공통 destination 선택을 제공하고, 현재 parent와 폴더 자기 자신·하위 경로를 선택지에서 제외한다.
- content header에서 이동 select·이동 button·휴지통 button 제거. folder pane 하단 `pane-tools`(연필·select·이동·휴지통) 제거.
- context menu는 추가 dependency 없이 자체 구현하고 DESIGN.md의 modal shadow·radius 규칙을 따른다. opener는 `aria-haspopup="menu"`·`aria-expanded`, container는 `role="menu"`, 항목은 `role="menuitem"`을 사용한다. open 시 첫 항목으로 focus를 이동하고 Arrow Up/Down·Home/End로 이동, Enter/Space로 실행, Esc로 닫은 뒤 opener로 focus를 복귀한다.
- 접근성 계약 유지: 모든 CRUD가 keyboard로 도달 가능해야 한다. 목록 항목의 Context Menu key 또는 `⇧F10`으로 menu를 열며, dialog 종료 후 원래 목록 항목으로 focus를 복귀한다.
- 게이트: Step 0의 DESIGN.md `ContextMenu` 정의.
- 검증: `src/components/ContextMenu.test.tsx`에 file-level jsdom 환경을 선언하고 open/focus/Arrow/Home/End/Enter/Space/Esc/focus 복귀를 회귀 테스트한다. `pnpm check`·`pnpm build`·기존 Vitest를 통과하고, 실제 앱에서 문서·폴더 각각 mouse 우클릭과 Context Menu key/`⇧F10`으로 Rename/Move/Trash를 수행하며 제거된 icon의 잔여 import가 없음을 확인한다.

## Slice 2 — Space 모델과 전환 UI

- `LayoutSettings` 확장: `docsRoot: string | null`, `activeSpace: "docs" | "intent"` (zod schema default는 `docsRoot: null`, `activeSpace: "intent"`; 기존 settings.json과 호환 로드).
- left pane과 접힌 content header가 공유하는 두 variant를 `src/components/SpaceSwitcher.tsx`에 구현한다.
- left pane 최상단 brand header 영역을 `Intent | Docs` 두 segment의 icon+label toggle로 재구성한다. 각 segment 아래 또는 active-space header에 `나의 의도` / `참고 문서` 보조 문구를 제공한다. active는 `--accent`·`aria-pressed`, 전환은 180ms이며 공간별 전체 theme·surface 색상은 바꾸지 않는다.
- folder pane이 숨겨진 layout에서는 content header 좌측에 현재 space icon+label을 표시하는 compact binary toggle을 노출한다. visible label은 현재 space를 표시하고 `aria-label`은 전환 대상을 명시한다. toggle 활성화는 left pane switcher와 같은 저장 gate를 사용한다.
- 전환 로직: Slice 2에서는 `persistCurrent` 성공 시에만 `activeSpace`를 바꾸고, `useLibraryWorkspace`에 넘기는 root를 교체한다(root 변경 시 hook이 상태를 리셋하는 기존 동작을 그대로 이용). Slice 3에서 이 gate를 `persistAllOpenDocuments`로 교체한다.
- Docs 공간 첫 진입 시 `docsRoot`가 없으면 workspace 대신 폴더 선택 화면(WelcomeScreen 변형)을 표시한다. 선택 후 즉시 workspace 진입.
- 공간별 기본 mode 적용: 문서 open 시 Docs는 `view`, Intent는 `edit`. (이 시점에는 mode가 아직 단일 state — 문서별 유지는 Slice 3에서 tab state로 흡수.)
- 게이트: Step 0 스펙 델타.
- 검증: `src/lib/settings.test.ts`에서 기존 settings default와 `docsRoot`·`activeSpace` round-trip을 검증한다. 기존 settings.json을 로드하면 `libraryRoot` 문서가 Intent에 그대로 표시되고 active space가 Intent가 된다. 두 공간 전환 시 각 root의 트리·문서가 로드되고, dirty 문서가 전환 전에 저장되며, 재시작 후 `activeSpace`·`docsRoot`가 복원된다. Docs 미지정 상태에서 Docs workspace를 열지 않는다. `⌘1`·`⌘2`로 folder pane을 숨긴 뒤에도 content header compact toggle을 mouse와 keyboard로 직접 전환할 수 있다.

## Slice 3 — Tab

가장 큰 리팩토링. `useLibraryWorkspace`의 단일 `activeDocument` 전제를 다중 문서로 확장한다.

- workspace state를 `openDocuments: Map<path, OpenDocument>` + `activePath`로 재구성. dirty·revision·mtime·saveStatus와 save promise를 문서별로 추적하고, autosave(500ms)·conflict 감지·`persistCurrent(path)`의 의미론을 문서 단위로 유지한다.
- `persistAllOpenDocuments()`는 모든 문서의 진행 중인 save promise를 기다린 뒤 남은 dirty 문서를 저장하고, 문서별 성공/실패 결과를 반환한다. 공간 전환과 window close는 전부 성공한 경우에만 진행하며 실패 시 현재 state를 유지한다.
- tab 전환 시 이전 tab의 dirty buffer는 background 저장한다(전환을 막지 않음). tab 닫기는 해당 tab 저장 성공을 확인한 뒤 진행하고, 공간 전환과 앱 종료는 `persistAllOpenDocuments()` 성공을 확인한 뒤 진행한다.
- tab별 `mode: EditorMode` 보유. 초기값은 공간 기본값, toggle 시 그 tab에서 유지.
- CodeMirror는 단일 `EditorView`에 tab별 `EditorState`를 swap한다(문서 수만큼 인스턴스를 만들지 않는다).
- tab bar UI는 `src/components/TabBar.tsx`에 구현한다: content pane 최상단, 제목 + 닫기 button, active 표시, overflow 가로 스크롤. DocumentList 클릭 = 열린 tab 활성화 또는 새 tab.
- persistence: 공간별 tab 경로 목록과 active tab을 settings에 저장하고 재시작 시 복원한다. 복원 시 존재하지 않는 파일은 조용히 제외한다.
- rename·move·trash(Slice 1의 context menu)와 tab 동기화: 경로 변경 시 tab 경로를 갱신하고, trash 시 해당 tab을 닫는다.
- Tauri main window의 close request를 intercept한다. `persistAllOpenDocuments()` 실행 동안 close를 보류하고, 전부 성공하면 동일 요청의 재진입을 막는 guard와 함께 window를 닫는다. 실패하면 close를 취소하고 실패한 tab을 유지·표시한다.
- 게이트: Slice 2 (공간별 tab set 저장 위치).
- 검증: `src/hooks/useLibraryWorkspace.test.tsx`에 file-level jsdom 환경을 선언하고 문서별 dirty·save promise·부분 실패·tab path rebase·restore filtering을 검증한다. 문서 3개 이상을 tab으로 열고 각 tab의 편집·autosave·mode가 독립 동작, 외부 변경 conflict가 해당 tab에만 표시, 재시작 후 두 공간의 tab set 복원, IME 조합 중 tab 전환으로 입력이 끊기지 않음을 확인한다. 여러 tab이 dirty/saving인 상태에서 공간 전환·window close가 모든 저장을 기다리며, 하나의 save를 실패시키면 전환·종료가 중단되고 모든 buffer가 유지되는 회귀 테스트를 추가한다.

## Slice 4 — 다듬기와 통합 QA

- 빈 상태 정비: Docs는 참고할 문서 선택을, Intent는 자신의 목적·배경·제약·완료 조건 기록을 안내하도록 empty state 문구와 현재 space label을 분리한다.
- `?showcase=1`에 SpaceSwitcher·TabBar·ContextMenu 상태 노출 확인.
- README 갱신(두 공간 소개).
- 통합 QA (실제 Tauri 앱): 첫 실행 Intent onboarding → 기존 `libraryRoot` 원본 유지 확인 → Docs 폴더 지정 → 공간 왕복 → tab 다중 문서 → context menu CRUD → 재시작 복원 → OS light/dark 각각의 가독성·한글 조판.
- 검증 공통: `pnpm test`·`pnpm check`·`pnpm build` 통과, Rust는 변경이 없어야 하며(`git status`로 확인) 변경이 생기면 fmt·clippy·test를 함께 통과시킨다.

## 의존 관계 요약

```
Step 0 (스펙·DESIGN 델타)
   ├─→ Slice 1 (단순화 + context menu)   — 독립
   └─→ Slice 2 (space 모델·전환 UI) ─→ Slice 3 (tab) ─→ Slice 4 (다듬기·QA)
```

Slice 1과 Slice 2는 병행 가능하나 둘 다 content header를 만지므로 순차(1 → 2)를 권장한다.

## 실행 현황

- [x] Step 0 — 스펙·디자인 문서 델타
- [x] Slice 1 — Header/아이콘 단순화 + Context Menu
- [x] Slice 2 — Space 모델과 전환 UI
- [x] Slice 3 — Tab
- [x] Slice 4 — 다듬기와 통합 QA
- [x] 후속 UI — cyclic pane control + 공간별 base folder 위치

## 구현 evidence

- 자동 검증: `pnpm test` 14건, `pnpm check`, `pnpm build`, `cargo test --manifest-path src-tauri/Cargo.toml` 통과.
- settings: v0.1 shape가 기존 `libraryRoot`를 Intent로 유지하면서 `docsRoot: null`, `activeSpace: intent`, 빈 공간별 tab session으로 로드되고 신규 필드는 round-trip 된다.
- 실제 Tauri: Intent/Docs의 독립 tree·복원된 2개 tab, Docs 기본 View, tab별 Edit 복귀, 500ms autosave read-back, compact switcher, mouse context menu, MoveDialog, 재시작 session 복원을 관찰했다.
- 종료 barrier: pending Intent 편집 직후 red window button을 눌러 저장 read-back을 확인했고, `core:window:allow-destroy` capability를 연 뒤 save 성공 시 main window/process가 종료되는 것을 관찰했다. save 실패 시 destroy를 호출하지 않는 회귀 테스트를 포함한다.
- visual: `?showcase=1`의 SpaceSwitcher·TabBar·열린 ContextMenu를 OS light/dark에서 확인하고, Tauri 앱의 full/compact layout과 한글 View/Edit 조판을 확인했다.
- 후속 UI: 두 개의 pane 방향 icon을 `RefreshCw + 현재 pane 수(3/2/1)` 단일 cyclic control로 교체하고, full folder pane에는 Intent·Docs 두 base root를 함께, compact header에는 active root를 노출했다. `nextPaneLayout` 회귀 테스트가 전체 순환을 고정한다.
- 후속 interaction/visual: 실제 Tauri click으로 `2 → 1 → 3 → 2` pane 순환과 settings 저장을 확인하고 Docs base row의 native picker open/cancel을 확인했다. 1024px full/compact/focus 및 680px full capture를 두 독립 visual reviewer가 재검토해 모두 PASS했다.
- 최종 gate: Vitest 14건, Biome 33 files, TypeScript/Vite production build, cargo fmt, clippy `-D warnings`, Rust 5 tests, `git diff --check`를 모두 통과했다.

## 리스크

- **workspace hook 다중 문서 리팩토링** — autosave 경합·mtime conflict 의미론이 문서별로 깨지기 쉽다. `persistCurrent(path)`의 문서별 promise map과 aggregate `persistAllOpenDocuments()`를 분리하고, 다중 dirty·pending·부분 실패 시나리오 회귀 테스트를 slice 안에서 추가한다.
- **공간 전환·앱 종료와 미저장 buffer** — root 교체와 window close가 hook state를 제거하므로, `persistAllOpenDocuments()`가 성공하기 전에는 어느 transition도 commit하지 않는다. 실패 시 discard 없이 현재 state를 유지한다.
- **context menu 접근성** — icon 제거로 visible control이 사라지는 만큼 keyboard 진입·roving focus·opener focus 복귀가 스펙 계약(모든 CRUD keyboard 도달)의 핵심 보증이 된다. 중첩 submenu를 피하고 Rename/Move를 dialog로 분리하며 실기기 keyboard QA를 Slice 1 검증에 포함한다.
- **tab bar와 미니멀리즘 긴장** — chrome이 다시 늘어날 수 있다. tab은 텍스트+닫기만, 고정 높이 1줄, DESIGN 토큰 외 장식 금지를 유지한다.
- **`⌘W` 등 tab 단축키** — macOS 창 닫기 기본 동작과 충돌하므로 v0.2에서 제외했다. 요구가 생기면 Tauri menu 레벨에서 재검토한다.

## 진행 규칙

- git 커밋·푸시는 사용자가 직접 수행한다(conventional commits).
- 각 slice 완료 시 `pnpm check`·`pnpm build` 통과를 확인하고 리뷰를 요청한다.
- dependency 추가 없음. 필요해 보이면 구현 전에 명시적으로 승인 요청한다.
- 결정 Gate는 모두 확정되었다. 구현 중 계약을 바꾸는 새 요구가 발견되지 않는 한 추가 사용자 결정 없이 Step 0부터 순서대로 진행한다.
