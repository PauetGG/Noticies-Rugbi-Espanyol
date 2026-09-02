import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { getFeaturedArticle, getLatestArticles } from '@/lib/queries';

export const revalidate = 300;

export default async function Home() {
  const featured = await getFeaturedArticle();
  const latest = await getLatestArticles(6, featured?.id);

  if (!featured) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold">Rugby Español</h1>
        <p className="mt-4 text-gray-500">Encara no hi ha articles publicats.</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <section className="border-b pb-8">
        <ArticleCard {...featured} size="large" />
      </section>

      {latest.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900 border-b pb-2 mb-6">
            Últimas noticias
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((a) => (
              <ArticleCard key={a.id} {...a} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/articles"
          className="inline-block border px-6 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Ver todas las noticias
        </Link>
      </div>
    </main>
  );
}