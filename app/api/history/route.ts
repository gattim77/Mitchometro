import { getChatGPTUser } from '@/app/chatgpt-auth';
import { adminAuthorized } from '@/lib/server/admin-auth';
import { database, safeOrigin } from '@/lib/server/spotify';
import { validateHistoryProfile } from '@/lib/history-profile';

const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401, headers });
  try {
    const db = database();
    const mine = await db.prepare("SELECT uploaded_at, plays, summary FROM listening_profiles WHERE owner_id = ? AND role = 'user'")
      .bind(user.userId).first<{ uploaded_at: number; plays: number; summary: string }>();
    const myProfile = mine && validateHistoryProfile(JSON.parse(mine.summary));
    const master = await db.prepare("SELECT uploaded_at, plays, summary FROM listening_profiles WHERE role = 'master' ORDER BY uploaded_at DESC LIMIT 1")
      .first<{ uploaded_at: number; plays: number; summary: string }>();
    const masterProfile = master && validateHistoryProfile(JSON.parse(master.summary));
    return Response.json({
      mine: mine ? { uploadedAt: mine.uploaded_at, plays: mine.plays, source: myProfile?.source === 'recent' ? 'recent' : 'upload' } : null,
      masterReady: !!master,
      ...(await adminAuthorized() ? { master: master ? { uploadedAt: master.uploaded_at, plays: master.plays, rotationReady: !!masterProfile?.rotationTracks?.length } : null } : {}),
    }, { headers });
  } catch (error) {
    console.error('History status unavailable', error);
    return Response.json({ error: 'Cronologia non disponibile.' }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401, headers });
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403, headers });
  if (Number(request.headers.get('content-length')) > 1_500_000) return Response.json({ error: 'Troppi artisti nel file. Seleziona un periodo più breve.' }, { status: 413, headers });
  const text = await request.text();
  if (text.length > 1_500_000) return Response.json({ error: 'Troppi artisti nel file. Seleziona un periodo più breve.' }, { status: 413, headers });
  const payload = await Promise.resolve().then(() => JSON.parse(text || 'null')).catch(() => null) as { role?: unknown; profile?: unknown } | null;
  const role = payload?.role;
  if (role !== 'user' && role !== 'master') return Response.json({ error: 'Ruolo non valido.' }, { status: 400, headers });
  if (role === 'master' && !await adminAuthorized()) return new Response(null, { status: 404, headers });
  const profile = validateHistoryProfile(payload?.profile);
  if (!profile) return Response.json({ error: 'Cronologia non valida.' }, { status: 400, headers });
  if (role === 'master' && !profile.rotationTracks?.length) return Response.json({ error: 'Ricarica i file della cronologia per attivare la rotazione dei brani.' }, { status: 400, headers });
  const storedProfile = role === 'user' ? { version: 1 as const, source: 'upload' as const, windows: profile.windows } : profile;
  try {
    await database().prepare(`INSERT INTO listening_profiles (owner_id, role, summary, uploaded_at, plays) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, role) DO UPDATE SET summary = excluded.summary, uploaded_at = excluded.uploaded_at, plays = excluded.plays`)
      .bind(user.userId, role, JSON.stringify(storedProfile), Date.now(), profile.windows.year.plays).run();
    if (role === 'user') await database().prepare("DELETE FROM spotify_connections WHERE owner_id = ? AND role = 'user'").bind(user.userId).run();
    return Response.json({ ok: true, plays: profile.windows.year.plays }, { headers });
  } catch (error) {
    console.error('History upload failed', error);
    return Response.json({ error: 'Salvataggio non riuscito. Riprova.' }, { status: 503, headers });
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401, headers });
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403, headers });
  const payload = await request.json().catch(() => null) as { role?: unknown } | null;
  const role = payload?.role;
  if (role !== 'user' && role !== 'master') return Response.json({ error: 'Ruolo non valido.' }, { status: 400, headers });
  if (role === 'master' && !await adminAuthorized()) return new Response(null, { status: 404, headers });
  try {
    await database().prepare('DELETE FROM listening_profiles WHERE owner_id = ? AND role = ?').bind(user.userId, role).run();
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    console.error('History deletion failed', error);
    return Response.json({ error: 'Eliminazione non riuscita.' }, { status: 503, headers });
  }
}
