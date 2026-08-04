# Intent Memo v0.1.0 Homebrew 배포 Plan (Slice 8 실행)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

작성일: 2026-08-03
상태: 실행 준비 완료
관련: `docs/plans/pivot-markdown-editor.md` Slice 8 · `docs/specs/intent-memo.md` §10 배포 계약

**Goal:** `tkhwang/homebrew-tap`을 통해 `brew install --cask tkhwang/tap/intent-memo`로 Intent Memo v0.1.0을 설치할 수 있게 첫 릴리스를 발행하고 검증한다.

**Architecture:** `v0.1.0` 태그 push → `build-macos.yml`이 서명·notarized DMG를 draft release로 업로드 → draft publish(`release: published`) → `homebrew-bump.yml`이 checksum을 계산해 `distribution/homebrew/intent-memo.rb`를 렌더링하고 `tkhwang/homebrew-tap`의 `Casks/intent-memo.rb`로 push. v0.1 업데이트는 Homebrew가 관리하며 in-app updater는 후속 slice다.

**Tech Stack:** Tauri 2 + tauri-action, GitHub Actions, Homebrew cask, gh CLI.

## Global Constraints

- 버전은 `0.1.0` 고정: `package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` 모두 이미 `0.1.0`이며 첫 릴리스에서 `pnpm release`(bumpp)를 실행하지 않는다.
- 릴리스 태그: `v0.1.0`, 태그는 Task 1–2가 병합된 `main`에서 생성한다.
- git 커밋·푸시·태그·release publish는 사용자가 직접 수행한다 (conventional commits). — CLAUDE.md 규칙
- 파괴적 조작(기존 릴리스·태그 삭제, release publish)은 실행 시점에 사용자 확인 후 수행한다.
- 새 dependency 추가 없음. 앱 로직(`src/`, `src-tauri/src/`)은 수정하지 않고 packaging config와 workflow만 수정한다.
- macOS app/release basename은 공백 없는 `IntentMemo`로 고정한다. Tauri `productName`과 `.app`/DMG/updater/MAS artifact 경로는 `IntentMemo`를 사용하고, 사용자-facing 브랜드 표기는 `Intent Memo`, repo/package/cask token은 `intent-memo`를 유지한다.
- Homebrew cask 계약: v0.1 업데이트는 Homebrew가 관리하므로 `auto_updates`를 선언하지 않는다. 사용자 library와 앱 데이터를 보존하기 위해 `zap` stanza도 정의하지 않는다. — spec §10은 Task 1에서 이 결정에 맞게 갱신한다.

## 확정 결정 (2026-08-03)

- **버전 전략 (사용자 승인):** 기존 PromptPad 릴리스(v0.1.4, v0.1.5, draft v0.1.8)와 태그(v0.1.1–v0.1.8)를 저장소에서 전부 삭제하고, greenfield 결정대로 `v0.1.0`으로 첫 릴리스한다. 이후 patch 버전 충돌이 없고, `releases/latest/download/latest.json`이 PromptPad 0.1.5 manifest를 가리키는 updater 위험도 제거된다.
- **업데이트 소유권 (사용자 승인):** v0.1은 Homebrew-managed update로 배포한다. cask에서 `auto_updates`를 제거해 일반 `brew upgrade` 대상이 되게 하고, 실제 check/install UX가 없는 Tauri in-app updater는 별도 후속 slice로 연기한다.
- **macOS app basename (사용자 승인):** 기본 app 이름에는 공백을 사용하지 않고 `IntentMemo`로 고정한다. `/Applications/IntentMemo.app`과 `IntentMemo_<version>_<arch>.dmg`가 배포 계약이며, 화면·README의 제품 브랜드 `Intent Memo`와 cask token `intent-memo`는 유지한다. 앞선 dot-normalized/slug filename 선택지는 이 최신 결정으로 대체한다.
- **pre-merge CI (사용자 승인):** `.github/workflows/ci.yml`을 추가해 pull request와 `main` push에서 frontend/Rust/release config/unsigned Tauri package를 검증한다. signing·notarization과 양 architecture release build는 기존 tag workflow가 계속 소유한다.

## 사전 확인된 현재 상태 (2026-08-03 조사)

