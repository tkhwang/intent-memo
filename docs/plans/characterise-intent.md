# Plan: Human | AI 공간 성격 구분 + Bear 스타일 워크스페이스

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

작성일: 2026-08-06
상태: 구현·검증 완료
브랜치: `feat/characterise-intent`
관련: 설계 `docs/specs/2026-08-06-human-ai-characterisation-design.md` · 제품 스펙 `docs/specs/intent-memo.md` · `DESIGN.md` · 선행 plan `docs/plans/edit-view-mode.md`

**Goal:** 두 공간을 `Human`(내가 쓰는 의도·취향, Edit 기본)과 `AI`(AI가 쓴 결과, View 기본)로 성격 구분하고, 워크스페이스를 Bear 스타일(스니펫 리스트·숫자 없는 사이드바·공간색 강조·테마)로 재편한다.

**Architecture:** 동작·데이터 계약(`libraryRoot`/`docsRoot`, `intent`/`docs` 내부 키, 기본 mode)은 그대로 두고 표시 계층만 바꾼다. 색은 `data-theme`(테마)와 `data-space`(공간) 두 attribute가 CSS custom property를 전환하는 구조. `scan_library`는 구조·mtime 전용으로 유지하고, 스니펫은 현재 폴더의 visible 문서만 신규 batch IPC `read_document_snippets`로 지연 로드한다.

**Tech Stack:** React 19 + TypeScript, CSS custom properties, CodeMirror 6, Tauri 2 (Rust), Vitest, zod.

## Global Constraints

- **의존성 추가 금지** (CLAUDE.md). 특히 `@lezer/highlight`는 직접 의존성이 아니므로 import하지 않는다. 에디터 공간색은 기존 `@codemirror/language` syntax tree와 `@codemirror/view` Decoration으로 Markdown marker node만 강조한다.
- **git commit·push 금지** (CLAUDE.md). 각 task는 검증 단계로 끝나며 커밋 단계가 없다. 커밋은 사용자가 직접 한다.
- 내부 설정 키·값 유지: `libraryRoot`, `docsRoot`, `activeSpace: "intent" | "docs"`. **표시만** Human/AI로 바꾼다. 마이그레이션 어댑터를 만들지 않는다.
- 공간색 확정값: Human `#B5524A` / tint `rgba(181,82,74,.10)` / text `#9E4038` · AI `#5878A0` / tint `rgba(88,120,160,.12)` / text `#41618C`. 다크 표면 위 변형: Human `#D87A68`/`#F0B4A8`, AI `#7E9EC4`/`#B8CDE4`.
- 확정 문구 (글자 그대로): Human **"내가 남기는 의도와 취향, AI 요청의 출발점입니다"** · AI **"내 의도와 취향으로 AI가 만든 결과입니다"**.
- 아이콘: robot·sparkle·brain 계열 금지. Human은 `PenLine`, AI는 `BookOpenText`, 화살표는 `MoveRight` (모두 lucide-react 기존 의존성).
- 코드 스타일: Biome 규정을 따르고 `pnpm check`가 깨끗해야 한다. 기존 파일의 관용구(zod 스키마, `readonly` props, `void` 처리)를 따른다.
- 각 task 후 최소 검증: 해당 테스트 + `pnpm check`. Task 8에서 전체 게이트(`pnpm test`·`pnpm build`·cargo fmt/clippy/test·Tauri smoke)를 통과한다.

## Decision Gates

- [x] **Decision 1 — 스니펫 로딩 경계**
  - Impact: scan 성능, IPC 계약, 편집 후 목록 일관성
  - Evidence: 확정 설계는 지연·비동기 로드를 요구하고, 현재 autosave는 `LibrarySnapshot`을 갱신하지 않는다.
  - Resolved: `scan_library`는 현재 계약을 유지한다. 신규 IPC `read_document_snippets(root, paths)`는 현재 선택 폴더에서 보이는 문서만 batch로 읽는다. 프런트 캐시는 `path + updatedMs` 기준이며, 저장 성공 시 해당 path의 mtime과 스니펫을 즉시 갱신한다.
  - Status: resolved
- [x] **Decision 2 — 에디터 Markdown 공간색 범위**
  - Impact: 에디터 가독성, 공간 정체성, CodeMirror 확장 방식
  - Evidence: parser가 `HeaderMark`, `ListMark`, `QuoteMark`, `CodeMark`를 별도 node로 제공하며 설계는 본문 ink를 뉴트럴로 유지한다.
  - Resolved: Markdown marker node와 horizontal rule만 Human/AI 공간색으로 강조한다. heading·인용문·목록 항목의 실제 텍스트는 뉴트럴을 유지하며 신규 dependency는 추가하지 않는다.
  - Status: resolved
- [x] **Decision 3 — 신규 utility 파일 위치**
  - Impact: pure logic 테스트 경계, `App.tsx`·`SpaceSwitcher.tsx` 책임
  - Evidence: 기존 독립 로직은 `src/lib/*.ts`와 인접 test에 배치한다.
  - Resolved: `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/lib/rootDisplay.ts`, `src/lib/rootDisplay.test.ts`를 계획된 이름과 위치로 생성한다. UI 컴포넌트에 인라인하지 않는다.
  - Status: resolved
- [x] **Decision 4 — 폴더 카운트 유지 여부**
  - Impact: sidebar 정보 밀도, Bear 시각 기준 충실도, 불필요한 상태·prop 범위
  - Evidence: Bear 공식 sidebar는 아이콘·라벨·계층·선택 상태를 사용하며 항목별 note count를 표시하지 않는다.
  - Resolved: 폴더 카운트는 범위에서 제거한다. Task 6은 집계·`documents` prop 없이 folder/document row의 Bear형 선택 스타일만 담당한다.
  - Status: resolved
- [x] **Decision 5 — SpaceSwitcher 테스트 파일 위치**
  - Impact: 컴포넌트 계약 테스트 경계와 App integration test 복잡도
  - Evidence: 독립 UI primitive는 `src/components/<Component>.test.tsx`에 인접 배치한다.
  - Resolved: `src/components/SpaceSwitcher.test.tsx`를 생성해 full/compact 전환, radio-group 키보드 동작, root 표시줄을 독립 검증한다.
  - Status: resolved
- [x] **Decision 6 — 스니펫 batch 일부 실패 처리**
  - Impact: IPC error semantics, 외부 파일 변경 경쟁, filesystem safety
  - Evidence: multi-file batch는 scan 직후 삭제·이동·일시적 read failure를 만날 수 있지만 root 탈출·symlink는 기존 안전 계약상 허용할 수 없다.
  - Resolved: `read_document_snippets`는 `{ path, snippet: string | null }[]`을 반환한다. `not-found`·일시적 read failure는 해당 path의 `snippet: null`로 부분 성공하고, absolute/traversal/outside-root/hidden/symlink/non-Markdown 입력은 batch 전체를 실패시킨다. 프런트는 non-null 결과만 캐시한다.
  - Status: resolved

## Repo-Evidence Resolutions

