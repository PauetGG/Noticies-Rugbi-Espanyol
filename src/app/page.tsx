import { db } from '@/db';
import { articles } from '@/db/schema';

export default async function Home() {
  const rows = await db.select().from(articles).limit(10);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Rugby Español</h1>
      <p className="text-sm text-gray-500 mb-6">{rows.length} articles a la base de dades</p>
      <ul className="space-y-2">
        {rows.map((a) => (
          <li key={a.id}>{a.title}</li>
        ))}
      </ul>
    </main>
  );
}