- `origin/main`에 이미 존재: `.github/workflows/build-macos.yml`(태그 `v*` push → 서명 빌드, `releaseDraft: true`), `.github/workflows/homebrew-bump.yml`(`release: published` + `workflow_dispatch`), `distribution/homebrew/intent-memo.rb`.
- `feat/brew-support` 브랜치는 `main`과 동일 (신규 커밋 없음).
- `build-macos-mas.yml`은 `workflow_dispatch` 전용 — 태그 push로는 실행되지 않는다.
- repo secrets: `APPLE_*` 전부, `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)` 등록됨. **`TAP_GITHUB_TOKEN` 미등록** (Task 4).
- 기존 PromptPad 릴리스: v0.1.5(Latest, latest.json 포함), v0.1.4, draft v0.1.8. 태그: v0.1.1–v0.1.5, v0.1.8. `v0.1.0` 태그는 없음.
- `tkhwang/homebrew-tap`: `Casks/workbranch-companion.rb`, `Formula/workbranch.rb` 존재. `Casks/intent-memo.rb` 없음. tap에 `.github/workflows` 없음 → PAT에 workflow scope 불필요.
- **잠재 버그 확인:** 현재 `productName`·cask app stanza·Homebrew workflow·MAS workflow가 `Intent Memo`/`Intent-Memo`를 혼용한다. 기본 basename을 `IntentMemo`로 바꾸면서 모든 packaging path를 함께 갱신하지 않으면 Homebrew download와 MAS build path가 깨진다. Task 1에서 일괄 수정한다.

## Task 의존 관계

```
Task 1 (distribution 계약 + pre-merge CI) ─┐
Task 2 (README 확정)      ─┴→ Task 3 (main 병합) ─→ Task 6 (태그→draft 빌드) ─→ Task 7 (publish→bump) ─→ Task 8 (brew E2E) ─→ Task 9 (문서 마무리)
Task 4 (TAP_GITHUB_TOKEN) ──────────────────────────→ Task 7 전 필수
Task 5 (PromptPad 정리)   ──────────────────────────→ Task 6 전 권장, Task 7 전 필수
```

---

### Task 1 — distribution 계약 + pre-merge CI 확정

**Files:**
- Modify: `src-tauri/tauri.conf.json:3`
- Modify: `distribution/homebrew/intent-memo.rb:8,18,21,25-31`
- Modify: `.github/workflows/homebrew-bump.yml:43-53`
- Modify: `.github/workflows/build-macos-mas.yml:111,194,249`
- Create: `.github/workflows/ci.yml`
- Modify: `docs/specs/intent-memo.md:152-153`
- Add to Git: `docs/plans/brew-release.md`

**Interfaces:**
- Produces: macOS app/release basename `IntentMemo`, Homebrew-managed update와 non-destructive uninstall 계약, pre-merge CI, cask url·bump workflow가 참조하는 DMG asset 이름 `IntentMemo_<version>_<arch>.dmg` — Developer ID/MAS build, Task 3 merge gate, Task 6 draft asset gate, Task 7 tap render가 이 계약에 의존한다.

- [x] **Step 1: Homebrew-managed update와 non-destructive zap 계약 반영**

  - Evidence: cask의 `auto_updates` 및 `zap` stanza를 제거하고, spec §10에 Homebrew-managed update와 사용자 데이터 보존 계약을 반영했다.

`distribution/homebrew/intent-memo.rb`에서 `auto_updates true`와 `zap trash: [...]` 전체를 제거한다. 일반 uninstall의 실행 중 앱 종료만 담당하는 `uninstall quit: "app.tkbetter.intentmemo"`는 유지한다.

`docs/specs/intent-memo.md` §10의 artifact/cask 계약을 다음 의미로 갱신한다:

```markdown
- macOS app과 release artifact basename은 `IntentMemo`, repo/package/Homebrew cask token은 `intent-memo`, 사용자-facing 브랜드는 `Intent Memo`를 사용한다.
- v0.1 업데이트는 Homebrew가 관리하므로 cask는 `auto_updates`를 선언하지 않는다. 사용자 library와 앱 데이터 보존을 위해 `zap` stanza를 정의하지 않는다. In-app updater는 후속 범위다.
```

