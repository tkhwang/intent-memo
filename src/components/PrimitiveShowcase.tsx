import { FileText, Folder, Plus, Trash2 } from "lucide-react";
import { MarkdownView } from "@/components/MarkdownView";

export function PrimitiveShowcase() {
  return (
    <main className="showcase">
      <header className="showcase-header">
        <p>Intent Memo design system</p>
        <h1>조용한 크롬, 선명한 의도</h1>
        <span>Primitive states · responsive shell · 한국어 조판</span>
      </header>
      <section className="showcase-grid" aria-label="Primitive showcase">
        <article className="showcase-card">
          <h2>Controls</h2>
          <div className="showcase-row">
            <button className="icon-button" aria-label="새 메모" type="button">
              <Plus size={15} />
            </button>
            <button className="text-button" type="button">
              취소
            </button>
            <button className="primary-button" type="button">
              저장
            </button>
            <button
              className="icon-button danger"
              aria-label="휴지통으로 이동"
              type="button"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <fieldset className="mode-switch">
            <legend className="sr-only">편집 모드</legend>
            <button aria-pressed="true" type="button">
              Edit
            </button>
            <button aria-pressed="false" type="button">
              View
            </button>
          </fieldset>
        </article>
        <article className="showcase-card">
          <h2>Rows</h2>
          <button className="folder-row" type="button">
            <Folder size={15} />
            <span>생각</span>
          </button>
          <button aria-current="page" className="folder-row" type="button">
            <Folder size={15} />
            <span>의도</span>
          </button>
          <button
            aria-selected="true"
            className="document-row"
            role="option"
            type="button"
          >
            <FileText size={15} />
            <span className="document-copy">
              <strong>이번 주에 지키려는 방향</strong>
              <time>8월 2일 오후 1:40</time>
            </span>
          </button>
        </article>
        <article className="showcase-card">
          <h2>Notice</h2>
          <div className="inline-notice" role="alert">
            <span>파일이 외부에서 변경되어 자동 저장하지 않았습니다.</span>
            <button
              className="icon-button"
              aria-label="알림 닫기"
              type="button"
            >
              ×
            </button>
          </div>
          <p className="pane-empty">이 폴더에는 Markdown 메모가 없습니다.</p>
        </article>
        <article className="showcase-card showcase-prose">
          <h2>Rendered Markdown</h2>
          <MarkdownView
            body={
              "# 나의 의도\n\nAI 시대에도 **내가 결정한 방향**을 먼저 기록한다.\n\n- 생각을 적는다\n- 선택의 이유를 남긴다"
            }
          />
        </article>
      </section>
    </main>
  );
}
