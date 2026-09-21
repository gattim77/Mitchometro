import { adminAuthorized } from '@/lib/server/admin-auth';
import { actor, database, digest, randomUrlSafe, redirectUriFor, roleFrom, seeOther, spotifyConfig } from '@/lib/server/spotify';
export async function GET(request: Request) {
  const user = await actor();
  if (!user) return Response.json({ error: 'Accedi al sito prima di collegare Spotify.' }, { status: 401 });
  const role = roleFrom(new URL(request.url).searchParams.get('role'));
  if (!role) return Response.json({ error: 'Ruolo non valido.' }, { status: 400 });
  if (role === 'master' && !(await adminAuthorized())) return new Response(null, { status: 404 });
  const config = await spotifyConfig();
  if (!config) return seeOther(role === 'master' ? '/admin?spotify=unconfigured' : '/?spotify=unconfigured');
  try {
    const redirectUri = redirectUriFor(request, config.redirectUri);
    const db = database();
    const state = randomUrlSafe();
    const verifier = randomUrlSafe(64);
    const challenge = await digest(verifier);
    await db.prepare('DELETE FROM spotify_auth_attempts WHERE expires_at < ?').bind(Date.now()).run();
    await db.prepare('INSERT INTO spotify_auth_attempts (state_hash, owner_id, role, verifier, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(await digest(state), user.id, role, verifier, Date.now() + 10 * 60 * 1000).run();
    const authorize = new URL('https://accounts.spotify.com/authorize');
    authorize.search = new URLSearchParams({ client_id: config.id, response_type: 'code', redirect_uri: redirectUri, state, scope: 'user-read-private', code_challenge_method: 'S256', code_challenge: challenge }).toString();
    return seeOther(authorize.toString());
  } catch (error) { console.error('Spotify authorization start failed', error); return seeOther('/?spotify=unavailable'); }
}