- [x] **Step 2: Tauri productName과 app/artifact basename을 `IntentMemo`로 통일**

  - Evidence: Tauri `productName`, Homebrew URL/app stanza, MAS app/pkg/artifact 경로를 공백 없는 `IntentMemo` basename으로 통일했다.

`src-tauri/tauri.conf.json`:

```json
"productName": "IntentMemo"
```

window title과 README의 사용자-facing 브랜드 `Intent Memo`는 유지한다.

`distribution/homebrew/intent-memo.rb` 8행:

```ruby
# 변경 전
  url "https://github.com/tkhwang/intent-memo/releases/download/v#{version}/Intent%20Memo_#{version}_#{arch}.dmg"
# 변경 후
  url "https://github.com/tkhwang/intent-memo/releases/download/v#{version}/IntentMemo_#{version}_#{arch}.dmg"
```

DMG 내부 app stanza는 `app "IntentMemo.app"`으로 바꾸고, 사용자-facing cask 표기인 `name "Intent Memo"`는 유지한다.

`build-macos-mas.yml`의 packaging 경로도 같은 basename으로 맞춘다:

```yaml
APP_PATH="src-tauri/target/universal-apple-darwin/release/bundle/macos/IntentMemo.app"
PKG_PATH="$RUNNER_TEMP/IntentMemo_${APP_VERSION}_${BUILD_NUMBER}.pkg"
name: IntentMemo-MAS-${{ inputs.build_number || github.run_number }}
```

- [x] **Step 3: bump workflow의 asset 참조 6곳을 `IntentMemo_`로 교체**

  - Evidence: Homebrew bump workflow의 다운로드 pattern, 파일 존재 확인, checksum 입력 6곳을 `IntentMemo_` asset 이름으로 교체했다.

`.github/workflows/homebrew-bump.yml`에서 `Intent Memo_` → `IntentMemo_` (총 6곳):

```yaml
          gh release download "$TAG_NAME" --repo "$GITHUB_REPOSITORY" \
            --pattern "IntentMemo_${VERSION}_aarch64.dmg" \
            --pattern "IntentMemo_${VERSION}_x64.dmg" \
            --dir dist
          test -f "dist/IntentMemo_${VERSION}_aarch64.dmg"
          test -f "dist/IntentMemo_${VERSION}_x64.dmg"
```

```yaml
          echo "SHA_ARM=$(shasum -a 256 "dist/IntentMemo_${VERSION}_aarch64.dmg" | awk '{print $1}')" >> "$GITHUB_ENV"
          echo "SHA_INTEL=$(shasum -a 256 "dist/IntentMemo_${VERSION}_x64.dmg" | awk '{print $1}')" >> "$GITHUB_ENV"
```

- [x] **Step 4: PR/main pre-merge CI 추가**

  - Evidence: PR 및 main push에서 frontend, Rust, release 계약, unsigned arm64 Tauri packaging을 검증하는 secret-free CI workflow를 추가했다.

새 파일 `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-macos-build
        with:
          rust-targets: aarch64-apple-darwin
      - name: Frontend checks
        run: |
          pnpm check
          pnpm test
          pnpm build
      - name: Rust checks
        run: |
          cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
          cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
          cargo test --manifest-path src-tauri/Cargo.toml --all-features
      - name: Release config checks
        run: |
          ruby -c distribution/homebrew/intent-memo.rb
          node --input-type=module - <<'NODE'
          import fs from "node:fs";
          import yaml from "js-yaml";
          for (const file of [
            ".github/workflows/build-macos.yml",
            ".github/workflows/build-macos-mas.yml",
            ".github/workflows/homebrew-bump.yml",
            ".github/workflows/ci.yml",
          ]) {
            yaml.load(fs.readFileSync(file, "utf8"));
          }
          NODE
          node --input-type=module -e "import fs from 'node:fs'; const c=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json')); if (c.productName !== 'IntentMemo') process.exit(1)"
          ! grep -nE 'Intent Memo\.app|Intent[.% ]Memo_|Intent-Memo' src-tauri/tauri.conf.json distribution/homebrew/intent-memo.rb .github/workflows/homebrew-bump.yml .github/workflows/build-macos-mas.yml
          ! grep -nE 'auto_updates|^[[:space:]]*zap ' distribution/homebrew/intent-memo.rb
      - name: Unsigned Tauri package smoke
        run: |
          pnpm tauri build --target aarch64-apple-darwin --config '{"bundle":{"createUpdaterArtifacts":false}}'
          test -d "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/IntentMemo.app"
          test -f "src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/IntentMemo_0.1.0_aarch64.dmg"
```

