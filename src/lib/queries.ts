import { db } from '@/db';
import { articles, categories, articleRelated } from '@/db/schema';
import { eq, and, or, desc, asc, ilike, isNotNull, isNull, ne, sql, inArray } from 'drizzle-orm';
const publishedFilter = and(
  eq(articles.status, 'published'),
  isNotNull(articles.publishedAt)
);

const listFields = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  excerpt: articles.excerpt,
  publishedAt: articles.publishedAt,
  isFeatured: articles.isFeatured,
  coverImageUrl: articles.coverImageUrl,
  coverImageAlt: articles.coverImageAlt,
  categoryName: categories.name,
  categorySlug: categories.slug,
};

type Filters = {
  q?: string;
  categorySlug?: string;
  order?: 'recientes' | 'antiguas';
  limit?: number;
  offset?: number;
};


/** Article destacat per a la portada. Si no n'hi ha cap marcat, agafa el més recent. */
export async function getFeaturedArticle() {
  const featured = await db
    .select(listFields)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(publishedFilter, eq(articles.isFeatured, true)))
    .orderBy(desc(articles.publishedAt))
    .limit(1);

  if (featured[0]) return featured[0];

  const latest = await db
    .select(listFields)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(publishedFilter)
    .orderBy(desc(articles.publishedAt))
    .limit(1);

  return latest[0] ?? null;
}

/** Últimes notícies, excloent-ne una (la destacada) per no duplicar. */
export async function getLatestArticles(limit = 6, excludeId?: bigint) {
  return db
    .select(listFields)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(
      excludeId
        ? and(publishedFilter, ne(articles.id, excludeId))
        : publishedFilter
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

/** Articles d'una categoria concreta, per als blocs de portada. */
export async function getArticlesByCategory(categorySlug: string, limit = 4) {
  return db
    .select(listFields)
    .from(articles)
    .innerJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(publishedFilter, eq(categories.slug, categorySlug)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

/** Llistat paginat per a /articles. */
export async function getPublishedArticles(limit = 20, offset = 0) {
  return db
    .select(listFields)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(publishedFilter)
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function countPublishedArticles() {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(articles)
    .where(publishedFilter);

  return rows[0]?.count ?? 0;
}

export async function getArticleBySlug(slug: string) {
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
    .limit(1);

  return rows[0] ?? null;
}

export async function getAllPublishedSlugs() {
  return db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.status, 'published'));
}

/** Categories per a la navegació: només arrel i actives. */
export async function getNavCategories() {
  return db
    .select({ name: categories.name, slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.active, true), isNull(categories.parentId)))
    .orderBy(categories.sortOrder);
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
    })
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.active, true)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getArticlesByCategoryId(categoryId: number, limit = 30) {
  return db
    .select(listFields)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(publishedFilter, eq(articles.categoryId, categoryId)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export async function getAllCategorySlugs() {
  return db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.active, true));
}

/** Llistat estructurat: obertura, columna lateral, graella i hemeroteca. */
export async function getNewsPage(offset = 0) {
  const rows = await db
    .select(listFields)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(publishedFilter)
    .orderBy(desc(articles.publishedAt))
    .limit(32)
    .offset(offset);

  return {
    lead: rows[0] ?? null,
    aside: rows.slice(1, 6),
    grid: rows.slice(6, 12),
    archive: rows.slice(12, 32),
  };
}

export async function searchArticles({
  q,
  categorySlug,
  order = 'recientes',
  limit = 18,
  offset = 0,
}: Filters) {
  const conditions = [publishedFilter];

  if (q?.trim()) {
    // unaccent perquè "leon" trobi "León"
    conditions.push(
      sql`unaccent(${articles.title}) ILIKE unaccent(${'%' + q.trim() + '%'})`
    );
  }

  if (categorySlug) {
    conditions.push(eq(categories.slug, categorySlug));
  }

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select(listFields)
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(where)
      .orderBy(
        order === 'antiguas'
          ? asc(articles.publishedAt)
          : desc(articles.publishedAt)
      )
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(where),
  ]);

  return { rows, total: totalRows[0]?.count ?? 0 };
}


/** Relacionats: primer els manuals, després es completa amb la misma categoría. */
export async function getRelatedArticles(
  articleId: bigint,
  categoryId: number | null,
  limit = 4
) {
  const relId = Number(articleId);

  // 1. Relacions definides a mà
  const manual = await db
    .select(listFields)
    .from(articleRelated)
    .innerJoin(articles, eq(articleRelated.relatedId, articles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(articleRelated.articleId, relId), publishedFilter))
    .orderBy(articleRelated.sortOrder)
    .limit(limit);

  if (manual.length >= limit) return manual;

    // 2. Es completa: primer mateixa categoria, després qualsevol
  const exclude = [articleId, ...manual.map((m) => m.id)];
  const need = limit - manual.length;

  const base = [publishedFilter, sql`${articles.id} NOT IN ${exclude}`];

  let filler = categoryId
    ? await db
        .select(listFields)
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
        .where(and(...base, eq(articles.categoryId, categoryId)))
        .orderBy(desc(articles.publishedAt))
        .limit(need)
    : [];

  if (filler.length < need) {
    const seen = [...exclude, ...filler.map((f) => f.id)];
    const rest = await db
      .select(listFields)
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(and(publishedFilter, sql`${articles.id} NOT IN ${seen}`))
      .orderBy(desc(articles.publishedAt))
      .limit(need - filler.length);

    filler = [...filler, ...rest];
  }

  return [...manual, ...filler];
}