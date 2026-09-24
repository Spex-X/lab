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
  const [info, setInfo] = useState<UserInfo | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_url, is_affiliate')
        .eq('id', user.id)
        .single()

      setInfo({
        userName: profile?.full_name || userName || user.email?.split('@')[0] || 'Usuário',
        email: email || user.email || '',
        isAdmin: isAdmin ?? profile?.role === 'admin',
        isAffiliate: !!profile?.is_affiliate,
        avatarUrl: profile?.avatar_url || '',
      })
    })
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
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav userName={name} email={mail} isAdmin={admin} isAffiliate={affiliate} />
        {children}
      </div>
    </div>
  )
}
