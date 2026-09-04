import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { articles, sources } from '@/db/schema';

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function RevisionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;

  const files = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      createdAt: articles.createdAt,
      sourceName: sources.name,
      promptVersion: articles.llmPromptVersion,
    })
    .from(articles)
    .leftJoin(sources, eq(articles.sourceId, sources.id))
    .where(eq(articles.status, 'draft'))
    .orderBy(desc(articles.createdAt));

  async function sortir() {
    'use server';
    const jar = await cookies();
    jar.delete('admin_session');
    redirect('/admin/login');
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-baseline justify-between border-b-2 border-ink pb-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black">
          Borradores pendientes
        </h1>
        <form action={sortir}>
          <button className="text-xs text-ink-2 hover:text-red">Salir</button>
        </form>
      </div>

      {ok && (
        <p className="mb-4 border border-ink bg-paper-2 px-3 py-2 text-sm">
          Artículo {ok}.
        </p>
      )}

      {files.length === 0 ? (
        <p className="text-ink-2">No hay borradores pendientes de revisión.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {files.map((a) => (
            <li key={a.id.toString()} className="py-4">
              <Link
                href={`/admin/revision/${a.id}`}
                className="font-[family-name:var(--font-display)] text-xl font-bold hover:text-red"
              >
                {a.title}
              </Link>
              <p className="mt-1 text-sm text-ink-2">{a.excerpt}</p>
              <p className="mt-2 text-[0.7rem] uppercase tracking-wider text-ink-2">
                {a.sourceName ?? 'Sin fuente'} · prompt v{a.promptVersion ?? '?'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}