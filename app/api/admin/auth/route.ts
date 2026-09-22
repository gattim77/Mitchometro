import { actor, safeOrigin } from '@/lib/server/storage';
import { adminAuthorized, adminConfigured, beginAdminSetup, clearSessionCookie, confirmAdminSetup, endAdminSession, loginAdmin, sessionCookie } from '@/lib/server/admin-auth';

const noStore = { 'Cache-Control': 'no-store' };
export async function GET() {
  if (!(await actor())?.isMasterOwner) return new Response(null, { status: 404, headers: noStore });
  try { return Response.json({ configured: await adminConfigured(), authenticated: await adminAuthorized() }, { headers: noStore }); }
  catch (error) { console.error('Admin auth status failed', error); return Response.json({ error: 'Accesso admin non disponibile.' }, { status: 503, headers: noStore }); }
}
export async function POST(request: Request) {
  const owner = await actor();
  if (!owner?.isMasterOwner) return new Response(null, { status: 404, headers: noStore });
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403, headers: noStore });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || typeof payload.action !== 'string') return Response.json({ error: 'Richiesta non valida.' }, { status: 400, headers: noStore });
  try {
    if (payload.action === 'setup') {
      const result = await beginAdminSetup(owner.id, payload.username, payload.password);
      return Response.json(result, { status: 'error' in result ? 400 : 200, headers: noStore });
    }
    if (payload.action === 'confirm') {
      const token = await confirmAdminSetup(owner.id, payload.username, payload.code);
      if (!token) return Response.json({ error: 'Codice non valido o configurazione scaduta. Riprova.' }, { status: 401, headers: noStore });
      return Response.json({ authenticated: true }, { headers: { ...noStore, 'Set-Cookie': sessionCookie(token) } });
    }
    if (payload.action === 'login') {
      const result = await loginAdmin(owner.id, payload.username, payload.password, payload.code);
      if ('error' in result) return Response.json({ error: result.error }, { status: result.status, headers: noStore });
      return Response.json({ authenticated: true }, { headers: { ...noStore, 'Set-Cookie': sessionCookie(result.token) } });
    }
    if (payload.action === 'logout') {
      await endAdminSession();
      return Response.json({ authenticated: false }, { headers: { ...noStore, 'Set-Cookie': clearSessionCookie() } });
    }
    return Response.json({ error: 'Azione non valida.' }, { status: 400, headers: noStore });
  } catch (error) { console.error('Admin auth operation failed', error); return Response.json({ error: 'Accesso admin non disponibile.' }, { status: 503, headers: noStore }); }
}
