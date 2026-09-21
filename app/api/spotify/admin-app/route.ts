import { adminAuthorized } from '@/lib/server/admin-auth';
import { database, encrypt, safeOrigin } from '@/lib/server/spotify';
import { env } from 'cloudflare:workers';
export async function POST(request: Request) {
  if (!(await adminAuthorized())) return new Response(null, { status: 404 });
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403 });
  const body = await request.json().catch(() => null) as {clientId?: unknown; clientSecret?: unknown} | null;
  if (typeof body?.clientId !== 'string' || typeof body?.clientSecret !== 'string' ||
      !/^[a-zA-Z0-9]{20,100}$/.test(body.clientId) || !/^[a-zA-Z0-9]{20,100}$/.test(body.clientSecret))
    return Response.json({ error: 'Client ID o Client Secret non validi.' }, { status: 400 });
  if (!env.SPOTIFY_TOKEN_KEY) return Response.json({ error: 'Configurazione del sito incompleta.' }, { status: 503 });
  try {
    const db = database();
    const existing = await db.prepare('SELECT id FROM spotify_app_settings WHERE id = 1').first();
    if (existing) return Response.json({ error: 'L’app Spotify è già configurata.' }, { status: 409 });
    await db.prepare('INSERT INTO spotify_app_settings (id, client_id, client_secret) VALUES (1, ?, ?)')
      .bind(body.clientId, await encrypt(body.clientSecret, env.SPOTIFY_TOKEN_KEY)).run();
    return Response.json({ configured: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { console.error('Spotify app setup failed', error); return Response.json({ error: 'Configurazione non riuscita.' }, { status: 503 }); }
}
