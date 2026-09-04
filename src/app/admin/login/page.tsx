import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata = { robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function entrar(formData: FormData) {
    'use server';

    const pass = String(formData.get('password') ?? '');
    if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD) {
      redirect('/admin/login?error=1');
    }

    const jar = await cookies();
    jar.set('admin_session', process.env.ADMIN_SESSION_TOKEN ?? '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
    });

    redirect('/admin/revision');
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-3xl font-black">
        Redacción
      </h1>

      <form action={entrar} className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          autoFocus
          className="border border-ink bg-paper px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="border-2 border-ink bg-ink px-3 py-2 text-sm text-paper"
        >
          Entrar
        </button>
        {error && <p className="text-sm text-red">Contraseña incorrecta.</p>}
      </form>
    </main>
  );
}