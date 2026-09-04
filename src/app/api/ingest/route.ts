import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/db';
import { rawArticles } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const itemSchema = z.object({
  sourceId: z.number().int().positive(),
  url: z.string().url(),
  title: z.string().min(1).max(500),
  summary: z.string().max(4000).optional(),
  content: z.string().optional(),
  author: z.string().max(200).optional(),
  imageUrl: z.string().url().optional(),
  publishedAt: z.string().datetime({ offset: true }).optional(),
});

const payloadSchema = z.union([itemSchema, z.array(itemSchema).min(1).max(100)]);

function checkApiKey(req: Request): boolean {
  const expected = process.env.INGEST_API_KEY;
  if (!expected) return false;

  const provided = req.headers.get('x-api-key');
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

function normalizeUrl(raw: string): string {
  const u = new URL(raw);

  u.hash = '';
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  u.protocol = 'https:';

  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_cid|mc_eid|ref|source)/i.test(key)) {
      u.searchParams.delete(key);
    }
  }
  u.searchParams.sort();

  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.slice(0, -1);
  }

  return u.toString();
}

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

export async function POST(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const items = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

  const rows = items.map((item) => {
    const url = normalizeUrl(item.url);
    return {
      sourceId: item.sourceId,
      url,
      urlHash: hashUrl(url),
      title: item.title.trim(),
      summary: item.summary ?? null,
      content: item.content ?? null,
      author: item.author ?? null,
      imageUrl: item.imageUrl ?? null,
      publishedAt: item.publishedAt ?? null,
      rawPayload: item,
    };
  });

  try {
    const inserted = await db
      .insert(rawArticles)
      .values(rows)
      .onConflictDoNothing({ target: rawArticles.urlHash })
      .returning({ id: rawArticles.id });

    return NextResponse.json(
      {
        received: rows.length,
        inserted: inserted.length,
        skipped: rows.length - inserted.length,
        ids: inserted.map((r) => r.id.toString()),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[ingest] insert failed', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}