CI는 repository secret을 사용하지 않는다. 실제 signing·notarization과 두 architecture DMG는 Task 6의 tag workflow gate에서 검증한다.

- [x] **Step 5: 구문·계약·잔여 공백 참조 검증**

  - Evidence: Ruby/JSON/YAML 및 잔여 basename 계약 검사가 통과했다. `pnpm check`, frontend 3 tests, production build, Rust fmt/clippy, Rust 5 tests, unsigned arm64 Tauri build가 모두 통과했고 `IntentMemo.app`과 `IntentMemo_0.1.0_aarch64.dmg` 생성을 확인했다. 생성된 app bundle을 격리된 HOME에서 실행해 `intent-memo` 프로세스와 native window 1개를 관찰했다.

```bash
ruby -c distribution/homebrew/intent-memo.rb
node --input-type=module -e "import fs from 'node:fs'; import yaml from 'js-yaml'; for (const file of ['.github/workflows/build-macos.yml', '.github/workflows/build-macos-mas.yml', '.github/workflows/homebrew-bump.yml', '.github/workflows/ci.yml']) yaml.load(fs.readFileSync(file, 'utf8'))"
node --input-type=module -e "import fs from 'node:fs'; const c=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json')); if (c.productName !== 'IntentMemo') process.exit(1)"
! grep -nE 'Intent Memo\.app|Intent[.% ]Memo_|Intent-Memo' src-tauri/tauri.conf.json distribution/homebrew/intent-memo.rb .github/workflows/homebrew-bump.yml .github/workflows/build-macos-mas.yml
! grep -nE 'auto_updates|^[[:space:]]*zap ' distribution/homebrew/intent-memo.rb
```

기대: `Syntax OK`, 네 workflow YAML 파싱과 `productName` assertion 성공, 두 grep 모두 **매치 0건**. 첫 grep은 packaging path의 이전 basename 잔존 여부, 두 번째 grep은 Homebrew-managed update와 no-zap 계약을 검증한다. window title과 문서의 브랜드 표기 `Intent Memo`는 검사 대상이 아니다.

- [ ] **Step 6: 사용자 커밋**

```bash
git add src-tauri/tauri.conf.json distribution/homebrew/intent-memo.rb .github/workflows/homebrew-bump.yml .github/workflows/build-macos-mas.yml docs/specs/intent-memo.md
git commit -m "fix(release): standardize IntentMemo distribution contracts"
git add .github/workflows/ci.yml docs/plans/brew-release.md
git commit -m "ci: add pre-merge release validation"
```

---

### Task 2 — README Release 전략 확정

**Files:**
- Modify: `README.md:75-79`
- Modify: `README.ko.md:77-81`

- [x] **Step 1: README.md Release 문단 교체**

  - Evidence: 첫 Intent Memo release를 `v0.1.0`으로 확정하고, legacy release/tag 정리 후 첫 태그는 직접 생성하며 이후부터 `pnpm release`를 사용한다는 영문 계약을 반영했다.

77행 문단을 다음으로 교체:

```markdown
The first Intent Memo release is `v0.1.0`. The legacy PromptPad releases and `v0.1.x` tags are deleted from this repository before tagging, so the greenfield `0.1.0` line starts clean. The sources already carry `0.1.0`; tag the first release directly without running `pnpm release`. From the second release on, use `pnpm release patch|minor|major`.
```

- [x] **Step 2: README.ko.md Release 문단 교체**

  - Evidence: 영문과 동일한 `v0.1.0` 초기 release/tag 정리 및 후속 `pnpm release` 정책을 한글 README에 반영했다.

79행 문단 교체:

```markdown
첫 Intent Memo 릴리스는 `v0.1.0`입니다. 태그 생성 전에 기존 PromptPad 릴리스와 `v0.1.x` 태그를 저장소에서 삭제해 greenfield `0.1.0` 라인을 깨끗하게 시작합니다. 소스는 이미 `0.1.0`이므로 첫 릴리스는 `pnpm release` 없이 태그를 직접 생성하고, 두 번째 릴리스부터 `pnpm release patch|minor|major`를 사용합니다.
```

