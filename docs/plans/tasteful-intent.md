# Plan: Tasteful Intent 리네이밍 + 설정(테마) 도입

작성일: 2026-08-08
상태: 이름·설정 UI 결정 확정 — 구현 대기 (리네이밍 결정 Gate 일부 미결)
브랜치: `feat/update-0808`
관련: 제품 스펙 `docs/specs/intent-memo.md` · `DESIGN.md` · `CLAUDE.md` · `distribution/homebrew/intent-memo.rb`

## 확정된 결정

| 결정 | 요지 | 확정일 |
|---|---|---|
| 앱 이름 | **Tasteful Intent** (Tasteful Intent Memo·Intent Memo 대신) | 2026-08-08 사용자 결정 |
| 한글 병기 | **취향 담은 의도** ("취향적 의도" 대신) — 표기: `Tasteful Intent · 취향 담은 의도` | 2026-08-08 사용자 결정 |
| 설정 UI | **Case A 중앙 modal dialog** + 테마 **radio group** (Light·Charcoal·Dark·System, 즉시 적용) | 2026-08-08 사용자 결정 |

이름 근거: 제품 서사가 이미 "내 의도와 취향으로 AI가 만든 결과"를 사용한다. 이름이 의도(intent)+취향(taste)라는 제품 논지를 직접 실어 나르고 검색에서 유일하다. 영어 native에게 "tasteful"이 "품위 있는"으로 먼저 읽힐 수 있는 중의성은 인지하고 수용했다.

---

## Part 1 — Tasteful Intent 리네이밍

### 이름 체계

| 층위 | 현재 | 변경 후 | 비고 |
|---|---|---|---|
| Display name | `Intent Memo` | `Tasteful Intent` | UI·titlebar·문서 |
| 한글 병기 | `의도 메모` | `취향 담은 의도` | welcome eyebrow 등 |
| productName / .app | `IntentMemo` / `IntentMemo.app` | `TastefulIntent` / `TastefulIntent.app` | Gate R2 |
| kebab (배포) | `intent-memo` | `tasteful-intent` | Gate R3 |
| bundle identifier | `app.tkbetter.intentmemo` | **유지** | Gate R1, 아래 참조 |
| 내부 space 키 | `intent` / `docs` | **유지** | 스펙 계약 |
| Rust crate/lib | `intent-memo` / `intent_memo_lib` | **유지** | 외부 비노출 |

### 변경 지점 전수 조사 (2026-08-08 grep 기준)

Display 층 (안전, 전부 변경):

- `src/App.tsx:77` — titlebar 제품명
- `src/App.tsx:207` — "Intent Memo를 여는 중입니다" → "Tasteful Intent를 여는 중입니다"
- `src/App.tsx:223` — welcome-mark `IM` → `TI` (Gate R6)
- `src/App.tsx:224` — eyebrow `Intent Memo · 의도 메모` → `Tasteful Intent · 취향 담은 의도`
- `src/App.tsx:231` — welcome 본문 "Intent Memo는 그 원본을…"
- `src/main.tsx:8` — root element 에러 문구
- `src/components/PrimitiveShowcase.tsx:43` — "Intent Memo design system"
- `index.html:7` — `<title>`
- `src-tauri/tauri.conf.json:18` — window `title`
- `src-tauri/capabilities/default.json:4` — capability description
- `CLAUDE.md` — titlebar 계약 문장 등 제품명 표기
- `DESIGN.md` — 문서 제목, §1 Atmosphere, §4 Grid, WindowTitleBar 항목의 `Intent Memo` 표기
- `docs/specs/intent-memo.md` — 제품명 표기 문장 (파일 경로는 유지)

배포·번들 층 (Gate 결정 후 변경):

- `src-tauri/tauri.conf.json:3` — `productName`
- `distribution/homebrew/intent-memo.rb` — cask 이름·`name`·`app`·URL
- `release-please-config.json` — `package-name`/`component` (유지 권장)
- `package.json:2` — `name` (내부, 변경 무해)

### 결정 Gate (리네이밍)

- [x] **R1. bundle identifier 유지** — `app.tkbetter.intentmemo` 그대로 둔다. 변경 시 macOS가 별개 앱으로 취급해 app data dir 경로가 바뀌고, tauri-plugin-store의 `settings.json`(libraryRoot·docsRoot·theme·탭 세션)이 유실되며 updater 연속성이 끊긴다. Apple 관례상 제품명 변경에도 bundle id는 유지한다.
- [x] **R2. productName** — `TastefulIntent`로 변경 (R3 확정에 결합: cask의 `app` stanza와 DMG/updater artifact 파일명이 productName에서 나오므로 한 세트다). `.app`·DMG 파일명이 바뀐다.
- [x] **R3. Homebrew cask** — **`tasteful-intent`로 clean cutover 확정** (2026-08-08 사용자 확인: 기존 유저 없음 → 마이그레이션 장치 불필요). personal tap(`tkhwang/homebrew-tap`)은 심사 절차가 없어 재등록은 파일 커밋 하나다. 실행 내역:
  - `distribution/homebrew/intent-memo.rb` → `tasteful-intent.rb` (token·`name "Tasteful Intent"`·`app "TastefulIntent.app"`·URL의 repo 주소와 DMG 파일명 패턴).
  - `.github/workflows/homebrew-bump.yml`의 하드코딩 갱신: `IntentMemo_${VERSION}_*.dmg` 패턴(50-60행), `Casks/intent-memo.rb` 경로(73-109행).
  - tap repo에서 기존 `Casks/intent-memo.rb` 삭제(수동 커밋 1건, 사용자 수행). `tap_migrations.json`·deprecate 병행 유지는 하지 않는다.
  - 개발 머신에 설치된 기존 cask는 `brew uninstall intent-memo` 후 새 이름으로 재설치한다. bundle identifier 유지(R1) + `zap` 부재로 설정·데이터는 보존된다.
