import { adminAuthorized } from '@/lib/server/admin-auth';
import { actor, database, spotifyConfig, validAccessToken } from '@/lib/server/spotify';
export async function GET() {
  const user = await actor();
  if (!user) return Response.json({ authenticated: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const configured = !!(await spotifyConfig());
  const admin = user.isMasterOwner && await adminAuthorized();
  try {
    const db = database();
    await validAccessToken(user.id, 'user');
    if (admin) await validAccessToken(user.id, 'master');
    const own = await db.prepare("SELECT display_name, connected_at FROM spotify_connections WHERE owner_id = ? AND role = 'user'").bind(user.id).first<{display_name:string|null;connected_at:number}>();
    const master = admin ? await db.prepare("SELECT connected_at FROM spotify_connections WHERE owner_id = ? AND role = 'master'").bind(user.id).first<{connected_at:number}>() : null;
    return Response.json({ authenticated: true, configured, user: { connected: !!own, name: own?.display_name ?? null }, adminAvailable: user.isMasterOwner, ...(admin ? { master: { connected: !!master } } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { console.error('Spotify status failed', error); return Response.json({ error: 'Stato Spotify non disponibile.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