- [x] **Step 3: 검증**

  - Evidence: `pnpm check`가 26개 파일 대상으로 통과했고, 두 README에서 미결정 문구와 아직 공개하면 안 되는 Homebrew install 명령이 모두 0건임을 확인했다.

```bash
pnpm check
```

기대: 통과 (Biome은 markdown을 검사하지 않지만 repo 규칙으로 실행). 두 README에서 `not decided yet` / `확정하지 않았습니다` 문구가 사라졌는지 확인하고, 아직 동작하지 않는 Homebrew install 명령은 Task 8 성공 전 노출하지 않는다:

```bash
! grep -n "not decided\|확정하지 않았" README.md README.ko.md
! grep -n "brew install --cask tkhwang/tap/intent-memo" README.md README.ko.md
```

기대: 두 grep 모두 매치 0건.

- [ ] **Step 4: 사용자 커밋**

```bash
git add README.md README.ko.md
git commit -m "docs(readme): finalize v0.1.0 release strategy"
```

---

### Task 3 — feat/brew-support → main 병합

`release: published` 이벤트는 default branch(`main`)의 workflow 정의로 실행되고, `v0.1.0` 태그도 수정사항이 포함된 `main`에서 생성해야 한다.

- [ ] **Step 1: 사용자 push + PR 생성**

```bash
git push -u origin feat/brew-support
gh pr create --title "feat: brew release preparation for v0.1.0" --body "Task 1–2 of docs/plans/brew-release.md"
```

- [ ] **Step 2: CI green 확인 후 사용자 merge**

기대: 새 `.github/workflows/ci.yml`의 `CI / verify` check가 통과한다. unsigned Tauri package에서 `IntentMemo.app`과 `IntentMemo_0.1.0_aarch64.dmg` 생성도 확인한 뒤 merge하고, `origin/main`에 Task 1–2 커밋과 이 plan이 포함됐는지 검증한다.

---

### Task 4 — `TAP_GITHUB_TOKEN` secret 등록 (수동 1회, 사용자)

bump workflow가 `tkhwang/homebrew-tap` checkout과 push에 사용한다. Task 7(publish) 전에 반드시 등록.

- [ ] **Step 1: fine-grained PAT 생성**

github.com → Settings → Developer settings → Fine-grained tokens → Generate new token:
- Resource owner: `tkhwang`
- Repository access: **Only select repositories → `tkhwang/homebrew-tap`**
- Permissions: **Contents: Read and write** (Metadata: Read는 자동). tap에 workflow 파일이 없으므로 다른 권한 불필요.
- Expiration: 1년 권장 (만료 시 재등록)

- [ ] **Step 2: repo secret 등록**

```bash
gh secret set TAP_GITHUB_TOKEN --repo tkhwang/intent-memo
# 프롬프트에 토큰 붙여넣기
```

- [ ] **Step 3: 검증**

```bash
gh secret list --repo tkhwang/intent-memo | grep TAP_GITHUB_TOKEN
```

기대: `TAP_GITHUB_TOKEN` 1행 출력.

---

### Task 5 — PromptPad 릴리스·태그 정리 (파괴적 · 2026-08-03 사용자 승인)

되돌릴 수 없는 삭제다. 실행 직전 사용자 최종 확인 후 진행한다.

- [ ] **Step 1: 릴리스 3개 삭제 (연결 태그 포함)**

```bash
gh release delete v0.1.8 --repo tkhwang/intent-memo --cleanup-tag --yes
gh release delete v0.1.5 --repo tkhwang/intent-memo --cleanup-tag --yes
gh release delete v0.1.4 --repo tkhwang/intent-memo --cleanup-tag --yes
```

draft v0.1.8이 태그 이름으로 조회되지 않으면 release ID로 삭제:

```bash
gh api repos/tkhwang/intent-memo/releases --jq '.[] | "\(.id)\t\(.tag_name)\tdraft=\(.draft)"'
gh api -X DELETE repos/tkhwang/intent-memo/releases/<id>
```

- [ ] **Step 2: 릴리스 없는 나머지 태그 삭제**

