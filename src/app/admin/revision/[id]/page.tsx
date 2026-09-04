import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { articles, categories } from '@/db/schema';
import { guardar, publicar, rechazar } from '../actions';

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, BigInt(id)))
    .limit(1);

  if (!article) notFound();

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.sortOrder));

  const input = 'w-full border border-ink bg-paper px-3 py-2 text-sm';

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin/revision" className="text-xs text-ink-2 hover:text-red">
        ← Volver a la lista
      </Link>

      <h1 className="mb-4 mt-2 font-[family-name:var(--font-display)] text-2xl font-black">
        Revisar borrador
      </h1>

      {ok ? (
        <p className="mb-4 border border-ink bg-paper-2 px-3 py-2 text-sm">
          Cambios {ok}.
        </p>
      ) : null}

      <div className="mb-6 border border-rule bg-paper-2 p-3 text-sm">
        <p className="mb-1 text-[0.7rem] uppercase tracking-wider text-ink-2">
          Titular original
        </p>
        <p className="mb-2">{article.sourceTitle}</p>
        {article.sourceUrl ? (
          <Link
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red underline"
          >
            Abrir la fuente
          </Link>
        ) : null}
      </div>

      <form className="flex flex-col gap-4">
        <input type="hidden" name="id" value={article.id.toString()} />

        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] uppercase tracking-wider text-ink-2">
            Titular ({article.title.length} car.)
          </span>
          <input name="title" defaultValue={article.title} className={input} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] uppercase tracking-wider text-ink-2">
            Entradilla ({article.excerpt?.length ?? 0} car.)
          </span>
          <textarea
            name="excerpt"
            rows={4}
            defaultValue={article.excerpt ?? ''}
            className={input}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] uppercase tracking-wider text-ink-2">
            Cuerpo (Markdown)
          </span>
          <textarea
            name="body"
            rows={8}
            defaultValue={article.body}
            className={`${input} font-mono`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] uppercase tracking-wider text-ink-2">
            Categoría
          </span>
          <select
            name="categoryId"
            defaultValue={article.categoryId ?? ''}
            className={input}
          >
            <option value="">Sin categoría</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] uppercase tracking-wider text-ink-2">
            Imagen de portada (URL)
          </span>
          <input
            name="coverImageUrl"
            defaultValue={article.coverImageUrl ?? ''}
            className={input}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] uppercase tracking-wider text-ink-2">
            Meta description
          </span>
          <input
            name="metaDescription"
            defaultValue={article.metaDescription ?? ''}
            className={input}
          />
        </label>

        <div className="flex flex-wrap gap-3 border-t-2 border-ink pt-4">
          <button
            formAction={publicar}
            className="border-2 border-ink bg-ink px-4 py-2 text-sm text-paper"
          >
            Publicar
          </button>
          <button
            formAction={guardar}
            className="border-2 border-ink px-4 py-2 text-sm"
          >
            Guardar sin publicar
          </button>
          <button
            formAction={rechazar}
            className="ml-auto border-2 border-red px-4 py-2 text-sm text-red"
          >
            Descartar
          </button>
        </div>
      </form>
    </main>
  );
}