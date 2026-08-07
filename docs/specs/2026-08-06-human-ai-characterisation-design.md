# Human | AI 공간 성격 구분 설계

상태: 구현·검증 완료
작성일: 2026-08-06
브랜치: `feat/characterise-intent`
선행 문서: `docs/specs/intent-memo.md`, `DESIGN.md`

## 1. 배경과 목적

이 앱의 핵심은 markdown edit/view 자체가 아니라 **AI 요청을 만들기 위한 나의 의도·취향을 기록하는 것**이다. 흐름은 intent programming을 따른다: 인간이 의도를 쓰고(Human) → AI가 이를 이용해 구현하고 → 그 결과 markdown을 읽는다(AI). 이 설계는 두 공간의 성격 차이 — **Human은 내가 쓰는 곳, AI는 AI가 쓴 것을 읽는 곳** — 를 UI 전반에 드러내고, 워크스페이스 구성을 Bear 스타일로 재편한다.

## 2. 공간 모델과 동작

동작은 v0.2 그대로 유지하고, 이름과 성격 표현만 바꾼다.

| 항목 | Human | AI |
|---|---|---|
| 표시명 | `Human` (구 `Intent`) | `AI` (구 `Docs`) |
| 내부 설정 키 | `libraryRoot` (유지) | `docsRoot` (유지) |
| 루트 | 사용자가 선택한 독립 폴더 | 사용자가 선택한 독립 폴더 (일반적으로 다른 위치) |
| 쓰기 | read-write | read-write |
| 기본 모드 | **Edit** | **View** |
| Edit ↔ View 전환 | 가능 | 가능 |
| 성격 | 내가 남기는 의도·취향 memo | AI가 작성한 결과물 열람 (때로는 수정) |

- 내부 키를 유지하므로 기존 `settings.json` 마이그레이션이 필요 없다.
- 클린 settings에서는 두 root가 모두 미선택(`null`)이다. onboarding의 Human/AI switcher에서 어느 공간을 먼저 연결할지 고르고, active space의 폴더만 OS picker로 선택한다.
- 앱은 기본 `Library` 위치나 이름을 가정하지 않는다. 선택 후 트리 최상위와 root 이동 목적지는 선택한 폴더의 최종 이름을 표시한다.
- 제3의 공간은 추가하지 않는다.

## 3. 워크스페이스 구성 (Bear 스타일)

3-pane 구성은 유지하되 각 pane의 내용과 밀도를 Bear의 문법으로 바꾼다.

### 3.1 사이드바 (구 폴더 pane)

위에서부터:

1. **공간 스위처** (4절)
2. **루트 표시줄** (5절)
3. **폴더 트리** — 선택한 root 폴더명을 최상위 label로 사용한다. 아이콘·라벨·계층만 표시하고 숫자 count는 두지 않는다. 선택 행은 라운드 pill에 공간색 tint를 사용한다.

### 3.2 노트 리스트 (구 문서 목록)

- 행 구성: **제목(1줄) + 본문 스니펫(최대 2줄, muted) + 날짜(소형)**. 기존 "제목+날짜 56px" 계약을 대체한다.
- 스니펫은 frontmatter를 제외한 본문 첫 부분에서 추출한다. 목록 표시를 위해 파일 본문 일부를 읽어야 하므로 지연/비동기 로드로 구현하고, 읽기 전에는 스니펫 자리를 비워 둔다.
- 선택 행: 라운드 pill, 공간색 tint 배경, 제목은 공간색 text.

### 3.3 콘텐츠 pane

- 상단: 공간별 탭 바(유지) — 액티브 탭 밑줄은 공간색.
- 상단 한 줄: `pane icon | 공간별 tabs | 저장 상태 | mode icon`. mode icon은 `Edit → View → Split(Edit | View)`를 순환하고 맨 오른쪽에 고정된다.
- 그 위 macOS overlay titlebar는 native traffic lights를 유지하고 왼쪽에 `Intent Memo`, 창 중앙에 현재 문서 제목만 표시한다.
- 에디터/뷰: 밝은 배경, 넓은 여백. markdown 구문 기호(`-`, `##`, `>` 등)는 공간색으로 하이라이트.
- Human/AI 전환과 root 변경은 sidebar에서만 제공한다. 폴더 pane이 숨겨진 compact 모드에서도 content toolbar에는 공간·root label을 반복하지 않는다.

