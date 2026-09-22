'use client';
import { useState } from 'react';
import { ArrowLeft, AudioLines, LockKeyhole, ShieldCheck } from 'lucide-react';
import TotpQr from './totp-qr';

type Stage = 'setup' | 'confirm' | 'login';
type SetupReply = { secret: string; uri: string };

export default function AdminAuthClient({ configured }: { configured: boolean }) {
  const [stage, setStage] = useState<Stage>(configured ? 'login' : 'setup');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [enrollment, setEnrollment] = useState<SetupReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    if (stage === 'setup' && password !== confirmation) { setError('Le password non corrispondono.'); setBusy(false); return; }
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: stage === 'setup' ? 'setup' : stage === 'confirm' ? 'confirm' : 'login', username: 'admin', ...(stage === 'confirm' ? { code } : stage === 'login' ? { password, code } : { password }) }),
      });
      const body = await response.json() as { error?: string; secret?: string; uri?: string };
      if (!response.ok) throw new Error(body.error || 'Accesso non riuscito.');
      if (stage === 'setup') {
        if (!body.secret || !body.uri) throw new Error('Configurazione incompleta.');
        setEnrollment({ secret: body.secret, uri: body.uri }); setPassword(''); setConfirmation(''); setStage('confirm');
      } else window.location.replace('/admin');
    } catch (e) { setError(e instanceof Error ? e.message : 'Accesso non riuscito.'); }
    finally { setBusy(false); }
  }
  return <div className="admin-page">
    <header className="admin-top"><span className="admin-brand"><AudioLines/> Mitch<span>ometro</span> <em>Admin</em></span><button className="admin-back" onClick={() => window.location.href = '/'}><ArrowLeft size={17}/> Torna alla dashboard</button></header>
    <main className="admin-auth-main"><div className="admin-auth-icon"><LockKeyhole size={24}/></div><div className="eyebrow">ACCESSO RISERVATO</div><h1>{stage === 'setup' ? 'Proteggi il pannello.' : stage === 'confirm' ? 'Attiva la verifica in due passaggi.' : 'Bentornato, admin.'}</h1><p>{stage === 'setup' ? 'Scegli una password per l’unico account admin. Il prossimo passaggio configurerà il codice dell’app di autenticazione.' : stage === 'confirm' ? 'Aggiungi la chiave al tuo autenticatore e inserisci il codice a 6 cifre per completare l’attivazione.' : 'Inserisci la password e il codice corrente del tuo autenticatore.'}</p>
      {error && <div className="admin-alert failure" role="alert">{error}</div>}
      <form className="admin-auth-form" onSubmit={submit}><label>Nome utente<input value="admin" readOnly autoComplete="username" /></label>
      {stage !== 'confirm' && <label>Password<input type="password" minLength={stage === 'setup' ? 12 : undefined} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} autoComplete={stage === 'setup' ? 'new-password' : 'current-password'} /></label>}
      {stage === 'setup' && <label>Ripeti password<input type="password" minLength={12} maxLength={128} required value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" /></label>}
      {stage === 'confirm' && enrollment && <div className="admin-totp-setup"><strong>Scansiona il QR con la tua app di autenticazione</strong><TotpQr uri={enrollment.uri}/><p className="admin-qr-help">Poi inserisci qui sotto il codice a 6 cifre mostrato dall’app.</p><strong>In alternativa, inserisci la chiave manualmente</strong><code>{enrollment.secret}</code><p>Usa un account TOTP standard (6 cifre, 30 secondi). Puoi anche <a href={enrollment.uri}>aprire il link di configurazione</a> in un’app compatibile. Conserva l’accesso al tuo autenticatore: la chiave non sarà mostrata di nuovo dopo l’attivazione.</p></div>}
      {stage !== 'setup' && <label>Codice dell’autenticatore<input type="text" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" placeholder="000000" /></label>}
      <button className="admin-primary" type="submit" disabled={busy}>{busy ? 'Verifica…' : stage === 'setup' ? 'Continua con 2FA' : stage === 'confirm' ? 'Attiva e accedi' : 'Accedi al pannello'}</button></form>
      <div className="admin-auth-note"><ShieldCheck size={16}/> Richiede anche l’accesso come unico proprietario del sito.</div>
    </main>
  </div>;
}
