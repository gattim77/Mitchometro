import type { EvaluationSettings, MessageVariant } from './evaluation-settings';
import type { HistoryProfile, HistoryWindow, Period } from '@/lib/history-profile';
// Only imported by server routes. Synthetic fixtures; no Spotify data.
const reference = { variety: 12, discovery: 0.4, identity: 5, genres: [0.35, 0.30, 0.20, 0.15] };
const samples = {
  month: { variety: 10, discovery: 0.29, identity: 5.2, genres: [0.50, 0.27, 0.15, 0.08], artists: 48, tracks: 126 },
  year: { variety: 14, discovery: 0.44, identity: 5.8, genres: [0.36, 0.30, 0.20, 0.14], artists: 219, tracks: 864 },
  forever: { variety: 16, discovery: 0.47, identity: 6.1, genres: [0.34, 0.29, 0.21, 0.16], artists: 486, tracks: 2410 },
};
const demoArtists = { month: ['The Weeknd', 'Arctic Monkeys', 'SZA', 'Gigi Perez'], year: ['The Weeknd', 'Arctic Monkeys', 'SZA', 'Gigi Perez', 'Daft Punk', 'Måneskin'], forever: ['The Weeknd', 'Arctic Monkeys', 'SZA', 'Gigi Perez', 'Daft Punk', 'Måneskin', 'Radiohead'] };
const mitchTitles = ['Sua Santità del Punk', 'Il Sommo Maestro', 'Il Gran Sacerdote del Volume', 'L’Oracolo del Ritornello'];
const artistGenres: Record<string, string> = {
  'arctic monkeys': 'Indie / Rock', 'blur': 'Indie / Rock', 'fontaines d.c.': 'Indie / Rock', 'gigi perez': 'Indie / Rock',
  'getdown services': 'Indie / Rock', 'oasis': 'Indie / Rock', 'radiohead': 'Indie / Rock', 'the scratch': 'Indie / Rock',
  'måneskin': 'Rock / Punk', 'maneskin': 'Rock / Punk', 'green day': 'Rock / Punk', 'idles': 'Rock / Punk',
  'nirvana': 'Rock / Punk', 'ramones': 'Rock / Punk', 'the clash': 'Rock / Punk', 'the cure': 'Rock / Punk',
  'daft punk': 'Elettronica', 'depeche mode': 'Elettronica', 'kraftwerk': 'Elettronica', 'señor coconut': 'Elettronica',
  'the chemical brothers': 'Elettronica', 'the prodigy': 'Elettronica',
  'beyoncé': 'Pop / R&B', 'billie eilish': 'Pop / R&B', 'dua lipa': 'Pop / R&B', 'prince': 'Pop / R&B',
  'sza': 'Pop / R&B', 'teddy swims': 'Pop / R&B', 'the weeknd': 'Pop / R&B',
  'buena vista social club': 'Jazz / Latin', 'miles davis': 'Jazz / Latin', 'nina simone': 'Jazz / Latin',
  'bad bunny': 'Hip hop / Urban', 'kendrick lamar': 'Hip hop / Urban', 'run the jewels': 'Hip hop / Urban',
  'bob dylan': 'Folk / Cantautorato', 'bruce springsteen': 'Folk / Cantautorato', 'de andré': 'Folk / Cantautorato',
  'fabrizio de andré': 'Folk / Cantautorato', 'lucio dalla': 'Folk / Cantautorato',
};

function summarizeGenres(window: HistoryWindow) {
  const counts = new Map<string, number>();
  let classified = 0;
  for (const artist of window.artists) {
    const genre = artistGenres[artist.name.toLocaleLowerCase('it')];
    if (!genre) continue;
    classified += artist.count;
    counts.set(genre, (counts.get(genre) ?? 0) + artist.count);
  }
  const unclassified = Math.max(0, window.plays - classified);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const visible = ranked.slice(0, 3);
  const remaining = ranked.slice(3).reduce((sum, [, count]) => sum + count, 0) + unclassified;
  if (remaining) visible.push(['Altri / non classificati', remaining]);
  return visible.map(([name, count]) => ({ name, share: Math.round(count / Math.max(1, window.plays) * 100) }));
}

