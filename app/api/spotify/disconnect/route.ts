import { adminAuthorized } from '@/lib/server/admin-auth';
import { actor, database, roleFrom, safeOrigin } from '@/lib/server/spotify';
export async function POST(request: Request) {
  const user = await actor();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401 });
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403 });
  const payload = await request.json().catch(() => null) as {role?: string} | null;
  const role = roleFrom(payload?.role ?? null);
  if (!role) return Response.json({ error: 'Ruolo non valido.' }, { status: 400 });
  if (role === 'master' && !(await adminAuthorized())) return new Response(null, { status: 404 });
  try {
    await database().prepare('DELETE FROM spotify_connections WHERE owner_id = ? AND role = ?').bind(user.id, role).run();
    return Response.json({ disconnected: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { console.error('Spotify disconnect failed', error); return Response.json({ error: 'Disconnessione non riuscita.' }, { status: 503 }); }
}
