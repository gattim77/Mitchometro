'use client';

import { FileUp } from 'lucide-react';
import HistoryUpload from '@/components/history-upload';

export default function UserMusicSetup({ onUpdated }: { onUpdated: () => void }) {
  return <div className="music-options">
    <section className="music-option"><div className="music-option-heading"><FileUp size={20}/><div><h3>Presenta le prove al Sommo Maestro</h3><p>Carica la cronologia di ascolto estesa: Sua Santità del Punk la confronterà con il proprio sacro canone privato.</p></div></div><HistoryUpload role="user" onUpdated={onUpdated}/></section>
  </div>;
}
