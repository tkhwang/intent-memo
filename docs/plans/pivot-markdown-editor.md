# Plan: PromptPad → Intent Memo Pivot

작성일: 2026-08-02
상태: 로컬 구현 완료 · 외부 release gate 대기
관련: wayfinder 맵 `.scratch/pivot-markdown-editor/map.md` · 제품 스펙 `docs/specs/intent-memo.md`

## 목표

PromptPad를 `Intent Memo`(의도 메모)라는 lightweight 미니멀 Markdown editor/memo 앱으로 전환한다.
전제(확정): Tauri 2 + React 19 유지 · single repo 평탄화 · prompt 특화 기능 전부 제거 · `Intent Memo`로 리브랜딩 · brew(tkhwang/homebrew-tap) 배포.

## 장기 제품 방향

- 제품의 출발점은 AI 기능이 아니라, AI 시대에 한 인간이 자신의 생각과 의도(intent)를 직접 정리해 남기는 Markdown memo다.
- v1은 그 인간 작성 원본을 빠르고 안전하게 편집하는 Core-only desktop editor다.
- 이후 LLM은 이 원본을 검색·연결·활용해 개인 비서로 동작하되, 인간의 의도와 저작권을 대체하지 않는 knowledge/assistant 제품으로 확장한다.
- v1에는 LLM runtime, embedding/index, chat, graph, MCP/API를 포함하지 않는다.
- 장기적으로 사용자 원본 폴더와 AI 관리 폴더를 분리하고 동일 앱에서 서로 다른 권한과 표현 방식을 적용한다.
- v1은 이 dual-folder를 구현하지 않고 단일 Markdown library에서 edit/rendered view만 제공한다.

## 확정된 결정 (research 완료분)

| 결정 | 요지 |
|---|---|
| 에디터 기술 | CodeMirror 6 직접 통합 (스타일드 소스 에디터, 한글 IME 대응 최상, 파일 포맷 무변경) |
| MiaoYan UX 차용 | 리스트 셀 최소화 · pane 접기 ⌘1/⌘2 비대칭 종속 · 설정 최소화(값 하드코딩) · 본문 폭 고정+CJK 조판 |
| brew 배포 | 서명·notarization은 기존 workflow에 완성. 신규: cask 1개 + homebrew-bump.yml(트리거 `release: published`) + `TAP_GITHUB_TOKEN`. cask에 `auto_updates true` 필수 |

## 결정 Gate

- [x] **문서 canonical 저장 형식**
  - 결정: 파일명을 제목의 source of truth로 사용하고, 문서에는 최소 YAML frontmatter를 유지한다.
  - v1 metadata: `created`, `updated`
  - 후속 metadata: `tags`, `pinned`는 필요해질 때 optional field로 추가한다.
  - 제거 metadata: `title`, `templateValues`, `repoPath`
  - 구현 영향: 새 문서와 새 library만 대상으로 하며 legacy PromptPad schema adapter는 만들지 않는다.
- [x] **폴더 계층 범위**
  - v1 결정: 하나의 `libraryRoot`에서 root-level Markdown 문서와 임의 깊이의 중첩 폴더를 지원한다.
  - `libraryRoot`는 read-write이며 여러 workspace profile 동시 지원은 v1에 포함하지 않는다.
  - 구현 영향: 현재 Topic 기반 1-depth loader를 recursive filesystem read model로 교체한 뒤 UI를 연결한다.
- [x] **기존 파일 호환성·마이그레이션 범위**
  - 결정: 기존 사용자가 없는 greenfield 전환으로 간주한다.
  - 기존 PromptPad library import·변환·backup·rollback·legacy settings 이관은 구현하지 않는다.
  - 새 앱은 새 기본 library에서 새 canonical 형식으로 시작한다.
- [x] **v1 최소 기능 범위**
  - 포함: 단일 library, recursive 탐색, 파일·폴더 CRUD와 move, 파일명=제목, CodeMirror Markdown syntax highlighting, autosave, 동일 문서의 rendered view.
  - 후속: 검색, pin, tags, Markdown toolbar, 이미지 붙여넣기, wiki/backlink, 표·체크박스 보조.
  - 제거: template, LLM launcher, block editor, repo 연결, file mention, data export와 관련 설정·Rust command.
