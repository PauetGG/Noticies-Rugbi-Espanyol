import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="font-[family-name:var(--font-display)] text-7xl font-black leading-none">
        404
      </p>

      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-bold">
        Esta página no existe
      </h1>

      <p className="newsprint mt-4 max-w-md text-center text-ink-2">
        La dirección que has seguido no lleva a ningún sitio. Puede que la noticia
        se haya movido o que el enlace estuviera mal escrito.
      </p>

      <div className="mt-8 flex gap-6 border-t border-ink pt-4 font-[family-name:var(--font-display)] text-sm">
        <Link href="/" className="hover:text-red">
          Ir a portada
        </Link>
        <Link href="/noticias" className="hover:text-red">
          Ver todas las noticias
        </Link>
      </div>
    </main>
  );
}