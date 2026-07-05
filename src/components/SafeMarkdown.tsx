import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

/**
 * Rendering pipeline, in order:
 *  1. remark-gfm: parse GitHub-flavored markdown (tables, code fences, etc).
 *  2. rehype-raw: parse any *literal* HTML embedded in the markdown source
 *     (e.g. `<img onerror=...>`, `<script>`) into real hast nodes instead of
 *     leaving it as an inert string. This is required for rehype-sanitize
 *     to actually see and strip it -- without rehype-raw, react-markdown
 *     already refuses to execute raw HTML, but it also can't inspect it.
 *  3. rehype-sanitize (default schema): strips disallowed tags/attributes,
 *     including <script> entirely and event-handler attributes like
 *     `onerror`, `onclick`, etc. This is the actual XSS boundary.
 *
 * Net effect: the untrusted `<script>alert(...)</script>` and
 * `<img onerror=...>` payloads from the mock summary stream are removed
 * before anything reaches the DOM -- they never execute.
 */
export default function SafeMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-slate-200 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-100 [&_h2]:mt-2 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_pre]:bg-slate-950 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-slate-800 [&_code]:text-pink-400 [&_pre_code]:text-slate-100 [&_a]:text-indigo-400">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, defaultSchema]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
