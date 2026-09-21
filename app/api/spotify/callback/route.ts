import { actor, database, digest, encrypt, redirectUriFor, seeOther, spotifyConfig, spotifyMe, tokenExchange } from '@/lib/server/spotify';
export async function GET(request: Request) {
  const config = await spotifyConfig();
  const user = await actor();
  if (!config || !user) return seeOther('/?spotify=unavailable');
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  if (!state || state.length > 200) return seeOther('/?spotify=invalid');
  try {
    redirectUriFor(request, config.redirectUri);
    const db = database();
    const hash = await digest(state);
    const attempt = await db.prepare('SELECT owner_id, role, verifier, expires_at FROM spotify_auth_attempts WHERE state_hash = ?').bind(hash).first<{ owner_id: string; role: string; verifier: string; expires_at: number }>();
    if (!attempt || attempt.owner_id !== user.id || attempt.expires_at < Date.now() || (attempt.role !== 'user' && attempt.role !== 'master') || (attempt.role === 'master' && !user.isMasterOwner)) return seeOther('/?spotify=invalid');
    await db.prepare('DELETE FROM spotify_auth_attempts WHERE state_hash = ?').bind(hash).run();
    if (url.searchParams.has('error')) return seeOther('/?spotify=cancelled');
    const code = url.searchParams.get('code');
    if (!code || code.length > 4096) return seeOther('/?spotify=invalid');
    const token = await tokenExchange(code, attempt.verifier, config);
    const profile = await spotifyMe(token.access_token);
    const conflicting = await db.prepare('SELECT role FROM spotify_connections WHERE spotify_account_id = ? AND role != ? LIMIT 1').bind(profile.id, attempt.role).first<{ role: string }>();
    if (conflicting) return seeOther('/?spotify=conflict');
    await db.prepare(`INSERT INTO spotify_connections (owner_id, role, spotify_account_id, display_name, access_token, refresh_token, expires_at, connected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, role) DO UPDATE SET spotify_account_id = excluded.spotify_account_id, display_name = excluded.display_name,
      access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at, connected_at = excluded.connected_at`)
      .bind(user.id, attempt.role, profile.id, attempt.role === 'user' ? profile.display_name ?? null : null,
        await encrypt(token.access_token, config.tokenKey), await encrypt(token.refresh_token!, config.tokenKey),
        Date.now() + token.expires_in * 1000, Date.now()).run();
    return seeOther(`/?spotify=${attempt.role === 'master' ? 'master-connected' : 'connected'}`);
  } catch (error) { console.error('Spotify authorization callback failed', error); return seeOther('/?spotify=unavailable'); }
}
