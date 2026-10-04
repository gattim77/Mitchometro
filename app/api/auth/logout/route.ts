import { cookies } from 'next/headers';
import { clearSessionCookie, deleteSession, USER_COOKIE } from '@/lib/server/auth';
import { safeOrigin } from '@/lib/server/storage';

export async function POST(request: Request) {
  if (!safeOrigin(request)) return new Response(null, { status: 403 });
  await deleteSession((await cookies()).get(USER_COOKIE)?.value);
  return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': clearSessionCookie(), 'Cache-Control': 'no-store' } });
}
