import { getEvaluationSettings } from '@/lib/server/evaluation-settings';
import { analyze } from '@/lib/server/analysis';
export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get('period') ?? 'month';
  if (!['month', 'semester', 'year'].includes(period)) return Response.json({ error: 'Periodo non valido.' }, { status: 400 });
  try { return Response.json(analyze(period as 'month' | 'semester' | 'year', await getEvaluationSettings()), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { console.error('Analysis settings unavailable', error); return Response.json({ error: 'Analisi non disponibile.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
