import { redirect } from 'next/navigation'
import { UserShell } from '@/components/user-shell'
import { getSessionUser } from '@/lib/get-session-user'
import { AffiliateDashboard } from '@/components/affiliate-dashboard'

export default async function AffiliatesPage() {
  const { session, userName, isAdmin, isAffiliate, profile } = await getSessionUser()

  // Painel de afiliado só para afiliados aprovados pelo admin
  if (!isAffiliate) redirect('/rifas')

  return (
    <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
      <AffiliateDashboard userId={session.user.id} affiliateCode={profile?.affiliate_code ?? ''} />
    </UserShell>
  )
}
