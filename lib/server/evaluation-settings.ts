import { database } from './spotify';

export type BandRule = { name: string; adjustment: number };
export type MessageVariant = { title: string; body: string };
export type ScoreLevel = { min: number; max: number; variants: MessageVariant[] };
export type EvaluationSettings = { bandRules: BandRule[]; messages: ScoreLevel[] };

// Twelve contiguous levels: 0–9, 10–19, ... 100–109, 110–120.
const sarcasticCopy: MessageVariant[][] = [
  [
    { title: 'Gusti terribili.', body: 'Neanche un baballo ascolterebbe questa roba. Il pulsante Salta è lì per una ragione.' },
    { title: 'Qui serve un intervento.', body: 'La tua playlist ha chiesto di essere trasferita in un altro account.' },
    { title: 'Il silenzio suona meglio.', body: 'Abbiamo controllato due volte. Purtroppo il punteggio è giusto.' },
    { title: 'Emergenza musicale.', body: 'Perfino la riproduzione casuale si rifiuta di collaborare.' },
    { title: 'Il gusto è in vacanza.', body: 'Non sappiamo dove sia andato, ma di certo non è in questa playlist.' },
  ],
  [
    { title: 'Disastro con ritmo.', body: 'Almeno hai trovato il tasto play. Ora prova quello per cambiare brano.' },
    { title: 'La playlist si scusa.', body: 'Ha detto che non voleva causare tutto questo.' },
    { title: 'Un esperimento coraggioso.', body: 'Coraggioso per chi è rimasto ad ascoltare fino alla fine.' },
    { title: 'Meglio non vantarsene.', body: 'Conserviamo il risultato tra noi. Per il tuo bene.' },
    { title: 'Il volume non basta.', body: 'Alzarlo non trasforma queste scelte in buone idee.' },
  ],
  [
    { title: 'Scelte molto discutibili.', body: 'Qualcuno dovrebbe parlare con il tuo algoritmo. Con calma.' },
    { title: 'Hai preso la strada lunga.', body: 'Quella che passa lontanissimo dal buon gusto.' },
    { title: 'Un po’ di autocritica?', body: 'Questo sarebbe un ottimo momento per usarla.' },
    { title: 'La playlist è confusa.', body: 'E, per una volta, non possiamo darle torto.' },
    { title: 'Serve una bussola.', body: 'Il tuo gusto sembra aver perso il nord al primo ritornello.' },
  ],
  [
    { title: 'Il tuo algoritmo chiede aiuto.', body: 'C’è del potenziale. È nascosto molto bene sotto scelte discutibili.' },
    { title: 'Quasi una direzione.', body: 'Hai trovato una pista. Peccato porti in un vicolo cieco.' },
    { title: 'Un timido miglioramento.', body: 'Non chiameremmo ancora gli amici per festeggiare.' },
    { title: 'La musica resiste.', body: 'Nonostante la selezione, qualche brano sopravvive.' },
    { title: 'C’è speranza. Forse.', body: 'Una playlist nuova potrebbe fare miracoli. O almeno limitare i danni.' },
  ],
  [
    { title: 'Puoi fare di meglio.', body: 'Lo diciamo con affetto e con una certa urgenza.' },
    { title: 'Inizio promettente. A tratti.', body: 'Le parti buone sembrano però essere finite troppo presto.' },
    { title: 'Non è una catastrofe.', body: 'È il complimento più generoso che possiamo offrire oggi.' },
    { title: 'Il gusto si sta svegliando.', body: 'Dagli un caffè e qualche consiglio musicale.' },
    { title: 'Qualche idea c’è.', body: 'Dovresti invitarla più spesso nelle tue playlist.' },
  ],
  [
    { title: 'Metà strada, forse.', body: 'Hai evitato il disastro. Un traguardo sorprendentemente importante.' },
    { title: 'La sufficienza saluta.', body: 'Da lontano. Non è ancora pronta a fermarsi.' },
    { title: 'Qualcosa funziona.', body: 'Il resto ha ancora bisogno di una lunga conversazione.' },
    { title: 'Playlist in bilico.', body: 'Un brano giusto e uno sbagliato: sembri lanciare una moneta.' },
    { title: 'Un gusto in costruzione.', body: 'Speriamo tu abbia conservato le istruzioni.' },
  ],
  [
    { title: 'Discretamente ascoltabile.', body: 'Non è una recensione entusiasta, ma prendila come una vittoria.' },
    { title: 'Adesso ci siamo quasi.', body: 'Qualche scelta ci ha persino fatto annuire. Non abituarti.' },
    { title: 'Più bene che male.', body: 'Abbiamo dovuto contarle, ma le canzoni buone sono in vantaggio.' },
    { title: 'Un miglioramento sospetto.', body: 'Hai chiesto aiuto a qualcuno con gusto? Puoi dircelo.' },
    { title: 'Il ritmo c’è.', body: 'Le scelte discutibili pure, ma almeno ballano insieme.' },
  ],
  [
    { title: 'Non male, per sbaglio.', body: 'Ogni tanto indovini un brano. Non farne subito una personalità.' },
    { title: 'Qualcosa di buono si sente.', body: 'Pensavamo fosse un incidente. Poi è successo di nuovo.' },
    { title: 'Un gusto riconoscibile.', body: 'Lo diciamo senza promettere che sia un complimento.' },
    { title: 'Stai prendendo quota.', body: 'La playlist ha smesso di chiedere scusa a ogni ritornello.' },
    { title: 'Bella scelta. Quasi tutte.', body: 'Quel “quasi” sta facendo parecchio lavoro.' },
  ],
  [
    { title: 'Finalmente una playlist seria.', body: 'Seria quanto basta. Non rendiamo la cosa imbarazzante.' },
    { title: 'Il gusto comincia a farsi sentire.', body: 'Hai messo insieme più di due buone idee consecutive.' },
    { title: 'Quasi impressionante.', body: 'Ci manca poco per dirlo senza il “quasi”.' },
    { title: 'Niente male davvero.', body: 'Era difficile ammetterlo, ma i numeri sono testardi.' },
    { title: 'Una sorpresa piacevole.', body: 'Abbiamo ricontrollato. Sì, parliamo della tua musica.' },
  ],
  [
    { title: 'Quasi rispettabile.', body: 'Il riferimento vale 100. Ti concediamo un mezzo applauso, senza esagerare.' },
    { title: 'A un passo dal riferimento.', body: 'Preparati a sentirti insopportabile quando lo raggiungerai.' },
    { title: 'Il maestro ti sente arrivare.', body: 'Non sembri ancora una minaccia, ma stiamo prendendo appunti.' },
    { title: 'Gusto ben allenato.', body: 'Qualcuno qui prende le playlist troppo sul serio. Ci piace.' },
    { title: 'Vicino al podio.', body: 'Mantieni la calma. Un solo brano sbagliato può rovinare il discorso.' },
  ],
  [
    { title: 'Hai pareggiato col maestro.', body: 'Il riferimento vale 100. Cerca di non ricordarcelo ogni cinque minuti.' },
    { title: 'Gusto fastidiosamente buono.', body: 'Sì, hai superato la soglia. No, non avrai una corona.' },
    { title: 'Ci hai presi in contropiede.', body: 'Questo risultato merita rispetto. Poco, ma sincero.' },
    { title: 'Playlist di classe.', body: 'Ora basta guardare il punteggio con quell’aria soddisfatta.' },
    { title: 'Oltre il riferimento.', body: 'A quanto pare il tuo algoritmo ha finalmente ascoltato te.' },
  ],
  [
    { title: 'Hai superato il maestro. Che fastidio.', body: 'Il riferimento vale 100 e tu hai osato fare di più. Goditela finché dura.' },
    { title: 'È quasi irritante.', body: 'La tua playlist è così buona che vorremmo fingere un errore di calcolo.' },
    { title: 'Un gusto indecentemente alto.', body: 'Lascia almeno qualche brano decente anche agli altri.' },
    { title: 'Il maestro chiede una pausa.', body: 'Hai portato la sfida un po’ troppo lontano. Complimenti, supponiamo.' },
    { title: 'La corona ti va bene.', body: 'Non farcela pentire quando scegli la prossima canzone.' },
  ],
];