```bash
git push origin --delete v0.1.1 v0.1.2 v0.1.3
```

(`--cleanup-tag`가 지우지 못한 태그가 있으면 같은 방식으로 추가 삭제)

- [ ] **Step 3: 로컬 태그 정리**

```bash
git tag -l "v0.1.*" | xargs -r git tag -d
git fetch origin --prune --prune-tags
```

- [ ] **Step 4: 검증**

```bash
gh release list --repo tkhwang/intent-memo
gh api repos/tkhwang/intent-memo/tags --jq '.[].name'
```

기대: 두 명령 모두 빈 출력. 이 시점부터 `releases/latest/download/latest.json`은 404가 되지만 설치된 사용자 기반이 없는 greenfield이므로 허용, Task 7 publish로 해소된다.

---

### Task 6 — `v0.1.0` 태그 push → 서명 빌드 → draft release 검증

게이트: Task 3 병합 완료, Task 5 완료.

- [ ] **Step 1: 사용자 태그 생성·push (main에서)**

```bash
git checkout main && git pull
git tag v0.1.0
git push origin v0.1.0
```

주의: `pnpm release`는 실행하지 않는다 (bumpp가 0.1.1로 올려버린다).

- [ ] **Step 2: build-macos.yml 완료 대기**

```bash
gh run list --repo tkhwang/intent-memo --workflow build-macos.yml --limit 1
gh run watch --repo tkhwang/intent-memo <run-id>
```

기대: `aarch64-apple-darwin`, `x86_64-apple-darwin` 두 matrix job 성공. 서명·notarization 포함으로 수십 분 소요될 수 있다.

- [ ] **Step 3: draft asset 이름 검증 — publish 전 필수 gate**

```bash
gh release view v0.1.0 --repo tkhwang/intent-memo --json isDraft,assets --jq '{draft:.isDraft, assets:[.assets[].name]}'
```

Homebrew 배포 gate인 필수 asset 목록:
- `IntentMemo_0.1.0_aarch64.dmg`
- `IntentMemo_0.1.0_x64.dmg`

현재 Tauri 설정이 함께 생성하는 비-gating updater artifact:
- `IntentMemo_aarch64.app.tar.gz` + `.sig`
- `IntentMemo_x64.app.tar.gz` + `.sig`
- `latest.json`

**DMG 이름이 위와 다르면 publish하지 말고**, 실제 이름 기준으로 Task 1의 packaging config·cask·workflow 참조를 다시 수정해 main에 반영한 뒤 Step 4로 진행한다 (publish가 bump trigger이므로 이 gate가 안전판이다).

- [ ] **Step 4: (참고) 생성된 updater metadata sanity check — release gate 아님**

```bash
SCRATCH_DIR=$(mktemp -d)
gh release download v0.1.0 --repo tkhwang/intent-memo --pattern latest.json --dir "$SCRATCH_DIR"
python3 -m json.tool "$SCRATCH_DIR/latest.json"
```

기대: 현재 build 설정상 `version`이 `0.1.0`, `platforms.darwin-aarch64`·`platforms.darwin-x86_64`에 signature와 `IntentMemo` tar.gz url이 포함된다. v0.1 앱은 이를 호출하지 않으므로 이 확인은 Homebrew release publish gate가 아니며, in-app updater 활성화는 후속 계획에서 별도 runtime QA한다.

---

### Task 7 — draft publish → homebrew-bump → tap 반영 검증

게이트: Task 4 (secret), Task 6 Step 3 gate 통과. publish는 외부 공개 행위이므로 사용자 확인 후 실행.

- [ ] **Step 1: 사용자 publish (Latest로 지정)**

```bash
gh release edit v0.1.0 --repo tkhwang/intent-memo --draft=false --latest
```

- [ ] **Step 2: bump workflow 성공 확인**

```bash
gh run list --repo tkhwang/intent-memo --workflow homebrew-bump.yml --limit 1
gh run watch --repo tkhwang/intent-memo <run-id>
```

기대: 성공. 실패 시 원인 수정 후 재실행:

```bash
gh workflow run homebrew-bump.yml --repo tkhwang/intent-memo -f tag=v0.1.0
```

- [ ] **Step 3: tap cask 렌더 결과 검증**

