import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownViewProps = {
  readonly body: string;
};

export function MarkdownView({ body }: MarkdownViewProps) {
  return (
    <article className="markdown-view">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </article>
  );
}
