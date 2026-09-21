import { analyze } from '@/lib/server/analysis';
export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get('period') ?? 'month';
  if (!['month', 'semester', 'year'].includes(period)) return Response.json({ error: 'Periodo non valido.' }, { status: 400 });
  return Response.json(analyze(period as 'month' | 'semester' | 'year'), { headers: { 'Cache-Control': 'no-store' } });
}
