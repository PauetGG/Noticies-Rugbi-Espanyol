import Link from 'next/link';
import { getNavCategories } from '@/lib/queries';
import { site } from '@/lib/site';

export async function Masthead() {
  const cats = await getNavCategories();

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="mx-auto max-w-6xl px-4 pt-6">
      <div className="border-t-4 border-ink" />

      <Link href="/" className="block pt-5 pb-6 text-center sm:pb-8">
        <span className="font-[family-name:var(--font-display)] block text-5xl font-black leading-none tracking-tight sm:text-8xl">
          {site.name}
        </span>
      </Link>

      <div className="flex items-center justify-center gap-3 pb-4 sm:gap-4">
        <span className="h-px w-8 bg-ink sm:w-16" />
        <p className="font-[family-name:var(--font-body)] text-[0.7rem] font-semibold uppercase leading-none tracking-[0.18em] text-ink sm:text-xs">
          {site.tagline}
        </p>
        <span className="h-px w-8 bg-ink sm:w-16" />
      </div>

      <div className="flex items-baseline justify-between border-y border-ink py-1 text-[0.7rem] text-ink-2">
        <span className="first-letter:uppercase">{today}</span>
        <span className="hidden sm:inline">Edición digital</span>
      </div>

      <nav className="sticky top-0 z-20 flex justify-center gap-8 border-b-2 border-ink bg-paper py-2 font-[family-name:var(--font-display)] text-sm">
        <div className="group relative">
          <Link href="/noticias" className="hover:text-red">
            Noticias
          </Link>

          {cats.length > 0 && (
            <div className="invisible absolute left-1/2 top-full z-30 min-w-44 -translate-x-1/2 border border-ink bg-paper opacity-0 shadow-[3px_3px_0_var(--color-rule)] transition-opacity duration-100 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              {cats.map((c) => (
                <Link
                  key={c.slug}
                  href={`/noticias/${c.slug}`}
                  className="block border-b border-rule px-4 py-2 text-xs last:border-b-0 hover:bg-paper-2 hover:text-red"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link href="/competiciones" className="hover:text-red">
          Competiciones
        </Link>
        <Link href="/equipos" className="hover:text-red">
          Equipos
        </Link>
      </nav>
    </header>
  );
}