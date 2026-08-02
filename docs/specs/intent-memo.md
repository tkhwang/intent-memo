# Intent Memo v0.1 제품 스펙

상태: 구현 기준 확정
작성일: 2026-08-02
제품명: `Intent Memo` (`의도 메모`)

## 1. 제품 의도

Intent Memo는 AI 시대에 한 인간이 자신의 생각과 의도를 직접 정리해 남기는 가벼운 데스크톱 Markdown 메모 앱이다. Markdown 파일은 사용자가 소유하는 원본이며, 앱은 이 원본을 빠르고 안전하게 작성하고 읽는 데 집중한다.

초기 버전은 AI 기능을 포함하지 않는다. 향후 LLM 기반 개인 지식·비서 기능은 사용자의 원본을 활용하는 파생 계층으로 추가하되, 인간이 작성한 원본을 대체하거나 암묵적으로 변경하지 않는다.

## 2. v0.1 성공 조건

- 사용자가 하나의 로컬 폴더를 Markdown library로 선택할 수 있다.
- library의 root와 임의 깊이 하위 폴더에 있는 `.md` 문서를 탐색한다.
- 파일과 폴더를 생성·이름 변경·이동하고 시스템 휴지통으로 삭제할 수 있다.
- 문서는 Markdown syntax highlighting이 있는 소스 편집기에서 작성하고 자동 저장된다.
- 같은 문서를 `Edit | View`로 전환해 rendered Markdown으로 읽을 수 있다.
- 외부 변경이나 경계 이탈이 감지되면 원본을 조용히 덮어쓰거나 손상하지 않는다.
- 클린 설치에서 library 선택 전에는 workspace에 진입하지 않는다.

## 3. 제품 정체성

| 항목 | 값 |
|---|---|
| 표시명 | `Intent Memo` |
| 한국어 설명 | `의도 메모` |
| artifact/package/cask slug | `intent-memo` |
| bundle identifier | `app.tkbetter.intentmemo` |
| 초기 버전 | `0.1.0` |

기존 PromptPad 이름, 버전, 설정, 데이터 형식은 계승하지 않는다. 기존 사용자나 운영 데이터가 없는 greenfield 제품으로 시작한다.

## 4. v0.1 기능 범위

### 포함

- 단일 read-write `libraryRoot`
- root-level 및 중첩 폴더 Markdown 탐색
- 파일·폴더 create, rename, move
- 파일·폴더 system Trash 이동
- 파일명 기반 문서 제목
- UTC ISO 8601 `created`, `updated` frontmatter
- CodeMirror 6 Markdown syntax highlighting
- 자동 저장
- 동일 문서의 rendered View mode
- 3-pane workspace: 폴더, 문서 목록, content
- pane 단축키: `⌘1` 폴더 pane 토글, `⌘2` 문서 목록과 폴더 pane을 함께 접어 content-only 전환
- library 경로 선택·변경
- OS light/dark 색상 모드와 고정 제품 typography

### 제외

- 검색, tags, pin
- Markdown toolbar 및 표·체크박스 편집 보조
- 이미지 붙여넣기와 첨부파일 관리
- template 변수와 block editor
- LLM launcher, chat, embedding, index, graph, backlink, wiki
- repo 연결, file mention, data export
- backend, 동기화, 계정
- theme, font size, 언어 등 appearance 설정 UI
- 기존 PromptPad library·settings migration
- 여러 workspace profile 동시 관리

## 5. 정보 구조와 인터랙션

### 5.1 첫 실행

앱은 저장된 `libraryRoot`가 없으면 OS 폴더 선택기를 표시한다. 사용자가 유효한 폴더를 선택하기 전에는 빈 workspace를 열지 않는다. 선택한 경로는 새 bundle identity의 앱 설정에 저장하고 재시작 시 복원한다.

### 5.2 Workspace

1. 폴더 pane은 `libraryRoot`의 디렉토리 트리를 표시한다.
2. 문서 목록 pane은 선택 폴더의 Markdown 문서를 제목과 updated 날짜만으로 표시한다.
3. content pane은 선택 문서의 `Edit | View` 전환과 파일명 기반 제목 편집을 제공한다.

`⌘1`은 폴더 pane만 독립적으로 토글한다. `⌘2`로 문서 목록을 접으면 폴더 pane도 함께 접혀 content-only 상태가 된다. 문서 목록을 다시 펼칠 때 이전 폴더 pane 상태를 복원한다. pane 상태는 앱 재시작 후 복원한다.

### 5.3 문서 편집