- [x] **v1 설정·커스터마이즈 표면**
  - 결정: Markdown editor 핵심 구현을 우선하고 사용자 커스터마이즈는 후속 버전으로 연기한다.
  - v1 설정 표면: `libraryRoot` 경로 선택·변경만 제공한다.
  - 후속 범위: theme 선택, font size, 언어 선택 UI, 기타 appearance 설정.
  - 기본 동작: 색상 모드는 OS 설정을 따르고 타이포그래피는 제품 기본값으로 고정한다.
- [x] **CodeMirror v1 고급 기능 범위**
  - 결정: v1은 Markdown syntax highlighting만 제공한다.
  - hybrid live preview와 편집 보조 기능은 후속 slice로 연기한다.
- [x] **향후 LLM knowledge/assistant의 source-of-truth 경계**
  - 사용자 원본 폴더: canonical source-of-truth. 앱에서 생성·수정·rename·move·delete 가능한 editable 영역.
  - AI 관리 폴더: LLM이 생성·관리하는 derived knowledge. 앱에서는 read-only로 탐색하고 Markdown render만 제공.
  - 앱은 AI 관리 폴더의 파일을 수정하지 않으며, AI 파생 데이터는 원본 손상 없이 재생성할 수 있어야 한다.
  - 후속 버전에서 두 폴더를 독립 경로로 선택하며 경로명 자체는 앱이 강제하지 않는다.
- [x] **dual-folder 도입 시점**
  - 결정: Human/AI mode와 dual-folder UI는 후속 버전으로 연기한다.
  - v1은 단일 `libraryRoot`와 동일 문서의 `Edit | View` mode만 제공한다.
  - AI runtime, 생성, indexing, chat, graph, MCP/API도 v1 범위 밖이다.
- [x] **앱 이름·bundle identifier·repo/cask 이름**
  - 제품 표시명: `Intent Memo`
  - 한국어 제품 설명: `의도 메모`
  - artifact slug: `intent-memo` — repo, package/app artifact, Homebrew cask에 동일하게 사용한다.
  - bundle namespace: `app.tkbetter`
  - full bundle identifier: `app.tkbetter.intentmemo`
  - 초기 제품 버전: greenfield artifact로 `0.1.0`에서 시작하고, 기존 PromptPad `0.1.8`은 계승하지 않는다.
  - 확정: `Prompt` 브랜드와 `PromptMemo` 후보는 사용하지 않는다.
  - 의미 기준: "AI를 위한 메모"가 아니라 "AI 시대에 인간이 자신의 생각과 의도를 정리해 남기는 메모"를 표현한다.
  - 이름 자체에 `AI`를 넣지 않고, 인간의 의도·저작성과 기본 note/editor 성격을 우선한다.
- [x] **최종 spec 파일명과 경로**
  - 결정: `docs/specs/intent-memo.md`
- [x] **파일·폴더 삭제 의미론**
  - 결정: 파일과 폴더는 운영체제 시스템 휴지통으로 이동한다.
  - v1에는 영구 삭제 기능을 제공하지 않는다.
  - trash 이동이 실패하면 원본을 유지하고 사용자에게 오류를 표시한다.
  - 모든 삭제 요청은 canonicalized path가 `libraryRoot` 내부인지 확인한 뒤 native trash adapter에 전달한다.

## Phase 0 — 결정 마무리

구현 착수 전 해소해야 할 제품 결정:

1. **데이터 모델 결정** — 완료: 새 단일 library, 파일명=제목, 최소 frontmatter, 중첩 폴더 지원.
2. **v1 최소 기능 목록 확정** — 완료: filesystem CRUD·CM6 edit·rendered view·autosave만 포함.
3. **에디터 고급 기능 범위 결정** — 완료: v1에는 syntax highlighting 외 고급 편집 기능을 포함하지 않음.
4. **LLM knowledge/assistant 경계 결정** — 완료: source는 edit, AI managed knowledge는 read-only render. 실제 dual-folder UI는 후속.
5. **앱 이름 결정** — 완료: `Intent Memo` / `의도 메모` / `intent-memo` / `app.tkbetter.intentmemo`.
6. **파일·폴더 삭제 의미론** — 완료: system Trash 이동, 영구 삭제 없음, 실패 시 원본 유지.