export const defaultMessages: ScoreLevel[] = sarcasticCopy.map((variants, index) => ({
  min: index * 10,
  max: index === 11 ? 120 : index * 10 + 9,
  variants,
}));
export const defaultSettings: EvaluationSettings = { bandRules: [], messages: defaultMessages };

export function validateSettings(input: unknown): EvaluationSettings | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  if (!Array.isArray(value.bandRules) || value.bandRules.length > 20 || !Array.isArray(value.messages) || value.messages.length !== defaultMessages.length) return null;
  const keys = new Set<string>();
  const bandRules: BandRule[] = [];
  for (const raw of value.bandRules) {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.name !== 'string' || typeof row.adjustment !== 'number') return null;
    const name = row.name.trim().replace(/\s+/g, ' ');
    const key = name.toLocaleLowerCase('it');
    if (name.length < 2 || name.length > 80 || keys.has(key) || !Number.isInteger(row.adjustment) || row.adjustment < -10 || row.adjustment > 10) return null;
    keys.add(key);
    bandRules.push({ name, adjustment: row.adjustment });
  }
  const messages: ScoreLevel[] = [];
  for (let i = 0; i < defaultMessages.length; i++) {
    const raw = value.messages[i];
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const band = defaultMessages[i];
    if (row.min !== band.min || row.max !== band.max || !Array.isArray(row.variants) || row.variants.length !== 5) return null;
    const variants: MessageVariant[] = [];
    for (const rawVariant of row.variants) {
      if (!rawVariant || typeof rawVariant !== 'object') return null;
      const variant = rawVariant as Record<string, unknown>;
      if (typeof variant.title !== 'string' || typeof variant.body !== 'string') return null;
      const title = variant.title.trim();
      const body = variant.body.trim();
      if (!title || title.length > 100 || !body || body.length > 240) return null;
      variants.push({ title, body });
    }
    messages.push({ min: band.min, max: band.max, variants });
  }
  return { bandRules, messages };
}

