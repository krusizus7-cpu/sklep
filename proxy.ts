import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const dev = process.env.NODE_ENV === 'development';
  const nonce = randomBytes(18).toString('base64');
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({request: {headers}});
  response.headers.set('Content-Security-Policy', csp);
  if (process.env.P24_MODE === 'live') response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  else response.headers.set('X-Robots-Tag', 'noindex');
  return response;
}

export const config = {matcher: ['/((?!_next/static|_next/image|assets/|fonts/|.*\\.css$).*)']};
