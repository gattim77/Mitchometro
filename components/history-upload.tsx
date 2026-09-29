'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, FileUp, Trash2 } from 'lucide-react';
import { profileFromFiles } from '@/lib/history-profile';

type Status = { mine: { uploadedAt: number; plays: number; lifetimeReady: boolean } | null; masterReady: boolean; masterLifetimeReady: boolean; master?: { uploadedAt: number; plays: number; rotationReady: boolean; lifetimeReady: boolean } | null };

export default function HistoryUpload({ role, onUpdated }: { role: 'user' | 'master'; onUpdated?: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const current = role === 'master' ? status?.master : status?.mine;

  async function refresh() {
    const response = await fetch('/api/history', { cache: 'no-store' });
    if (!response.ok) throw new Error('Stato della cronologia non disponibile.');
    setStatus(await response.json() as Status);
  }
  useEffect(() => {
    fetch('/api/history', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Stato della cronologia non disponibile.'); return response.json() as Promise<Status>; })
      .then(setStatus)
      .catch(e => setError(e.message));
  }, []);

  async function upload() {
    setBusy(true); setError(''); setNotice('');
    try {
      const profile = await profileFromFiles(files, true);
      const response = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, profile }) });
      const result = await response.json() as { error?: string; plays?: number };
      if (!response.ok) throw new Error(result.error || 'Caricamento non riuscito.');
      setFiles([]);
      await refresh();
      onUpdated?.();
      setNotice(`Le prove sono agli atti: il Maestro esaminerà ${result.plays?.toLocaleString('it-IT') ?? ''} ascolti complessivi.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Caricamento non riuscito.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/history', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
      if (!response.ok) throw new Error('Eliminazione non riuscita.');
      await refresh();
      onUpdated?.();
      setNotice('Le prove sono state ritirate. Il Maestro sospende il giudizio.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Eliminazione non riuscita.'); }
    finally { setBusy(false); }
  }
  return <div className="history-upload">
    <ol className="history-steps">
      <li>Apri <a href="https://www.spotify.com/account/privacy/" target="_blank" rel="noreferrer">Privacy dell’account Spotify <ArrowUpRight size={13}/></a> e scegli <strong>Scarica i tuoi dati</strong>.</li>
      <li>Richiedi <strong>Cronologia di ascolto estesa</strong> (intero account), non la cronologia standard dell’ultimo anno.</li>
      <li>Quando Spotify ti invia lo ZIP, estrailo e seleziona qui tutti i file JSON della cronologia musicale.</li>
    </ol>
    <p className="history-help">Presenta tutti i JSON della cronologia estesa. Il tribunale esamina tre periodi: ultimi 30 giorni, ultimo anno e intera cronologia. Escludiamo podcast e riproduzioni sotto i 30 secondi. Conserviamo i conteggi degli artisti e fino a 500 titoli con i relativi artisti per calcolare i brani condivisi. {role === 'master' ? 'Una reliquia del Maestro alla volta può apparire nella dashboard; il canone completo resta privato.' : 'Gli altri utenti non possono vedere il tuo elenco.'} IP, dispositivo e file originali non vengono salvati.</p>
    <label className="history-file-label"><FileUp size={18}/> Seleziona le prove in formato JSON<input type="file" accept=".json,application/json" multiple onChange={event => setFiles([...event.target.files ?? []])} /></label>
    {files.length > 0 && <p className="history-selected">{files.length} {files.length === 1 ? 'file selezionato' : 'file selezionati'}: {files.map(file => file.name).join(', ')}</p>}
    <div className="history-actions"><button className="connect" type="button" disabled={busy || !files.length} onClick={upload}>{busy ? 'Il Maestro esamina…' : current ? 'Sostituisci le prove' : 'Presenta le prove'}</button>{current && <button className="history-delete" type="button" disabled={busy} onClick={remove}><Trash2 size={15}/> Ritira le prove</button>}</div>
    {current && <p className="history-status">Ultimo caricamento: {new Date(current.uploadedAt).toLocaleDateString('it-IT')} · {current.plays.toLocaleString('it-IT')} {current.lifetimeReady ? 'ascolti complessivi' : 'ascolti nell’ultimo anno'}.</p>}
    {current && !current.lifetimeReady && <p className="history-status">Ricarica tutti i JSON della cronologia estesa per attivare il confronto “Da sempre”.</p>}
    {role === 'master' && current && !status?.master?.rotationReady && <p className="history-status">Ricostruisci il sacro canone per attivare la playlist del Maestro: il vecchio archivio conservava soltanto gli artisti.</p>}
    {role === 'user' && status && !status.masterReady && <p className="history-status">Il verdetto resterà sospeso finché il Sommo Maestro non avrà depositato il proprio sacro canone.</p>}
    {role === 'user' && status?.masterReady && !status.masterLifetimeReady && <p className="history-status">Il giudizio “Da sempre” attende che il Maestro completi i propri archivi.</p>}
    {notice && <p className="history-success" role="status">{notice}</p>}
    {error && <p className="history-error" role="alert">{error}</p>}
  </div>;
}
