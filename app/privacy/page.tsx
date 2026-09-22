import Link from 'next/link';

export const metadata = { title: 'Privacy — Mitchometro' };

export default function Privacy() {
  return <main className="privacy-page">
    <Link href="/">← Mitchometro</Link>
    <h1>Privacy</h1>
    <p>Puoi collegare Spotify per un giudizio rapido o caricare i file JSON della cronologia di ascolto estesa per il giudizio finale. Il collegamento chiede soltanto il permesso “Access your recently played items”. Mitchometro non chiede la tua password Spotify.</p>
    <p>Per il giudizio rapido, il server legge i brani riprodotti di recente tramite Spotify e conserva solo conteggi per artista e indicatori aggregati. I token di accesso sono cifrati sul server e puoi eliminarli scollegando Spotify. Per il giudizio finale, il browser legge i JSON e invia gli stessi riepiloghi per gli ultimi 28 giorni, 6 mesi e 12 mesi. Non salviamo i file originali, i dati su IP e dispositivo presenti nei file o la cronologia dei singoli brani degli utenti.</p>
    <p>Conserviamo il riepilogo sul server, associato al tuo accesso a Mitchometro. Puoi sostituirlo o eliminarlo dalle opzioni di analisi. L’admin carica un riferimento separato: oltre ai conteggi, conserviamo fino a 500 titoli e artisti tra i suoi brani più ascoltati nell’ultimo anno. La dashboard mostra un brano casuale alla volta. L’identità, i conteggi e il profilo completo del master non vengono restituiti agli altri utenti.</p>
    <p>Le copertine dei brani dimostrativi vengono caricate da Apple Music, che riceve la normale richiesta del browser. I brani salvati nella demo rimangono nella memoria della sessione e spariscono quando ricarichi la pagina.</p>
    <p>Per domande o richieste sui dati, contatta il proprietario del sito tramite il canale con cui hai ricevuto il link.</p>
  </main>;
}