`docs/specs/intent-memo.md` 작성과 3-pane rough prototype은 결정 질문이 아닌 실행 산출물이다. spec은 Phase 0 결정 종료 직후 작성하고, prototype은 workspace slice 안에서 구현 전 visual baseline으로 만든다.

## Phase 1+ — 구현 Vertical Slices

각 slice는 독립적으로 "빌드 통과 + 앱 동작" 상태를 유지한 채 종료한다.
검증 공통: `pnpm build` + `pnpm check` + `tauri dev` 수동 스모크.

### Slice 1 — 레포 평탄화

- backend(`apps/backend`)·`packages/shared`·turborepo·pnpm workspace 제거
- `apps/desktop/*` → 루트 `src/` + `src-tauri/`로 이동, 단일 `package.json`
- 루트 script를 단일 앱 기준으로 정리: `build`, 비수정 `check`, `test`, `tauri:dev`, `tauri:build`
- CI workflow 경로 수정 (`build-macos.yml`, MAS workflow)
- 게이트: 없음 (확정 결정만으로 착수 가능)
- 검증: `pnpm build`·`pnpm tauri dev` 정상, CI green

### Slice 2 — Prompt 특화 기능 제거

- 템플릿 시스템(`lib/template.ts`, TemplatePanel), LLM launcher(`lib/llm-services.ts`, StatusBar 연동), 블록 시스템(BlockCard, `---` 분리) 제거
- prompt 특화 UI·동작과 저장 필드(`templateValues`, `repoPath`)를 함께 제거
- repo 연결·file mention·data export와 관련 설정·Tauri command 제거
- 검색·tags·pin·Markdown toolbar는 v1 surface에서 제거
- 기존 Markdown renderer는 동일 문서의 View mode로 축소·재사용
- 게이트: 없음 (v1 최소 기능 확정)
- 검증: library 탐색·편집·autosave만 남고 제거된 기능의 import·setting·Tauri permission이 없음

### Slice 3 — filesystem 데이터 모델 전환

- Topic 기반 1-depth loader를 단일 `libraryRoot`의 recursive filesystem read-write model로 교체
- root/nested `.md` 문서와 폴더의 create·rename·move를 지원하고, delete는 system Trash 이동으로 처리한다. library root 밖 경로·symlink traversal·숨김 경로는 탐색 대상에서 제외한다.
- 파일명=제목 모델 적용; v1 frontmatter는 UTC ISO 8601 `created`·`updated`만 사용
- `created`는 생성 후 불변, `updated`는 본문 또는 파일명 저장 성공 시 갱신
- 저장은 같은 디렉토리의 임시 파일을 거친 atomic replace로 수행하고, load 이후 disk mtime이 달라졌으면 자동 덮어쓰지 않고 conflict error를 표시
- 기존 PromptPad library migration·legacy schema adapter는 구현하지 않음
- filesystem boundary, rename/move collision, frontmatter round-trip, external-change conflict 회귀 테스트 추가
- 게이트: 없음 (삭제 의미론 포함 filesystem 계약 확정)
- 검증: root/nested CRUD, 경계 이탈 차단, 충돌 시 원본 보존, frontmatter round-trip 정상

### Slice 4 — CodeMirror 6 에디터 교체

- PromptEditor(textarea) → CM6 (`EditorView` 직접 통합, `@lezer/markdown` 조합)
- 마크다운 syntax highlighting만 제공
- 한글 IME 회귀 테스트 (조합 입력, 하이라이트 경계)
- 별도 preview·hybrid live preview·이미지·wiki/backlink·표·체크박스 보조는 구현하지 않음
- 게이트: Slice 3 문서 모델 준비
- 검증: 대용량 문서 타이핑 지연 없음, IME 정상, 저장 파일 본문 바이트 동일

### Slice 5 — single-root 3-pane workspace

