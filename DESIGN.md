# Intent Memo Design System

## 0. Research Log

- 제품 기준: `docs/specs/intent-memo.md`의 인간 원본 중심 Markdown editor 계약.
- UX 기준: `.scratch/pivot-markdown-editor/research/miaoyan-ux.md`에서 MiaoYan의 세 pane, 제목+날짜 문서 셀, content 중심 접기 규칙, 고정 본문 폭과 CJK 조판을 추출했다. 브랜드 자산이나 화면을 복제하지 않는다.
- 스타일 기준: frontend `minimalist-skill`의 premium utilitarian minimalism을 적용하되, 메모 앱의 읽기 집중을 위해 장식적 hero·gradient·glass는 사용하지 않는다.
- 성능·접근성 기준: frontend `perfection`의 semantic HTML, keyboard, focus, reduced-motion, real-browser 검증 규칙을 적용한다.
- 추가 React dev tooling은 repo 규칙의 "명시 요청 없는 dependency 추가 금지" 때문에 설치하지 않는다. 제품에 필요한 CodeMirror와 테스트 도구만 사용한다.
- 이미지 concept draft와 lazyweb 조사는 실행하지 않는다. 이 앱은 기존 MiaoYan 소스 조사와 확정된 3-pane 제품 계약이 구체적 reference packet을 제공한다.

## 1. Atmosphere & Identity

Intent Memo는 조용한 종이 책상처럼 느껴져야 한다. 크롬은 낮은 대비의 따뜻한 회색 표면으로 물러나고, 사용자가 쓴 Markdown과 현재 선택 상태만 선명하게 남는다.

기억에 남아야 할 순간은 `⌘2`로 양쪽 pane이 사라져 글만 남는 전환이다. 장식 애니메이션 대신 content 집중의 상태 변화가 제품의 signature interaction이다.

### App Icon

- 상징의 중심은 AI나 자동화가 아니라 인간이 스스로 남기는 의도다.
- 따뜻한 종이 메모와 자연스러운 세 줄의 손글씨 필획으로 `인간이 직접 남긴 생각`을 표현한다.
- 마지막 짧은 필획을 느슨한 terracotta 원으로 강조해 여러 생각 중 스스로 선택한 `의도`를 나타낸다.
- arrow·chart·graph·robot·brain·sparkle·chat bubble·문자 로고는 사용하지 않는다. AI보다 메모와 인간 저작성이 먼저 읽혀야 한다.
- macOS rounded-square silhouette 안에서 16px에서도 메모와 강조 표시가 구분되어야 하며, 본문 UI와 같은 warm neutral·graphite·terracotta 계열을 사용한다.

## 2. Color

### Palette

색상은 CSS custom properties로만 소비한다.

| Token | Light 역할 | Dark 역할 |
|---|---|---|
| `--canvas` | 앱 배경 | 앱 배경 |
| `--panel` | folder/list surface | folder/list surface |
| `--content` | editor/read surface | editor/read surface |
| `--text` | primary text | primary text |
| `--muted` | 날짜·보조 설명 | 날짜·보조 설명 |
| `--border` | pane separator | pane separator |
| `--selection` | 선택된 항목 | 선택된 항목 |
| `--selection-text` | 선택 항목 text | 선택 항목 text |
| `--accent` | focus·active control | focus·active control |
| `--danger` | destructive action | destructive action |

### Rules

- `prefers-color-scheme`만으로 light/dark를 전환한다.
- 색상만으로 선택·오류를 표현하지 않고 shape, label, icon을 함께 사용한다.
- 본문 surface에는 gradient, glass, noise를 사용하지 않는다.
- 한 화면의 강조색은 active mode와 focus indication에만 제한한다.

## 3. Typography

### Scale

| Token | 크기/행간 | 용도 |
|---|---|---|
| `--type-xs` | 11px / 1.35 | 날짜·shortcut hint |
| `--type-sm` | 13px / 1.45 | pane labels·controls |
| `--type-body` | 16px / 1.74 | editor·rendered body |
| `--type-title` | 22px / 1.3 | 문서 제목 |
| `--type-empty` | 34px / 1.2 | 빈 상태 문구 |

### Font Stack

