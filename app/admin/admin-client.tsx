'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, AudioLines, Check, LockKeyhole, Plus, Save, Trash2 } from 'lucide-react';
import HistoryUpload from '@/components/history-upload';
import type { EvaluationSettings } from '@/lib/server/evaluation-settings';

export default function AdminClient() {
  const [settings, setSettings] = useState<EvaluationSettings | null>(null);
  const [bandName, setBandName] = useState('');
  const [adjustment, setAdjustment] = useState(3);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function refresh() {
    const response = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (!response.ok) throw new Error('Impossibile caricare il pannello.');
    setSettings(await response.json() as EvaluationSettings);
  }
  useEffect(() => { void refresh().catch(e => setError(e.message)); }, []);
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
    <main className="admin-main"><div className="admin-heading"><div className="eyebrow">ACCESSO RISERVATO AL MASTER</div><h1>La cabina di regia.</h1><p>Carica il riferimento privato e regola il tono dell’indice di gusto.</p></div>
      {notice && <div className="admin-alert success" role="status"><Check size={18}/>{notice}</div>}
      {error && <div className="admin-alert failure" role="alert">{error}</div>}
      <section className="admin-card"><div className="admin-card-heading"><span className="admin-symbol"><LockKeyhole size={20}/></span><div><h2>Cronologia master</h2><p>Solo l’admin può caricare o eliminare il riferimento. Gli utenti vedono il proprio confronto e un brano master casuale alla volta; identità e profilo completo restano privati.</p></div></div><HistoryUpload role="master" /></section>
      <div className="admin-two"><section className="admin-card"><div className="admin-card-heading"><span className="admin-symbol violet">±</span><div><h2>Bonus e malus per band</h2><p>Un ritocco manuale al punteggio reale o demo.</p></div></div><p className="admin-help">Ogni band presente nella cronologia caricata aggiunge o toglie i punti indicati; il totale dei ritocchi è limitato a ±20. Il riferimento rimane 100.</p><form className="admin-rule-form" onSubmit={addRule}><label>Band o artista<input placeholder="Es. The Weeknd" maxLength={80} value={bandName} onChange={e => setBandName(e.target.value)} /></label><label>Punti<input type="number" min={-10} max={10} step={1} value={adjustment} onChange={e => setAdjustment(Number(e.target.value))} /></label><button type="submit" disabled={!settings || settings.bandRules.length >= 20} aria-label="Aggiungi regola"><Plus size={18}/></button></form><div className="admin-rules">{settings?.bandRules.length ? settings.bandRules.map((rule, i) => <div className="admin-rule" key={rule.name}><span>{rule.name}</span><strong className={rule.adjustment >= 0 ? 'positive' : 'negative'}>{rule.adjustment > 0 ? '+' : ''}{rule.adjustment}</strong><button aria-label={`Elimina regola per ${rule.name}`} onClick={() => setSettings({ ...settings, bandRules: settings.bandRules.filter((_, n) => n !== i) })}><Trash2 size={16}/></button></div>) : <div className="admin-empty">Nessuna regola. Tutte le band partono senza bonus o malus.</div>}</div></section>
      <section className="admin-card"><div className="admin-card-heading"><span className="admin-symbol pink">“</span><div><h2>Messaggi del punteggio</h2><p>12 livelli, 5 battute per livello.</p></div></div><p className="admin-help">Personalizza cinque titoli e battute per ognuna delle 12 fasce della scala 0–120. A ogni analisi viene mostrata una delle cinque varianti, scelta casualmente.</p><div className="admin-messages">{settings?.messages.map((level, i) => <details className="admin-message" key={level.min} open={i === 0 ? true : undefined}><summary><span className="admin-range">{level.min}–{level.max} <small>/120</small></span><span>5 varianti</span></summary><div className="admin-variants">{level.variants.map((variant, j) => <div className="admin-variant" key={j}><div className="admin-variant-number">Battuta {j + 1}</div><label>Titolo<input maxLength={100} value={variant.title} onChange={e => editVariant(i, j, 'title', e.target.value)}/></label><label>Testo<textarea rows={2} maxLength={240} value={variant.body} onChange={e => editVariant(i, j, 'body', e.target.value)}/></label></div>)}</div></details>)}</div></section></div>
      <div className="admin-savebar"><span>Con due cronologie caricate, il punteggio confronta l’utente con il riferimento master. Senza di esse viene mostrata una demo.</span><button className="admin-primary" disabled={!settings || busy} onClick={save}><Save size={16}/> {busy ? 'Salvataggio…' : 'Salva impostazioni'}</button></div>
    </main>
  </div>;
}