## 4. 시그니처 스위처

```
[ ✎ Human ] ⟶ [ ⧉ AI ]
```

- 두 개의 단계 버튼과 사이의 `⟶` 화살표. 화살표는 "의도가 AI로 흘러간다"는 방향 서사를 나타낸다.
- 서브라벨은 없다 (의미 설명은 안내 문구가 전담).
- 활성 버튼: 공간색 tint 배경 + 공간색 border + 공간색 text. 비활성 버튼: 투명 배경 + muted border/text.
- 아이콘: Human `✎`(펜), AI `⧉`(문서). robot·sparkle 계열은 사용하지 않는다 (앱 아이콘 원칙과 동일).
- 접근성: 버튼 2개로 구성된 라디오 그룹 시맨틱, 키보드 전환 가능, 색 외에 아이콘·라벨·위치로도 상태가 구분된다.

## 5. 루트 표시줄

Human과 AI의 루트는 서로 다른 위치의 폴더이므로, 어느 위치의 트리를 보고 있는지 항상 보여준다.

- 스위처 바로 아래 한 줄. **경로 끝부분 우선**: 앞부분은 `…`으로 접고, 부모 세그먼트는 muted, **최종 폴더명은 공간색 + bold**.
  - 예: `…/side-projects/` `claude-outputs` / `~/memo/` `intents`
- 전체 경로는 tooltip으로 제공한다.
- 클릭하면 기존 루트 위치 변경 기능으로 연결한다.
- 공간 전환 시 루트 표시줄·폴더 트리·노트 리스트·탭이 함께 해당 공간의 것으로 교체된다.
- AI 루트 빠른 전환(최근 루트 목록)은 이번 범위에서 제외하고 v0.3 후보로 남긴다.

## 6. 색 시스템

### 6.1 공간색

| 토큰 | Human | AI |
|---|---|---|
| `--space-accent` | `#B5524A` (muted red) | `#5878A0` (slate blue) |
| `--space-tint` | `rgba(181,82,74,.10)` | `rgba(88,120,160,.12)` |
| `--space-text` | `#9E4038` | `#41618C` |

다크 표면 위 변형(차콜 사이드바·Dark 테마 시작값): Human `#D87A68` / text `#F0B4A8`, AI `#7E9EC4` / text `#B8CDE4`. 구현 시 대비 기준(WCAG AA)으로 미세 조정한다.

### 6.2 공간색 적용 범위

스위처 활성 버튼, 루트 표시줄 최종 폴더명, 선택된 폴더 행, 선택된 노트 행, 액티브 탭 밑줄, 헤더 공간 배지, 에디터 markdown 구문 기호. **본문 텍스트와 크롬 나머지는 뉴트럴을 유지한다.**

### 6.3 표면 (Light 테마 시작값)

웜 브라운/베이지 팔레트를 라이트 그레이/화이트 계열로 교체한다.

| 역할 | 시작값 |
|---|---|
| 사이드바 | `#F0F0F2` |
| 노트 리스트 | `#FAFAFB` |
| 에디터 | `#FFFFFF` |
| 경계선 | `#E3E3E5` / `#ECECEE` |
| 본문 ink | `#3A3A3C` |
| muted | `#98989D` |

## 7. 테마 시스템 (신설)

설정에 테마 선택을 추가한다. **기본값은 Light.**

| 테마 | 설명 |
|---|---|
| **Light** (기본) | 6.3의 라이트 그레이 3-pane |
| **Charcoal** | 사이드바만 블루 잉크 `#272C34` (border `#3A4150`, text `#DDE3EA`, muted `#97A1AE`), 리스트·에디터는 Light와 동일 |
| **Dark** | 전체 다크. 블루 잉크 계열을 기준 hue로 재조정 (Bear의 뉴트럴 차콜과 구분) |
| **System** | OS 라이트/다크를 따름 (Light ↔ Dark 매핑) |

- 다크 색은 의도적으로 Bear의 `#2C2C2E` 뉴트럴 차콜과 다른 블루 잉크 계열을 쓴다.
- 테마는 `settings.json`에 저장한다. 기존 사용자 호환: 테마 설정이 없으면 Light로 시작한다.

