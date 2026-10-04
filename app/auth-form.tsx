'use client';

import { useState } from 'react';
import { ArrowRight, AudioLines } from 'lucide-react';

export default function AuthForm({ mode, returnTo, googleEnabled, initialError }: { mode: 'login' | 'register'; returnTo: string; googleEnabled: boolean; initialError?: string }) {
  const [error, setError] = useState(initialError || '');
  const [busy, setBusy] = useState(false);
  const register = mode === 'register';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password'), returnTo }) });
    const result = await response.json().catch(() => ({})) as { error?: string; returnTo?: string };
    if (response.ok) window.location.assign(result.returnTo || '/');
    else { setError(result.error || 'Operazione non riuscita. Riprova.'); setBusy(false); }
  }
  return <main className="auth-shell">
    <a className="brand auth-brand" href="/"><AudioLines/><span>Mitch<span className="gradient-text">ometro</span><small>Il tribunale supremo delle tue scelte musicali.</small></span></a>
    <section className="auth-card">
      <div className="eyebrow mint">{register ? 'ENTRA NEL TRIBUNALE' : 'TORNA AL VERDETTO'}</div>
      <h1>{register ? 'Crea il tuo account' : 'Accedi a Mitchometro'}</h1>
      <p>{register ? 'Conserva il tuo profilo di ascolto e confrontalo con il sacro canone del Maestro.' : 'Riprendi la tua udienza musicale personale.'}</p>
      {googleEnabled ? <a className="google-button" href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}><span className="google-mark">G</span> Continua con Google</a> : <button className="google-button" disabled title="Configurazione Google in corso"><span className="google-mark">G</span> Continua con Google</button>}
      <div className="auth-divider"><span>oppure con email</span></div>
      <form onSubmit={submit} className="auth-form">
        {register && <label>Nome<input name="name" autoComplete="name" required minLength={2} maxLength={80}/></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required/></label>
        <label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 10 : undefined}/></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="connect auth-submit" disabled={busy}>{busy ? 'Un momento…' : register ? 'Crea account' : 'Accedi'} <ArrowRight size={17}/></button>
      </form>
      <div className="auth-switch">{register ? 'Hai già un account?' : 'Non hai ancora un account?'} <a href={`${register ? '/login' : '/register'}?returnTo=${encodeURIComponent(returnTo)}`}>{register ? 'Accedi' : 'Registrati'}</a></div>
    </section>
  </main>;
}
