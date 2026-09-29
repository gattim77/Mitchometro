import Link from 'next/link';

export const metadata = { title: 'Privacy — Mitchometro' };

export default function Privacy() {
  return <main className="privacy-page">
    <Link href="/">← Mitchometro</Link>
    <h1>Privacy</h1>
    <p>Carichi i file JSON della cronologia di ascolto estesa che hai scaricato dal tuo account Spotify. Mitchometro non collega il tuo account e non chiede la tua password Spotify.</p>
    <p>Il browser legge i JSON e invia conteggi per artista, indicatori aggregati e un’impronta tecnica non leggibile per ogni brano unico. Le impronte permettono di contare i brani condivisi sull’intero archivio senza inviare i titoli degli utenti. Non salviamo i file originali, i dati su IP e dispositivo presenti nei file o la sequenza cronologica dei singoli ascolti.</p>
    <p>Conserviamo il riepilogo sul server, associato al tuo accesso a Mitchometro. Puoi sostituirlo o eliminarlo dalle opzioni di analisi. L’admin carica un riferimento separato con gli stessi dati aggregati e, per alimentare la rotazione, fino a 500 titoli tra i propri brani più ascoltati. La dashboard può mostrarne uno casuale alla volta; l’identità, i conteggi e il profilo completo del Maestro non vengono restituiti agli altri utenti.</p>
    <p>Le copertine dei brani dimostrativi vengono caricate da Apple Music, che riceve la normale richiesta del browser. I brani salvati nella demo rimangono nella memoria della sessione e spariscono quando ricarichi la pagina.</p>
    <p>Per domande o richieste sui dati, contatta il proprietario del sito tramite il canale con cui hai ricevuto il link.</p>
  </main>;
}
