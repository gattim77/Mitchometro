'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, KeyRound } from 'lucide-react';

type Settings = { configured: boolean; clientId: string; redirectUri: string };

export default function SpotifyAppSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/admin/spotify-settings', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Configurazione Spotify non disponibile.'); return response.json() as Promise<Settings>; })
      .then(result => { setSettings(result); setClientId(result.clientId); })
      .catch(caught => setError(caught instanceof Error ? caught.message : 'Configurazione Spotify non disponibile.'));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/spotify-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }) });
      const result = await response.json() as Settings & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Salvataggio non riuscito.');
      setSettings(result); setClientSecret(''); setNotice('App Spotify configurata. Gli utenti autorizzati possono collegarsi.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Salvataggio non riuscito.'); }
    finally { setBusy(false); }
  }

  return <section className="admin-card spotify-app-card">
    <div className="admin-card-heading"><span className="admin-symbol violet"><KeyRound size={20}/></span><div><h2>Connessione Spotify per gli utenti</h2><p>Solo gli utenti collegano Spotify. Il riferimento master resta basato sulla cronologia estesa caricata qui sopra.</p></div>{settings?.configured && <span className="admin-state"><Check size={13}/> CONFIGURATA</span>}</div>
    <p className="admin-help">Crea un’app nel <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify Developer Dashboard <ArrowUpRight size={13}/></a>. Inserisci questo indirizzo tra i Redirect URI dell’app, poi salva qui Client ID e Client Secret. Il segreto viene cifrato sul server e non viene restituito alla pagina. In modalità sviluppo, Spotify richiede Premium al proprietario dell’app e consente fino a cinque utenti Spotify autorizzati: aggiungili alla allowlist nel dashboard Spotify.</p>
    <code className="admin-code">{settings?.redirectUri || 'Caricamento indirizzo di ritorno…'}</code>
    <form className="admin-credential-form" onSubmit={save}><label>Client ID<input autoComplete="off" maxLength={32} value={clientId} onChange={event => setClientId(event.target.value)} placeholder="Client ID Spotify" required/></label><label>Client Secret<input type="password" autoComplete="new-password" maxLength={32} value={clientSecret} onChange={event => setClientSecret(event.target.value)} placeholder={settings?.configured ? 'Nuovo secret per aggiornare' : 'Client Secret Spotify'} required/></label><button className="admin-primary" type="submit" disabled={busy || !settings}>{busy ? 'Salvataggio…' : settings?.configured ? 'Aggiorna app' : 'Salva app Spotify'}</button></form>
    {notice && <p className="history-success" role="status">{notice}</p>}{error && <p className="history-error" role="alert">{error}</p>}
  </section>;
}
