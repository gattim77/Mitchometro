import { adminAuthorized } from '@/lib/server/admin-auth';
import { safeOrigin } from '@/lib/server/spotify';
import { getEvaluationSettings, saveEvaluationSettings, validateSettings } from '@/lib/server/evaluation-settings';

const privateHeaders = { 'Cache-Control': 'no-store' };
export async function GET() {
  if (!(await adminAuthorized())) return new Response(null, { status: 404, headers: privateHeaders });
  try { return Response.json(await getEvaluationSettings(), { headers: privateHeaders }); }
  catch (error) { console.error('Admin settings unavailable', error); return Response.json({ error: 'Impostazioni non disponibili.' }, { status: 503, headers: privateHeaders }); }
}
export async function PUT(request: Request) {
  if (!(await adminAuthorized())) return new Response(null, { status: 404, headers: privateHeaders });
  if (!safeOrigin(request)) return Response.json({ error: 'Richiesta non valida.' }, { status: 403, headers: privateHeaders });
  const settings = validateSettings(await request.json().catch(() => null));
  if (!settings) return Response.json({ error: 'Controlla band, valori e messaggi.' }, { status: 400, headers: privateHeaders });
  try { await saveEvaluationSettings(settings); return Response.json(settings, { headers: privateHeaders }); }
  catch (error) { console.error('Admin settings save failed', error); return Response.json({ error: 'Salvataggio non riuscito.' }, { status: 503, headers: privateHeaders }); }
}
