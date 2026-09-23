import { getEvaluationSettings } from '@/lib/server/evaluation-settings';
import { analyze, analyzeHistory } from '@/lib/server/analysis';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server/storage';
import { periods, validateHistoryProfile, type Period } from '@/lib/history-profile';
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const period = new URL(request.url).searchParams.get('period') ?? 'month';
  if (!periods.includes(period as Period)) return Response.json({ error: 'Periodo non valido.' }, { status: 400 });
  try {
    const settings = await getEvaluationSettings();
    const db = database();
    const [own, master] = await Promise.all([
      db.prepare("SELECT summary FROM listening_profiles WHERE owner_id = ? AND role = 'user'").bind(user.userId).first<{ summary: string }>(),
      db.prepare("SELECT summary FROM listening_profiles WHERE role = 'master' ORDER BY uploaded_at DESC LIMIT 1").first<{ summary: string }>(),
    ]);
    const parsedOwn = own && validateHistoryProfile(JSON.parse(own.summary));
    const ownProfile = parsedOwn?.source === 'recent' ? null : parsedOwn;
    const masterProfile = master && validateHistoryProfile(JSON.parse(master.summary));
    const requestedPeriod = period as Period;
    const requestedIndex = periods.indexOf(requestedPeriod);
    const availablePeriods = ownProfile && masterProfile
      ? periods.filter(candidate => (candidate !== 'forever' || (ownProfile.lifetimeReady && masterProfile.lifetimeReady)) && ownProfile.windows[candidate].plays > 0 && masterProfile.windows[candidate].plays > 0)
      : [];
    const effectivePeriod = availablePeriods.includes(requestedPeriod)
      ? requestedPeriod
      : availablePeriods.find(candidate => periods.indexOf(candidate) > requestedIndex)
        ?? [...availablePeriods].reverse().find(candidate => periods.indexOf(candidate) < requestedIndex);
    const result = effectivePeriod && ownProfile && masterProfile && analyzeHistory(effectivePeriod, ownProfile, masterProfile, settings);
    const periodFallbackReason = requestedPeriod === 'forever' && effectivePeriod !== 'forever' && ownProfile && masterProfile && (!ownProfile.lifetimeReady || !masterProfile.lifetimeReady)
      ? 'reload-history'
      : undefined;
    return Response.json(result ? { ...result, ...(effectivePeriod !== requestedPeriod ? { periodFallbackFrom: requestedPeriod, ...(periodFallbackReason ? { periodFallbackReason } : {}) } : {}) } : analyze(requestedPeriod, settings), { headers: { 'Cache-Control': 'no-store' } });
  }
  catch (error) { console.error('Analysis settings unavailable', error); return Response.json({ error: 'Analisi non disponibile.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
