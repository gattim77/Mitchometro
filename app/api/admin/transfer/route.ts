import { getChatGPTUser } from '@/app/chatgpt-auth';
import { adminAuthorized, adminTransferStatus, beginAdminTransfer, completeAdminTransfer, requestAdminTransfer, sessionCookie } from '@/lib/server/admin-auth';
import { actor, safeOrigin } from '@/lib/server/storage';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ valid: false }, { status: 401, headers });
  const token = new URL(request.url).searchParams.get('token');
  return Response.json(await adminTransferStatus(token, user.email), { headers });
}

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403, headers });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || typeof payload.action !== 'string') return Response.json({ error: 'Richiesta non valida.' }, { status: 400, headers });
  try {
    if (payload.action === 'invite') {
      if (!await adminAuthorized()) return new Response(null, { status: 404, headers });
      const owner = await actor();
      if (!owner) return new Response(null, { status: 404, headers });
      const result = await requestAdminTransfer(owner.id, owner.email, payload.email, new URL(request.url).origin);
      if ('error' in result) return Response.json({ error: result.error }, { status: result.status, headers });
      return Response.json(result, { headers });
    }
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: 'Accedi con l’indirizzo che ha ricevuto l’invito.' }, { status: 401, headers });
    if (payload.action === 'begin') {
      const result = await beginAdminTransfer(payload.token, user.userId, user.email, payload.password);
      return Response.json(result, { status: 'error' in result ? 400 : 200, headers });
    }
    if (payload.action === 'complete') {
      const token = await completeAdminTransfer(payload.token, user.userId, user.email, payload.code);
      if (!token) return Response.json({ error: 'Codice non valido o invito scaduto. Riprova.' }, { status: 401, headers });
      return Response.json({ authenticated: true }, { headers: { ...headers, 'Set-Cookie': sessionCookie(token) } });
    }
    return Response.json({ error: 'Azione non valida.' }, { status: 400, headers });
  } catch (error) {
    console.error('Admin transfer failed', error);
    return Response.json({ error: 'Invio non riuscito. Controlla la configurazione email e riprova.' }, { status: 503, headers });
  }
}