```bash
gh api repos/tkhwang/homebrew-tap/contents/Casks/intent-memo.rb --jq '.content' | base64 -d
```

기대: `version "0.1.0"`, `sha256` arm/intel 모두 0이 아닌 실제 해시, url이 `IntentMemo_#{version}_#{arch}.dmg`, app stanza가 `IntentMemo.app`, `auto_updates`와 `zap`은 없음. tap 최신 커밋 메시지 `chore(intent-memo): update cask for v0.1.0`.

- [ ] **Step 4: checksum 교차 검증**

```bash
SCRATCH_DIR=$(mktemp -d)
gh api repos/tkhwang/homebrew-tap/contents/Casks/intent-memo.rb --jq '.content' | base64 -d > "$SCRATCH_DIR/intent-memo.rb"
curl -fL -o "$SCRATCH_DIR/arm.dmg" "https://github.com/tkhwang/intent-memo/releases/download/v0.1.0/IntentMemo_0.1.0_aarch64.dmg"
curl -fL -o "$SCRATCH_DIR/intel.dmg" "https://github.com/tkhwang/intent-memo/releases/download/v0.1.0/IntentMemo_0.1.0_x64.dmg"
CASK_SHA_ARM=$(ruby -e 'puts File.read(ARGV[0])[/sha256 arm:\s+"([0-9a-f]{64})"/, 1]' "$SCRATCH_DIR/intent-memo.rb")
CASK_SHA_INTEL=$(ruby -e 'puts File.read(ARGV[0])[/intel:\s+"([0-9a-f]{64})"/, 1]' "$SCRATCH_DIR/intent-memo.rb")
test "$(shasum -a 256 "$SCRATCH_DIR/arm.dmg" | awk '{print $1}')" = "$CASK_SHA_ARM"
test "$(shasum -a 256 "$SCRATCH_DIR/intel.dmg" | awk '{print $1}')" = "$CASK_SHA_INTEL"
```

기대: 두 download 모두 HTTP 오류 없이 성공하고 aarch64/x64 실제 SHA-256이 각 cask 값과 일치한다. Intel app 실행은 별도 Intel runner가 없으므로 Task 6 x64 signed build 성공 + 이 checksum 검증을 해당 architecture의 release gate로 사용한다.

---

### Task 8 — 로컬 `brew install` E2E 검증

- [ ] **Step 1: tap 및 설치**

```bash
brew tap | grep -q tkhwang/tap || brew tap tkhwang/tap
brew update
brew install --cask tkhwang/tap/intent-memo
```

기대: `/Applications/IntentMemo.app` 설치 성공.

- [ ] **Step 2: 서명·notarization 확인**

```bash
spctl -a -vv "/Applications/IntentMemo.app"
```

기대: `accepted`, `source=Notarized Developer ID`.

- [ ] **Step 3: 앱 실행 스모크**

앱을 실행해 클린 상태면 libraryRoot onboarding, 기존 설정이 있으면 3-pane workspace가 뜨는지 확인.

- [ ] **Step 4: livecheck·Homebrew-managed upgrade 확인**

```bash
brew livecheck --cask tkhwang/tap/intent-memo
brew upgrade --cask intent-memo
```

기대: livecheck `0.1.0 ==> 0.1.0`(최신 일치), 일반 `brew upgrade`는 이미 최신이므로 no-op. 이후 버전에서는 `auto_updates` 예외 없이 Homebrew가 upgrade를 관리한다.

---

### Task 9 — tap README + repo 문서 마무리

**Files:**
- Modify: `tkhwang/homebrew-tap` `README.md` (별도 repo — 로컬 clone에서 수정, 사용자 push)
- Modify: `README.md:41`
- Modify: `README.ko.md:43`
- Modify: `docs/plans/pivot-markdown-editor.md:198` (Slice 8 체크 + evidence)
- Modify: `docs/plans/brew-release.md` (상태·checkbox·evidence closeout)

- [ ] **Step 1: tap README에 intent-memo 섹션 추가**

`## [2] workbranch-companion` 섹션 뒤에 추가:

````markdown
## [3] [intent-memo](https://github.com/tkhwang/intent-memo)

Minimal Markdown desktop app for writing down your thinking and intent before handing anything to AI.

### Install

