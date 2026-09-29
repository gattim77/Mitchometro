import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Mitchometro — Il Giudizio Finale di Mitch', description: 'Sottoponi i tuoi ascolti al Sommo Maestro e ricevi il suo insindacabile verdetto musicale.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="it"><body>{children}</body></html>; }
