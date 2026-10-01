'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { UserSidebar } from './user-sidebar'
import { MobileNav } from './mobile-nav'

type UserInfo = {
  userName: string
  email: string
  isAdmin: boolean
  isAffiliate: boolean
  avatarUrl: string
}

// Cache em memória entre navegações: o shell remonta a cada página,
// mas o perfil só é buscado uma vez por sessão do navegador.
let cachedInfo: (UserInfo & { userId: string }) | null = null

export function invalidateUserShellCache() {
  cachedInfo = null
}

export function hasCachedUser() {
  return cachedInfo !== null
}

export function UserShell({
  children,
  userName,
  email,
  isAdmin,
}: {
  children: React.ReactNode
  userName?: string
  email?: string
  isAdmin?: boolean
}) {
  const [info, setInfo] = useState<UserInfo | null>(cachedInfo)

  useEffect(() => {
    const supabase = createClient()
    // getSession é local (sem ida ao servidor) — a rota já foi protegida no proxy
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user
      if (!user) {
        cachedInfo = null
        window.location.href = '/login'
        return
      }
      if (cachedInfo?.userId === user.id) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_url, is_affiliate')
        .eq('id', user.id)
        .single()

      cachedInfo = {
        userId: user.id,
        userName: profile?.full_name || userName || user.email?.split('@')[0] || 'Usuário',
        email: email || user.email || '',
        isAdmin: isAdmin ?? profile?.role === 'admin',
        isAffiliate: !!profile?.is_affiliate,
        avatarUrl: profile?.avatar_url || '',
      }
      setInfo(cachedInfo)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') cachedInfo = null
    })
    return () => sub.subscription.unsubscribe()
  }, [userName, email, isAdmin])

  const name = info?.userName || userName || '...'
  const mail = info?.email || email || ''
  const admin = info?.isAdmin ?? isAdmin ?? false
  const affiliate = info?.isAffiliate || false

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <UserSidebar
        userName={name}
        email={mail}
        isAdmin={admin}
        isAffiliate={affiliate}
        avatarUrl={info?.avatarUrl}
      />
      <div className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-0">
        <MobileNav userName={name} email={mail} isAdmin={admin} isAffiliate={affiliate} />
        {children}
      </div>
    </div>
  )
}
