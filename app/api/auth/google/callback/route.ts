import { cookies } from 'next/headers';
import { createSession, normalizeDisplayName, normalizeEmail, safeReturnTo, sessionCookie } from '@/lib/server/auth';
import { database } from '@/lib/server/storage';
import { runtimeString } from '@/lib/server/runtime-env';

type GoogleProfile = { sub?: string; email?: string; email_verified?: boolean; name?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const state = jar.get('__Host-mitch-google-state')?.value;
  const verifier = jar.get('__Host-mitch-google-verifier')?.value;
  const returnTo = safeReturnTo(decodeURIComponent(jar.get('__Host-mitch-google-return')?.value || '/'));
  const clear = '__Host-mitch-google-state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
  const fail = (reason: string) => new Response(null, { status: 302, headers: { Location: `/login?error=${reason}`, 'Set-Cookie': clear, 'Cache-Control': 'no-store' } });
  const clientId = runtimeString('GOOGLE_CLIENT_ID');
  const clientSecret = runtimeString('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret || !state || state !== url.searchParams.get('state') || !verifier || !url.searchParams.get('code')) return fail('google_failed');
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: url.searchParams.get('code')!, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: `${url.origin}/api/auth/google/callback` }),
    });
    const token = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) return fail('google_failed');
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json() as GoogleProfile;
    const email = normalizeEmail(profile.email);
    if (!profileResponse.ok || !profile.sub || !email || profile.email_verified !== true) return fail('google_failed');
    const db = database();
    let user = await db.prepare('SELECT id, google_sub FROM app_users WHERE google_sub = ? OR email = ? ORDER BY google_sub = ? DESC LIMIT 1')
      .bind(profile.sub, email, profile.sub).first<{ id: string; google_sub: string | null }>();
    const now = Date.now();
    if (!user) {
      const id = crypto.randomUUID();
      await db.prepare('INSERT INTO app_users (id, email, display_name, google_sub, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, email, normalizeDisplayName(profile.name, email), profile.sub, now, now).run();
      user = { id, google_sub: profile.sub };
    } else {
      if (user.google_sub && user.google_sub !== profile.sub) return fail('google_failed');
      await db.prepare('UPDATE app_users SET google_sub = ?, display_name = COALESCE(display_name, ?), updated_at = ? WHERE id = ?')
        .bind(profile.sub, normalizeDisplayName(profile.name, email), now, user.id).run();
    }
    const session = await createSession(user.id);
    const headers = new Headers({ Location: returnTo, 'Cache-Control': 'no-store' });
    headers.append('Set-Cookie', sessionCookie(session));
    for (const name of ['state', 'verifier', 'return']) headers.append('Set-Cookie', `__Host-mitch-google-${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error('Google authentication failed', error);
    return fail('google_failed');
  }
}
