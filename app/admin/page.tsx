import { notFound } from 'next/navigation';
import { actor } from '@/lib/server/spotify';
import AdminClient from './admin-client';
import './admin.css';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  if (!(await actor())?.isMasterOwner) notFound();
  return <AdminClient />;
}
