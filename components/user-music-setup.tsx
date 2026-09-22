'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock3, FileUp, Link2, Trash2 } from 'lucide-react';
import HistoryUpload from '@/components/history-upload';

type Status = { configured: boolean; connected: boolean; source: 'recent' | 'upload' | null; plays: number; updatedAt: number | null };

export default function UserMusicSetup({ onUpdated }: { onUpdated: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    const response = await fetch('/api/spotify/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Stato Spotify non disponibile.');
    setStatus(await response.json() as Status);
  }
  useEffect(() => {
    fetch('/api/spotify/status', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Stato Spotify non disponibile.'); return response.json() as Promise<Status>; })
      .then(setStatus)
      .catch(caught => setError(caught instanceof Error ? caught.message : 'Stato Spotify non disponibile.'));
  }, []);

  async function disconnect() {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/spotify/status', { method: 'DELETE' });
      if (!response.ok) throw new Error('Disconnessione non riuscita.');
      await refresh(); onUpdated(); setNotice('Account Spotify scollegato.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Disconnessione non riuscita.'); }
    finally { setBusy(false); }
  }

  return <div className="music-options">
    <section className="music-option"><div className="music-option-heading"><Clock3 size={20}/><div><h3>Giudizio rapido</h3><p>Collega Spotify e analizziamo i brani riprodotti di recente.</p></div></div><p>Spotify chiederà solo il permesso <strong>“Access your recently played items”</strong> (<code>user-read-recently-played</code>). Il campione è limitato a ciò che l’API rende disponibile; non rappresenta la tua cronologia completa.</p>
      {status?.connected && <p className="history-status">Spotify collegato{status.source === 'recent' ? ` · ${status.plays.toLocaleString('it-IT')} ascolti nel campione` : ''}.</p>}
      {status?.source === 'upload' && <p className="history-status">Collegando Spotify, il giudizio rapido sostituirà il riepilogo del giudizio finale. Potrai ricaricare i file per ripristinarlo.</p>}
      {status?.configured ? <a className="connect" href="/api/spotify/start"><Link2 size={17}/>{status.connected ? 'Ricollega Spotify' : 'Collega Spotify'} <ArrowUpRight size={15}/></a> : <p className="history-status">Connessione in preparazione: l’admin deve prima configurare l’app Spotify.</p>}
      {status?.configured && <p className="history-status">Se Spotify rifiuta l’accesso, chiedi all’admin di aggiungere il tuo account agli utenti autorizzati dell’app.</p>}
      {status?.connected && <button className="disconnect-button" type="button" disabled={busy} onClick={disconnect}><Trash2 size={15}/> Scollega Spotify</button>}
    </section>
    <section className="music-option"><div className="music-option-heading"><FileUp size={20}/><div><h3>Il giudizio finale di Mitch</h3><p>Usa la tua cronologia estesa per un confronto più completo.</p></div></div><HistoryUpload role="user" onUpdated={() => { void refresh(); onUpdated(); }}/></section>
    {notice && <p className="history-success" role="status">{notice}</p>}{error && <p className="history-error" role="alert">{error}</p>}
  </div>;
}
