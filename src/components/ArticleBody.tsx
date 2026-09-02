import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="article-body mt-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="newsprint mb-4">{children}</p>,
          h2: ({ children }) => (
            <h2 className="mt-9 mb-3 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-2 font-[family-name:var(--font-display)] text-lg font-bold">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 list-disc pl-5 leading-relaxed">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-decimal pl-5 leading-relaxed">{children}</ol>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-6 border-l-2 border-ink pl-5 font-[family-name:var(--font-display)] text-xl italic leading-snug">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => {
            const external = href?.startsWith('http');
            return (
              <Link
                href={href ?? '#'}
                rel={external ? 'nofollow noopener' : undefined}
                target={external ? '_blank' : undefined}
                className="underline decoration-rule underline-offset-2 hover:text-red"
              >
                {children}
              </Link>
            );
          },
          hr: () => <hr className="my-8 border-rule" />,
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b-2 border-ink px-2 py-1 text-left font-[family-name:var(--font-display)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-rule px-2 py-1">{children}</td>
          ),
          img: () => null,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}