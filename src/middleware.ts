import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value;
  const esperat = process.env.ADMIN_SESSION_TOKEN;

  if (esperat && token === esperat) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin', '/admin/((?!login).*)'],
};