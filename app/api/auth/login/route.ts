import { createSession, normalizeEmail, safeReturnTo, sessionCookie, verifyPassword } from '@/lib/server/auth';
import { database, safeOrigin } from '@/lib/server/storage';

const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) return Response.json({ error: 'Email o password non corretti.' }, { status: 401 });
  const db = database();
  const limit = await db.prepare('SELECT failed_count, locked_until FROM app_login_limits WHERE email = ?').bind(email).first<{ failed_count: number; locked_until: number }>();
  if (limit && limit.locked_until > Date.now()) return Response.json({ error: 'Troppi tentativi. Riprova tra qualche minuto.' }, { status: 429 });
  const row = await db.prepare('SELECT u.id, u.password_salt, u.password_hash FROM app_users u LEFT JOIN third_admin_controls c ON c.user_id=u.id WHERE u.email = ? AND COALESCE(c.status,\'active\')=\'active\'').bind(email)
    .first<{ id: string; password_salt: string | null; password_hash: string | null }>();
  const valid = !!row?.password_salt && !!row.password_hash && await verifyPassword(password, row.password_salt, row.password_hash);
  if (!valid) {
    const failures = (limit?.failed_count ?? 0) + 1;
    await db.prepare(`INSERT INTO app_login_limits (email, failed_count, locked_until) VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET failed_count = excluded.failed_count, locked_until = excluded.locked_until`)
      .bind(email, failures >= MAX_FAILURES ? 0 : failures, failures >= MAX_FAILURES ? Date.now() + LOCK_MS : 0).run();
    return Response.json({ error: 'Email o password non corretti.' }, { status: 401 });
  }
  await db.prepare('DELETE FROM app_login_limits WHERE email = ?').bind(email).run();
  const token = await createSession(row.id);
  return Response.json({ ok: true, returnTo: safeReturnTo(body?.returnTo) }, { headers: { 'Set-Cookie': sessionCookie(token), 'Cache-Control': 'no-store' } });
}
