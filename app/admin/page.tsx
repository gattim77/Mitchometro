import { notFound } from 'next/navigation';
import { actor } from '@/lib/server/storage';
import AdminClient from './admin-client';
import AdminAuthClient from './admin-auth-client';
import { adminAuthorized, adminConfigured } from '@/lib/server/admin-auth';
import './admin.css';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  if (!(await actor())?.isMasterOwner) notFound();
  if (!(await adminAuthorized())) return <AdminAuthClient configured={await adminConfigured()} />;
  return <AdminClient />;
}
