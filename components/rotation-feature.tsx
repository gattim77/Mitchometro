'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, AudioLines, Disc3, Headphones, Heart, RefreshCw } from 'lucide-react';
import { tracks } from '@/lib/tracks';

type RotationTrack = { artist: string; title: string };

export default function RotationFeature({ revision, selected, setSelected, saved, toggleSave }: {
  revision: number;
  selected: number;
  setSelected: (index: number) => void;
  saved: number[];
  toggleSave: (index: number) => void;
}) {
  const [masterTrack, setMasterTrack] = useState<RotationTrack | null>(null);
  const [busy, setBusy] = useState(false);
  const demoTrack = tracks[selected];

  async function refresh(exclude?: RotationTrack, signal?: AbortSignal) {
    try {
      const key = exclude ? `${exclude.artist}\u0000${exclude.title}` : '';
      const response = await fetch(`/api/rotation${key ? `?exclude=${encodeURIComponent(key)}` : ''}`, { cache: 'no-store', signal });
      if (!response.ok) throw new Error('Rotazione non disponibile');
      const result = await response.json() as { track: RotationTrack | null };
      if (!signal?.aborted) setMasterTrack(result.track);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setMasterTrack(null);
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/rotation', { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Rotazione non disponibile'); return response.json() as Promise<{ track: RotationTrack | null }>; })
      .then(result => setMasterTrack(result.track))
      .catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) setMasterTrack(null); });
    return () => controller.abort();
  }, [revision]);

  return <section className="panel feature">
    <div className="section-top"><h2><span className="mint"><AudioLines size={20}/></span> Nella tua rotazione</h2><span className="micro-label">{masterTrack ? 'DAL RIFERIMENTO MASTER' : 'SELEZIONE DEMO'}</span></div>
    {masterTrack ? <>
      <div className="featured-song">
        <div className="master-art" aria-hidden="true"><AudioLines size={58}/><span>MITCHOMETRO<br/>MASTER ROTATION</span></div>
        <div className="song-info"><span className="tag">SCELTA CASUALE</span><h3>{masterTrack.title}</h3><p className="artist">{masterTrack.artist}</p><p>Un brano dal riferimento privato.</p><div className="song-actions"><a className="play-link" href={`https://open.spotify.com/search/${encodeURIComponent(`${masterTrack.artist} ${masterTrack.title}`)}`} target="_blank" rel="noreferrer"><Disc3 size={17}/> Cerca su Spotify <ArrowUpRight size={15}/></a></div></div>
      </div>
      <div className="master-selector"><span>Scelto tra i brani più ascoltati dal master nell’ultimo anno.</span><button type="button" onClick={() => { setBusy(true); void refresh(masterTrack); }} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''}/> Un altro brano</button></div>
    </> : <>
      <div className="featured-song"><a href={demoTrack.source} target="_blank" rel="noreferrer" aria-label={`Copertina di ${demoTrack.album} su Apple Music`}><img className="cover" src={demoTrack.image} alt={`Copertina ${demoTrack.album}`} /></a><div className="song-info"><span className="tag">{demoTrack.genre}</span><h3>{demoTrack.title}</h3><p className="artist">{demoTrack.artist}</p><p>{demoTrack.album} · {demoTrack.year}</p><div className="song-actions"><a className="play-link" href={`https://open.spotify.com/search/${encodeURIComponent(`${demoTrack.artist} ${demoTrack.title}`)}`} target="_blank" rel="noreferrer"><Disc3 size={17}/> Apri in Spotify <ArrowUpRight size={15}/></a><button className={`icon-button ${saved.includes(selected) ? 'liked' : ''}`} aria-label={saved.includes(selected) ? 'Rimuovi dai salvati' : 'Salva brano'} aria-pressed={saved.includes(selected)} onClick={() => toggleSave(selected)}><Heart size={20} fill={saved.includes(selected) ? 'currentColor' : 'none'}/></button></div></div></div>
      <div className="track-selector">{tracks.map((track, index) => <button key={track.title} onClick={() => setSelected(index)} aria-label={`Mostra ${track.title}`} aria-pressed={index === selected} className={index === selected ? 'active' : ''}><span>0{index + 1}</span><span>{track.artist}</span></button>)}</div>
    </>}
    <div className="feature-footer"><Headphones size={16}/><span>La colonna sonora della tua personalità.</span><span className="mint">Falla sentire.</span></div>
  </section>;
}
