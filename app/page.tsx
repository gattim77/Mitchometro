import Dashboard from './dashboard';
import { requireChatGPTUser } from './chatgpt-auth';
import { actor } from '@/lib/server/storage';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await requireChatGPTUser('/');
  return <Dashboard viewerName={user.displayName} viewerIsMaster={!!(await actor())?.isMasterOwner} />;
}
