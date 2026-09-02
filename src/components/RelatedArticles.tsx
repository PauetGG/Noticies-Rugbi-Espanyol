import { ArticleCard } from '@/components/ArticleCard';
import { getRelatedArticles } from '@/lib/queries';

export async function RelatedArticles({
  articleId,
  categoryId,
}: {
  articleId: bigint;
  categoryId: number | null;
}) {
  const related = await getRelatedArticles(articleId, categoryId);

  if (related.length === 0) return null;

  return (
    <section className="mt-12 border-t-2 border-ink pt-4">
      <h2 className="mb-6 font-[family-name:var(--font-display)] text-lg font-bold">
        Seguir leyendo
      </h2>

      <div className="colrule grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((a) => (
          <ArticleCard key={String(a.id)} {...a} compact />
        ))}
      </div>
    </section>
  );
}