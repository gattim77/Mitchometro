import { requireUser } from '@/lib/server/auth';
import AdminTransferClient from './transfer-client';
import '../admin.css';

export const dynamic = 'force-dynamic';

export default async function AdminTransferPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  await requireUser(`/admin/transfer?token=${encodeURIComponent(token)}`);
  return <AdminTransferClient token={token}/>;
}