function mitchVerdict(message: MessageVariant, score: number): MessageVariant {
  const judge = mitchTitles[Math.floor(score / 10) % mitchTitles.length];
  return { title: `${judge} ha sentenziato: ${message.title}`, body: `Mitch ti giudica: ${message.body}` };
}
export function analyze(period: keyof typeof samples, settings: EvaluationSettings) {
  const user = samples[period];
  const match = Math.round(100 * user.genres.reduce((sum, value, i) => sum + Math.min(value, reference.genres[i]), 0));
  const metrics = [
    { key: 'variety', name: 'Ampiezza del repertorio', value: Math.min(120, Math.round(user.variety / reference.variety * 100)), detail: `${user.variety} generi convocati a giudizio`, description: 'Sua Santità misura l’ampiezza dei generi rispetto al proprio sacro canone.' },
    { key: 'discovery', name: 'Spirito di scoperta', value: Math.min(120, Math.round(user.discovery / reference.discovery * 100 + 1e-8)), detail: `${Math.round(user.discovery * 100)}% di nuovi testimoni`, description: 'Il Maestro premia gli artisti scoperti nel periodo.' },
    { key: 'identity', name: 'Fede musicale', value: Math.min(120, Math.round(user.identity / reference.identity * 100)), detail: 'Un credo sonoro riconoscibile', description: 'L’Oracolo del Ritornello valuta la continuità delle preferenze.' },
    { key: 'affinity', name: 'Grazia del Maestro', value: match, detail: 'In sintonia con il sacro canone', description: 'Sovrapposizione con il repertorio di Mitch. Massimo 100.' },
  ];
  const baseScore = Math.round(metrics.slice(0, 3).reduce((sum, metric) => sum + metric.value, 0) / 3 * (0.8 + 0.2 * match / 100));
  const artists = new Set(demoArtists[period].map(name => name.toLocaleLowerCase('it')));
  const adjustment = Math.max(-20, Math.min(20, settings.bandRules.reduce((sum, rule) => sum + (artists.has(rule.name.toLocaleLowerCase('it')) ? rule.adjustment : 0), 0)));
  const score = Math.max(0, Math.min(120, baseScore + adjustment));
  const level = settings.messages.find(message => score >= message.min && score <= message.max)!;
  const scoreMessage = mitchVerdict(level.variants[Math.floor(Math.random() * level.variants.length)], score);
  return { mode: 'demo' as const, period, score, scoreMessage, match, artists: user.artists, tracks: user.tracks, metrics,
    genres: ['Alternative', 'Pop', 'R&B / Soul', 'Elettronica'].map((name, i) => ({ name, share: Math.round(user.genres[i] * 100) })),
    strength: { title: 'Il Maestro annuisce, appena.', text: 'La tua identità musicale è abbastanza netta da ottenere un cenno di approvazione dal Sommo Giudice.' },
    weakness: { title: period === 'month' ? 'Sua Santità esige più coraggio.' : 'L’Oracolo pretende nuove prospettive.', text: period === 'month' ? 'La scoperta è il capo d’accusa principale: osa un artista mai ascoltato e forse Mitch sarà clemente.' : 'Il repertorio si è ampliato, ma il Maestro ordina di alternare i preferiti a territori meno battuti.' }
  };
}

function characteristics(window: HistoryWindow) {
  const listed = window.artists.reduce((sum, item) => sum + item.count, 0);
  const shares = window.artists.map(item => item.count / Math.max(1, listed));
  const diversity = shares.length ? 1 / shares.reduce((sum, share) => sum + share * share, 0) : 0;
  const discovery = window.uniqueArtists / Math.max(1, window.plays);
  const identity = [...shares].sort((a, b) => b - a).slice(0, 5).reduce((sum, share) => sum + share, 0);
  return { diversity, discovery, identity };
}

