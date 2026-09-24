import { redirect } from 'next/navigation'
import { UserShell } from '@/components/user-shell'
import { getSessionUser } from '@/lib/get-session-user'
import { AffiliateEarnings } from '@/components/affiliate-earnings'

export default async function CommissionsPage() {
  const { session, userName, isAdmin, isAffiliate } = await getSessionUser()

  if (!isAffiliate) redirect('/rifas')

  return (
    <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
      <AffiliateEarnings userId={session.user.id} />
    </UserShell>
  )
}
