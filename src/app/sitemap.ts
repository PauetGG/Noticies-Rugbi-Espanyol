import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';
import { getAllPublishedSlugs, getNavCategories } from '@/lib/queries';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [arts, cats] = await Promise.all([
    getAllPublishedSlugs(),
    getNavCategories(),
  ]);

  return [
    { url: site.url, changeFrequency: 'hourly', priority: 1 },
    { url: `${site.url}/noticias`, changeFrequency: 'hourly', priority: 0.9 },
    ...cats.map((c) => ({
      url: `${site.url}/noticias/${c.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...arts.map((a) => ({
      url: `${site.url}/noticias/${a.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}