```bash
brew install --cask tkhwang/tap/intent-memo
```
````

`## Formula and Cask` 목록에 한 줄 추가:

```markdown
- `Casks/intent-memo.rb` installs the latest published `IntentMemo.app` release; release automation in `tkhwang/intent-memo` updates its version and checksums.
```

사용자 커밋·push: `docs: add intent-memo cask section`

- [ ] **Step 2: E2E 성공 후 repo README Install 섹션 공개**

`README.md`의 `## v0.1` 마지막 문장 뒤, `## Data` 앞에 추가:

````markdown
## Install

```bash
brew install --cask tkhwang/tap/intent-memo
```

Or download the signed `.dmg` from [Releases](https://github.com/tkhwang/intent-memo/releases).
````

`README.ko.md`에도 같은 위치에 추가:

````markdown
## Install

```bash
brew install --cask tkhwang/tap/intent-memo
```

또는 [Releases](https://github.com/tkhwang/intent-memo/releases)에서 서명된 `.dmg`를 직접 내려받아 설치합니다.
````

- [ ] **Step 3: pivot plan 실행 현황 갱신**

`docs/plans/pivot-markdown-editor.md`의 `- [ ] Slice 8 — brew 배포`를 `[x]`로 바꾸고, 실제 결과(릴리스 URL, bump run, brew install 검증)를 evidence 한 단락으로 추가한다.

- [ ] **Step 4: 현재 brew release plan closeout**

이 문서의 상태를 `완료`로 바꾸고 실제 완료한 checkbox를 모두 `[x]`로 갱신한다. 릴리스 URL, `CI / verify` run, signed build run, bump run, arm/intel checksum, `brew install`, notarization, app smoke, livecheck/upgrade 결과를 evidence로 남긴다. 실행하지 않은 선택 항목은 `[ ]`로 유지하고 이유를 기록한다.

- [ ] **Step 5: (선택) README 배지 갱신**

`v0.1.0-pre--release` 배지를 릴리스 상태로 바꿀지는 사용자 선택. 이 plan의 필수 범위가 아니다.

- [ ] **Step 6: 사용자 커밋**

```bash
git add docs/plans/brew-release.md docs/plans/pivot-markdown-editor.md README.md README.ko.md
git commit -m "docs(plan): record brew release completion evidence"
```

---

## 리스크·비상 대응

- **asset 이름 예측 불일치** — `productName: IntentMemo`라 공백 정규화에 의존하지 않는다. 그래도 Tauri/tauri-action 버전에 따른 suffix 차이는 Task 6 Step 3에서 publish 전에 실제 asset 목록으로 검증하고, 불일치 시 cask·workflow를 실제 이름에 맞춘 뒤 publish한다.
- **bump workflow 실패 (secret 누락·권한 부족)** — `workflow_dispatch` + `-f tag=v0.1.0`으로 수정 후 재실행 가능. tap push 실패 시 PAT의 Contents write 권한과 대상 repo 지정을 재확인.
- **notarization 지연·실패** — 기존 PromptPad 릴리스에서 검증된 secrets·workflow 재사용이라 위험은 낮다. 실패 시 `gh run view --log`로 notarytool 로그 확인.
- **PromptPad 삭제 불가역성** — 사용자 승인 완료. 삭제 전 목록을 출력해 최종 확인 후 실행한다.
- **cask 오배포 시 롤백** — tap은 일반 git repo이므로 `Casks/intent-memo.rb`를 revert commit으로 되돌리면 된다. release는 unpublish 대신 asset 수정 후 bump 재실행으로 정정한다.
- **in-app updater 후속 범위** — v0.1에는 실제 update check/install 호출과 사용자 UX가 없으므로 Homebrew가 update source of truth다. in-app updater를 도입할 때 startup/menu trigger, 동의, 오류, download/install/relaunch QA를 별도 계획으로 결정하고 그때 `auto_updates true`를 재검토한다.

## 진행 규칙

- git 커밋·푸시·태그·PR merge·release publish는 사용자가 직접 수행한다.
- 파괴적 gh 조작(Task 5, Task 7 publish)은 실행 직전 사용자 확인을 받는다.
- 각 Task 종료 시 해당 검증 step의 실제 출력을 evidence로 남긴다.
