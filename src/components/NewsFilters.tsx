import { getNavCategories } from '@/lib/queries';

export async function NewsFilters({
  q,
  categoria,
  orden,
}: {
  q?: string;
  categoria?: string;
  orden?: string;
}) {
  const cats = await getNavCategories();

  return (
    <form
      method="get"
      action="/noticias"
      className="flex flex-wrap items-end gap-4 border-y border-ink py-3"
    >
      <label className="flex-1 min-w-52">
        <span className="mb-1 block text-[0.65rem] italic text-ink-2">
          Buscar en los titulares
        </span>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Portugal, VRAC, Seis Naciones…"
          className="w-full border border-rule bg-transparent px-2 py-1 text-sm outline-none focus:border-ink"
        />
      </label>

      <label>
        <span className="mb-1 block text-[0.65rem] italic text-ink-2">Sección</span>
        <select
          name="categoria"
          defaultValue={categoria ?? ''}
          className="border border-rule bg-transparent px-2 py-1 text-sm outline-none focus:border-ink"
        >
          <option value="">Todas</option>
          {cats.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="mb-1 block text-[0.65rem] italic text-ink-2">Orden</span>
        <select
          name="orden"
          defaultValue={orden ?? 'recientes'}
          className="border border-rule bg-transparent px-2 py-1 text-sm outline-none focus:border-ink"
        >
          <option value="recientes">Más recientes</option>
          <option value="antiguas">Más antiguas</option>
        </select>
      </label>

      <button
        type="submit"
        className="border border-ink px-4 py-1 font-[family-name:var(--font-display)] text-sm hover:bg-ink hover:text-paper"
      >
        Buscar
      </button>
    </form>
  );
}