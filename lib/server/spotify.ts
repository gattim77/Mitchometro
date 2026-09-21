import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type Role = 'user' | 'master';
type SpotifyToken = { access_token: string; refresh_token?: string; expires_in: number; token_type: string };
type SpotifyMe = { id: string; display_name?: string | null };
const encoder = new TextEncoder();

export async function spotifyConfig() {
  const redirectUri = env.SPOTIFY_REDIRECT_URI;
  const tokenKey = env.SPOTIFY_TOKEN_KEY;
  const ownerEmail = env.MASTER_USER_EMAIL;
  if (!redirectUri || !tokenKey || !ownerEmail) return null;
  const row = await database().prepare('SELECT client_id, client_secret FROM spotify_app_settings WHERE id = 1').first<{ client_id: string; client_secret: string }>();
  if (!row) return null;
  return { id: row.client_id, secret: await decrypt(row.client_secret, tokenKey), redirectUri, tokenKey, ownerEmail };
}

export async function actor() {
  const user = await getChatGPTUser();
  if (!user) return null;
  return { id: user.userId, isMasterOwner: !!env.MASTER_USER_EMAIL && user.email.toLowerCase() === env.MASTER_USER_EMAIL.toLowerCase() };
}

export function roleFrom(value: string | null): Role | null {
  return value === 'user' || value === 'master' ? value : null;
}

export function database() {
  if (!env.DB) throw new Error('Spotify storage is unavailable');
  return env.DB;
}

export function redirectUriFor(request: Request, configured: string) {
  const url = new URL(request.url);
  const redirect = new URL(configured);
  if (redirect.protocol !== 'https:' || redirect.origin !== url.origin || redirect.pathname !== '/api/spotify/callback' || redirect.search || redirect.hash) throw new Error('Spotify redirect configuration is invalid');
  return configured;
}

export function safeOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin === new URL(request.url).origin;
}

export function randomUrlSafe(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return encodeBase64Url(data);
}

export async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return encodeBase64Url(new Uint8Array(bytes));
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export async function encrypt(value: string, keyString: string) {
  const keyBytes = decodeBase64Url(keyString);
  if (keyBytes.length !== 32) throw new Error('Invalid Spotify token key');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(value)));
  return `${encodeBase64Url(iv)}.${encodeBase64Url(encrypted)}`;
}

export async function decrypt(value: string, keyString: string) {
  const keyBytes = decodeBase64Url(keyString);
  if (keyBytes.length !== 32) throw new Error('Invalid Spotify token key');
  const [nonce, payload] = value.split('.');
  if (!nonce || !payload) throw new Error('Invalid encrypted Spotify token');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64Url(nonce) }, key, decodeBase64Url(payload));
  return new TextDecoder().decode(plaintext);
}

export async function tokenExchange(code: string, verifier: string, config: NonNullable<Awaited<ReturnType<typeof spotifyConfig>>>) {
  const params = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, code_verifier: verifier });
  const basic = btoa(`${config.id}:${config.secret}`);
  const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
  if (!response.ok) throw new Error(`Spotify token request failed: ${response.status}`);
  const token = await response.json() as SpotifyToken;
  if (!token.access_token || !token.refresh_token || !Number.isFinite(token.expires_in)) throw new Error('Spotify returned an incomplete token');
  return token;
}

export async function spotifyMe(accessToken: string): Promise<SpotifyMe> {
  const response = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Spotify profile request failed: ${response.status}`);
  const profile = await response.json() as SpotifyMe;
  if (!profile.id) throw new Error('Spotify did not return an account ID');
  return profile;
}

export async function validAccessToken(ownerId: string, role: Role): Promise<string | null> {
  const config = await spotifyConfig();
  if (!config) return null;
  const db = database();
  const row = await db.prepare('SELECT access_token, refresh_token, expires_at FROM spotify_connections WHERE owner_id = ? AND role = ?').bind(ownerId, role).first<{ access_token: string; refresh_token: string; expires_at: number }>();
  if (!row) return null;
  if (row.expires_at > Date.now() + 60_000) return decrypt(row.access_token, config.tokenKey);
  const oldRefresh = await decrypt(row.refresh_token, config.tokenKey);
  const basic = btoa(`${config.id}:${config.secret}`);
  const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: oldRefresh }) });
  if (response.status === 400 || response.status === 401) {
    await db.prepare('DELETE FROM spotify_connections WHERE owner_id = ? AND role = ?').bind(ownerId, role).run();
    return null;
  }
  if (!response.ok) throw new Error(`Spotify refresh failed: ${response.status}`);
  const token = await response.json() as SpotifyToken;
  if (!token.access_token || !Number.isFinite(token.expires_in)) throw new Error('Spotify returned an incomplete refresh token');
  await db.prepare('UPDATE spotify_connections SET access_token = ?, refresh_token = ?, expires_at = ? WHERE owner_id = ? AND role = ?')
    .bind(await encrypt(token.access_token, config.tokenKey), await encrypt(token.refresh_token || oldRefresh, config.tokenKey), Date.now() + token.expires_in * 1000, ownerId, role).run();
  return token.access_token;
}

export function seeOther(url: string) { return new Response(null, { status: 303, headers: { Location: url, 'Cache-Control': 'no-store' } }); }
