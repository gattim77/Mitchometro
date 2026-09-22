import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, digest, encrypt, redirectUriFor, seeOther, spotifyConfig, tokenExchange } from '@/lib/server/spotify';
import { syncRecentProfile } from '@/lib/server/recent-profile';

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return seeOther('/signin-with-chatgpt?return_to=%2F');
  const params = new URL(request.url).searchParams;
  if (params.has('error')) return seeOther('/?spotify=denied');
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state || code.length > 2048 || state.length > 256) return seeOther('/?spotify=error');
  try {
    const db = database();
    const stateHash = await digest(state);
    const attempt = await db.prepare('SELECT owner_id, role, verifier, expires_at FROM spotify_auth_attempts WHERE state_hash = ?')
      .bind(stateHash).first<{ owner_id: string; role: string; verifier: string; expires_at: number }>();
    if (!attempt || attempt.owner_id !== user.userId || attempt.role !== 'user' || attempt.expires_at < Date.now()) return seeOther('/?spotify=expired');
    await db.prepare('DELETE FROM spotify_auth_attempts WHERE state_hash = ?').bind(stateHash).run();
    const config = await spotifyConfig();
    if (!config) return seeOther('/?spotify=setup');
    redirectUriFor(request, config.redirectUri);
    const token = await tokenExchange(code, attempt.verifier, config);
    await db.prepare(`INSERT INTO spotify_connections (owner_id, role, spotify_account_id, display_name, access_token, refresh_token, expires_at, connected_at)
      VALUES (?, 'user', ?, NULL, ?, ?, ?, ?)
      ON CONFLICT(owner_id, role) DO UPDATE SET access_token = excluded.access_token, refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at, connected_at = excluded.connected_at`)
      .bind(user.userId, user.userId, await encrypt(token.access_token, config.tokenKey), await encrypt(token.refresh_token!, config.tokenKey), Date.now() + token.expires_in * 1000, Date.now()).run();
    try {
      await syncRecentProfile(user.userId);
      return seeOther('/?spotify=connected');
    } catch (error) {
      console.error('Spotify first sync failed', error);
      return seeOther('/?spotify=sync-error');
    }
  } catch (error) {
    console.error('Spotify callback failed', error);
    return seeOther('/?spotify=error');
  }
}
