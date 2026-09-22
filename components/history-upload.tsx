'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, FileUp, Trash2 } from 'lucide-react';
import { profileFromFiles } from '@/lib/history-profile';

type Status = { mine: { uploadedAt: number; plays: number } | null; masterReady: boolean; master?: { uploadedAt: number; plays: number } | null };

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
  useEffect(() => { void refresh().catch(e => setError(e.message)); }, []);

  async function upload() {
    setBusy(true); setError(''); setNotice('');
    try {
      const profile = await profileFromFiles(files);
      const response = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, profile }) });
      const result = await response.json() as { error?: string; plays?: number };
      if (!response.ok) throw new Error(result.error || 'Caricamento non riuscito.');
      setFiles([]);
      await refresh();
      onUpdated?.();
      setNotice(`Cronologia salvata: ${result.plays?.toLocaleString('it-IT') ?? ''} ascolti nell’ultimo anno.`);
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
      setNotice('Cronologia eliminata.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Eliminazione non riuscita.'); }
    finally { setBusy(false); }
  }
  return <div className="history-upload">
    <ol className="history-steps">
      <li>Apri <a href="https://www.spotify.com/account/privacy/" target="_blank" rel="noreferrer">Privacy dell’account Spotify <ArrowUpRight size={13}/></a> e scegli <strong>Scarica i tuoi dati</strong>.</li>
      <li>Richiedi <strong>Cronologia di ascolto</strong> (ultimo anno) o <strong>Cronologia di ascolto estesa</strong> (intero account).</li>
      <li>Quando Spotify ti invia lo ZIP, estrailo e seleziona qui tutti i file JSON della cronologia musicale.</li>
    </ol>
    <p className="history-help">Accettiamo i JSON standard e quelli della cronologia estesa. Escludiamo podcast e riproduzioni sotto i 30 secondi. Il browser invia soltanto i conteggi degli artisti necessari al confronto: IP, dispositivo e file originali non vengono salvati.</p>
    <label className="history-file-label"><FileUp size={18}/> Seleziona i file JSON<input type="file" accept=".json,application/json" multiple onChange={event => setFiles([...event.target.files ?? []])} /></label>
    {files.length > 0 && <p className="history-selected">{files.length} {files.length === 1 ? 'file selezionato' : 'file selezionati'}: {files.map(file => file.name).join(', ')}</p>}
    <div className="history-actions"><button className="connect" type="button" disabled={busy || !files.length} onClick={upload}>{busy ? 'Elaborazione…' : current ? 'Sostituisci cronologia' : 'Carica cronologia'}</button>{current && <button className="history-delete" type="button" disabled={busy} onClick={remove}><Trash2 size={15}/> Elimina</button>}</div>
    {current && <p className="history-status">Ultimo caricamento: {new Date(current.uploadedAt).toLocaleDateString('it-IT')} · {current.plays.toLocaleString('it-IT')} ascolti nell’ultimo anno.</p>}
    {role === 'user' && status && !status.masterReady && <p className="history-status">Il confronto sarà disponibile quando l’admin avrà caricato la cronologia master.</p>}
    {notice && <p className="history-success" role="status">{notice}</p>}
    {error && <p className="history-error" role="alert">{error}</p>}
  </div>;
}
