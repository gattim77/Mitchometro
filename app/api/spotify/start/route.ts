import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, digest, randomUrlSafe, redirectUriFor, seeOther, spotifyConfig } from '@/lib/server/spotify';

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return seeOther('/signin-with-chatgpt?return_to=%2F');
  try {
    const config = await spotifyConfig();
    if (!config) return seeOther('/?spotify=setup');
    const redirectUri = redirectUriFor(request, config.redirectUri);
    const state = randomUrlSafe(32);
    const verifier = randomUrlSafe(64);
    await database().prepare("DELETE FROM spotify_auth_attempts WHERE expires_at < ?").bind(Date.now()).run();
    await database().prepare('INSERT INTO spotify_auth_attempts (state_hash, owner_id, role, verifier, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(await digest(state), user.userId, 'user', verifier, Date.now() + 10 * 60_000).run();
    const url = new URL('https://accounts.spotify.com/authorize');
    url.search = new URLSearchParams({ response_type: 'code', client_id: config.id, redirect_uri: redirectUri, scope: 'user-read-recently-played', state, code_challenge_method: 'S256', code_challenge: await digest(verifier) }).toString();
    return seeOther(url.toString());
  } catch (error) {
    console.error('Spotify authorization start failed', error);
    return seeOther('/?spotify=error');
  }
}
