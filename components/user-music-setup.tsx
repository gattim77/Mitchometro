'use client';

import { FileUp } from 'lucide-react';
import HistoryUpload from '@/components/history-upload';

export default function UserMusicSetup({ onUpdated }: { onUpdated: () => void }) {
  return <div className="music-options">
    <section className="music-option"><div className="music-option-heading"><FileUp size={20}/><div><h3>Il giudizio finale di Mitch</h3><p>Carica la tua cronologia di ascolto estesa per confrontarla con il riferimento privato.</p></div></div><HistoryUpload role="user" onUpdated={onUpdated}/></section>
  </div>;
}
