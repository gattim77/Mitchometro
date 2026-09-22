import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

const encoder = new TextEncoder();

export async function actor() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const identity = await database().prepare('SELECT owner_id, email FROM admin_identity WHERE id = 1').first<{ owner_id: string; email: string }>();
  const email = user.email.toLowerCase();
  const isMasterOwner = identity
    ? identity.owner_id === user.userId && identity.email === email
    : !!env.MASTER_USER_EMAIL && email === env.MASTER_USER_EMAIL.toLowerCase();
  return { id: user.userId, email, isMasterOwner };
}

export function database() {
  if (!env.DB) throw new Error('Storage is unavailable');
  return env.DB;
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
  if (keyBytes.length !== 32) throw new Error('Invalid admin encryption key');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(value)));
  return `${encodeBase64Url(iv)}.${encodeBase64Url(encrypted)}`;
}

export async function decrypt(value: string, keyString: string) {
  const keyBytes = decodeBase64Url(keyString);
  if (keyBytes.length !== 32) throw new Error('Invalid admin encryption key');
  const [nonce, payload] = value.split('.');
  if (!nonce || !payload) throw new Error('Invalid encrypted admin value');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64Url(nonce) }, key, decodeBase64Url(payload));
  return new TextDecoder().decode(plaintext);
}
