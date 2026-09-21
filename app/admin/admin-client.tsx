'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, AudioLines, Check, Disc3, LockKeyhole, Plus, Save, Trash2 } from 'lucide-react';
import type { EvaluationSettings } from '@/lib/server/evaluation-settings';

type SpotifyStatus = { configured: boolean; master?: { connected: boolean } };
const redirectUri = 'https://mitchometro-music-lab.marcog77.chatgpt.site/api/spotify/callback';

export default function AdminClient() {
  const [settings, setSettings] = useState<EvaluationSettings | null>(null);
  const [spotify, setSpotify] = useState<SpotifyStatus | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [bandName, setBandName] = useState('');
  const [adjustment, setAdjustment] = useState(3);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function refresh() {
    const [s, p] = await Promise.all([
      fetch('/api/admin/settings', { cache: 'no-store' }),
      fetch('/api/spotify/status', { cache: 'no-store' }),
    ]);
    if (!s.ok || !p.ok) throw new Error('Impossibile caricare il pannello.');
    setSettings(await s.json() as EvaluationSettings);
    setSpotify(await p.json() as SpotifyStatus);
  }
  useEffect(() => {
    Promise.resolve().then(refresh).catch(e => setError(e.message));
    const state = new URLSearchParams(window.location.search).get('spotify');
    if (state) {
      Promise.resolve().then(() => setNotice(({ 'master-connected': 'Profilo master collegato.', cancelled: 'Autorizzazione annullata.', invalid: 'Autorizzazione non valida o scaduta.', conflict: 'Questo account Spotify è già usato per un altro ruolo.', unavailable: 'Collegamento non riuscito.' } as Record<string, string>)[state] || ''));
      window.history.replaceState(null, '', '/admin');
    }
  }, []);
  async function configureSpotify(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch('/api/spotify/admin-app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, clientSecret }) });
      if (!r.ok) throw new Error((await r.json() as {error?: string}).error || 'Configurazione non riuscita.');
      setClientId(''); setClientSecret(''); await refresh(); setNotice('App Spotify configurata. Ora collega il profilo master.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Configurazione non riuscita.'); }
    finally { setBusy(false); }
  }
  async function disconnectMaster() {
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch('/api/spotify/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'master' }) });
      if (!r.ok) throw new Error('Disconnessione non riuscita.');
      await refresh(); setNotice('Profilo master disconnesso.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Disconnessione non riuscita.'); }
    finally { setBusy(false); }
  }
  function addRule(event: React.FormEvent) {
    event.preventDefault(); if (!settings) return;
    const name = bandName.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80 || !Number.isInteger(adjustment) || adjustment < -10 || adjustment > 10 || settings.bandRules.length >= 20 || settings.bandRules.some(r => r.name.toLocaleLowerCase('it') === name.toLocaleLowerCase('it'))) {
      setError('Inserisci una band nuova, con un valore intero tra −10 e +10.'); return;
    }
    setSettings({ ...settings, bandRules: [...settings.bandRules, { name, adjustment }] }); setBandName(''); setError(''); setNotice('Regola aggiunta. Salva per applicarla.');
  }
  function editVariant(levelIndex: number, variantIndex: number, field: 'title' | 'body', value: string) {
    setSettings(current => current && ({ ...current, messages: current.messages.map((level, i) => i === levelIndex ? { ...level, variants: level.variants.map((variant, j) => j === variantIndex ? { ...variant, [field]: value } : variant) } : level) }));
  }
  async function save() {
    if (!settings) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      if (!r.ok) throw new Error((await r.json() as {error?: string}).error || 'Salvataggio non riuscito.');
      setSettings(await r.json() as EvaluationSettings); setNotice('Impostazioni salvate. Aggiorna la dashboard per vedere i nuovi testi.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Salvataggio non riuscito.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    window.location.replace('/admin');
  }
  return <div className="admin-page">
    <header className="admin-top"><span className="admin-brand"><AudioLines/> Mitch<span>ometro</span> <em>Admin</em></span><div className="admin-top-actions"><button className="admin-back" onClick={() => window.location.href = '/'}><ArrowLeft size={17}/> Torna alla dashboard</button><button className="admin-logout" onClick={logout}>Esci</button></div></header>
    <main className="admin-main"><div className="admin-heading"><div className="eyebrow">ACCESSO RISERVATO AL MASTER</div><h1>La cabina di regia.</h1><p>Configura il collegamento privato e il tono dell’indice di gusto.</p></div>
      {notice && <div className="admin-alert success" role="status"><Check size={18}/>{notice}</div>}
      {error && <div className="admin-alert failure" role="alert">{error}</div>}
      <section className="admin-card"><div className="admin-card-heading"><span className="admin-symbol"><LockKeyhole size={20}/></span><div><h2>Profilo master Spotify</h2><p>Accesso riservato; identità e token restano sul server.</p></div><span className="admin-state">{spotify?.master?.connected ? 'COLLEGATO' : spotify?.configured ? 'DA COLLEGARE' : 'DA CONFIGURARE'}</span></div>
      {!spotify ? <p>Caricamento…</p> : spotify.configured ? <div className="admin-account"><p>{spotify.master?.connected ? 'Il profilo master è collegato. Il suo nome e le sue credenziali non compaiono nell’interfaccia pubblica.' : 'L’app Spotify è pronta. Autorizza l’account che userai come master.'}</p>{spotify.master?.connected ? <button className="admin-danger" disabled={busy} onClick={disconnectMaster}>Disconnetti il profilo master</button> : <a className="admin-primary" href="/api/spotify/start?role=master"><Disc3 size={17}/> Collega il profilo master</a>}</div> : <div className="admin-account"><p>Crea un’app su <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify for Developers <ArrowUpRight size={13}/></a> e registra questo Redirect URI esatto:</p><code className="admin-code">{redirectUri}</code><p>Inserisci Client ID e Client Secret dell’app sviluppatore. Il secret viene cifrato sul server. Non inserire qui la password del tuo account Spotify.</p><form className="admin-credential-form" onSubmit={configureSpotify}><label>Client ID<input required minLength={20} maxLength={100} value={clientId} onChange={e => setClientId(e.target.value)} autoComplete="off" /></label><label>Client Secret<input required type="password" minLength={20} maxLength={100} value={clientSecret} onChange={e => setClientSecret(e.target.value)} autoComplete="off" /></label><button className="admin-primary" disabled={busy} type="submit">Salva credenziali</button></form></div>}</section>
      <div className="admin-two"><section className="admin-card"><div className="admin-card-heading"><span className="admin-symbol violet">±</span><div><h2>Bonus e malus per band</h2><p>Un ritocco manuale al punteggio demo.</p></div></div><p className="admin-help">Ogni band presente nel campione sintetico aggiunge o toglie i punti indicati; il totale dei ritocchi è limitato a ±20. Il riferimento rimane 100. Queste regole non analizzano gli ascolti Spotify.</p><form className="admin-rule-form" onSubmit={addRule}><label>Band o artista<input placeholder="Es. The Weeknd" maxLength={80} value={bandName} onChange={e => setBandName(e.target.value)} /></label><label>Punti<input type="number" min={-10} max={10} step={1} value={adjustment} onChange={e => setAdjustment(Number(e.target.value))} /></label><button type="submit" disabled={!settings || settings.bandRules.length >= 20} aria-label="Aggiungi regola"><Plus size={18}/></button></form><div className="admin-rules">{settings?.bandRules.length ? settings.bandRules.map((rule, i) => <div className="admin-rule" key={rule.name}><span>{rule.name}</span><strong className={rule.adjustment >= 0 ? 'positive' : 'negative'}>{rule.adjustment > 0 ? '+' : ''}{rule.adjustment}</strong><button aria-label={`Elimina regola per ${rule.name}`} onClick={() => setSettings({ ...settings, bandRules: settings.bandRules.filter((_, n) => n !== i) })}><Trash2 size={16}/></button></div>) : <div className="admin-empty">Nessuna regola. Tutte le band partono senza bonus o malus.</div>}</div></section>
      <section className="admin-card"><div className="admin-card-heading"><span className="admin-symbol pink">“</span><div><h2>Messaggi del punteggio</h2><p>12 livelli, 5 battute per livello.</p></div></div><p className="admin-help">Personalizza cinque titoli e battute per ognuna delle 12 fasce della scala 0–120. A ogni analisi viene mostrata una delle cinque varianti, scelta casualmente.</p><div className="admin-messages">{settings?.messages.map((level, i) => <details className="admin-message" key={level.min} open={i === 0 ? true : undefined}><summary><span className="admin-range">{level.min}–{level.max} <small>/120</small></span><span>5 varianti</span></summary><div className="admin-variants">{level.variants.map((variant, j) => <div className="admin-variant" key={j}><div className="admin-variant-number">Battuta {j + 1}</div><label>Titolo<input maxLength={100} value={variant.title} onChange={e => editVariant(i, j, 'title', e.target.value)}/></label><label>Testo<textarea rows={2} maxLength={240} value={variant.body} onChange={e => editVariant(i, j, 'body', e.target.value)}/></label></div>)}</div></details>)}</div></section></div>
      <div className="admin-savebar"><span>Il punteggio e i messaggi mostrati ora sono dimostrativi. La connessione Spotify usa solo i dati essenziali del profilo.</span><button className="admin-primary" disabled={!settings || busy} onClick={save}><Save size={16}/> {busy ? 'Salvataggio…' : 'Salva impostazioni'}</button></div>
    </main>
  </div>;
}