- TopicPanel/Sidebar → 폴더 pane / 문서 리스트 pane / content pane 구조로 재구성
- 단일 `libraryRoot`를 recursive 탐색해 root-level 문서와 임의 깊이 폴더를 표시
- content pane은 동일 문서를 `Edit | View`로 전환하고 View mode는 Markdown render를 제공
- pane 접기: ⌘1(폴더 토글, 독립) / ⌘2(리스트+폴더 접기 → 에디터 단독)
- 문서 리스트 셀 최소화 (제목+updated 날짜, pin은 후속)
- 구현 전 rough prototype을 slice-local visual baseline으로 만들고 실제 앱 browser/webview에서 비교 검증
- 게이트: Slice 3 recursive filesystem model, Slice 4 editor 준비
- 검증: 접기 상태 전 조합 정상, 재시작 시 레이아웃 복원, visual baseline 대비 확인

### Slice 6 — 리브랜딩

- 제품명 `Intent Memo`, bundle ID `app.tkbetter.intentmemo`, package/repo/cask slug `intent-memo`로 전환
- 인간이 AI 활용의 원천이 되는 자신의 의도를 기록한다는 의미를 담은 새 앱 아이콘을 생성하고, project source asset과 Tauri 전체 platform icon set에 반영
- AppData 설정 위치를 새 bundle identity 기준으로 변경하며 기존 PromptPad 설정 migration은 구현하지 않음
- 최초 launch에서 단일 `libraryRoot`를 선택
- README·CLAUDE.md와 release artifact 이름 갱신
- 게이트: 없음 (이름·identifier·artifact 확정)
- 검증: 클린 설치에서 library 선택 전 workspace에 진입하지 않으며 선택값이 재시작 후 복원되고, macOS bundle과 실행 중 앱에 새 아이콘이 표시됨

### Slice 7 — 미니멀 다듬기

- 설정은 libraryRoot 경로 변경만 제공하고 theme·font·language 선택 UI는 구현하지 않음
- 색상 모드는 OS 설정을 따르고 본문 폭·행간·자간·font는 제품 기본값으로 고정
- 게이트: v1 최소 기능 목록
- 검증: 설정에서 library 변경 가능, OS light/dark 반영, 고정 typography 시안 대비 확인

### Slice 8 — brew 배포

- `tkhwang/homebrew-tap`에 cask 추가 (`auto_updates true`, zap에 사용자 데이터 제외)
- `homebrew-bump.yml` 신규 (workbranch companion-release.yml 패턴, `release: published` 트리거)
- `TAP_GITHUB_TOKEN` secret 등록 (수동 1회)
- 게이트: Slice 6 완료 (cask 토큰 = 최종 이름)
- 검증: 실제 릴리스 1회 → `brew install --cask` 성공, `brew upgrade` 다운그레이드 없음

## 의존 관계 요약

```
Phase 0 결정 ──→ 스펙(docs/specs/intent-memo.md) ──→ 구현 착수
Slice 1 → 2 → 3 → 4 → 5 → 6 → 8
                              7은 5 이후 아무 때나
```

모든 결정 gate가 닫혔으므로 `docs/specs/intent-memo.md` 작성 후 Slice 1부터 순서대로 구현한다.

## 실행 현황

- [x] Step 0 — 확정 결정으로 `docs/specs/intent-memo.md` 작성
- [x] Slice 1 — 레포 평탄화
- [x] Slice 2 — Prompt 특화 기능 제거
- [x] Slice 3 — filesystem 데이터 모델 전환
- [x] Slice 4 — CodeMirror 6 에디터 교체
- [x] Slice 5 — single-root 3-pane workspace
- [x] Slice 6 — 리브랜딩
- [x] Slice 7 — 미니멀 다듬기
- [ ] Slice 8 — brew 배포

Step 0 evidence (2026-08-02): 제품 의도, v0.1 포함·제외 범위, canonical Markdown, 파일시스템 안전·충돌·휴지통 계약, 장기 Human/AI 폴더 경계, 배포·검증 기준을 스펙에 고정했다. 미결정 placeholder는 없다.

Slice 1 evidence (2026-08-02): desktop `src/`·`src-tauri/`를 repo root로 이동하고 backend/shared/Turbo/workspace를 제거했다. lockfile은 root importer 하나만 포함한다. `pnpm build`, `pnpm test`, non-mutating `pnpm check`, `cargo check`가 통과했고 `pnpm tauri:dev`가 Vite와 native app process를 실제 실행했다.