- invalid theme은 theme만 `"light"`로 복구하고 다른 유효한 settings를 보존한다. 현재 all-or-default parse 구조에 theme을 그대로 추가하지 않는다.
- **Superseded by Task 9:** content header의 Human/AI badge 상시 유지와 folder pane 숨김 시 active-root 노출 요구. 최종 계약은 Human/AI 전환과 root 변경을 sidebar에만 둔다.
- full SpaceSwitcher는 `radiogroup`/`radio` semantics와 Arrow/Home/End keyboard 이동을 제공한다.
- 확정 색 대비를 계산했다. tint 선택면 위 `--space-text`는 Light 5.49:1 이상, charcoal/dark 6.31:1 이상이고, dark base 위 `--space-accent`도 Human 4.61:1 이상·AI 5.06:1 이상이므로 시작값을 변경하지 않는다.
- jsdom 26에는 `window.matchMedia`가 없으므로 App test에 controllable mock을 두고 System theme listener의 적용·해제를 검증한다.

## 파일 지도

| 파일 | 작업 |
|---|---|
| `src/types/library.ts` | `THEMES`/`Theme`, `LayoutSettings.theme`, `DocumentSnippet` 계약 추가 |
| `src/lib/settings.ts` | `theme` 필드 저장·로드 (기본 `"light"`) |
| `src/lib/theme.ts` (신규) | `resolveTheme`, `applyResolvedTheme` |
| `src/lib/rootDisplay.ts` (신규) | `formatRootDisplay` 경로 축약 |
| `src/lib/native.ts` | `readDocumentSnippets` batch IPC adapter·schema 추가 |
| `src/index.css` | 라이트 그레이 팔레트, `data-theme` 3종, `data-space` 공간색, Bear 행/탭/에디터 스타일 |
| `src/components/SpaceSwitcher.tsx` | Human\|AI 스위처 + 루트 표시줄로 재작성 |
| `src/components/SpaceSwitcher.test.tsx` (신규) | 스위처·루트 표시줄 동작 |
| `src/hooks/useLibraryWorkspace.ts` | visible-only 스니펫 로드·`path + updatedMs` 캐시·save freshness |
| `src/components/DocumentList.tsx` | 캐시된 스니펫 행 |
| `src/components/MarkdownEditor.tsx` | syntax-tree marker Decoration 공간색 |
| `src/App.tsx` | 테마 적용·선택 UI, `data-space`, base-folder-list 제거, 문구 교체 |
| `src-tauri/src/library.rs` · `src-tauri/src/lib.rs` | `read_document_snippets` + 추출 로직·등록·테스트 |
| `src/components/PrimitiveShowcase.tsx` | 변경된 prop·시각 상태 반영 |
| `CLAUDE.md` · `DESIGN.md` · `docs/specs/intent-memo.md` | 계약 문서 델타 |

---

### Task 1: 테마 설정 기반 (types · settings · theme 유틸)

**Files:**
- Modify: `src/types/library.ts`
- Modify: `src/lib/settings.ts`
- Create: `src/lib/theme.ts`
- Create: `src/lib/theme.test.ts`
- Modify: `src/lib/settings.test.ts`

**Interfaces:**
- Produces: `type Theme = "light" | "charcoal" | "dark" | "system"`, `type ResolvedTheme = "light" | "charcoal" | "dark"`, `LayoutSettings.theme: Theme`, `resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme`, `applyResolvedTheme(resolved: ResolvedTheme): void`
- Consumes: 기존 `LayoutSettings`, `SPACES` 패턴

- [x] **Step 1: 타입 추가** — `src/types/library.ts`의 `SPACES` 선언 근처에 추가하고 `LayoutSettings`에 `theme` 필드를 더한다:

```ts
export const THEMES = ["light", "charcoal", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
export type ResolvedTheme = Exclude<Theme, "system">;
```

`LayoutSettings`에는 `readonly theme: Theme;`를 추가한다.

- [x] **Step 2: theme 유틸의 실패하는 테스트 작성** — `src/lib/theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveTheme } from "@/lib/theme";

describe("resolveTheme", () => {
  it("system은 OS 다크 여부를 따른다", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("명시 테마는 OS와 무관하게 유지된다", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("charcoal", true)).toBe("charcoal");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
```

- [x] **Step 3: 실패 확인** — Run: `pnpm test src/lib/theme.test.ts` · Expected: FAIL (`@/lib/theme` 모듈 없음)

- [x] **Step 4: `src/lib/theme.ts` 구현**

```ts
import type { ResolvedTheme, Theme } from "@/types/library";

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved;
}
```

- [x] **Step 5: 통과 확인** — Run: `pnpm test src/lib/theme.test.ts` · Expected: PASS

- [x] **Step 6: settings에 theme 저장·복구 테스트 추가** — `src/lib/settings.test.ts`의 기존 패턴을 따라 다음을 고정한다.
  1. 저장된 theme이 없으면 `"light"`로 로드된다.
  2. `"dark"`/`"system"` 값은 save-load round trip된다.
  3. 잘못된 값(`"neon"`)은 theme만 `"light"`로 대체되고, 유효한 `libraryRoot`/`docsRoot`/active space/tab sessions/pane layout은 그대로 보존된다.

- [x] **Step 7: 실패 확인** — Run: `pnpm test src/lib/settings.test.ts` · Expected: FAIL

- [x] **Step 8: `src/lib/settings.ts` 구현** — `settingsSchema`에 `theme: z.enum(THEMES)`, `defaultSettings`에 `theme: "light"`, `loadSettings`의 `Promise.all`·조립부에 `store.get<unknown>("theme")`, `saveSettings`에 `store.set("theme", parsed.theme)`를 추가한다. `loadSettings`에서는 `themeSchema.safeParse(storedTheme)`로 theme만 먼저 정규화한 뒤 전체 settings schema에 넣어, invalid theme이 다른 유효한 설정을 default로 되돌리지 않게 한다. import는 `import { type LayoutSettings, SPACES, THEMES } from "@/types/library";`.

- [x] **Step 9: 통과 확인** — Run: `pnpm test src/lib/settings.test.ts src/lib/theme.test.ts` && `pnpm check` · Expected: 모두 PASS. (`App.tsx`가 아직 theme을 모르므로 TS 오류가 나면 Task 2에서 해소된다 — `pnpm check`는 Biome만 보므로 통과해야 한다.)

---

### Task 2: 색 토큰·테마 CSS + 테마 적용·선택 UI

**Files:**
- Modify: `src/index.css:1-43` (토큰 블록 교체)
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `resolveTheme`, `applyResolvedTheme`, `Theme`, `THEMES`
- Produces: CSS 토큰 계약 — `--space-accent`/`--space-tint`/`--space-text`(공간색), `--sidebar-bg`/`--sidebar-text`/`--sidebar-muted`/`--sidebar-border`(사이드바 스코프), `--list`(리스트 표면). `data-theme`은 `<html>`에, `data-space`는 workspace `<main>`에 걸린다.

- [x] **Step 1: `src/index.css` 토큰 블록 교체** — 파일 상단 `:root`와 `@media (prefers-color-scheme: dark)` 블록(1–43행)을 아래로 교체한다. **`@media (prefers-color-scheme: dark)` 블록은 삭제**한다(OS 연동은 JS의 System 테마가 담당):