// Existing installations stored five wider score bands with one message each.
// Carry each saved line into the closest new band rather than discarding edits.
export function upgradeLegacyMessages(input: unknown): unknown {
  if (!Array.isArray(input) || input.length !== 5) return input;
  const oldRanges = [[0, 39], [40, 69], [70, 89], [90, 104], [105, 120]];
  if (!input.every((raw, i) => raw && typeof raw === 'object' && (raw as Record<string, unknown>).min === oldRanges[i][0] && (raw as Record<string, unknown>).max === oldRanges[i][1] && typeof (raw as Record<string, unknown>).title === 'string' && typeof (raw as Record<string, unknown>).body === 'string')) return input;
  const old = input as Array<{ min: number; max: number; title: string; body: string }>;
  return defaultMessages.map(level => {
    const midpoint = Math.floor((level.min + level.max) / 2);
    const saved = old.find(message => midpoint >= message.min && midpoint <= message.max) ?? old[old.length - 1];
    return { min: level.min, max: level.max, variants: [{ title: saved.title, body: saved.body }, ...level.variants.slice(1)] };
  });
}

export async function getEvaluationSettings(): Promise<EvaluationSettings> {
  const row = await database().prepare('SELECT band_rules, messages FROM evaluation_settings WHERE id = 1').first<{ band_rules: string; messages: string }>();
  if (!row) return defaultSettings;
  const settings = validateSettings({ bandRules: JSON.parse(row.band_rules), messages: upgradeLegacyMessages(JSON.parse(row.messages)) });
  if (!settings) throw new Error('Stored evaluation settings are invalid');
  return settings;
}

export async function saveEvaluationSettings(settings: EvaluationSettings) {
  await database().prepare(`INSERT INTO evaluation_settings (id, band_rules, messages, updated_at) VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET band_rules = excluded.band_rules, messages = excluded.messages, updated_at = excluded.updated_at`)
    .bind(JSON.stringify(settings.bandRules), JSON.stringify(settings.messages), Date.now()).run();
}
