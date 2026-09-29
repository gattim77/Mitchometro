export const periods = ['month', 'year', 'forever'] as const;
export type Period = (typeof periods)[number];
export type ArtistCount = { name: string; count: number };
export type RotationTrack = { artist: string; title: string };
export type TrackFingerprints = { encoding: 'fnv1a64-be-base64-v1'; count: number; data: string };
export type HistoryWindow = {
  plays: number;
  uniqueArtists: number;
  uniqueTracks: number;
  artists: ArtistCount[];
};
export type HistoryProfile = {
  version: 1 | 2 | 3 | 4;
  windows: Record<Period, HistoryWindow>;
  lifetimeReady: boolean;
  rotationTracks?: RotationTrack[];
  trackFingerprints?: TrackFingerprints;
  source?: 'recent' | 'upload';
};

const day = 86_400_000;
const windowDurations = { month: 30 * day, year: 365 * day } as const;
const fnvOffset = BigInt('14695981039346656037');
const fnvPrime = BigInt('1099511628211');
const byteMask = BigInt(255);

function fingerprintTrack(value: string) {
  let hash = fnvOffset;
  for (let index = 0; index < value.length; index++) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * fnvPrime);
  }
  return hash;
}

function encodeTrackFingerprints(values: Set<string>): TrackFingerprints {
  const hashes = [...new Set([...values].map(fingerprintTrack))].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const bytes = new Uint8Array(hashes.length * 8);
  hashes.forEach((hash, index) => {
    for (let byte = 0; byte < 8; byte++) bytes[index * 8 + byte] = Number(hash >> BigInt((7 - byte) * 8) & byteMask);
  });
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32_768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  return { encoding: 'fnv1a64-be-base64-v1', count: hashes.length, data: btoa(binary) };
}

export async function profileFromFiles(files: File[], includeRotationTracks = false): Promise<HistoryProfile> {
  if (!files.length || files.length > 200) throw new Error('Seleziona fino a 200 file JSON della cronologia.');
  const now = Date.now();
  const buckets = Object.fromEntries(periods.map(period => [period, {
    plays: 0, artists: new Map<string, ArtistCount>(), tracks: new Set<string>(),
  }])) as Record<Period, { plays: number; artists: Map<string, ArtistCount>; tracks: Set<string> }>;
  const seen = new Set<string>();
  const rotation = new Map<string, RotationTrack & { count: number }>();
  let found = 0;
  let foundExtended = false;
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.json') || file.size > 75_000_000) throw new Error('Usa i file JSON estratti da Spotify, massimo 75 MB ciascuno.');
    let rows: unknown;
    try { rows = JSON.parse(await file.text()); }
    catch { throw new Error(`Il file ${file.name} non è un JSON valido.`); }
    if (!Array.isArray(rows)) continue;
    for (const raw of rows) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      if (typeof row.ts === 'string' && typeof row.master_metadata_album_artist_name === 'string') foundExtended = true;
      const artist = typeof row.master_metadata_album_artist_name === 'string' ? row.master_metadata_album_artist_name : row.artistName;
      const track = typeof row.master_metadata_track_name === 'string' ? row.master_metadata_track_name : row.trackName;
      const time = typeof row.ts === 'string' ? row.ts : row.endTime;
      const ms = typeof row.ms_played === 'number' ? row.ms_played : row.msPlayed;
      if (typeof artist !== 'string' || typeof track !== 'string' || typeof time !== 'string' || typeof ms !== 'number') continue;
      const playedAt = Date.parse(/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(time) ? `${time.replace(' ', 'T')}:00Z` : time);
      if (!Number.isFinite(playedAt) || playedAt > now + day || ms < 30_000) continue;
      const artistName = artist.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 100);
      const trackName = track.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 150);
      if (!artistName || !trackName) continue;
      const artistKey = artistName.toLocaleLowerCase('it');
      const trackKey = `${artistKey}\u0000${trackName.toLocaleLowerCase('it')}`;
      const eventKey = `${playedAt}\u0000${trackKey}\u0000${ms}`;
      if (seen.has(eventKey)) continue;
      seen.add(eventKey);
      found++;
      if (found > 1_000_000) throw new Error('La cronologia supera un milione di ascolti; prova a selezionare meno file.');
      if (includeRotationTracks) {
        const existing = rotation.get(trackKey);
        if (existing) existing.count++;
        else rotation.set(trackKey, { artist: artistName, title: trackName, count: 1 });
      }
      for (const period of periods) {
        if (period !== 'forever' && playedAt < now - windowDurations[period]) continue;
        const bucket = buckets[period];
        bucket.plays++;
        bucket.tracks.add(trackKey);
        const existing = bucket.artists.get(artistKey);
        if (existing) existing.count++;
        else bucket.artists.set(artistKey, { name: artistName, count: 1 });
      }
    }
  }
  if (!foundExtended) throw new Error('Seleziona i JSON della Cronologia di ascolto estesa: la cronologia standard contiene solo l’ultimo anno.');
  if (!found) throw new Error('Non abbiamo trovato brani validi nella cronologia. Seleziona tutti i JSON della cronologia di ascolto estesa.');
  return {
    version: 4,
    source: 'upload',
    lifetimeReady: true,
    windows: Object.fromEntries(periods.map(period => {
      const bucket = buckets[period];
      return [period, {
        plays: bucket.plays,
        uniqueArtists: bucket.artists.size,
        uniqueTracks: bucket.tracks.size,
        artists: [...bucket.artists.values()].sort((a, b) => b.count - a.count).slice(0, 4_000),
      }];
    })) as Record<Period, HistoryWindow>,
    trackFingerprints: encodeTrackFingerprints(buckets.forever.tracks),
    ...(includeRotationTracks ? { rotationTracks: [...rotation.values()].sort((a, b) => b.count - a.count).slice(0, 500).map(({ artist, title }) => ({ artist, title })) } : {}),
  };
}

