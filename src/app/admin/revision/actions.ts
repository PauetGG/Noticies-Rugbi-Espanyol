'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { articles } from '@/db/schema';

function camps(formData: FormData) {
  const categoryId = String(formData.get('categoryId') ?? '');
  return {
    title: String(formData.get('title') ?? '').trim(),
    excerpt: String(formData.get('excerpt') ?? '').trim() || null,
    body: String(formData.get('body') ?? '').trim(),
    metaDescription: String(formData.get('metaDescription') ?? '').trim() || null,
    coverImageUrl: String(formData.get('coverImageUrl') ?? '').trim() || null,
    categoryId: categoryId ? Number(categoryId) : null,
    updatedAt: new Date().toISOString(),
  };
}

export async function guardar(formData: FormData) {
  const id = BigInt(String(formData.get('id')));
  await db.update(articles).set(camps(formData)).where(eq(articles.id, id));

  revalidatePath('/admin/revision');
  redirect(`/admin/revision/${id}?ok=guardado`);
}

export async function publicar(formData: FormData) {
  const id = BigInt(String(formData.get('id')));
  const ara = new Date().toISOString();

  await db
    .update(articles)
    .set({
      ...camps(formData),
      status: 'published',
      publishedAt: ara,
      reviewedAt: ara,
      reviewedBy: 'admin',
    })
    .where(eq(articles.id, id));

  revalidatePath('/admin/revision');
  revalidatePath('/');
  revalidatePath('/noticias');
  redirect('/admin/revision?ok=publicado');
}

export async function rechazar(formData: FormData) {
  const id = BigInt(String(formData.get('id')));
  const ara = new Date().toISOString();

  await db
    .update(articles)
    .set({
      status: 'archived',
      reviewedAt: ara,
      reviewedBy: 'admin',
      updatedAt: ara,
    })
    .where(eq(articles.id, id));

  revalidatePath('/admin/revision');
  redirect('/admin/revision?ok=descartado');
}