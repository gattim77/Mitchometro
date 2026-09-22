import { getChatGPTUser } from '@/app/chatgpt-auth';
import { validateHistoryProfile } from '@/lib/history-profile';
import { database } from '@/lib/server/spotify';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Accesso richiesto.' }, { status: 401, headers });
  try {
    const row = await database().prepare("SELECT summary FROM listening_profiles WHERE role = 'master' ORDER BY uploaded_at DESC LIMIT 1")
      .first<{ summary: string }>();
    const tracks = row && validateHistoryProfile(JSON.parse(row.summary))?.rotationTracks;
    if (!tracks?.length) return Response.json({ track: null }, { headers });
    const previous = new URL(request.url).searchParams.get('exclude');
    const choices = tracks.length > 1 && previous ? tracks.filter(track => `${track.artist}\u0000${track.title}` !== previous) : tracks;
    const random = crypto.getRandomValues(new Uint32Array(1))[0];
    const track = choices[random % choices.length];
    return Response.json({ track: { artist: track.artist, title: track.title } }, { headers });
  } catch (error) {
    console.error('Rotation unavailable', error);
    return Response.json({ error: 'Rotazione non disponibile.' }, { status: 503, headers });
  }
}
