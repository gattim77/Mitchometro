import { database } from './spotify';

export type BandRule = { name: string; adjustment: number };
export type ScoreMessage = { min: number; max: number; title: string; body: string };
export type EvaluationSettings = { bandRules: BandRule[]; messages: ScoreMessage[] };

export const defaultMessages: ScoreMessage[] = [
  { min: 0, max: 39, title: 'Gusti terribili.', body: 'Neanche un baballo ascolterebbe questa roba. Il pulsante Salta è lì per una ragione.' },
  { min: 40, max: 69, title: 'Il tuo algoritmo chiede aiuto.', body: 'C’è del potenziale. È nascosto molto bene sotto scelte discutibili.' },
  { min: 70, max: 89, title: 'Non male, per sbaglio.', body: 'Ogni tanto indovini un brano. Non farne subito una personalità.' },
  { min: 90, max: 104, title: 'Quasi rispettabile.', body: 'Il riferimento vale 100. Ti concediamo un mezzo applauso, senza esagerare.' },
  { min: 105, max: 120, title: 'Hai superato il maestro. Che fastidio.', body: 'Il riferimento vale 100 e tu hai osato fare di più. Goditela finché dura.' },
];

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
  const messages: ScoreMessage[] = [];
  for (let i = 0; i < defaultMessages.length; i++) {
    const raw = value.messages[i];
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const band = defaultMessages[i];
    if (row.min !== band.min || row.max !== band.max || typeof row.title !== 'string' || typeof row.body !== 'string') return null;
    const title = row.title.trim();
    const body = row.body.trim();
    if (!title || title.length > 100 || !body || body.length > 240) return null;
    messages.push({ min: band.min, max: band.max, title, body });
  }
  return { bandRules, messages };
}

export async function getEvaluationSettings(): Promise<EvaluationSettings> {
  const row = await database().prepare('SELECT band_rules, messages FROM evaluation_settings WHERE id = 1').first<{ band_rules: string; messages: string }>();
  if (!row) return defaultSettings;
  const settings = validateSettings({ bandRules: JSON.parse(row.band_rules), messages: JSON.parse(row.messages) });
  if (!settings) throw new Error('Stored evaluation settings are invalid');
  return settings;
}

export async function saveEvaluationSettings(settings: EvaluationSettings) {
  await database().prepare(`INSERT INTO evaluation_settings (id, band_rules, messages, updated_at) VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET band_rules = excluded.band_rules, messages = excluded.messages, updated_at = excluded.updated_at`)
    .bind(JSON.stringify(settings.bandRules), JSON.stringify(settings.messages), Date.now()).run();
}