```css
:root {
  color-scheme: light;
  --canvas: #f2f2f3;
  --panel: #f0f0f2;
  --list: #fafafb;
  --content: #ffffff;
  --text: #3a3a3c;
  --muted: #98989d;
  --border: #e3e3e5;
  --selection: #e8e8ea;
  --selection-text: #1c1c1e;
  --accent: #55554f;
  --accent-text: #ffffff;
  --danger: #a33b34;
  --focus: #6b6b74;
  --shadow: 0 18px 50px rgb(30 30 34 / 14%);
  --space-accent: #b5524a;
  --space-tint: rgb(181 82 74 / 10%);
  --space-text: #9e4038;
  --sidebar-bg: var(--panel);
  --sidebar-text: var(--text);
  --sidebar-muted: var(--muted);
  --sidebar-border: var(--border);
  --type-xs: 11px;
  --type-sm: 13px;
  --type-body: 16px;
  --type-title: 22px;
  --type-empty: 34px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

[data-space="docs"] {
  --space-accent: #5878a0;
  --space-tint: rgb(88 120 160 / 12%);
  --space-text: #41618c;
}

[data-theme="charcoal"] {
  --sidebar-bg: #272c34;
  --sidebar-text: #dde3ea;
  --sidebar-muted: #97a1ae;
  --sidebar-border: #3a4150;
}

[data-theme="charcoal"] .folder-pane {
  --space-accent: #d87a68;
  --space-tint: rgb(216 122 104 / 16%);
  --space-text: #f0b4a8;
}

[data-theme="charcoal"] [data-space="docs"] .folder-pane {
  --space-accent: #7e9ec4;
  --space-tint: rgb(126 158 196 / 16%);
  --space-text: #b8cde4;
}

[data-theme="dark"] {
  color-scheme: dark;
  --canvas: #1e2229;
  --panel: #232833;
  --list: #20242c;
  --content: #262b34;
  --text: #e2e6ec;
  --muted: #8f98a5;
  --border: #343b47;
  --selection: #333a46;
  --selection-text: #ffffff;
  --accent: #c6cdd8;
  --accent-text: #1e2229;
  --danger: #ed8a7f;
  --focus: #9fb1c8;
  --shadow: 0 20px 60px rgb(0 0 0 / 38%);
  --space-accent: #d87a68;
  --space-tint: rgb(216 122 104 / 16%);
  --space-text: #f0b4a8;
}

[data-theme="dark"] [data-space="docs"],
[data-theme="dark"][data-space="docs"] {
  --space-accent: #7e9ec4;
  --space-tint: rgb(126 158 196 / 16%);
  --space-text: #b8cde4;
}
```

- [x] **Step 2: 사이드바·리스트 표면 토큰 연결** — `src/index.css`에서 `.folder-pane`의 `background`를 `var(--sidebar-bg)`·`color: var(--sidebar-text)`로, `.list-pane` 배경을 `var(--list)`로 바꾼다 (기존 선택자를 grep으로 찾아 해당 속성만 수정: `grep -n "folder-pane\|list-pane" src/index.css`). 사이드바 내부에서 `var(--muted)`·`var(--border)`를 쓰는 규칙(`.space-header`, `.folder-header`, `.folder-row` 계열)은 `var(--sidebar-muted)`·`var(--sidebar-border)`로 바꾼다.

- [x] **Step 3: App에 테마 적용 effect + `data-space`** — `src/App.tsx`의 `RuntimeApp`에 추가 (import: `resolveTheme`, `applyResolvedTheme` from `@/lib/theme`):

```tsx
const theme = settings?.theme ?? "light";
useEffect(() => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => applyResolvedTheme(resolveTheme(theme, media.matches));
  apply();
  media.addEventListener("change", apply);
  return () => media.removeEventListener("change", apply);
}, [theme]);
```

주의: `RuntimeApp`의 early return(`loadError`, `!settings`)보다 **앞에** hook을 둔다. `LibraryApp`의 `<main className="app-shell …">`에 `data-space={settings.activeSpace}`를, `DocsWelcomeScreen`의 `<main>`에 `data-space="docs"`를 추가한다.

- [x] **Step 4: Runtime theme 회귀 테스트** — `src/App.test.tsx`의 settings fixture에 `theme: "light"`를 추가하고 jsdom 환경에 controllable `window.matchMedia` mock을 둔 뒤 다음을 검증한다.
  1. `light`/`charcoal`/`dark` 설정이 `<html data-theme>`에 적용된다.
  2. `system`일 때 mock OS preference 변경 event가 `light ↔ dark`를 갱신한다.
  3. unmount 시 media-query listener가 제거된다.

- [x] **Step 5: 테마 선택 UI** — `LibraryApp`의 folder pane 하단(현재 `base-folder-list` fieldset 자리 근처, Task 4에서 fieldset은 제거되므로 그 아래)에 추가하고, `Theme` 타입을 import한다:

```tsx
<label className="theme-picker">
  <span>테마</span>
  <select
    onChange={(event) =>
      updateLayout({ theme: event.currentTarget.value as Theme })
    }
    value={settings.theme}
  >
    <option value="light">Light</option>
    <option value="charcoal">Charcoal</option>
    <option value="dark">Dark</option>
    <option value="system">System</option>
  </select>
</label>
```

CSS(`src/index.css` 끝에):

```css
.theme-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding: 8px;
  border-top: 1px solid var(--sidebar-border);
  color: var(--sidebar-muted);
  font-size: var(--type-xs);
}

.theme-picker select {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid var(--sidebar-border);
  border-radius: 6px;
  background: transparent;
}
```

- [x] **Step 6: 검증** — Run: `pnpm test` && `pnpm check` && `pnpm build` · Expected: 전부 통과. 이어서 `pnpm tauri:dev`로 테마 4종 전환·System의 OS 연동을 눈으로 확인.

---

### Task 3: SpaceSwitcher 재작성 — `✎ Human ⟶ ⧉ AI`

**Files:**
- Modify: `src/components/SpaceSwitcher.tsx` (전체 재작성)
- Create: `src/components/SpaceSwitcher.test.tsx`
- Modify: `src/index.css` (`.space-segments`·`.space-switcher-compact` 구획)

**Interfaces:**
- Produces: `SpaceSwitcherProps = { activeSpace: Space; compact?: boolean; root?: string | null; onChange: (space: Space) => Promise<void>; onRootChange?: () => void }` — `root`·`onRootChange`는 Task 4의 루트 표시줄에서 사용하며 이 task에서 prop 자리만 만든다(렌더링은 Task 4).
- Consumes: `Space` 타입, lucide `PenLine`/`BookOpenText`/`MoveRight`.

- [x] **Step 1: 실패하는 테스트 작성** — `src/components/SpaceSwitcher.test.tsx` (기존 `ContextMenu.test.tsx`의 testing-library 패턴을 따른다):

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SpaceSwitcher } from "@/components/SpaceSwitcher";

