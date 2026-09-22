import type { EvaluationSettings } from './evaluation-settings';
import type { HistoryProfile, HistoryWindow, Period } from '@/lib/history-profile';
// Only imported by server routes. Synthetic fixtures; no Spotify data.
const reference = { variety: 12, discovery: 0.4, identity: 5, genres: [0.35, 0.30, 0.20, 0.15] };
const samples = {
  month: { variety: 10, discovery: 0.29, identity: 5.2, genres: [0.50, 0.27, 0.15, 0.08], artists: 48, tracks: 126 },
  semester: { variety: 13, discovery: 0.38, identity: 5.5, genres: [0.40, 0.30, 0.19, 0.11], artists: 137, tracks: 482 },
  year: { variety: 14, discovery: 0.44, identity: 5.8, genres: [0.36, 0.30, 0.20, 0.14], artists: 219, tracks: 864 },
};
const demoArtists = { month: ['The Weeknd', 'Arctic Monkeys', 'SZA', 'Gigi Perez'], semester: ['The Weeknd', 'Arctic Monkeys', 'SZA', 'Gigi Perez', 'Daft Punk'], year: ['The Weeknd', 'Arctic Monkeys', 'SZA', 'Gigi Perez', 'Daft Punk', 'Måneskin'] };
export function analyze(period: keyof typeof samples, settings: EvaluationSettings) {
  const user = samples[period];
  const match = Math.round(100 * user.genres.reduce((sum, value, i) => sum + Math.min(value, reference.genres[i]), 0));
  const metrics = [
    { key: 'variety', name: 'Varietà', value: Math.min(120, Math.round(user.variety / reference.variety * 100)), detail: `${user.variety} generi nel tuo universo`, description: 'Ampiezza dei generi ascoltati rispetto al riferimento.' },
    { key: 'discovery', name: 'Scoperta', value: Math.min(120, Math.round(user.discovery / reference.discovery * 100 + 1e-8)), detail: `${Math.round(user.discovery * 100)}% di nuovi artisti`, description: 'Quota di artisti nuovi rispetto al periodo precedente.' },
    { key: 'identity', name: 'Identità', value: Math.min(120, Math.round(user.identity / reference.identity * 100)), detail: 'Un suono che ti somiglia', description: 'Continuità delle preferenze nel modello dimostrativo.' },
    { key: 'affinity', name: 'Affinità', value: match, detail: 'In sintonia con il riferimento', description: 'Sovrapposizione tra distribuzioni di generi. Massimo 100.' },
  ];
  const baseScore = Math.round(metrics.slice(0, 3).reduce((sum, metric) => sum + metric.value, 0) / 3 * (0.8 + 0.2 * match / 100));
  const artists = new Set(demoArtists[period].map(name => name.toLocaleLowerCase('it')));
  const adjustment = Math.max(-20, Math.min(20, settings.bandRules.reduce((sum, rule) => sum + (artists.has(rule.name.toLocaleLowerCase('it')) ? rule.adjustment : 0), 0)));
  const score = Math.max(0, Math.min(120, baseScore + adjustment));
  const level = settings.messages.find(message => score >= message.min && score <= message.max)!;
  const scoreMessage = level.variants[Math.floor(Math.random() * level.variants.length)];
  return { mode: 'demo' as const, period, score, scoreMessage, match, artists: user.artists, tracks: user.tracks, metrics,
    genres: ['Alternative', 'Pop', 'R&B / Soul', 'Elettronica'].map((name, i) => ({ name, share: Math.round(user.genres[i] * 100) })),
    strength: { title: 'La tua identità si sente.', text: 'Torni ai suoni che ami senza perdere la tua personalità. Nel modello demo, la continuità delle tue preferenze supera il riferimento.' },
    weakness: { title: period === 'month' ? 'Esci dalla comfort zone.' : 'Continua a cambiare prospettiva.', text: period === 'month' ? 'La scoperta è il tuo margine più grande: prova un artista che non hai mai ascoltato, fuori dai tuoi generi abituali.' : 'Hai ampliato i tuoi ascolti. Alterna i preferiti a generi meno presenti per continuare a esplorare.' }
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
    { key: 'variety', name: 'Varietà', value: ratio(own.diversity, baseline.diversity), detail: `${user.uniqueArtists} artisti ascoltati`, description: 'Diversità degli artisti ascoltati rispetto al riferimento.' },
    { key: 'discovery', name: 'Scoperta', value: ratio(own.discovery, baseline.discovery), detail: `${Math.round(own.discovery * 100)} artisti distinti ogni 100 ascolti`, description: 'Quota di artisti distinti per ascolto rispetto al riferimento.' },
    { key: 'identity', name: 'Identità', value: ratio(own.identity, baseline.identity), detail: `${Math.round(own.identity * 100)}% ai cinque artisti preferiti`, description: 'Peso dei cinque artisti più ascoltati rispetto al riferimento.' },
    { key: 'affinity', name: 'Affinità', value: match, detail: 'Artisti in comune con il riferimento', description: 'Sovrapposizione delle distribuzioni di ascolto degli artisti. Massimo 100.' },
  ];
  const baseScore = Math.round(metrics.slice(0, 3).reduce((sum, metric) => sum + metric.value, 0) / 3 * (0.8 + 0.2 * match / 100));
  const names = new Set(user.artists.map(item => item.name.toLocaleLowerCase('it')));
  const adjustment = Math.max(-20, Math.min(20, settings.bandRules.reduce((sum, rule) =>
    sum + (names.has(rule.name.toLocaleLowerCase('it')) ? rule.adjustment : 0), 0)));
  const score = Math.max(0, Math.min(120, baseScore + adjustment));
  const level = settings.messages.find(message => score >= message.min && score <= message.max)!;
  const scoreMessage = level.variants[Math.floor(Math.random() * level.variants.length)];
  const ranked = metrics.slice(0, 3).sort((a, b) => b.value - a.value);
  return {
    mode: 'real' as const, period, score, scoreMessage, match, artists: user.uniqueArtists, tracks: user.uniqueTracks, metrics,
    genres: user.artists.slice(0, 4).map(item => ({ name: item.name, share: Math.round(item.count / Math.max(1, user.plays) * 100) })),
    strength: { title: `${ranked[0].name}: il tuo punto forte.`, text: `Questo indicatore è a ${ranked[0].value}/120 rispetto al profilo di riferimento.` },
    weakness: { title: `${ranked[2].name}: qui puoi crescere.`, text: `Questo indicatore è a ${ranked[2].value}/120 rispetto al profilo di riferimento.` },
  };
}

export type Analysis = ReturnType<typeof analyze> | NonNullable<ReturnType<typeof analyzeHistory>>;
