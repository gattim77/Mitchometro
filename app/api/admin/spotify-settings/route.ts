import { env } from 'cloudflare:workers';
import { adminAuthorized } from '@/lib/server/admin-auth';
import { database, safeOrigin } from '@/lib/server/spotify';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  if (!await adminAuthorized()) return new Response(null, { status: 404, headers });
  try {
    const row = await database().prepare('SELECT client_id FROM spotify_app_settings WHERE id = 1').first<{ client_id: string }>();
    return Response.json({ configured: !!row, clientId: row?.client_id ?? '', redirectUri: env.SPOTIFY_REDIRECT_URI ?? '' }, { headers });
  } catch (error) {
    console.error('Spotify app settings unavailable', error);
    return Response.json({ error: 'Configurazione Spotify non disponibile.' }, { status: 503, headers });
  }
}

export async function PUT(request: Request) {
  if (!await adminAuthorized()) return new Response(null, { status: 404, headers });
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403, headers });
  const payload = await request.json().catch(() => null) as { clientId?: unknown } | null;
  if (typeof payload?.clientId !== 'string' || !/^[a-f0-9]{32}$/i.test(payload.clientId)) {
    return Response.json({ error: 'Inserisci un Client ID Spotify valido (32 caratteri esadecimali).' }, { status: 400, headers });
  }
  if (!env.SPOTIFY_TOKEN_KEY || !env.SPOTIFY_REDIRECT_URI) return Response.json({ error: 'Configurazione del server incompleta.' }, { status: 503, headers });
  try {
    await database().prepare('INSERT INTO spotify_app_settings (id, client_id, client_secret) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET client_id = excluded.client_id, client_secret = excluded.client_secret')
      .bind(payload.clientId.toLowerCase(), '').run();
    return Response.json({ configured: true, clientId: payload.clientId.toLowerCase(), redirectUri: env.SPOTIFY_REDIRECT_URI }, { headers });
  } catch (error) {
    console.error('Spotify app settings save failed', error);
    return Response.json({ error: 'Salvataggio non riuscito.' }, { status: 503, headers });
  }
}
