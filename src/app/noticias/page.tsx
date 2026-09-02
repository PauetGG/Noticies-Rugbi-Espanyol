import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { Headline } from '@/components/Headline';
import { NewsFilters } from '@/components/NewsFilters';
import { getNewsPage, searchArticles } from '@/lib/queries';

export const revalidate = 300;

const PER_PAGE = 18;

export const metadata = {
  title: 'Noticias | Rugby Español',
  description: 'Toda la actualidad del rugby español.',
};

export default async function NoticiasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    orden?: string;
    page?: string;
  }>;
}) {
  const { q, categoria, orden, page } = await searchParams;
  const filtering = Boolean(q?.trim() || categoria);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <NewsFilters q={q} categoria={categoria} orden={orden} />

      {filtering ? (
        <Results
          q={q}
          categoria={categoria}
          orden={orden}
          page={Math.max(1, Number(page) || 1)}
        />
      ) : (
        <Front />
      )}
    </main>
  );
}

async function Front() {
  const { lead, aside, grid, archive } = await getNewsPage();

  if (!lead) {
    return (
      <p className="py-20 text-center font-[family-name:var(--font-display)] text-2xl italic text-ink-2">
        Sin noticias por ahora.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-8 border-b-2 border-ink py-8 lg:grid-cols-[2fr_1fr]">
        <ArticleCard {...lead} size="large" />

        {aside.length > 0 && (
          <div className="lg:border-l lg:border-rule lg:pl-6">
            {aside.map((a) => (
              <Headline key={String(a.id)} {...a} />
            ))}
          </div>
        )}
      </div>

      {grid.length > 0 && (
        <section className="border-b-2 border-ink py-8">
          <div className="colrule grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((a) => (
              <ArticleCard key={String(a.id)} {...a} />
            ))}
          </div>
        </section>
      )}

      {archive.length > 0 && (
        <section className="py-8">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold">
            Hemeroteca
          </h2>
          <div className="border-t border-ink">
            {archive.map((a) => (
              <Headline key={String(a.id)} {...a} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

async function Results({
  q,
  categoria,
  orden,
  page,
}: {
  q?: string;
  categoria?: string;
  orden?: string;
  page: number;
}) {
  const { rows, total } = await searchArticles({
    q,
    categorySlug: categoria,
    order: orden === 'antiguas' ? 'antiguas' : 'recientes',
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const buildHref = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (categoria) p.set('categoria', categoria);
    if (orden) p.set('orden', orden);
    p.set('page', String(n));
    return `/noticias?${p.toString()}`;
  };

  return (
    <section className="py-8">
      <p className="mb-6 text-sm text-ink-2">
        {total === 0
          ? 'Ningún titular coincide con la búsqueda.'
          : `${total} ${total === 1 ? 'noticia' : 'noticias'}`}{' '}
        <Link href="/noticias" className="italic underline hover:text-red">
          Quitar filtros
        </Link>
      </p>

      {rows.length > 0 && (
        <div className="colrule grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <ArticleCard key={String(a.id)} {...a} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex justify-between border-t border-ink pt-3 text-sm">
          {page > 1 ? (
            <Link href={buildHref(page - 1)} className="hover:text-red">
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-2">
            {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={buildHref(page + 1)} className="hover:text-red">
              Siguientes
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}