describe("SpaceSwitcher", () => {
  it("Human과 AI를 radio group으로 보여주고 활성 공간을 표시한다", () => {
    render(<SpaceSwitcher activeSpace="intent" onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "공간 선택" })).toBeDefined();
    expect(
      screen.getByRole("radio", { name: /Human/ }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("radio", { name: /AI/ }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("비활성 공간을 누르면 onChange를 호출한다", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<SpaceSwitcher activeSpace="intent" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: /AI/ }));
    expect(onChange).toHaveBeenCalledWith("docs");
  });

  it("화살표 키로 다음 공간에 focus하고 전환한다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<SpaceSwitcher activeSpace="intent" onChange={onChange} />);
    screen.getByRole("radio", { name: /Human/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /AI/ })).toBe(document.activeElement);
    expect(onChange).toHaveBeenCalledWith("docs");
  });

  it("compact 모드는 현재 공간 라벨과 전환 대상 aria-label을 가진다", () => {
    render(<SpaceSwitcher activeSpace="docs" compact onChange={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Human 공간으로 전환" });
    expect(button.textContent).toContain("AI");
  });
});
```

(현재 devDependencies에 `@testing-library/jest-dom`이 없으므로 기본 DOM property·`getAttribute`·`textContent` assertion만 사용한다.)

- [x] **Step 2: 실패 확인** — Run: `pnpm test src/components/SpaceSwitcher.test.tsx` · Expected: FAIL (라벨이 아직 Intent/Docs)

- [x] **Step 3: 컴포넌트 재작성** — `src/components/SpaceSwitcher.tsx`:

```tsx
import { BookOpenText, MoveRight, PenLine } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import type { Space } from "@/types/library";

type SpaceSwitcherProps = {
  readonly activeSpace: Space;
  readonly compact?: boolean;
  readonly root?: string | null;
  readonly onChange: (space: Space) => Promise<void>;
  readonly onRootChange?: () => void;
};

const spaceCopy = {
  intent: { label: "Human", icon: PenLine },
  docs: { label: "AI", icon: BookOpenText },
} as const;
const spaces = ["intent", "docs"] as const;

