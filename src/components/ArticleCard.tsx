import Link from 'next/link';
import Image from 'next/image';

type Props = {
  slug: string;
  title: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  categoryName?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  size?: 'default' | 'large';
  hideImage?: boolean;
  compact?: boolean;
};

export function ArticleCard({
  slug,
  title,
  excerpt,
  publishedAt,
  categoryName,
  coverImageUrl,
  coverImageAlt,
  size = 'default',
  hideImage = false,
  compact = false,
}: Props) {
  const large = size === 'large';

  return (
    <article>
      <Link href={`/noticias/${slug}`} className="group block">
        {coverImageUrl && !hideImage && (
          <div
            className={`relative mb-4 w-full overflow-hidden ${
              large ? 'aspect-[16/10]' : 'aspect-[3/2]'
            }`}
          >
            <Image
              src={coverImageUrl}
              alt={coverImageAlt ?? ''}
              fill
              priority={large}
              sizes={
                large
                  ? '(max-width: 1024px) 100vw, 700px'
                  : '(max-width: 640px) 100vw, 350px'
              }
              className="object-cover"
            />
          </div>
        )}

        {categoryName && !compact && (
          <span className="font-[family-name:var(--font-display)] text-xs italic text-red">
            {categoryName}
          </span>
        )}

        <h2
          className={`font-[family-name:var(--font-display)] font-black leading-[1.05] group-hover:text-red ${
            large ? 'text-4xl sm:text-5xl' : 'text-xl'
          } ${compact ? '' : 'mt-1'}`}
        >
          {title}
        </h2>

        {excerpt && !compact && (
          <p
            className={`newsprint mt-3 text-ink-2 ${
              large ? 'text-base' : 'text-sm line-clamp-3'
            }`}
          >
            {excerpt}
          </p>
        )}

        {publishedAt && (
          <time className="mt-3 block text-[0.7rem] text-ink-2">
            {new Date(publishedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        )}
      </Link>
    </article>
  );
}