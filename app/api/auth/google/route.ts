import { digest, randomUrlSafe } from '@/lib/server/storage';
import { safeReturnTo } from '@/lib/server/auth';
import { runtimeString } from '@/lib/server/runtime-env';

function oauthCookie(name: string, value: string) {
  return `${name}=${value}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`;
}

export async function GET(request: Request) {
  const clientId = runtimeString('GOOGLE_CLIENT_ID');
  if (!clientId) return Response.redirect(new URL('/login?error=google_unavailable', request.url), 302);
  const url = new URL(request.url);
  const state = randomUrlSafe(24);
  const verifier = randomUrlSafe(48);
  const challenge = await digest(verifier);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const destination = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  destination.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account' }).toString();
  const headers = new Headers({ Location: destination.toString(), 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', oauthCookie('__Host-mitch-google-state', state));
  headers.append('Set-Cookie', oauthCookie('__Host-mitch-google-verifier', verifier));
  headers.append('Set-Cookie', oauthCookie('__Host-mitch-google-return', encodeURIComponent(safeReturnTo(url.searchParams.get('returnTo')))));
  return new Response(null, { status: 302, headers });
}
