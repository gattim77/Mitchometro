import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import AuthForm from '../auth-form';
import { getUser, safeReturnTo } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  if (await getUser()) redirect(safeReturnTo(params.returnTo));
  return <AuthForm mode="register" returnTo={safeReturnTo(params.returnTo)} googleEnabled={!!env.GOOGLE_CLIENT_ID}/>;
}