export function SpaceSwitcher({
  activeSpace,
  compact = false,
  root,
  onChange,
  onRootChange,
}: SpaceSwitcherProps) {
  const [switching, setSwitching] = useState(false);
  const optionRefs = useRef<Record<Space, HTMLButtonElement | null>>({
    intent: null,
    docs: null,
  });

  const selectSpace = async (space: Space) => {
    if (space === activeSpace || switching) return;
    setSwitching(true);
    await onChange(space).finally(() => setSwitching(false));
  };

  const handleGroupKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    const currentIndex = spaces.indexOf(activeSpace);
    const nextIndex =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (currentIndex + 1) % spaces.length
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (currentIndex - 1 + spaces.length) % spaces.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? spaces.length - 1
              : null;
    if (nextIndex == null) return;
    event.preventDefault();
    const nextSpace = spaces[nextIndex];
    optionRefs.current[nextSpace]?.focus();
    void selectSpace(nextSpace);
  };

  if (compact) {
    const current = spaceCopy[activeSpace];
    const targetSpace = activeSpace === "intent" ? "docs" : "intent";
    const Icon = current.icon;
    return (
      <button
        aria-label={`${spaceCopy[targetSpace].label} 공간으로 전환`}
        className="space-switcher-compact"
        disabled={switching}
        onClick={() => void selectSpace(targetSpace)}
        type="button"
      >
        <Icon aria-hidden="true" size={14} />
        <span>{current.label}</span>
      </button>
    );
  }

  return (
    <div className="space-switcher">
      <fieldset
        aria-label="공간 선택"
        className="space-segments"
        onKeyDown={handleGroupKeyDown}
        role="radiogroup"
      >
        <legend className="sr-only">공간 선택</legend>
        {spaces.map((space, index) => {
          const entry = spaceCopy[space];
          const Icon = entry.icon;
          return (
            <div className="space-segment-slot" key={space}>
              {index > 0 && (
                <MoveRight
                  aria-hidden="true"
                  className="space-flow-arrow"
                  size={13}
                />
              )}
              <button
                aria-checked={activeSpace === space}
                disabled={switching}
                onClick={() => void selectSpace(space)}
                ref={(node) => {
                  optionRefs.current[space] = node;
                }}
                role="radio"
                tabIndex={activeSpace === space ? 0 : -1}
                type="button"
              >
                <Icon aria-hidden="true" size={14} />
                <span>{entry.label}</span>
              </button>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}
```

(주의: 기존 `space-description` 줄은 삭제한다 — 안내 문구는 Task 7에서 빈 상태로 이동. `root`·`onRootChange`는 Task 4에서 사용한다. 미사용 prop 때문에 Biome이 경고하면 Task 4까지는 `void root; void onRootChange;` 없이 그냥 구조분해에서 빼두어도 된다 — 그 경우 Task 4에서 추가.)

- [x] **Step 4: 통과 확인** — Run: `pnpm test src/components/SpaceSwitcher.test.tsx` · Expected: PASS

- [x] **Step 5: 스위처 CSS 교체** — `src/index.css`의 `.space-segments` 구획(단추·active 스타일)을 다음 원칙으로 갱신한다: 화살표 도입, active 단추는 공간색.

```css
.space-segments {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.space-segment-slot {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.space-flow-arrow {
  flex: none;
  margin: 0 4px;
  color: var(--sidebar-muted);
}

.space-segments button {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 8px 4px;
  border: 1px solid var(--sidebar-border);
  border-radius: 9px;
  background: transparent;
  color: var(--sidebar-muted);
  cursor: pointer;
  font-size: var(--type-sm);
  font-weight: 600;
  transition:
    background-color 180ms ease-out,
    border-color 180ms ease-out,
    color 180ms ease-out;
}

.space-segments button[aria-checked="true"] {
  border-color: var(--space-accent);
  background: var(--space-tint);
  color: var(--space-text);
}

.space-switcher-compact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--space-accent);
  border-radius: 999px;
  background: var(--space-tint);
  color: var(--space-text);
  font-size: var(--type-xs);
  font-weight: 650;
}
```

(기존 `.space-switcher`·`.space-switcher-compact:hover` 등 충돌 규칙은 위 계약에 맞게 정리한다. `@media (prefers-reduced-motion: reduce)` 블록이 이미 있으면 transition 예외에 이 단추를 포함, 없으면 `.space-segments button { transition: none; }`을 넣은 reduce 블록을 추가.)

- [x] **Step 6: 검증** — Run: `pnpm test` && `pnpm check` · Expected: PASS. (`PrimitiveShowcase`가 옛 prop을 쓰다 깨지면 Task 8이 아니라 지금 바로 호출부만 맞춘다 — description 제거로 인한 컴파일 오류는 없어야 정상.)

---

### Task 4: 루트 표시줄 + base-folder-list 정리

**Files:**
- Create: `src/lib/rootDisplay.ts`
- Create: `src/lib/rootDisplay.test.ts`
- Modify: `src/components/SpaceSwitcher.tsx` (루트 표시줄 렌더)
- Modify: `src/App.tsx` (`base-folder-list` fieldset 제거, props 연결; header `active-root` 조건은 Task 9에서 superseded)
- Modify: `src/index.css`

**Interfaces:**
- Produces: `formatRootDisplay(root: string): { parent: string; leaf: string }`
- Consumes: Task 3의 `root`/`onRootChange` props, `handleRootChange(space)` (App 기존 함수)

- [x] **Step 1: 실패하는 테스트 작성** — `src/lib/rootDisplay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatRootDisplay } from "@/lib/rootDisplay";

describe("formatRootDisplay", () => {
  it("깊은 경로는 부모 한 세그먼트만 남기고 앞을 접는다", () => {
    expect(formatRootDisplay("/Users/x/dev/side-projects/claude-outputs")).toEqual(
      { parent: "…/side-projects/", leaf: "claude-outputs" },
    );
  });

  it("2단계 경로는 그대로 보여준다", () => {
    expect(formatRootDisplay("/memo/intents")).toEqual({
      parent: "/memo/",
      leaf: "intents",
    });
  });

  it("1단계 경로는 루트 표시만 남긴다", () => {
    expect(formatRootDisplay("/intents")).toEqual({ parent: "/", leaf: "intents" });
  });

  it("filesystem root 자체도 중복 slash 없이 표시한다", () => {
    expect(formatRootDisplay("/")).toEqual({ parent: "", leaf: "/" });
  });
});
```

- [x] **Step 2: 실패 확인** — Run: `pnpm test src/lib/rootDisplay.test.ts` · Expected: FAIL (모듈 없음)

- [x] **Step 3: 구현** — `src/lib/rootDisplay.ts`:

```ts
export type RootDisplay = {
  readonly parent: string;
  readonly leaf: string;
};

export function formatRootDisplay(root: string): RootDisplay {
  const segments = root.split("/").filter(Boolean);
  if (segments.length === 0) return { parent: "", leaf: root };
  const leaf = segments.at(-1) ?? root;
  if (segments.length <= 1) return { parent: "/", leaf };
  const parent = segments.at(-2) ?? "";
  if (segments.length === 2) return { parent: `/${parent}/`, leaf };
  return { parent: `…/${parent}/`, leaf };
}
```

- [x] **Step 4: 통과 확인** — Run: `pnpm test src/lib/rootDisplay.test.ts` · Expected: PASS

- [x] **Step 5: SpaceSwitcher에 루트 표시줄 렌더** — Task 3의 full 변형 return에서 `</fieldset>` 다음에 추가 (import `formatRootDisplay`):

```tsx
{root != null && (
  <button
    className="root-row"
    onClick={onRootChange}
    title={root}
    type="button"
  >
    <span className="root-parent">{formatRootDisplay(root).parent}</span>
    <span className="root-leaf">{formatRootDisplay(root).leaf}</span>
  </button>
)}
```

SpaceSwitcher.test.tsx에 케이스 추가:

```tsx
it("루트 표시줄은 끝 세그먼트를 강조하고 클릭 시 위치 변경을 요청한다", async () => {
  const onRootChange = vi.fn();
  render(
    <SpaceSwitcher
      activeSpace="intent"
      onChange={vi.fn()}
      onRootChange={onRootChange}
      root="/Users/x/memo/intents"
    />,
  );
  const row = screen.getByRole("button", { name: /intents/ });
  expect(row.title).toBe("/Users/x/memo/intents");
  await userEvent.click(row);
  expect(onRootChange).toHaveBeenCalledTimes(1);
});
```

Run: `pnpm test src/components/SpaceSwitcher.test.tsx` · Expected: PASS

- [x] **Step 6: App 연결·정리** — `src/App.tsx`에서:
  1. folder pane의 `<SpaceSwitcher …>`에 `root={root}` · `onRootChange={() => void handleRootChange(settings.activeSpace)}` 추가.
  2. `base-folder-list` fieldset(현재 422–454행 부근) 전체 삭제. 이때 미사용이 되는 lucide import(`Files`, `NotebookPen`)를 정리한다.
  3. **Superseded by Task 9:** content header의 `active-root` 노출 요구. 최종 계약은 pane이 숨겨져도 content toolbar에 root를 반복하지 않고, sidebar를 다시 연 뒤 root를 변경한다.
  4. `DocsWelcomeScreen`의 `<SpaceSwitcher activeSpace="docs" …>`는 root 없이 그대로 둔다.

- [x] **Step 7: 루트 표시줄 CSS** — `src/index.css`:

```css
.root-row {
  display: flex;
  align-items: baseline;
  width: 100%;
  min-width: 0;
  margin-top: 8px;
  padding: 5px 8px;
  border-radius: 7px;
  background: rgb(0 0 0 / 4%);
  color: var(--sidebar-muted);
  cursor: pointer;
  font-size: var(--type-xs);
  white-space: nowrap;
}

[data-theme="charcoal"] .root-row,
[data-theme="dark"] .root-row {
  background: rgb(255 255 255 / 6%);
}

.root-row .root-parent {
  flex: none;
}

.root-row .root-leaf {
  overflow: hidden;
  min-width: 0;
  color: var(--space-text);
  font-weight: 650;
  text-overflow: ellipsis;
}
```

- [x] **Step 8: 검증** — Run: `pnpm test` && `pnpm check` && `pnpm build` · Expected: PASS. `pnpm tauri:dev`에서 공간 전환 시 루트명·트리가 함께 바뀌는지, 표시줄 클릭이 폴더 선택 다이얼로그로 이어지는지 확인.

---

### Task 5: 문서 스니펫 — visible-only batch IPC + cache + 리스트 행

**Files:**
- Modify: `src-tauri/src/library.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/native.ts`
- Modify: `src/types/library.ts`
- Modify: `src/hooks/useLibraryWorkspace.ts`
- Modify: `src/hooks/useLibraryWorkspace.test.tsx`
- Modify: `src/components/DocumentList.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Keeps: `scan_library` / `LibrarySnapshot` / `DocumentEntry` 응답 계약. scan 중 문서 본문을 읽지 않는다.
- Produces: Rust/TS `DocumentSnippet = { path: string; snippet: string | null }`, IPC `read_document_snippets(root, paths)` / adapter `readDocumentSnippets(root, paths)`.
- Error semantics: `not-found`·일시적 read failure는 해당 path의 `snippet: null`로 부분 성공한다. absolute/traversal/outside-root/hidden/symlink/non-Markdown 입력은 batch 전체를 실패시킨다.
- Cache: hook 내부에서 `path -> { updatedMs, snippet }`와 in-flight `path + updatedMs` key set을 관리한다. 현재 `visibleDocuments` 중 cache miss·mtime 변경이면서 in-flight가 아닌 문서만 batch 요청하며 non-null 결과만 cache한다. 읽기 전·실패 시 행의 스니펫 영역은 비워 둔다.
- Freshness: autosave 성공 시 해당 `DocumentEntry.updatedMs`를 payload mtime으로 갱신하고 snapshot을 기존 updatedMs-desc/path 정렬로 다시 정렬한다. 단일 path key를 in-flight로 등록한 뒤 `readDocumentSnippets`로 다시 읽어 cache를 즉시 교체해 visible effect와의 중복 요청을 막는다.

- [x] **Step 1: Rust 실패 테스트 작성** — 기존 `library.rs` 테스트 관용구를 사용해 다음 경계를 고정한다.
  1. `extract_snippet`이 frontmatter·선두 Markdown marker를 제외하고 최대 160자로 제한한다.
  2. `read_document_snippets`가 요청한 Markdown path만 반환하며 요청 순서와 무관하게 각 결과에 path를 포함한다.
  3. batch 중 삭제되거나 일시적으로 읽을 수 없는 파일은 해당 path의 `snippet: null`이고 다른 결과는 유지된다.
  4. absolute/traversal/outside-root/hidden/symlink/non-Markdown path는 기존 path safety helper로 batch 전체가 실패한다.

- [x] **Step 2: 실패 확인** — Run: `cargo test --manifest-path src-tauri/Cargo.toml` · Expected: FAIL (`read_document_snippets` / `extract_snippet` 없음)

- [x] **Step 3: Rust batch command 구현** — `src-tauri/src/library.rs`에 nullable `DocumentSnippet`, `SNIPPET_READ_BYTES = 4096`, `SNIPPET_MAX_CHARS = 160`, `extract_snippet`, `document_snippet`, `read_document_snippets(root, paths)`를 추가한다. canonical root는 batch당 한 번 계산한다. 각 path는 먼저 `normalize_relative`로 보안 경계를 검증하고 symlink/outside-root/non-Markdown은 전체 실패시킨다. 검증된 path의 not-found·일시적 read failure만 `snippet: None`으로 변환한다. `scan_directory`와 `DocumentEntry`는 변경하지 않는다.

- [x] **Step 4: command 등록·Rust 검증** — `src-tauri/src/lib.rs`의 `generate_handler!`에 `library::read_document_snippets`를 등록한다. Run: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` && `cargo test --manifest-path src-tauri/Cargo.toml` && `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings` · Expected: PASS

- [x] **Step 5: 프런트 IPC 계약 추가** — `src/types/library.ts`에 `DocumentSnippet`, `src/lib/native.ts`에 zod batch schema와 `readDocumentSnippets(root, paths)`를 추가한다. `DocumentEntry`와 `documentEntrySchema`에는 `snippet`을 추가하지 않는다.

- [x] **Step 6: hook 실패 테스트 작성** — `src/hooks/useLibraryWorkspace.test.tsx`에 다음 회귀를 추가한다.
  1. 선택 폴더의 `visibleDocuments`만 한 batch로 요청한다.
  2. 동일 `path + updatedMs`는 재요청하지 않고, scan에서 mtime이 바뀌면 다시 요청한다.
  3. autosave 성공 후 저장된 path만 재조회하고 목록용 updatedMs·snippet이 최신 값으로 바뀌며 updatedMs-desc 순서도 다시 정렬된다.
  4. save refresh와 visible effect가 같은 `path + updatedMs`를 중복 요청하지 않는다.
  5. nullable 결과와 일반 batch 실패는 기존 문서 탐색·편집을 막지 않고 해당 snippet을 빈 상태로 남기며, non-null 결과만 cache한다.

- [x] **Step 7: hook cache·freshness 구현** — `useLibraryWorkspace`에 snippet cache, in-flight key dedupe, visible-only effect를 추가한다. stale async 응답이 root/visible set 변경 뒤 새 cache를 덮지 않도록 latest scope ref로 검증한다. hook은 `visibleSnippets: ReadonlyMap<string, string>`을 반환한다. save 성공 경로는 snapshot의 해당 entry mtime을 갱신·재정렬하고 단일 path key를 in-flight 등록한 뒤 batch 결과로 cache를 교체한다.

- [x] **Step 8: 리스트 행 연결** — `DocumentList`에 `snippets: ReadonlyMap<string, string>` prop을 추가하고 `App.tsx`에서 `workspace.visibleSnippets`를 전달한다. `.document-copy` 안에서 `const snippet = snippets.get(document.path) ?? ""`를 사용해 제목과 날짜 사이에 non-empty snippet만 렌더한다.

- [x] **Step 9: 행 CSS** — `src/index.css`의 `.document-row` 구획에 추가·수정 (56px 고정 높이 규칙이 있으면 제거하고 내용 기반 높이로):

```css
.document-snippet {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--muted);
  font-size: var(--type-xs);
  line-height: 1.45;
  word-break: keep-all;
}
```

- [x] **Step 10: 검증** — Run: `pnpm test` && `pnpm check` && `pnpm build` · Expected: PASS. `pnpm tauri:dev`에서 폴더 선택 직후 빈 snippet으로 목록이 먼저 표시된 뒤 visible 행만 채워지는지, 본문 편집·autosave 후 해당 행의 snippet·날짜가 즉시 갱신되는지 확인.

---

### Task 6: Bear 행 스타일

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Keeps: 기존 `FolderTree` props와 폴더 탐색 의미론. note count는 추가하지 않는다.
- Produces: 선택된 folder/document row의 공간색 tint·text와 Bear형 radius.

- [x] **Step 1: Bear 행 CSS** — `src/index.css`의 `.folder-row`/`.document-row` 구획을 갱신:

```css
.folder-row {
  border-radius: 7px;
}

.folder-row[aria-current="page"] {
  background: var(--space-tint);
  color: var(--space-text);
  font-weight: 600;
}

.document-row {
  border-radius: 9px;
}

.document-row[aria-selected="true"] {
  background: var(--space-tint);
}

.document-row[aria-selected="true"] strong {
  color: var(--space-text);
}
```

(기존 `--selection` 기반의 동일 선택자 규칙은 위 값으로 교체한다. dialog 등 공간과 무관한 곳의 `--selection` 사용은 유지.)

- [x] **Step 2: 검증** — Run: `pnpm test` && `pnpm check` · Expected: PASS. dev 앱에서 sidebar가 아이콘·라벨·계층·선택 상태만 표시하고 숫자 없이 정돈되는지 확인.

---

### Task 7: 공간색 마감 — 탭·모드·에디터·뷰·문구

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.tsx` (빈 상태·onboarding·다이얼로그 title 문구)
- Modify: `src/App.test.tsx`
- Modify: `src/components/MarkdownEditor.tsx`
- Modify: `src/components/MarkdownEditor.test.tsx`

**Interfaces:**
- Consumes: `--space-accent`/`--space-tint`/`--space-text`, 확정 문구 (Global Constraints).

- [x] **Step 1: content-header 공간 배지 계약 복구 (Task 9에서 superseded)** — 당시 `src/App.tsx` content header의 compact `SpaceSwitcher`에서 `!folderVisible` 조건을 제거해 folder pane 표시 여부와 무관하게 `✎ Human`/`⧉ AI` 배지를 렌더했다. Task 9에서 content header와 `active-root`를 제거하고 공간 전환·root 변경을 sidebar로 한정했다.

- [x] **Step 2: 탭·모드 스위치 공간색 CSS** — `src/index.css`:

```css
.tab-item.active {
  box-shadow: inset 0 -2px 0 var(--space-accent);
}

.mode-switch button[aria-pressed="true"] {
  background: var(--space-tint);
  color: var(--space-text);
}
```

(기존 `.tab-item.active`·`.mode-switch` active 규칙의 강조 속성을 위로 교체. 나머지 레이아웃 속성은 유지.)

- [x] **Step 3: 실패하는 marker 강조 테스트** — `src/components/MarkdownEditor.test.tsx`에 `#`/`-`/`>`/fenced-code marker가 `.cm-space-mark`로 렌더되고, 뒤의 heading·본문 텍스트에는 이 class가 붙지 않는 회귀를 추가한다. Run: `pnpm test src/components/MarkdownEditor.test.tsx` · Expected: FAIL.

- [x] **Step 4: 에디터 marker Decoration 구현** — `src/components/MarkdownEditor.tsx`에서 기존 직접 의존성만 사용한다.
  1. `syntaxTree`를 `@codemirror/language`에서, `Decoration`·`ViewPlugin`을 `@codemirror/view`에서 import한다.
  2. `HeaderMark`, `ListMark`, `QuoteMark`, `CodeMark`, `HorizontalRule` node만 `Decoration.mark({ class: "cm-space-mark" })`로 표시한다.
  3. document 변경 시 decoration을 다시 계산하고, selection-only transaction에서는 기존 set을 재사용한다.
  4. heading/paragraph/list item의 텍스트 node에는 decoration을 적용하지 않는다.

- [x] **Step 5: 에디터·뷰 공간색 CSS** — marker class와 안정 UI class를 공간색에 연결한다:

```css
.markdown-editor .cm-space-mark {
  color: var(--space-text);
}

.markdown-editor .cm-cursor,
.markdown-editor .cm-dropCursor {
  border-left-color: var(--space-accent);
}

.markdown-editor .cm-selectionBackground,
.markdown-editor .cm-content ::selection {
  background: var(--space-tint);
}

.markdown-view blockquote {
  border-inline-start: 3px solid var(--space-accent);
}

.markdown-view li::marker {
  color: var(--space-accent);
}

.markdown-view a {
  color: var(--space-text);
}
```

(기존 `.markdown-view` 규칙과 중복되면 병합한다. editor 본문 텍스트는 뉴트럴을 유지하며, View mode는 렌더된 list marker·blockquote border·link에만 공간색을 적용한다.)

- [x] **Step 6: 빈 상태 문구 교체** — `src/App.tsx`의 `content-empty` 분기를:

```tsx
{settings.activeSpace === "intent" ? (
  <p>
    내가 남기는 의도와 취향,
    <br />
    AI 요청의 출발점입니다
  </p>
) : (
  <p>
    내 의도와 취향으로
    <br />
    AI가 만든 결과입니다
  </p>
)}
```

버튼 라벨은 `새 메모`/`새 문서` 유지.

- [x] **Step 7: onboarding·라벨 문구 교체** — `src/App.tsx`에서:
  1. `DocsWelcomeScreen`: eyebrow `AI · 구현 결과`, h1 `AI가 만든 Markdown 결과를 읽을 폴더를 연결하세요.`, 본문 `내 의도와 취향으로 AI가 만든 결과를 읽는 공간입니다. 원본 파일은 선택한 폴더에 그대로 유지됩니다.`, 버튼 `AI folder 선택`.
  2. `chooseLibrary` 호출 title: `"Intent library 선택"` → `"Human library 선택"`, `"Docs folder 선택"` → `"AI folder 선택"` (두 곳: `RuntimeApp`·`handleRootChange`).
  3. **Superseded by Task 9:** content header의 `active-root` 버튼·aria-label 교체 요구. 최종 구현에서는 해당 버튼을 제거했다.
  4. `WelcomeScreen`(첫 onboarding)의 eyebrow는 `Intent Memo · 의도 메모`로 유지하되 본문 아래 문장은 그대로 둔다 (제품명은 변경 없음).

- [x] **Step 8: 검증** — Run: `pnpm test` && `pnpm check` && `pnpm build` · Expected: PASS. dev 앱에서 3-pane·2-pane·content-only 모두 content toolbar에 공간 배지·active-root가 없고 Human/AI 전환·root 변경은 sidebar에만 있는지 확인한다. Human/AI 전환 시 탭 밑줄·선택 행·caret·Markdown marker 색이 red/blue로 함께 바뀌고 heading·본문 텍스트는 뉴트럴인지, 빈 상태 문구가 공간별로 맞는지도 확인한다.

---

### Task 8: Showcase·계약 문서 갱신 + 전체 게이트

**Files:**
- Modify: `src/components/PrimitiveShowcase.tsx`
- Modify: `CLAUDE.md`
- Modify: `DESIGN.md`
- Modify: `docs/specs/intent-memo.md`
- Modify: `docs/specs/2026-08-06-human-ai-characterisation-design.md`

- [x] **Step 1: Showcase 갱신** — `PrimitiveShowcase.tsx`에서 `SpaceSwitcher`·`DocumentList`·`FolderTree` 사용부를 새 prop 계약(`root`, `documents`, `snippets` map 포함)에 맞추고, 스위처의 Human/AI 두 상태와 루트 표시줄을 나란히 보여주는 항목으로 수정한다. Run: `pnpm build`로 컴파일 확인, `pnpm dev` 후 `?showcase=1` 방문.

- [x] **Step 2: CLAUDE.md UI Contract 갱신** — 다음 항목을 수정한다:
  - `Intent | Docs` 표기를 `Human | AI`(내부 키는 intent/docs 유지)로.
  - "the folder pane lists both configurable base folders" → 사이드바는 active root 표시줄(경로 끝부분+최종 폴더 강조)을 제공한다. compact header의 active-root 유지 요구는 Task 9에서 superseded되어 최종 계약에서 제외한다.
  - "OS color mode … fixed" → 테마 설정(Light 기본 · Charcoal · Dark · System)으로.
  - 문서 리스트가 제목+스니펫+날짜 행이라는 문장 추가.

- [x] **Step 3: DESIGN.md 갱신** — 팔레트 표를 새 토큰(라이트 그레이 + `--space-*` + `--sidebar-*` + 테마 4종)으로 교체하고, `SpaceSwitcher`(화살표·공간색 active·루트 표시줄)·문서 리스트 행(제목+스니펫 2줄+날짜)·숫자 없는 sidebar 행·탭 밑줄 규칙을 컴포넌트 절에 반영한다. "문서 list row는 56px" 규칙을 내용 기반 높이로 교체한다.

- [x] **Step 4: 제품·설계 스펙 갱신** — `docs/specs/intent-memo.md`에 v0.2 델타로 공간 표시명 Human/AI와 성격 정의, 루트 표시줄, 스니펫 리스트, 테마 설정, 공간색 계약을 반영한다. `docs/specs/2026-08-06-human-ai-characterisation-design.md`의 구현 시 결정 사항은 Decision Gates와 Repo-Evidence Resolutions의 최종 결과와 동기화한다: visible-only batch IPC + `path + updatedMs` cache, syntax-tree marker node만 공간색 강조, 폴더 카운트 제거, 일반 file 오류 부분 성공·보안 오류 batch 실패, 검증된 dark/charcoal 시작 색 유지.

- [x] **Step 5: 전체 게이트** — Run:

```bash
pnpm test
pnpm check
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: 전부 PASS.

- [x] **Step 6: Tauri smoke 테스트** — `pnpm tauri:dev` 실행 후 확인 체크리스트:
  1. Human ↔ AI 전환: 스위처·루트 표시줄·트리·리스트·탭이 함께 교체되고 red ↔ blue로 물든다.
  2. 테마 4종 전환 + System의 OS 연동. Charcoal에서 사이드바만 `#272C34`.
  3. 스니펫: 목록이 먼저 표시된 뒤 현재 폴더의 visible 행만 채워지고, frontmatter 제외 본문이 2줄 클램프로 보이며, 편집·autosave 뒤 해당 행이 즉시 갱신된다.
  4. 루트 표시줄 클릭 → 폴더 선택 다이얼로그 → 변경 반영.
  5. `⌘1`/`⌘2` 레이아웃에서 content toolbar에는 공간 배지·active-root가 없고, Human/AI 전환·root 변경은 sidebar에만 있다.
  6. Human 문서는 Edit로, AI 문서는 View로 열린다 (기존 동작 유지).

---

### Task 9: Content toolbar 단순화 (2026-08-07 후속 결정)

기존 Task 7의 "모든 layout에서 compact 공간 배지"와 `RefreshCw + pane 수` 계약은 사용자 후속 결정으로 대체한다. 목표는 Human에서는 의도를 작성하고 AI에서는 결과를 확인하는 두 핵심 흐름 외의 content chrome을 최소화하는 것이다.

- [x] **Step 1: 단일 tab row 회귀 테스트** — `src/App.test.tsx`에 tab row 우측 toolbar, mode switch 최우측, compact 공간 배지 부재, 숫자 없는 pane control 계약을 추가한다.
- [x] **Step 2: toolbar 통합** — `src/components/TabBar.tsx`가 scrollable tab list와 fixed right actions를 한 줄로 렌더하도록 변경하고 `src/App.tsx`의 별도 content header를 제거한다.
- [x] **Step 3: pane control 단순화** — `RefreshCw + 3/2/1`을 top-right `PanelLeft` icon-only control로 교체하되 기존 layout cycle 동작과 accessible label·tooltip은 유지한다.
- [x] **Step 4: 공간 정보 중복 제거** — Human/AI 전환과 root 변경은 sidebar에만 남기고 content toolbar에는 공간·root label을 표시하지 않는다. `Edit | View`는 toolbar 맨 오른쪽에 고정한다.
- [x] **Step 5: 검증** — frontend 47 tests·check·build, Rust fmt·clippy·9 tests, `git diff --check` PASS. 실제 Tauri 3-pane·2-pane·content-only fresh capture에서 pane icon cycle, 한 줄 toolbar, mode switch 우측 고정, 공간·root label 부재, CJK 조판을 확인했고 2인 독립 visual QA PASS.

---

### Task 10: Leading pane control + icon mode cycle (2026-08-07 후속 결정)

Task 9의 우측 pane icon과 text `Edit | View` segmented control을 사용자 후속 결정으로 대체한다. toolbar 순서는 `[pane control] | tabs | [mode control]`이며 mode에는 Split이 추가된다.

- [x] **Step 1: toolbar 위치 회귀** — `src/components/TabBar.tsx`를 leading action·scrollable tabs·trailing actions 구조로 바꾸고 pane control이 첫 tab 바로 앞에 있음을 `src/App.test.tsx`에서 검증한다.
- [x] **Step 2: mode type 확장** — `EditorMode`에 `split`을 추가하고 `Edit → View → Split → Edit` 순서를 `PencilLine`·`Eye`·`Columns2` icon과 accessible label로 연결한다.
- [x] **Step 3: Split surface** — `src/App.tsx`와 `src/index.css`에서 editor와 rendered view를 동일 폭 2-column, 독립 scroll owner, 1px separator로 렌더한다.
- [x] **Step 4: targeted 검증** — toolbar 위치, 세 mode의 다음 상태, split editor/view 동시 렌더를 포함한 App 12 tests와 frontend check/build PASS.
- [x] **Step 5: 전체 검증·Tauri QA** — frontend 50 tests·check·build, Rust fmt·clippy·9 tests, `git diff --check` PASS. 실제 Edit·View·Split 화면에서 pane icon 선두, mode icon 우측, 동일 폭 split과 CJK 조판을 확인했고 독립 2인 visual QA PASS.

---

### Task 11: Window titlebar identity + active document title (2026-08-07 후속 결정)

비어 있던 macOS 상단 영역을 reference처럼 최소 정보만 담는 titlebar로 사용한다. native traffic lights는 유지하며 제품명은 왼쪽, 현재 문서 제목은 창 중앙에 둔다.

- [x] **Step 1: titlebar 회귀 테스트** — active document가 있을 때 `Intent Memo`와 문서 제목이 각각 service·document slot에 렌더되는지 App test에 추가하고 RED를 확인한다.
- [x] **Step 2: overlay titlebar 구현** — Tauri window를 `Overlay + hiddenTitle`로 설정하고 38px drag region에 왼쪽 service name과 절대 중앙 document title을 렌더한다. 문서 action·경로는 추가하지 않는다.
- [x] **Step 3: 계약 갱신·targeted 검증** — `DESIGN.md`, 제품 스펙, `CLAUDE.md`에 titlebar 계약을 반영하고 App 12 tests·frontend check/build PASS.
- [x] **Step 4: 전체 검증·Tauri QA** — fresh Tauri 창에서 native traffic lights, 왼쪽 `Intent Memo`, 중앙 `hybrid`, Edit·View·Split 세 상태를 확인했다. Split CJK word break를 `break-word + keep-all`로 보정한 fresh 3-state capture가 독립 2인 visual QA PASS.

---

### Task 12: Human/AI root 선택 onboarding (2026-08-07 후속 결정)

클린 settings에서 `libraryRoot`와 `docsRoot`를 모두 미선택으로 유지하고, 사용자가 Human/AI 중 먼저 사용할 공간과 폴더를 직접 선택한다. 앱은 기본 위치나 `Library`라는 고정 root 이름을 가정하지 않는다.

- [x] **Step 1: onboarding 회귀 테스트 RED** — 두 root가 `null`일 때 Human 폴더를 선택하지 않고 AI로 전환할 수 있으며, 전환 후에도 두 root가 미선택으로 유지되는 계약을 `src/App.test.tsx`에 추가했다. empty store가 두 root를 `null`로 시작하는 계약을 `src/lib/settings.test.ts`에 추가했다.
- [x] **Step 2: 공간 독립 root gate** — `RuntimeApp`이 active space의 root만 검사하도록 바꾸고 Human/AI onboarding 양쪽에 space switcher를 제공했다. 사용자가 선택한 공간의 folder picker만 열고 선택 전에는 workspace를 렌더하지 않는다.
- [x] **Step 3: 고정 Library label 제거** — 폴더 트리 최상위, root 목록 header, root 이동 목적지에 선택한 directory basename을 사용한다. Human picker 문구도 `Human folder 선택`으로 통일했다.
- [x] **Step 4: 전체 검증·실제 Tauri QA** — frontend 52 tests·check·build, Rust fmt·clippy·9 tests, `git diff --check` PASS. clean-store 실제 Tauri에서 Human/AI를 어느 쪽이든 먼저 선택할 수 있고 각 공간의 native folder picker만 열리는 것을 확인했다. 사용자 settings는 SHA 대조 후 복원했으며, 복원 workspace에서 고정 `Library` 대신 선택한 root basename `plans`가 표시되었다. 4개 fresh capture의 독립 2인 visual QA도 PASS.

## Self-Review 기록

- 설계 §2(공간 모델)→Task 3·7, §3(Bear 구성)→Task 5·6, §4(스위처)→Task 3, §5(루트 표시줄)→Task 4, §6(색)→Task 2·6·7, §7(테마)→Task 1·2, §8(문구)→Task 7, §9(모션·접근성)→Task 3 Step 5 reduce-motion·radio semantics, §10(영향 범위)→전 task. §12의 미결 4건은 모두 해소되었다: snippet=visible-only batch/cache, count=제거, dark colors=contrast 검증 후 유지, syntax=marker node only.
- Task 간 시그니처 일치 확인: `Theme`/`resolveTheme`(1→2), `root`/`onRootChange`(3→4), `DocumentSnippet`/`readDocumentSnippets`/`visibleSnippets`(5 Rust→TS→hook→UI).
