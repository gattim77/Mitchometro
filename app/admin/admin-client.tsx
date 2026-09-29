'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, AudioLines, Check, Copy, Crown, LockKeyhole, Plus, Save, Trash2 } from 'lucide-react';
import HistoryUpload from '@/components/history-upload';
import type { EvaluationSettings } from '@/lib/server/evaluation-settings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminClient() {
  const [settings, setSettings] = useState<EvaluationSettings | null>(null);
  const [bandName, setBandName] = useState('');
  const [adjustment, setAdjustment] = useState(3);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferLink, setTransferLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Impossibile caricare il pannello.'); return response.json() as Promise<EvaluationSettings>; })
      .then(setSettings)
      .catch(e => setError(e.message));
  }, []);
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
  async function inviteNewAdmin(event: React.FormEvent) {
    event.preventDefault(); setTransferBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'invite', email: newAdminEmail.trim() }) });
      const result = await response.json() as { error?: string; email?: string; delivery?: 'email' | 'manual'; link?: string };
      if (!response.ok) throw new Error(result.error || 'Invito non riuscito.');
      setTransferForm(false); setNewAdminEmail('');
      if (result.delivery === 'manual' && result.link) { setTransferLink(result.link); setLinkCopied(false); setNotice('Link monouso creato. Copialo e invialo personalmente al nuovo Re.'); }
      else setNotice(`Invito inviato a ${result.email}. Il tuo accesso resterà attivo finché il nuovo Re non completa password e 2FA.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Invito non riuscito.'); }
    finally { setTransferBusy(false); }
  }
  return <div className="admin-page">
    <header className="admin-top"><span className="admin-brand"><AudioLines/> Mitch<span>ometro</span> <em>Admin</em></span><div className="admin-top-actions"><button className="admin-back" onClick={() => window.location.href = '/'}><ArrowLeft size={17}/> Torna alla dashboard</button><button className="admin-logout" onClick={logout}>Esci</button></div></header>
    <main className="admin-main"><div className="admin-heading"><div className="eyebrow">ACCESSO RISERVATO AL SOMMO MAESTRO</div><h1>La sala del trono.</h1><p>Custodisci il sacro canone e regola il tono del Giudizio Finale di Mitch.</p></div>
      {notice && <div className="admin-alert success" role="status"><Check size={18}/>{notice}</div>}
      {error && <div className="admin-alert failure" role="alert">{error}</div>}
      <section className="admin-card"><div className="admin-card-heading"><span className="admin-symbol"><LockKeyhole size={20}/></span><div><h2>Il sacro canone del Maestro</h2><p>Carica la cronologia estesa di Sua Santità del Punk. I fedeli vedono il proprio verdetto e una reliquia musicale casuale alla volta; identità e archivi completi restano privati.</p></div></div><HistoryUpload role="master" /></section>
      <section className="admin-card succession-card"><div className="admin-card-heading"><span className="admin-symbol gold"><Crown size={21}/></span><div><h2>Nomina il nuovo Re</h2><p>Trasferisci l’unico accesso amministratore a un nuovo indirizzo email.</p></div></div><p className="admin-help">Viene creato un link personale valido per 24 ore. Se l’invio email è configurato, Mitchometro lo spedisce; altrimenti potrai copiarlo e inviarlo tu. Il nuovo Re dovrà scegliere una password e configurare un nuovo autenticatore. Il tuo accesso verrà revocato appena completa il passaggio.</p><button className="admin-royal" onClick={() => setConfirmTransfer(true)}><Crown size={17}/> Nomina il nuovo Re</button></section>
      <div className="admin-two"><section className="admin-card"><div className="admin-card-heading"><span className="admin-symbol violet">±</span><div><h2>Benedizioni e anatemi per band</h2><p>Il Maestro concede bonus o infligge malus al verdetto.</p></div></div><p className="admin-help">Ogni band presente nelle prove aggiunge o toglie i punti decretati; il totale dei ritocchi è limitato a ±20. Il sacro canone rimane 100.</p><form className="admin-rule-form" onSubmit={addRule}><label>Band o artista<input placeholder="Es. The Weeknd" maxLength={80} value={bandName} onChange={e => setBandName(e.target.value)} /></label><label>Punti<input type="number" min={-10} max={10} step={1} value={adjustment} onChange={e => setAdjustment(Number(e.target.value))} /></label><button type="submit" disabled={!settings || settings.bandRules.length >= 20} aria-label="Aggiungi decreto"><Plus size={18}/></button></form><div className="admin-rules">{settings?.bandRules.length ? settings.bandRules.map((rule, i) => <div className="admin-rule" key={rule.name}><span>{rule.name}</span><strong className={rule.adjustment >= 0 ? 'positive' : 'negative'}>{rule.adjustment > 0 ? '+' : ''}{rule.adjustment}</strong><button aria-label={`Revoca il decreto per ${rule.name}`} onClick={() => setSettings({ ...settings, bandRules: settings.bandRules.filter((_, n) => n !== i) })}><Trash2 size={16}/></button></div>) : <div className="admin-empty">Nessun decreto. Tutte le band attendono il giudizio imparziale del Maestro.</div>}</div></section>
      <section className="admin-card"><div className="admin-card-heading"><span className="admin-symbol pink">“</span><div><h2>Sentenze del Maestro</h2><p>12 livelli, 5 verdetti per livello.</p></div></div><p className="admin-help">Personalizza cinque titoli e sentenze per ognuna delle 12 fasce della scala 0–120. A ogni udienza Sua Santità ne pronuncia una a caso.</p><div className="admin-messages">{settings?.messages.map((level, i) => <details className="admin-message" key={level.min} open={i === 0 ? true : undefined}><summary><span className="admin-range">{level.min}–{level.max} <small>/120</small></span><span>5 sentenze</span></summary><div className="admin-variants">{level.variants.map((variant, j) => <div className="admin-variant" key={j}><div className="admin-variant-number">Verdetto {j + 1}</div><label>Titolo<input maxLength={100} value={variant.title} onChange={e => editVariant(i, j, 'title', e.target.value)}/></label><label>Sentenza<textarea rows={2} maxLength={240} value={variant.body} onChange={e => editVariant(i, j, 'body', e.target.value)}/></label></div>)}</div></details>)}</div></section></div>
      <div className="admin-savebar"><span>Con entrambe le cronologie agli atti, Mitch confronta il fedele con il proprio sacro canone. Senza le prove convoca un’udienza demo.</span><button className="admin-primary" disabled={!settings || busy} onClick={save}><Save size={16}/> {busy ? 'Incisione delle tavole…' : 'Promulga i decreti'}</button></div>
    </main>
    <AlertDialog open={confirmTransfer} onOpenChange={setConfirmTransfer}><AlertDialogContent className="admin-confirm-dialog"><AlertDialogHeader><AlertDialogTitle>Vuoi davvero cedere il trono?</AlertDialogTitle><AlertDialogDescription>Quando il nuovo amministratore confermerà password e 2FA, tutte le sessioni attuali verranno chiuse e non potrai più accedere al pannello.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirmTransfer(false); setTransferForm(true); }}>Continua</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={transferForm} onOpenChange={setTransferForm}><DialogContent className="admin-transfer-dialog"><DialogHeader><DialogTitle>Email del nuovo Re</DialogTitle><DialogDescription>Il link personale sarà vincolato a questo indirizzo. Se l’email automatica non è disponibile, potrai copiarlo e consegnarlo tu.</DialogDescription></DialogHeader><form className="admin-transfer-form" onSubmit={inviteNewAdmin}><label>Indirizzo email<input type="email" autoComplete="email" maxLength={254} required value={newAdminEmail} onChange={event => setNewAdminEmail(event.target.value)} placeholder="nuovo.admin@example.com"/></label><button className="admin-royal" type="submit" disabled={transferBusy}>{transferBusy ? 'Creazione…' : 'Crea la nomina'}</button></form></DialogContent></Dialog>
    <Dialog open={!!transferLink} onOpenChange={open => { if (!open) setTransferLink(''); }}><DialogContent className="admin-transfer-dialog"><DialogHeader><DialogTitle>Consegna il sigillo reale</DialogTitle><DialogDescription>Questo link è monouso, scade tra 24 ore e funziona soltanto dopo l’accesso con l’email indicata.</DialogDescription></DialogHeader><div className="admin-transfer-link"><code>{transferLink}</code><button className="admin-royal" type="button" onClick={async () => { try { await navigator.clipboard.writeText(transferLink); setLinkCopied(true); } catch { setError('Copia automatica non riuscita. Seleziona il link manualmente.'); } }}>{linkCopied ? <Check size={17}/> : <Copy size={17}/>} {linkCopied ? 'Copiato' : 'Copia il link'}</button></div></DialogContent></Dialog>
  </div>;
}
