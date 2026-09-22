import { database, validAccessToken } from './spotify';
import { periods, type ArtistCount, type HistoryProfile, type HistoryWindow, type Period } from '@/lib/history-profile';

type RecentItem = {
  played_at?: string;
  track?: { id?: string; name?: string; type?: string; artists?: { name?: string }[] };
};
type RecentPage = { items?: RecentItem[]; cursors?: { before?: string }; next?: string | null };

const day = 86_400_000;
const durations: Record<Period, number> = { month: 28 * day, semester: 183 * day, year: 365 * day };

export function profileFromRecentItems(items: RecentItem[]): HistoryProfile {
  const now = Date.now();
  const buckets = Object.fromEntries(periods.map(period => [period, { plays: 0, artists: new Map<string, ArtistCount>(), tracks: new Set<string>() }])) as Record<Period, { plays: number; artists: Map<string, ArtistCount>; tracks: Set<string> }>;
  const seen = new Set<string>();
  for (const item of items) {
    const artist = item.track?.artists?.[0]?.name?.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 100);
    const title = item.track?.name?.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 150);
    const playedAt = Date.parse(item.played_at ?? '');
    if (item.track?.type !== 'track' || !artist || !title || !Number.isFinite(playedAt) || playedAt > now + day || playedAt < now - durations.year) continue;
    const artistKey = artist.toLocaleLowerCase('it');
    const trackKey = `${artistKey}\u0000${title.toLocaleLowerCase('it')}`;
    const eventKey = `${item.played_at}\u0000${item.track?.id ?? trackKey}`;
    if (seen.has(eventKey)) continue;
    seen.add(eventKey);
    for (const period of periods) {
      if (playedAt < now - durations[period]) continue;
      const bucket = buckets[period];
      bucket.plays++;
      bucket.tracks.add(trackKey);
      const current = bucket.artists.get(artistKey);
      if (current) current.count++;
      else bucket.artists.set(artistKey, { name: artist, count: 1 });
    }
  }
  return { version: 1, source: 'recent', windows: Object.fromEntries(periods.map(period => {
    const bucket = buckets[period];
    return [period, { plays: bucket.plays, uniqueArtists: bucket.artists.size, uniqueTracks: bucket.tracks.size, artists: [...bucket.artists.values()].sort((a, b) => b.count - a.count) }];
  })) as Record<Period, HistoryWindow> };
}

export async function syncRecentProfile(ownerId: string): Promise<HistoryProfile | null> {
  const accessToken = await validAccessToken(ownerId, 'user');
  if (!accessToken) return null;
  const items: RecentItem[] = [];
  let before: string | null = null;
  for (let pageNumber = 0; pageNumber < 4; pageNumber++) {
    const url = new URL('https://api.spotify.com/v1/me/player/recently-played');
    url.searchParams.set('limit', '50');
    if (before) url.searchParams.set('before', before);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Spotify recently-played request failed: ${response.status}`);
    const result = await response.json() as RecentPage;
    if (!Array.isArray(result.items)) throw new Error('Spotify recently-played response was incomplete');
    items.push(...result.items);
    const nextBefore = result.cursors?.before;
    if (!result.next || !nextBefore || nextBefore === before || result.items.length === 0) break;
    before = nextBefore;
  }
  const profile = profileFromRecentItems(items);
  if (!profile.windows.year.plays) throw new Error('Spotify did not return any recent music plays');
  await database().prepare(`INSERT INTO listening_profiles (owner_id, role, summary, uploaded_at, plays) VALUES (?, 'user', ?, ?, ?)
    ON CONFLICT(owner_id, role) DO UPDATE SET summary = excluded.summary, uploaded_at = excluded.uploaded_at, plays = excluded.plays`)
    .bind(ownerId, JSON.stringify(profile), Date.now(), profile.windows.year.plays).run();
  return profile;
}
