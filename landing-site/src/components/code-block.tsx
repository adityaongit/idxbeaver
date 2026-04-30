import { codeToHtml } from "shiki";

type CodeBlockProps = {
  code: string;
  lang?: string;
  className?: string;
};

/**
 * Server-rendered, syntax-highlighted code block. Uses shiki at build time so
 * no JS ships to the client. Drop-in replacement for the old `<pre><code>` pairs
 * in blog posts.
 */
export async function CodeBlock({ code, lang = "json", className }: CodeBlockProps) {
  const html = await codeToHtml(code.trim(), {
    lang,
    theme: "github-dark-default",
  });

  return (
    <div
      className={[
        "not-prose my-2 overflow-x-auto rounded-lg border border-[var(--color-hair)] bg-[#0d1117] p-4 text-[13px] leading-[1.6] [&_pre]:!bg-transparent [&_pre]:!p-0 [&_code]:!bg-transparent [&_code]:!p-0",
        className ?? "",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
