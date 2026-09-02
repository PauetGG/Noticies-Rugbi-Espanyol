import Link from 'next/link';

export function Headline({
  slug,
  title,
  publishedAt,
  categoryName,
}: {
  slug: string;
  title: string;
  publishedAt?: string | null;
  categoryName?: string | null;
}) {
  return (
    <Link
      href={`/noticias/${slug}`}
      className="group flex items-baseline gap-3 border-b border-rule py-2"
    >
      <span className="font-[family-name:var(--font-display)] flex-1 leading-snug group-hover:text-red">
        {title}
      </span>
      {categoryName && (
        <span className="hidden text-[0.65rem] italic text-ink-2 sm:inline">
          {categoryName}
        </span>
      )}
      {publishedAt && (
        <time className="shrink-0 text-[0.65rem] text-ink-2">
          {new Date(publishedAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
          })}
        </time>
      )}
    </Link>
  );
}