export function validateHistoryProfile(input: unknown): HistoryProfile | null {
  if (!input || typeof input !== 'object') return null;
  const source = input as Record<string, unknown>;
  if ((source.version !== 1 && source.version !== 2 && source.version !== 3 && source.version !== 4) || !source.windows || typeof source.windows !== 'object') return null;
  const windows = {} as Record<Period, HistoryWindow>;
  for (const period of periods) {
    const rawWindows = source.windows as Record<string, unknown>;
    const raw = (source.version === 1 || source.version === 2) && period === 'forever' ? rawWindows.year : rawWindows[period];
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Record<string, unknown>;
    if (!Number.isInteger(value.plays) || (value.plays as number) < 0 || (value.plays as number) > 1_000_000 ||
      !Number.isInteger(value.uniqueArtists) || (value.uniqueArtists as number) < 0 || (value.uniqueArtists as number) > (value.plays as number) ||
      !Number.isInteger(value.uniqueTracks) || (value.uniqueTracks as number) < 0 || (value.uniqueTracks as number) > (value.plays as number) ||
      !Array.isArray(value.artists) || value.artists.length > 4_000) return null;
    const artists: ArtistCount[] = [];
    const names = new Set<string>();
    let covered = 0;
    for (const rawArtist of value.artists) {
      if (!rawArtist || typeof rawArtist !== 'object') return null;
      const entry = rawArtist as Record<string, unknown>;
      if (typeof entry.name !== 'string' || entry.name.length < 1 || entry.name.length > 100 ||
        !Number.isInteger(entry.count) || (entry.count as number) < 1 || (entry.count as number) > (value.plays as number)) return null;
      const key = entry.name.toLocaleLowerCase('it');
      if (names.has(key)) return null;
      names.add(key);
      covered += entry.count as number;
      artists.push({ name: entry.name, count: entry.count as number });
    }
    if (covered > (value.plays as number) || artists.length > (value.uniqueArtists as number)) return null;
    windows[period] = { plays: value.plays as number, uniqueArtists: value.uniqueArtists as number, uniqueTracks: value.uniqueTracks as number, artists };
  }
  if (windows.month.plays > windows.year.plays || windows.year.plays > windows.forever.plays) return null;
  const profileSource = source.source === 'recent' || source.source === 'upload' ? source.source : undefined;
  const lifetimeReady = (source.version === 3 || source.version === 4) && source.lifetimeReady === true;
  let trackFingerprints: TrackFingerprints | undefined;
  if (source.version === 4) {
    if (!source.trackFingerprints || typeof source.trackFingerprints !== 'object') return null;
    const fingerprints = source.trackFingerprints as Record<string, unknown>;
    if (fingerprints.encoding !== 'fnv1a64-be-base64-v1' || !Number.isInteger(fingerprints.count) || (fingerprints.count as number) < 1 ||
      (fingerprints.count as number) > windows.forever.uniqueTracks || typeof fingerprints.data !== 'string' || fingerprints.data.length > 11_000_004 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(fingerprints.data) || fingerprints.data.length !== Math.ceil((fingerprints.count as number) * 8 / 3) * 4) return null;
    trackFingerprints = { encoding: 'fnv1a64-be-base64-v1', count: fingerprints.count as number, data: fingerprints.data };
  }
  let rotationTracks: RotationTrack[] | undefined;
  if (source.rotationTracks !== undefined) {
    if (!Array.isArray(source.rotationTracks) || source.rotationTracks.length < 1 || source.rotationTracks.length > 500 || source.rotationTracks.length > windows.forever.uniqueTracks) return null;
    rotationTracks = [];
    const trackKeys = new Set<string>();
    for (const item of source.rotationTracks) {
      if (!item || typeof item !== 'object') return null;
      const track = item as Record<string, unknown>;
      if (typeof track.artist !== 'string' || typeof track.title !== 'string' || !track.artist.trim() || !track.title.trim() || track.artist.length > 100 || track.title.length > 150) return null;
      const key = `${track.artist.toLocaleLowerCase('it')}\u0000${track.title.toLocaleLowerCase('it')}`;
      if (trackKeys.has(key)) return null;
      trackKeys.add(key);
      rotationTracks.push({ artist: track.artist, title: track.title });
    }
  }
  return { version: source.version, windows, lifetimeReady, ...(rotationTracks ? { rotationTracks } : {}), ...(trackFingerprints ? { trackFingerprints } : {}), ...(profileSource ? { source: profileSource } : {}) };
}
