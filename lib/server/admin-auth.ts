import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { actor, database, decrypt, digest, encrypt, randomUrlSafe } from './storage';
import { adminPasswordHash } from './admin-password';

export const ADMIN_COOKIE = '__Host-mitch-admin';
const SESSION_MS = 12 * 60 * 60 * 1000;
const SETUP_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const TRANSFER_MS = 24 * 60 * 60 * 1000;

type Credential = { password_salt: string; password_hash: string; totp_secret: string; last_totp_step: number };
type Pending = Credential & { owner_id: string; expires_at: number; attempts: number };
type Transfer = { token_hash: string; email: string; requested_by: string; password_salt: string | null; password_hash: string | null; totp_secret: string | null; expires_at: number; attempts: number };

function base32(bytes: Uint8Array) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { output += alphabet[(value >>> (bits -= 5)) & 31]; }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
function base32Bytes(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, number = 0;
  const output: number[] = [];
  for (const char of value.replace(/\s+/g, '').toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid TOTP secret');
    number = (number << 5) | index; bits += 5;
    if (bits >= 8) { output.push((number >>> (bits -= 8)) & 255); }
  }
  return new Uint8Array(output);
}
function equalStrings(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
async function totpAt(secret: string, step: number) {
  const key = await crypto.subtle.importKey('raw', base32Bytes(secret) as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const counter = new Uint8Array(8);
  new DataView(counter.buffer).setUint32(4, step, false);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
  const offset = signature[signature.length - 1] & 15;
  const binary = ((signature[offset] & 127) << 24) | (signature[offset + 1] << 16) | (signature[offset + 2] << 8) | signature[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}
async function matchedTotpStep(secret: string, code: string, lastUsed = -1) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(Date.now() / 30_000);
  for (const step of [current, current - 1, current + 1]) {
    if (step > lastUsed && equalStrings(await totpAt(secret, step), code)) return step;
  }
  return null;
}
function encryptionKey() {
  if (!env.SPOTIFY_TOKEN_KEY) throw new Error('Admin encryption key is unavailable');
  return env.SPOTIFY_TOKEN_KEY;
}
export async function adminConfigured() {
  return !!(await database().prepare('SELECT id FROM admin_credentials WHERE id = 1').first());
}
export async function adminAuthorized() {
  const owner = await actor();
  if (!owner?.isMasterOwner) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{32,100}$/.test(token)) return false;
  const session = await database().prepare('SELECT owner_id, expires_at FROM admin_sessions WHERE token_hash = ?').bind(await digest(token)).first<{ owner_id: string; expires_at: number }>();
  return !!session && session.owner_id === owner.id && session.expires_at > Date.now();
}
async function ensureAdminIdentity(ownerId: string, email: string) {
  await database().prepare(`INSERT INTO admin_identity (id, owner_id, email, updated_at) VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING`).bind(ownerId, email.toLowerCase(), Date.now()).run();
}
export async function beginAdminSetup(ownerId: string, username: unknown, password: unknown) {
  if (username !== 'admin' || typeof password !== 'string' || password.length < 12 || password.length > 128) return { error: 'Usa admin e una password di almeno 12 caratteri.' };
  if (await adminConfigured()) return { error: 'L’accesso admin è già configurato.' };
  const secret = base32(crypto.getRandomValues(new Uint8Array(20)));
  const salt = randomUrlSafe(16);
  await database().prepare(`INSERT INTO admin_pending_setup (id, owner_id, password_salt, password_hash, totp_secret, expires_at, attempts) VALUES (1, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET owner_id = excluded.owner_id, password_salt = excluded.password_salt, password_hash = excluded.password_hash, totp_secret = excluded.totp_secret, expires_at = excluded.expires_at, attempts = 0`)
    .bind(ownerId, salt, await adminPasswordHash(password, salt), await encrypt(secret, encryptionKey()), Date.now() + SETUP_MS).run();
  return { secret, uri: `otpauth://totp/Mitchometro%20Admin:admin?secret=${secret}&issuer=Mitchometro%20Admin&algorithm=SHA1&digits=6&period=30` };
}
export async function confirmAdminSetup(ownerId: string, username: unknown, code: unknown) {
  if (username !== 'admin' || typeof code !== 'string' || await adminConfigured()) return null;
  const pending = await database().prepare('SELECT owner_id, password_salt, password_hash, totp_secret, expires_at, attempts FROM admin_pending_setup WHERE id = 1').first<Pending>();
  if (!pending || pending.owner_id !== ownerId || pending.expires_at < Date.now() || pending.attempts >= 5) return null;
  const step = await matchedTotpStep(await decrypt(pending.totp_secret, encryptionKey()), code);
  if (step === null) {
    await database().prepare('UPDATE admin_pending_setup SET attempts = attempts + 1 WHERE id = 1').run();
    return null;
  }
  const result = await database().prepare('INSERT OR IGNORE INTO admin_credentials (id, password_salt, password_hash, totp_secret, last_totp_step, created_at) VALUES (1, ?, ?, ?, ?, ?)')
    .bind(pending.password_salt, pending.password_hash, pending.totp_secret, step, Date.now()).run();
  if (!result.meta.changes) return null;
  await database().prepare('DELETE FROM admin_pending_setup WHERE id = 1').run();
  const owner = await actor();
  if (owner?.id === ownerId) await ensureAdminIdentity(ownerId, owner.email);
  return createAdminSession(ownerId);
}
export async function loginAdmin(ownerId: string, username: unknown, password: unknown, code: unknown) {
  const limit = await database().prepare('SELECT failed_count, locked_until FROM admin_login_limits WHERE owner_id = ?').bind(ownerId).first<{ failed_count: number; locked_until: number }>();
  if (limit && limit.locked_until > Date.now()) return { error: 'Troppi tentativi. Riprova tra 15 minuti.', status: 429 };
  const credentials = await database().prepare('SELECT password_salt, password_hash, totp_secret, last_totp_step FROM admin_credentials WHERE id = 1').first<Credential>();
  if (!credentials) return { error: 'Configura prima l’accesso admin.', status: 409 };
  const validPassword = typeof password === 'string' && password.length <= 128 && equalStrings(await adminPasswordHash(password, credentials.password_salt), credentials.password_hash);
  let step: number | null = null;
  if (validPassword && username === 'admin' && typeof code === 'string') step = await matchedTotpStep(await decrypt(credentials.totp_secret, encryptionKey()), code, credentials.last_totp_step);
  if (!validPassword || username !== 'admin' || step === null) {
    const failures = (limit?.failed_count ?? 0) + 1;
    await database().prepare(`INSERT INTO admin_login_limits (owner_id, failed_count, locked_until) VALUES (?, ?, ?)
      ON CONFLICT(owner_id) DO UPDATE SET failed_count = excluded.failed_count, locked_until = excluded.locked_until`)
      .bind(ownerId, failures >= 5 ? 0 : failures, failures >= 5 ? Date.now() + LOCK_MS : 0).run();
    return { error: 'Credenziali o codice non validi.', status: 401 };
  }
  const updated = await database().prepare('UPDATE admin_credentials SET last_totp_step = ? WHERE id = 1 AND last_totp_step < ?').bind(step, step).run();
  if (!updated.meta.changes) return { error: 'Codice già usato. Attendi il prossimo.', status: 401 };
  await database().prepare('DELETE FROM admin_login_limits WHERE owner_id = ?').bind(ownerId).run();
  const owner = await actor();
  if (owner?.id === ownerId) await ensureAdminIdentity(ownerId, owner.email);
  return { token: await createAdminSession(ownerId) };
}

function validEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function validTransferToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{40,100}$/.test(value);
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
async function sendTransferEmail(email: string, link: string) {
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL_FROM) throw new Error('ADMIN_EMAIL_NOT_CONFIGURED');
  const safeLink = escapeHtml(link);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.ADMIN_EMAIL_FROM,
      to: [email],
      subject: 'Sei stato nominato nuovo Re di Mitchometro',
      text: `Sei stato scelto come nuovo amministratore di Mitchometro. Completa il passaggio entro 24 ore: ${link}\n\nDovrai accedere con questo indirizzo email, scegliere una nuova password e configurare una nuova autenticazione a due fattori. Se non ti aspettavi questo invito, ignoralo.`,
      html: `<h1>Il trono ti aspetta.</h1><p>Sei stato scelto come nuovo amministratore di Mitchometro.</p><p><a href="${safeLink}">Accetta la nomina</a> entro 24 ore.</p><p>Dovrai accedere con questo indirizzo email, scegliere una nuova password e configurare una nuova autenticazione a due fattori. Se non ti aspettavi questo invito, ignora questa email.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`ADMIN_EMAIL_FAILED:${response.status}`);
}
export async function requestAdminTransfer(ownerId: string, currentEmail: string, emailValue: unknown, origin: string) {
  if (!validEmail(emailValue)) return { error: 'Inserisci un indirizzo email valido.', status: 400 };
  const email = emailValue.trim().toLowerCase();
  if (email === currentEmail.toLowerCase()) return { error: 'Il nuovo Re deve usare un indirizzo diverso da quello attuale.', status: 400 };
  const token = randomUrlSafe(32);
  const tokenHash = await digest(token);
  await database().prepare(`INSERT INTO admin_transfers (id, token_hash, email, requested_by, password_salt, password_hash, totp_secret, expires_at, attempts)
    VALUES (1, ?, ?, ?, NULL, NULL, NULL, ?, 0) ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, email = excluded.email,
    requested_by = excluded.requested_by, password_salt = NULL, password_hash = NULL, totp_secret = NULL, expires_at = excluded.expires_at, attempts = 0`)
    .bind(tokenHash, email, ownerId, Date.now() + TRANSFER_MS).run();
  try { await sendTransferEmail(email, `${origin}/admin/transfer?token=${encodeURIComponent(token)}`); }
  catch (error) {
    await database().prepare('DELETE FROM admin_transfers WHERE token_hash = ?').bind(tokenHash).run();
    throw error;
  }
  return { ok: true as const, email };
}
async function activeTransfer(token: unknown, email: string) {
  if (!validTransferToken(token)) return null;
  const transfer = await database().prepare('SELECT token_hash, email, requested_by, password_salt, password_hash, totp_secret, expires_at, attempts FROM admin_transfers WHERE id = 1 AND token_hash = ?')
    .bind(await digest(token)).first<Transfer>();
  return transfer && transfer.email === email.toLowerCase() && transfer.expires_at > Date.now() && transfer.attempts < 5 ? transfer : null;
}
export async function adminTransferStatus(token: unknown, email: string) {
  const transfer = await activeTransfer(token, email);
  return { valid: !!transfer, email: transfer?.email ?? null, enrollmentStarted: !!transfer?.totp_secret };
}
export async function beginAdminTransfer(token: unknown, ownerId: string, email: string, password: unknown) {
  const transfer = await activeTransfer(token, email);
  if (!transfer) return { error: 'Invito non valido, scaduto o destinato a un altro account.' };
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) return { error: 'Scegli una password di almeno 12 caratteri.' };
  const secret = base32(crypto.getRandomValues(new Uint8Array(20)));
  const salt = randomUrlSafe(16);
  await database().prepare('UPDATE admin_transfers SET password_salt = ?, password_hash = ?, totp_secret = ?, attempts = 0 WHERE token_hash = ?')
    .bind(salt, await adminPasswordHash(password, salt), await encrypt(secret, encryptionKey()), transfer.token_hash).run();
  return { secret, uri: `otpauth://totp/Mitchometro%20Admin:admin?secret=${secret}&issuer=Mitchometro%20Admin&algorithm=SHA1&digits=6&period=30`, ownerId };
}
export async function completeAdminTransfer(token: unknown, ownerId: string, email: string, code: unknown) {
  const transfer = await activeTransfer(token, email);
  if (!transfer?.password_salt || !transfer.password_hash || !transfer.totp_secret || typeof code !== 'string') return null;
  const step = await matchedTotpStep(await decrypt(transfer.totp_secret, encryptionKey()), code);
  if (step === null) {
    await database().prepare('UPDATE admin_transfers SET attempts = attempts + 1 WHERE token_hash = ?').bind(transfer.token_hash).run();
    return null;
  }
  const sessionToken = randomUrlSafe(32);
  const now = Date.now();
  const db = database();
  await db.batch([
    db.prepare('UPDATE admin_credentials SET password_salt = ?, password_hash = ?, totp_secret = ?, last_totp_step = ?, created_at = ? WHERE id = 1').bind(transfer.password_salt, transfer.password_hash, transfer.totp_secret, step, now),
    db.prepare(`INSERT INTO admin_identity (id, owner_id, email, updated_at) VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET owner_id = excluded.owner_id, email = excluded.email, updated_at = excluded.updated_at`).bind(ownerId, email.toLowerCase(), now),
    db.prepare("DELETE FROM listening_profiles WHERE owner_id = ? AND role = 'master'").bind(ownerId),
    db.prepare("UPDATE listening_profiles SET owner_id = ? WHERE role = 'master'").bind(ownerId),
    db.prepare('DELETE FROM admin_sessions'),
    db.prepare('DELETE FROM admin_login_limits'),
    db.prepare('DELETE FROM admin_transfers'),
    db.prepare('INSERT INTO admin_sessions (token_hash, owner_id, expires_at) VALUES (?, ?, ?)').bind(await digest(sessionToken), ownerId, now + SESSION_MS),
  ]);
  return sessionToken;
}
async function createAdminSession(ownerId: string) {
  const token = randomUrlSafe(32);
  await database().prepare('DELETE FROM admin_sessions WHERE expires_at < ?').bind(Date.now()).run();
  await database().prepare('INSERT INTO admin_sessions (token_hash, owner_id, expires_at) VALUES (?, ?, ?)').bind(await digest(token), ownerId, Date.now() + SESSION_MS).run();
  return token;
}
export function sessionCookie(token: string) {
  return `${ADMIN_COOKIE}=${token}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Lax`;
}
export function clearSessionCookie() {
  return `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
export async function endAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (token) await database().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await digest(token)).run();
}
