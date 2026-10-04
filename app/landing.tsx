import Link from 'next/link';
import { ArrowRight, AudioLines, ChartNoAxesCombined, FileJson, LockKeyhole, Sparkles } from 'lucide-react';

export default function Landing() {
  return <div className="public-shell">
    <header className="public-nav"><Link className="brand" href="/"><AudioLines/><span>Mitch<span className="gradient-text">ometro</span><small>Il tribunale supremo delle tue scelte musicali.</small></span></Link><div><Link className="public-login" href="/login">Accedi</Link><Link className="connect" href="/register">Registrati <ArrowRight size={16}/></Link></div></header>
    <main>
      <section className="public-hero"><div className="eyebrow mint">IL GIUDIZIO FINALE DI MITCH</div><h1>I tuoi ascolti.<br/><span className="gradient-text">Il verdetto del Maestro.</span></h1><p>Mitchometro confronta la tua cronologia Spotify con il canone musicale segreto del Sommo Maestro e trasforma ogni scelta in un punteggio da 0 a 120.</p><div className="public-actions"><Link className="connect" href="/register">Sottoponiti al giudizio <ArrowRight size={18}/></Link><Link className="public-login" href="/login">Ho già un account</Link></div></section>
      <section className="feature-summary" aria-label="Funzioni"><article><ChartNoAxesCombined/><h2>Un verdetto completo</h2><p>Punteggio generale, punti forti, debolezze e confronto su mese, anno e intera cronologia.</p></article><article><Sparkles/><h2>Sintonia col Maestro</h2><p>Artisti e brani condivisi, affinità degli ascolti e messaggi sarcastici senza possibilità di appello.</p></article><article><FileJson/><h2>I dati restano sotto controllo</h2><p>Carichi l’esportazione Spotify; il browser prepara il profilo e puoi eliminarlo quando vuoi.</p></article><article><LockKeyhole/><h2>Canone privato</h2><p>La cronologia del Maestro resta sul server ed è usata soltanto come riferimento segreto.</p></article></section>
      <figure className="public-screenshot"><div className="example-label"><Sparkles size={15}/> ESEMPIO DI VERDETTO</div><img src="/mitchometro-dashboard-example.jpeg" alt="Esempio della dashboard Mitchometro con punteggio e confronto musicale"/><figcaption>Un assaggio del tribunale musicale. Il tuo vero verdetto nasce dai tuoi ascolti.</figcaption></figure>
    </main>
    <footer className="public-footer"><span><AudioLines size={15}/> Mitchometro</span><div><Link href="/privacy">Privacy</Link><span>Il giudizio del Maestro è insindacabile.</span></div></footer>
  </div>;
}
