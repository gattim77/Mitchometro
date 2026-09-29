import Dashboard from './dashboard';
import { requireChatGPTUser } from './chatgpt-auth';
import { actor, database } from '@/lib/server/storage';
import { validateHistoryProfile } from '@/lib/history-profile';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await requireChatGPTUser('/');
  const uploaded = await database().prepare("SELECT summary FROM listening_profiles WHERE owner_id = ? AND role = 'user'")
    .bind(user.userId).first<{ summary: string }>();
  const profile = uploaded ? await Promise.resolve().then(() => validateHistoryProfile(JSON.parse(uploaded.summary))).catch(() => null) : null;
  return <Dashboard viewerName={user.displayName} viewerIsMaster={!!(await actor())?.isMasterOwner} initialHasUpload={profile?.source === 'upload'} />;
}
