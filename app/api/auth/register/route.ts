import { createSession, normalizeDisplayName, normalizeEmail, passwordHash, safeReturnTo, sessionCookie } from '@/lib/server/auth';
import { database, safeOrigin } from '@/lib/server/storage';

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email) return Response.json({ error: 'Inserisci un indirizzo email valido.' }, { status: 400 });
  if (password.length < 10 || password.length > 200) return Response.json({ error: 'La password deve contenere almeno 10 caratteri.' }, { status: 400 });
  const existing = await database().prepare('SELECT id FROM app_users WHERE email = ?').bind(email).first();
  if (existing) return Response.json({ error: 'Esiste già un account con questa email. Prova ad accedere.' }, { status: 409 });
  const { salt, hash } = await passwordHash(password);
  const userId = crypto.randomUUID();
  const now = Date.now();
  await database().prepare(`INSERT INTO app_users (id, email, display_name, password_salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(userId, email, normalizeDisplayName(body?.name, email), salt, hash, now, now).run();
  const token = await createSession(userId);
  return Response.json({ ok: true, returnTo: safeReturnTo(body?.returnTo) }, { headers: { 'Set-Cookie': sessionCookie(token), 'Cache-Control': 'no-store' } });
}
