'use client';

import { useEffect, useState } from 'react';
import { AudioLines, Crown, ShieldCheck } from 'lucide-react';
import TotpQr from '../totp-qr';

type Stage = 'loading' | 'password' | 'totp' | 'invalid';
type Enrollment = { secret: string; uri: string };

export default function AdminTransferClient({ token }: { token: string }) {
  const [stage, setStage] = useState<Stage>('loading');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/transfer?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(response => response.json() as Promise<{ valid?: boolean }>)
      .then(result => setStage(result.valid ? 'password' : 'invalid'))
      .catch(() => setStage('invalid'));
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (stage === 'password' && password !== confirmation) { setError('Le password non corrispondono.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/admin/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stage === 'password' ? { action: 'begin', token, password } : { action: 'complete', token, code }) });
      const result = await response.json() as { error?: string; secret?: string; uri?: string };
      if (!response.ok) throw new Error(result.error || 'Passaggio non riuscito.');
      if (stage === 'password') {
        if (!result.secret || !result.uri) throw new Error('Configurazione 2FA non disponibile.');
        setEnrollment({ secret: result.secret, uri: result.uri }); setPassword(''); setConfirmation(''); setStage('totp');
      } else window.location.replace('/admin');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Passaggio non riuscito.'); }
    finally { setBusy(false); }
  }

  return <div className="admin-page"><header className="admin-top"><span className="admin-brand"><AudioLines/> Mitch<span>ometro</span> <em>Passaggio del trono</em></span></header>
    <main className="admin-auth-main"><div className="admin-auth-icon crown"><Crown size={26}/></div><div className="eyebrow">NOMINA DEL NUOVO RE</div>
      <h1>{stage === 'loading' ? 'Verifichiamo l’invito…' : stage === 'invalid' ? 'Questo invito non è valido.' : stage === 'password' ? 'Scegli la tua password.' : 'Configura il nuovo 2FA.'}</h1>
      <p>{stage === 'invalid' ? 'Il link può essere scaduto, già utilizzato o aperto con un indirizzo diverso da quello invitato.' : stage === 'password' ? 'Questa password sostituirà quella dell’amministratore attuale. Nel prossimo passaggio configurerai un nuovo autenticatore.' : stage === 'totp' ? 'Scansiona il QR e conferma il codice. Solo dopo la conferma il vecchio amministratore perderà l’accesso.' : 'Un momento.'}</p>
      {error && <div className="admin-alert failure" role="alert">{error}</div>}
      {(stage === 'password' || stage === 'totp') && <form className="admin-auth-form" onSubmit={submit}>
        {stage === 'password' ? <><label>Nuova password<input type="password" minLength={12} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password"/></label><label>Ripeti password<input type="password" minLength={12} maxLength={128} required value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password"/></label></> : <><div className="admin-totp-setup"><strong>Scansiona il QR con la tua app di autenticazione</strong>{enrollment && <><TotpQr uri={enrollment.uri}/><p className="admin-qr-help">Poi inserisci il codice a 6 cifre.</p><strong>Chiave manuale</strong><code>{enrollment.secret}</code></>}</div><label>Codice dell’autenticatore<input type="text" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" placeholder="000000"/></label></>}
        <button className="admin-primary" type="submit" disabled={busy}>{busy ? 'Verifica…' : stage === 'password' ? 'Continua con il 2FA' : 'Accetta il trono'}</button>
      </form>}
      <div className="admin-auth-note"><ShieldCheck size={16}/> Il passaggio è definitivo quando il nuovo codice 2FA viene confermato.</div>
    </main></div>;
}