- Edit mode는 CodeMirror 6 직접 통합으로 구현하며 Markdown syntax highlighting만 제공한다.
- IME 조합 중에는 autosave나 외부 state 동기화가 조합 입력을 끊지 않는다.
- View mode는 저장 대상과 같은 본문을 Markdown으로 렌더링한다.
- 본문은 제품이 정한 고정 최대 폭, 행간, 자간을 사용한다.

## 6. 파일 및 metadata 계약

### 6.1 제목과 경로

- 문서 제목의 canonical source는 확장자를 제외한 파일명이다.
- 제목 변경은 같은 문서의 파일 rename으로 처리한다.
- 빈 제목, 경로 구분자, 예약 이름처럼 유효하지 않은 파일명은 저장 경계에서 거부한다.
- rename이나 move 대상이 이미 존재하면 덮어쓰지 않고 collision 오류를 반환한다.

### 6.2 Canonical Markdown

새 문서는 아래 형식으로 저장한다.

```markdown
---
created: 2026-08-02T03:04:05.000Z
updated: 2026-08-02T03:04:05.000Z
---

# 나의 의도
```

- 두 필드는 UTC `YYYY-MM-DDTHH:mm:ss.sssZ` 문자열이다.
- `created`는 생성 후 변경하지 않는다.
- 본문 저장 또는 파일명 저장이 성공하면 `updated`를 갱신한다.
- `title`, `tags`, `pinned`, `templateValues`, `repoPath`를 v0.1 metadata로 기록하지 않는다.
- 알 수 없는 legacy PromptPad 형식을 변환하는 adapter는 제공하지 않는다.

## 7. 파일시스템 안전 계약

모든 native 파일 작업은 canonicalized `libraryRoot`와 대상 경로를 비교한다.

- 대상은 항상 `libraryRoot` 내부여야 하며 root 자체의 rename·move·delete는 허용하지 않는다.
- 숨김 이름으로 시작하는 파일·폴더와 symlink는 탐색 및 조작 대상에서 제외한다.
- path traversal, symlink traversal, root 외부 absolute path를 거부한다.
- Markdown 문서는 `.md` 확장자만 취급한다.
- 파일 저장은 같은 디렉토리의 임시 파일에 완전한 내용을 기록한 뒤 atomic replace한다.
- 문서 load 시점의 disk modification time을 저장하고, save 시 현재 값과 다르면 `external-change` conflict를 반환한다.
- conflict가 발생하면 디스크 원본을 유지하고 사용자의 편집 내용을 자동으로 버리지 않는다.
- delete는 운영체제 시스템 휴지통으로 이동한다. 영구 삭제 API는 제공하지 않는다.
- 휴지통 이동이 실패하면 원본을 유지하고 오류를 표시한다.

## 8. 오류 표면

사용자가 해결할 수 있는 실패는 content pane 또는 해당 조작 근처에 간결하게 표시한다.

- 외부 변경 충돌
- 같은 이름의 파일·폴더 충돌
- library 경계 이탈 또는 허용되지 않은 경로
- 읽기·쓰기·rename·move·trash 실패

오류를 표시한 뒤 선택 문서와 편집 buffer를 유지한다. 실패를 성공처럼 처리하거나 silent overwrite하지 않는다.

## 9. 장기 확장 경계

후속 버전은 두 종류의 폴더를 독립 경로로 도입할 수 있다.

- 사용자 원본 폴더: canonical source-of-truth, editable
- AI 관리 폴더: 원본에서 생성 가능한 derived knowledge, read-only Markdown render

v0.1은 이 dual-folder UI와 Human/AI mode를 구현하지 않는다. 현재의 단일 `libraryRoot`, 경로 안전 경계, 문서 read model, rendered View mode가 후속 read-only AI 폴더를 추가할 수 있는 기반이어야 한다.

## 10. 배포 계약

- macOS Tauri app은 기존 signing·notarization workflow를 단일 앱 경로에 맞게 유지한다.
- release artifact와 Homebrew cask 이름은 `intent-memo`를 사용한다.
- Homebrew cask는 `auto_updates true`를 선언하고 사용자 library나 앱 데이터는 `zap`으로 삭제하지 않는다.
- `release: published` 이후 tap update workflow가 실행되도록 구성한다.
- 원격 tap 수정, repository secret 등록, 실제 release 발행은 자격증명이 필요한 배포 작업으로 로컬 구현과 분리한다.

## 11. 검증 기준

- TypeScript build 및 non-mutating Biome check 통과
- frontend와 filesystem 경계 회귀 테스트 통과
- Rust format, clippy, tests 통과
- Tauri production build 통과
- 실제 앱에서 첫 library 선택, root/nested CRUD, rename/move collision, external-change conflict, autosave, Edit/View, pane 단축키, 재시작 복원 확인
- OS light/dark 각각에서 3-pane, content-only, empty/error 상태의 가독성과 한글 조판 확인

