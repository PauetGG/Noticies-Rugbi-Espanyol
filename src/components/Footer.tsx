import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-20 border-t-2 border-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-ink-2 sm:flex-row sm:justify-between">
        <span className="font-[family-name:var(--font-display)] text-sm text-ink">
          Rugby Español
        </span>
        <nav className="flex gap-4">
          <Link href="/articles" className="hover:text-red">Noticias</Link>
          <Link href="/aviso-legal" className="hover:text-red">Aviso legal</Link>
          <Link href="/privacidad" className="hover:text-red">Privacidad</Link>
        </nav>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}