function affinity(user: HistoryWindow, master: HistoryWindow) {
  const userTotal = user.artists.reduce((sum, item) => sum + item.count, 0);
  const masterTotal = master.artists.reduce((sum, item) => sum + item.count, 0);
  if (!userTotal || !masterTotal) return 0;
  const reference = new Map(master.artists.map(item => [item.name.toLocaleLowerCase('it'), item.count / masterTotal]));
  return Math.round(100 * user.artists.reduce((sum, item) =>
    sum + Math.min(item.count / userTotal, reference.get(item.name.toLocaleLowerCase('it')) ?? 0), 0));
}

export function analyzeHistory(period: Period, userProfile: HistoryProfile, masterProfile: HistoryProfile, settings: EvaluationSettings) {
  const user = userProfile.windows[period];
  const master = masterProfile.windows[period];
  if (!user.plays || !master.plays) return null;
  const own = characteristics(user);
  const baseline = characteristics(master);
  const ratio = (a: number, b: number) => Math.max(0, Math.min(120, Math.round(a / Math.max(b, 0.000001) * 100)));
  const match = affinity(user, master);
  const metrics = [
    { key: 'variety', name: 'Ampiezza del repertorio', value: ratio(own.diversity, baseline.diversity), detail: `${user.uniqueArtists} artisti convocati`, description: 'Il Maestro confronta la diversità degli artisti con il proprio sacro canone.' },
    { key: 'discovery', name: 'Spirito di scoperta', value: ratio(own.discovery, baseline.discovery), detail: `${Math.round(own.discovery * 100)} testimoni distinti ogni 100 ascolti`, description: 'Sua Santità misura quanti artisti distinti compaiono in rapporto agli ascolti.' },
    { key: 'identity', name: 'Fede musicale', value: ratio(own.identity, baseline.identity), detail: `${Math.round(own.identity * 100)}% ai cinque artisti prediletti`, description: 'L’Oracolo valuta il peso dei cinque artisti più ascoltati rispetto al proprio canone.' },
    { key: 'affinity', name: 'Grazia del Maestro', value: match, detail: 'Artisti condivisi con il sacro canone', description: 'Sintonia tra la tua distribuzione degli ascolti e quella di Mitch. Massimo 100.' },
  ];
  const baseScore = Math.round(metrics.slice(0, 3).reduce((sum, metric) => sum + metric.value, 0) / 3 * (0.8 + 0.2 * match / 100));
  const names = new Set(user.artists.map(item => item.name.toLocaleLowerCase('it')));
  const adjustment = Math.max(-20, Math.min(20, settings.bandRules.reduce((sum, rule) =>
    sum + (names.has(rule.name.toLocaleLowerCase('it')) ? rule.adjustment : 0), 0)));
  const score = Math.max(0, Math.min(120, baseScore + adjustment));
  const level = settings.messages.find(message => score >= message.min && score <= message.max)!;
  const scoreMessage = mitchVerdict(level.variants[Math.floor(Math.random() * level.variants.length)], score);
  const ranked = metrics.slice(0, 3).sort((a, b) => b.value - a.value);
  return {
    mode: 'real' as const, period, score, scoreMessage, match, artists: user.uniqueArtists, tracks: user.uniqueTracks, metrics,
    genres: summarizeGenres(user),
    strength: { title: `${ranked[0].name}: il Maestro concede la grazia.`, text: `Sua Santità del Punk decreta ${ranked[0].value}/120 rispetto al proprio sacro canone.` },
    weakness: { title: `${ranked[2].name}: capo d’accusa principale.`, text: `Il Sommo Maestro assegna ${ranked[2].value}/120 e ordina un’immediata revisione del repertorio.` },
  };
}

export type Analysis = ReturnType<typeof analyze> | NonNullable<ReturnType<typeof analyzeHistory>>;
