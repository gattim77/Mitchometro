import Link from 'next/link';

export const metadata = { title: 'Privacy — Mitchometro' };

export default function Privacy() {
  return <main className="privacy-page">
    <Link href="/">← Mitchometro</Link>
    <h1>Privacy</h1>
    <p>Per il confronto puoi caricare i file JSON della tua cronologia di ascolto, scaricati direttamente dal tuo account Spotify. Mitchometro non si collega al tuo account Spotify e non chiede la tua password.</p>
    <p>Per gli utenti, il browser invia al server solo i conteggi degli artisti e gli indicatori necessari per gli ultimi 28 giorni, 6 mesi e 12 mesi. Non salviamo i file originali, gli indirizzi IP, i dati sul dispositivo o la cronologia dei singoli brani.</p>
    <p>Conserviamo il riepilogo sul server, associato al tuo accesso a Mitchometro. Puoi sostituirlo o eliminarlo in qualsiasi momento dal pulsante “Carica la tua cronologia”. L’admin carica un riferimento separato: oltre ai conteggi, conserviamo fino a 500 titoli e artisti tra i suoi brani più ascoltati nell’ultimo anno. La dashboard mostra un brano casuale alla volta. L’identità, i conteggi e il profilo completo del master non vengono restituiti agli altri utenti.</p>
    <p>Le copertine dei brani dimostrativi vengono caricate da Apple Music, che riceve la normale richiesta del browser. I brani salvati nella demo rimangono nella memoria della sessione e spariscono quando ricarichi la pagina.</p>
    <p>Per domande o richieste sui dati, contatta il proprietario del sito tramite il canale con cui hai ricevuto il link.</p>
  </main>;
}
