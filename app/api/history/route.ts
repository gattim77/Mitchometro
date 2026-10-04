import { getUser } from '@/lib/server/auth';
import { adminAuthorized } from '@/lib/server/admin-auth';
import { database, safeOrigin } from '@/lib/server/storage';
import { validateHistoryProfile } from '@/lib/history-profile';

const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  const user = await getUser();
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
      mine: mine && myProfile && myProfile.source !== 'recent' ? { uploadedAt: mine.uploaded_at, plays: mine.plays, lifetimeReady: myProfile.lifetimeReady } : null,
      masterReady: !!masterProfile,
      masterLifetimeReady: !!masterProfile?.lifetimeReady,
      ...(await adminAuthorized() ? { master: master && masterProfile ? { uploadedAt: master.uploaded_at, plays: master.plays, rotationReady: !!masterProfile.rotationTracks?.length, lifetimeReady: masterProfile.lifetimeReady } : null } : {}),
    }, { headers });
  } catch (error) {
    console.error('History status unavailable', error);
    return Response.json({ error: 'Cronologia non disponibile.' }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401, headers });
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403, headers });
  if (Number(request.headers.get('content-length')) > 20_000_000) return Response.json({ error: 'La cronologia supera il limite tecnico di caricamento.' }, { status: 413, headers });
  const text = await request.text();
  if (text.length > 20_000_000) return Response.json({ error: 'La cronologia supera il limite tecnico di caricamento.' }, { status: 413, headers });
  const payload = await Promise.resolve().then(() => JSON.parse(text || 'null')).catch(() => null) as { role?: unknown; profile?: unknown } | null;
  const role = payload?.role;
  if (role !== 'user' && role !== 'master') return Response.json({ error: 'Ruolo non valido.' }, { status: 400, headers });
  if (role === 'master' && !await adminAuthorized()) return new Response(null, { status: 404, headers });
  const profile = validateHistoryProfile(payload?.profile);
  if (!profile || profile.source !== 'upload') return Response.json({ error: 'Carica una cronologia esportata valida.' }, { status: 400, headers });
  if (role === 'master' && !profile.rotationTracks?.length) return Response.json({ error: 'Ricarica i file della cronologia per attivare la rotazione dei brani.' }, { status: 400, headers });
  const storedProfile = role === 'user' ? { ...profile, rotationTracks: undefined } : profile;
  const plays = profile.windows.forever.plays;
  try {
    await database().prepare(`INSERT INTO listening_profiles (owner_id, role, summary, uploaded_at, plays) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, role) DO UPDATE SET summary = excluded.summary, uploaded_at = excluded.uploaded_at, plays = excluded.plays`)
      .bind(user.userId, role, JSON.stringify(storedProfile), Date.now(), plays).run();
    return Response.json({ ok: true, plays }, { headers });
  } catch (error) {
    console.error('History upload failed', error);
    return Response.json({ error: 'Salvataggio non riuscito. Riprova.' }, { status: 503, headers });
  }
}

export async function DELETE(request: Request) {
  const user = await getUser();
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
