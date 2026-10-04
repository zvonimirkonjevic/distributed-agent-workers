import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  // Replies are read inside the chat; links should not navigate away from it.
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  // Wide tables scroll on their own instead of widening the whole message column.
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

/**
 * Render an assistant reply's Markdown, including GitHub extensions (tables,
 * strikethrough, task lists).
 *
 * Raw HTML in the reply is ignored, not rendered, so model output can never
 * inject markup or scripts.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div
      className={[
        "prose prose-zinc max-w-none min-w-0 text-[15px] leading-relaxed text-zinc-900",
        // Prose spacing is tuned for articles; tighten it for chat and drop the
        // outer margins so the first line stays aligned with the avatar.
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-4 prose-headings:mb-2",
        "prose-pre:my-3 prose-pre:rounded-xl prose-pre:bg-zinc-950 prose-pre:text-[13px]",
        "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
        // Inline code gets a tinted chip instead of prose's literal backticks.
        "prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-normal",
        "prose-code:before:content-none prose-code:after:content-none",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
      ].join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
