import { site } from '@/lib/site';
import { getPublishedArticles } from '@/lib/queries';

export const revalidate = 900;

function escape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const posts = await getPublishedArticles(30);

  const items = posts
    .map(
      (p) => `    <item>
      <title>${escape(p.title)}</title>
      <link>${site.url}/noticias/${p.slug}</link>
      <guid isPermaLink="true">${site.url}/noticias/${p.slug}</guid>
      ${p.excerpt ? `<description>${escape(p.excerpt)}</description>` : ''}
      ${p.categoryName ? `<category>${escape(p.categoryName)}</category>` : ''}
      ${p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : ''}
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(site.name)}</title>
    <link>${site.url}</link>
    <description>${escape(site.description)}</description>
    <language>es</language>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}