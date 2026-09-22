import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, safeOrigin, spotifyConfig } from '@/lib/server/spotify';
import { validateHistoryProfile } from '@/lib/history-profile';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401, headers });
  try {
    const [configured, connection, row] = await Promise.all([
      spotifyConfig().then(Boolean),
      database().prepare("SELECT connected_at FROM spotify_connections WHERE owner_id = ? AND role = 'user'").bind(user.userId).first<{ connected_at: number }>(),
      database().prepare("SELECT summary, uploaded_at, plays FROM listening_profiles WHERE owner_id = ? AND role = 'user'").bind(user.userId).first<{ summary: string; uploaded_at: number; plays: number }>(),
    ]);
    const profile = row && validateHistoryProfile(JSON.parse(row.summary));
    return Response.json({ configured, connected: !!connection, source: profile?.source === 'recent' ? 'recent' : profile ? 'upload' : null, plays: row?.plays ?? 0, updatedAt: row?.uploaded_at ?? null }, { headers });
  } catch (error) {
    console.error('Spotify status unavailable', error);
    return Response.json({ error: 'Stato Spotify non disponibile.' }, { status: 503, headers });
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401, headers });
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403, headers });
  try {
    const db = database();
    await db.prepare("DELETE FROM spotify_connections WHERE owner_id = ? AND role = 'user'").bind(user.userId).run();
    const row = await db.prepare("SELECT summary FROM listening_profiles WHERE owner_id = ? AND role = 'user'").bind(user.userId).first<{ summary: string }>();
    if (row && validateHistoryProfile(JSON.parse(row.summary))?.source === 'recent') {
      await db.prepare("DELETE FROM listening_profiles WHERE owner_id = ? AND role = 'user'").bind(user.userId).run();
    }
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    console.error('Spotify disconnect failed', error);
    return Response.json({ error: 'Disconnessione non riuscita.' }, { status: 503, headers });
  }
}