## 8. 안내 문구

| 공간 | 문구 |
|---|---|
| Human | **내가 남기는 의도와 취향, AI 요청의 출발점입니다** |
| AI | **내 의도와 취향으로 AI가 만든 결과입니다** |

- 노출 위치: content pane 빈 상태(문서 미선택)와 온보딩(루트 선택 화면). 사이드바에는 상시 노출하지 않는다.
- 온보딩·설정의 공간 명칭과 설명도 Human/AI 기준으로 갱신한다.

## 9. 모션·접근성

- 스위처 전환은 `.25s` 내외의 절제된 transition. `prefers-reduced-motion`에서는 즉시 전환.
- 상태를 색만으로 표현하지 않는다: 아이콘·라벨·굵기·위치를 병행한다.
- 스위처·루트 표시줄·탭은 키보드로 조작 가능해야 한다.

## 10. 구현 영향 범위

- `SpaceSwitcher.tsx`: 스위처 + 루트 표시줄로 재작성
- `DocumentList.tsx`: 스니펫 2줄 행 + 지연 스니펫 로드
- `FolderTree.tsx`: 숫자 없는 계층 행, pill 선택 스타일
- `TabBar.tsx`, content 헤더: 공간색 액티브 표시, 공간 배지
- `MarkdownEditor.tsx`: markdown 구문 기호 공간색 (CodeMirror 하이라이트 스타일)
- 색 토큰·테마 시스템: CSS custom properties 재정의 + 테마 속성 전환, `lib/settings.ts`에 테마 저장
- 스니펫 제공은 `scan_library` 계약을 유지하고 Rust `read_document_snippets(root, paths)` visible-only batch IPC로 분리한다.
- 문구·라벨 교체(온보딩 포함), `DESIGN.md`·`docs/specs/intent-memo.md` 갱신, 관련 테스트 수정
- Git 커밋·푸시는 하지 않는다 (사용자가 직접 수행)

## 11. 범위 밖

- AI 루트 빠른 전환(최근 루트 목록) — v0.3 후보
- 제3의 공간, LLM 런타임, 검색/태그/툴바/이미지/위키 (기존 제외 범위 유지)

## 12. 구현 결정 결과

- **스니펫**: `scan_library`는 본문을 읽지 않는다. 현재 선택 폴더의 visible 문서만 신규 `read_document_snippets(root, paths)` batch IPC로 읽고 hook에서 `path + updatedMs`로 cache한다. autosave 성공 시 해당 path의 mtime·snippet을 즉시 갱신하고 목록을 재정렬한다.
- **오류 경계**: 삭제·not-found·일시적 read failure는 해당 path의 `snippet: null`로 부분 성공한다. absolute/traversal/outside-root/hidden/symlink/non-Markdown 입력은 보안 오류로 batch 전체를 실패시킨다. non-null 결과만 cache한다.
- **폴더 count**: Bear 공식 sidebar 근거와 제품 밀도 목표에 따라 제거한다. 아이콘·라벨·계층·선택 상태만 표시한다.
- **다크 대비**: 설계 시작값을 유지한다. Charcoal sidebar는 `#272C34`, Dark는 blue-charcoal surface이며 Human `#D87A68`/`#F0B4A8`, AI `#7E9EC4`/`#B8CDE4` 계열을 사용한다.
- **CodeMirror 강조**: syntax tree의 `HeaderMark`, `ListMark`, `QuoteMark`, `CodeMark`, `HorizontalRule` node만 Decoration으로 공간색 처리한다. heading·paragraph·list item의 content text는 뉴트럴을 유지한다.

## 부록: 탐색 기록

시각 탐색 목업은 `.superpowers/brainstorm/91038-1786006500/content/`에 보존되어 있다. 주요 결정 경로: 게이지·파이프라인·로커·스플릿 4컨셉 → 파이프라인(B) 계열 채택 → 단계형(P1) 확정 → 서브라벨 제거 → 라이트 그레이 표면 → Human `#B5524A` × AI `#5878A0` → 루트 표시줄(끝부분 우선) → Bear 구성 채택 → 차콜은 블루 잉크 `#272C34` → 테마(Light 기본 + System).
