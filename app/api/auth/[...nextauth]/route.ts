import type { NextRequest } from 'next/server';
import { handlers } from '@/auth';
import { rewriteAuthResponseToRequestHost } from '@/lib/auth/request-origin';

/**
 * Wrapper: NextAuth con AUTH_URL di produzione riscrive origini/cookie verso
 * quel host. Qui forziamo Location e callback-url sull'host della preview/request.
 */
async function handle(
  method: 'GET' | 'POST',
  req: NextRequest
): Promise<Response> {
  const handler = handlers[method];
  const res = await handler(req);
  return rewriteAuthResponseToRequestHost(req, res);
}

export async function GET(req: NextRequest) {
  return handle('GET', req);
}

export async function POST(req: NextRequest) {
  return handle('POST', req);
}
