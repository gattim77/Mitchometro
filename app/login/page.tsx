import { redirect } from 'next/navigation';
import AuthForm from '../auth-form';
import { getUser, safeReturnTo } from '@/lib/server/auth';
import { runtimeString } from '@/lib/server/runtime-env';

export const dynamic = 'force-dynamic';
const errors: Record<string, string> = { google_failed: 'Accesso Google non riuscito. Riprova.', google_unavailable: 'Accesso Google non ancora configurato.' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const params = await searchParams;
  if (await getUser()) redirect(safeReturnTo(params.returnTo));
  return <AuthForm mode="login" returnTo={safeReturnTo(params.returnTo)} googleEnabled={!!runtimeString('GOOGLE_CLIENT_ID')} initialError={params.error ? errors[params.error] : undefined}/>;
}