Slice 2–5 evidence (2026-08-02): Prompt 전용 template·LLM launcher·block·검색·tags·pin·toolbar·repo/export 표면과 native permission을 제거했다. recursive native Markdown CRUD, 경계·hidden·symlink 차단, atomic save, mtime conflict와 system Trash를 구현했고 Rust 회귀 테스트 5개가 통과했다. CodeMirror 6 직접 통합, 500ms autosave, 3-pane folder/document/content, Edit/View, `⌘1`·`⌘2`, persisted layout을 연결했다. Markdown canonical round-trip 단위 테스트 3개와 frontend build가 통과했다.

Slice 6 진행 evidence (2026-08-02): built-in image generation으로 따뜻한 종이 메모 위에 자연스러운 graphite 손글씨 세 줄을 두고, 마지막 짧은 생각을 느슨한 terracotta 원으로 강조한 1024px 앱 아이콘 원본 `assets/intent-memo-icon.png`을 만들었다. 사용자 승인 A안을 project source asset과 Tauri 전체 platform icon set으로 재생성했으며, arrow·chart·graph처럼 읽히는 방향성 상징은 제거했다. 32px 산출물에서도 메모와 강조된 의도가 구분된다.

Slice 6–7 runtime evidence (2026-08-02): 새 bundle identity의 클린 Tauri 실행에서 onboarding을 확인하고 격리 QA library를 선택했다. recursive folder와 root/nested 문서 표시, 새 메모 생성, CodeMirror 입력 후 500ms autosave와 `updated` 변경, rendered View, system Trash, `⌘1`·`⌘2` 레이아웃을 실제 창에서 조작했다. 재시작 후 `libraryRoot`와 content-only layout이 `app.tkbetter.intentmemo/settings.json`에서 복원됐다. OS light mode와 고정 typography는 실화면 확인했고 dark token은 CSS 정적 검증했다. 이후 이전 QA library가 초기 구조처럼 보이지 않도록 설정 연결을 해제했으며, 새 빈 library를 production app에서 열어도 앱이 폴더·문서를 자동 생성하지 않고 entry count 0을 유지함을 확인했다.

Slice 8 local evidence (2026-08-02): source cask `distribution/homebrew/intent-memo.rb`와 `release: published` 기반 `.github/workflows/homebrew-bump.yml`을 추가했다. cask는 `auto_updates true`와 사용자 library를 제외한 zap만 포함하고, workflow YAML·Ruby syntax·0.1.0/arch hash render simulation이 통과했다. `TAP_GITHUB_TOKEN` 등록, 실제 release publish, tap push와 `brew install --cask`는 credential/external production gate로 남는다.

Final local verification (2026-08-02): non-mutating Biome, Vitest 3, TypeScript/Vite production build, Rust fmt, `--all-features` clippy `-D warnings`, Rust test 5, workflow YAML, cask syntax/render가 통과했다. updater artifact를 끈 local release build는 exit 0으로 `Intent Memo.app`과 `Intent Memo_0.1.0_aarch64.dmg`를 생성했다. bundle metadata는 `app.tkbetter.intentmemo` / `0.1.0` / executable `intent-memo`, DMG checksum과 mount가 통과했고 production `.app`을 실제 실행했다. 기본 updater build의 마지막 서명은 CI secret `TAURI_SIGNING_PRIVATE_KEY`가 필요한 외부 gate다.

## 리스크

- **CM6·React lifecycle/IME 통합** — EditorView 생성·destroy와 controlled state 동기화를 경계로 두고 한글 조합 입력 회귀 테스트를 둔다.
- **외부 파일 변경과 autosave 경합** — atomic replace와 load 시점 mtime 비교 없이 silent overwrite하지 않는다.
- **Windows IME 이슈** (tauri#15436) — macOS 주 타깃이라 릴리스 게이트 아님, Windows 배포 시 QA 항목
- 테스트 프레임워크 부재 — filesystem rename/move와 frontmatter round-trip 경계부터 vitest 도입

## 진행 규칙

- git 커밋·푸시는 사용자가 직접 수행 (conventional commits)
- 각 slice 완료 시 `pnpm build`·`pnpm check` 통과 확인 후 리뷰 요청
- 모든 구현 전 decision gate가 닫혔다. 새로운 범위가 추가되지 않는 한 추가 grilling 없이 Slice 1부터 실행한다.
