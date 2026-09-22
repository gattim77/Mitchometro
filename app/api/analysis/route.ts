import { getEvaluationSettings } from '@/lib/server/evaluation-settings';
import { analyze, analyzeHistory } from '@/lib/server/analysis';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server/spotify';
import { validateHistoryProfile, type Period } from '@/lib/history-profile';
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const period = new URL(request.url).searchParams.get('period') ?? 'month';
  if (!['month', 'semester', 'year'].includes(period)) return Response.json({ error: 'Periodo non valido.' }, { status: 400 });
  try {
    const settings = await getEvaluationSettings();
    const db = database();
    const [own, master] = await Promise.all([
      db.prepare("SELECT summary FROM listening_profiles WHERE owner_id = ? AND role = 'user'").bind(user.userId).first<{ summary: string }>(),
      db.prepare("SELECT summary FROM listening_profiles WHERE role = 'master' ORDER BY uploaded_at DESC LIMIT 1").first<{ summary: string }>(),
    ]);
    const ownProfile = own && validateHistoryProfile(JSON.parse(own.summary));
    const masterProfile = master && validateHistoryProfile(JSON.parse(master.summary));
    const result = ownProfile && masterProfile && analyzeHistory(period as Period, ownProfile, masterProfile, settings);
    return Response.json(result || analyze(period as Period, settings), { headers: { 'Cache-Control': 'no-store' } });
  }
  catch (error) { console.error('Analysis settings unavailable', error); return Response.json({ error: 'Analisi non disponibile.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
