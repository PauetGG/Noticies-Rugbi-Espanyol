import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Image from 'next/image';
import { ArticleCard } from '@/components/ArticleCard';
import { ArticleBody } from '@/components/ArticleBody';
import { RelatedArticles } from '@/components/RelatedArticles';
import { site } from '@/lib/site';
import {
  getCategoryBySlug,
  getArticlesByCategoryId,
  getArticleBySlug,
  getAllPublishedSlugs,
  getAllCategorySlugs,
} from '@/lib/queries';

export const revalidate = 300;

export async function generateStaticParams() {
  const [arts, cats] = await Promise.all([
    getAllPublishedSlugs(),
    getAllCategorySlugs(),
  ]);
  return [...cats, ...arts].map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);
  if (category) {
    return {
      title: category.name,
      description: category.description ?? undefined,
      alternates: { canonical: `/noticias/${category.slug}` },
    };
  }

  const article = await getArticleBySlug(slug);
  if (!article) return { title: 'Página no encontrada' };

  return {
    title: article.metaTitle ?? article.title,
    description: article.metaDescription ?? article.excerpt ?? undefined,
    alternates: { canonical: `/noticias/${article.slug}` },
    openGraph: {
      title: article.metaTitle ?? article.title,
      description: article.metaDescription ?? article.excerpt ?? undefined,
      type: 'article',
      publishedTime: article.publishedAt ?? undefined,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
  };
}

export default async function NoticiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. És una categoria?
  const category = await getCategoryBySlug(slug);

  if (category) {
    const posts = await getArticlesByCategoryId(category.id);

    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="border-b-2 border-ink pb-1 font-[family-name:var(--font-display)] text-3xl font-black">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 text-sm italic text-ink-2">{category.description}</p>
        )}

        {posts.length === 0 ? (
          <p className="mt-8 text-ink-2">
            Todavía no hay noticias en esta sección.{' '}
            <Link href="/noticias" className="underline hover:text-red">
              Ver todas
            </Link>
          </p>
        ) : (
          <div className="colrule mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <ArticleCard key={String(p.id)} {...p} />
            ))}
          </div>
        )}
      </main>
    );
  }

  // 2. Doncs és un article.
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <>
      <article className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-black leading-[1.05] sm:text-5xl">
          {article.title}
        </h1>

        {article.subtitle && (
          <p className="mt-3 font-[family-name:var(--font-display)] text-xl italic text-ink-2">
            {article.subtitle}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-3 border-y border-rule py-2 text-[0.7rem] text-ink-2">
          <span>{article.authorName}</span>
          {article.publishedAt && (
            <time>
              {new Date(article.publishedAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          )}
        </div>

        {article.coverImageUrl && (
          <figure className="mt-6">
            <div className="relative aspect-[3/2] w-full overflow-hidden">
              <Image
                src={article.coverImageUrl}
                alt={article.coverImageAlt ?? ''}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
              />
            </div>
            {(article.coverImageAlt || article.coverImageCredit) && (
              <figcaption className="mt-1 flex justify-between gap-4 text-xs text-ink-2">
                {article.coverImageAlt && (
                  <span className="italic">{article.coverImageAlt}</span>
                )}
                {article.coverImageCredit && (
                  <span className="shrink-0">Foto: {article.coverImageCredit}</span>
                )}
              </figcaption>
            )}
          </figure>
        )}

        <ArticleBody body={article.body} />

        {article.sourceUrl ? (
          <p className="mt-8 border-t border-rule pt-3 text-xs italic text-ink-2">
            {'Información original: '}
            <Link
              href={article.sourceUrl}
              rel="nofollow noopener"
              target="_blank"
              className="underline hover:text-red"
            >
              {article.sourceTitle ?? article.sourceUrl}
            </Link>
          </p>
        ) : null}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'NewsArticle',
              headline: article.title,
              description: article.excerpt ?? undefined,
              image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
              datePublished: article.publishedAt ?? undefined,
              dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
              author: { '@type': 'Organization', name: site.name },
              publisher: { '@type': 'Organization', name: site.name },
              mainEntityOfPage: `${site.url}/noticias/${article.slug}`,
            }),
          }}
        />
      </article>

      <div className="mx-auto max-w-6xl px-4 pb-10">
        <RelatedArticles articleId={article.id} categoryId={article.categoryId} />
      </div>
    </>
  );
}