import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Mitchometro — Il tuo gusto, senza filtri', description: 'Esplora il tuo universo musicale: un prototipo interattivo con confronto privato, punti di forza e nuove prospettive.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="it"><body>{children}</body></html>; }