- [x] **R4. GitHub repo 이름** — **사용자가 직접, 구현보다 먼저 리네이밍한다** (2026-08-08 확정, `tkhwang/intent-memo` → `tkhwang/tasteful-intent`). 순서 근거: old URL은 GitHub redirect로 rename 직후에도 계속 동작하지만, 구현에서 쓸 새 주소는 rename 후에만 유효하다(redirect는 old→new 단방향). rename 후 로컬은 `git remote set-url origin git@github.com-personal:tkhwang/tasteful-intent.git` 한 번(worktree는 remote 공유). 로컬 폴더명은 유지해도 무방. 코드 쪽 후속(cask `url`·`homepage` 갱신)은 Step R3에 포함. tap repo(`tkhwang/homebrew-tap`) 이름은 그대로다.
- [x] **R5. release-please** — `package-name`/`component`는 `intent-memo` 유지. 변경 시 태그·CHANGELOG 연속성이 깨진다.
- [ ] **R6. welcome-mark** — `IM` → `TI`. App icon 자체는 Brain·Bot·memo symbol 계약(DESIGN.md AppIcon)이라 이름 변경과 무관, 재작업 없음.

### 명시적 비변경

`identifier`, 내부 space 키(`intent`/`docs`), Cargo crate·lib 이름, `library.rs`의 temp 파일 prefix(`.intent-memo-*.tmp`), `docs/specs/intent-memo.md` 파일 경로, `public/intent-memo-icon.png` 자산 파일명 — 전부 외부 비노출이며 변경 시 위험 대비 이득이 없다.

### 구현 단계

- **Step R0 — 계약 문서 델타**: CLAUDE.md·DESIGN.md·spec의 제품명 문장 갱신. DESIGN.md WindowTitleBar의 "제품명 `Intent Memo`" 계약 문구 교체.
- **Step R1 — display 문자열**: `App.tsx`(4곳 + welcome-mark), `main.tsx`, `PrimitiveShowcase.tsx`, `index.html`.
- **Step R2 — Tauri 설정**: window `title`, `productName`(Gate R2 확정 시), capabilities description. `identifier`는 불변.
- **Step R3 — 배포**: cask 전략(Gate R3) 반영, release-please는 불변.
- **Step R4 — 검증**: `pnpm test`(titlebar 문자열 기대값 갱신 포함) · `pnpm check` · `pnpm build` · `pnpm tauri:dev` smoke(titlebar·welcome 표기 확인). `.app`/DMG 이름은 릴리스 빌드 시점에 확인.

---

## Part 2 — 설정(테마) 도입

Case A + radio group으로 확정. 동일 접근의 spike를 이 브랜치에서 구현·검증한 뒤(테스트 68개·Biome·`pnpm build`·Tauri 구동 통과) rollback한 상태이므로, 아래는 검증된 diff의 재적용이다.

- **S1 — `SettingsDialog` 컴포넌트**: `dialog-backdrop` + `name-dialog settings-dialog` 조합(MoveDialog 패턴), fieldset/legend "테마" + radio 4개(Light·Charcoal·Dark·System), 즉시 적용, `닫기`·Esc, 열릴 때 현재 테마 radio focus. 단위 테스트 4개.
- **S2 — `App.tsx` 진입점**: folder pane 하단 theme-picker(select) → ⚙ `설정` 버튼, `⌘,` 단축키, `settingsOpen` state 분리, 닫을 때 opener focus 복원.
- **S3 — CSS**: `.theme-picker` 제거 → `.settings-button`·`.settings-dialog` (기존 토큰만, biome import 정렬 주의: `{ THEMES, type Theme }`).
- **S4 — App 통합 테스트 2개**: 설정에서 Charcoal 선택 → `data-theme`·`saveSettings` 검증, `⌘,` 열림.
- **S5 — 문서 델타**: CLAUDE.md UI Contract appearance 항목에 진입점 문구, DESIGN.md `SettingsDialog` primitive 항목.
- 저장 구조(`settings.json` `theme` 키)·적용 경로(`lib/theme.ts`)는 불변. font 종류·크기는 스펙 v0.2 제외 항목으로 남긴다.

## 진행 순서

**0) 사용자 repo rename (R4)** → S(설정) → R(리네이밍) 순을 권장한다. S는 검증된 diff 재적용이라 빠르고, R의 테스트 기대값 변경(titlebar 문자열)과 충돌하지 않는다. 각 Part 완료 시 `pnpm test`·`check`·`build`와 Tauri smoke를 반복한다. 커밋은 사용자가 수행한다.