- UI와 본문: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Noto Sans KR`, sans-serif.
- CodeMirror 코드 영역: `SFMono-Regular`, `Cascadia Code`, `Noto Sans Mono CJK KR`, monospace.

### Rules

- 본문은 `word-break: keep-all`을 우선하고 긴 URL·code에서만 overflow wrapping을 허용한다.
- 한글 조사 한 글자가 고립될 정도로 content column을 좁히지 않는다.
- 제목은 한 줄 ellipsis, 문서 본문은 잘라내지 않는다.

## 4. Spacing & Layout

### Base Unit

기본 단위는 4px이다. 제품 화면에서 사용하는 간격은 4, 8, 12, 16, 20, 24, 32px로 제한한다.

### Grid

- Desktop 기본: folder 216px, document list 280px, content는 나머지.
- 각 pane은 독립 scroll owner이며 flex child에 `min-inline-size: 0`, `min-block-size: 0`을 적용한다.
- rendered body의 읽기 폭은 최대 880px, editor source 폭은 최대 960px다.
- 900px 미만에서는 folder pane을 기본 접고, 700px 미만에서는 list pane도 접을 수 있다. Tauri 최소 창 폭에서는 horizontal page scroll이 생기지 않는다.

### Rules

- pane separator는 1px border만 사용한다.
- 문서 list row는 56px이며 제목 1줄과 updated 날짜만 표시한다.
- content 하단에는 최소 96px의 읽기 여백을 둔다.

## 5. Components

### AppShell

- 상태: onboarding, loading, ready, fatal error.
- ready 상태만 `FolderPane`, `DocumentList`, `ContentPane`을 렌더링한다.

### PaneHeader

- label, 현재 경로 또는 mode, 필요한 icon button 최대 2개.
- hover에만 보이는 동작도 keyboard focus에서는 항상 보여야 한다.

### FolderTreeItem

- 상태: rest, hover, selected, drag-over, focus-visible.
- depth는 padding token으로 표현하고 folder icon과 이름을 제공한다.

### DocumentRow

- 제목과 updated 날짜만 표시한다.
- 상태: rest, hover, selected, dragging, focus-visible.
- selected background는 pane edge에서 6px 안쪽인 pill surface다.

### ModeSwitch

- `Edit`, `View` 두 button의 segmented control.
- `aria-pressed`로 active 상태를 노출한다.

### IconButton

- 30px hit area, Lucide icon 15px.
- 상태: rest, hover, active, focus-visible, disabled, danger.
- tooltip 또는 `aria-label` 없이 icon-only button을 사용하지 않는다.

### MarkdownEditor

- CodeMirror root가 content scroll owner가 되며 source text 이외의 toolbar는 없다.
- 상태: ready, saving, saved, conflict/error.

### MarkdownView

- prose hierarchy, GFM table/code/list를 지원하며 interactive editor control은 없다.

### InlineNotice

- conflict와 filesystem error를 content header 아래에 표시한다.
- dismiss 또는 재시도 action이 있을 때만 button을 렌더링한다.

### EmptyState

- 대형 한 문장과 다음 행동 하나만 제공한다.
- illustration, card grid, tutorial carousel은 사용하지 않는다.

### Primitive Showcase

개발용 `?showcase=1` surface에서 위 interactive primitive의 rest, hover 설명, selected, focus, error, empty 상태를 한 화면에 노출한다. 제품 route와 같은 token stylesheet를 사용한다.

## 6. Motion & Interaction

### Timing

- 즉시 feedback: 80ms.
- pane 전환: 180ms `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- hover/focus color: 120ms ease-out.

### Rules

- pane 폭 전환은 grid column interpolation으로만 사용하고 content 입력 중 layout animation을 시작하지 않는다.
- autosave는 motion이 아니라 text status로 알린다.
- `prefers-reduced-motion: reduce`에서는 모든 전환 시간을 1ms로 낮춘다.
- decorative loop, bounce, glow pulse를 금지한다.

## 7. Depth & Surface

### Strategy

- depth는 canvas/panel/content의 미세한 명도 차이와 separator로만 표현한다.
- modal과 context menu에만 단일 soft shadow를 허용한다.
- 모든 row를 card로 만들거나 중첩 rounded container를 사용하지 않는다.
- radius는 control 6px, selected row 8px, modal 12px로 제한한다.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- 모든 CRUD action은 keyboard로 도달 가능해야 한다.
- `⌘1`, `⌘2` 외 기능에는 단축키가 없어도 visible control이 있어야 한다.
- focus ring은 배경과 3:1 이상 대비를 유지한다.
- body text와 UI text는 WCAG AA 대비를 유지한다.
- destructive action은 확인 후 실행하고 시스템 Trash 실패 시 원본 보존을 명시한다.
- drag-and-drop move에는 keyboard 대체 move control을 함께 제공한다.
- editor와 rendered content에서 한글 조합·줄바꿈·glyph fallback을 실제 화면으로 검증한다.

### Accepted Debt

- v0.1은 사용자 조절 typography와 theme UI를 제공하지 않는다.
- Windows IME는 macOS 첫 release gate 밖이며 Windows 배포 전 별도 검증한다.
- 독립 visual reviewer subagent는 현재 실행 환경의 명시적 delegation 제한 때문에 사용할 수 없다. 같은 build의 다중 viewport capture와 직접 interaction QA로 대체하되 최종 보고에 이 검증 공백을 명시한다.
