import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url, affiliate_code, is_affiliate')
    .eq('id', session.user.id)
    .single()

  const email = session.user.email ?? ''
  const userName = profile?.full_name || email.split('@')[0] || 'Usuário'

  return {
    supabase,
    session,
    user: session.user,
    email,
    userName,
    isAdmin: profile?.role === 'admin',
    isAffiliate: !!profile?.is_affiliate,
    profile,
  }
}

export function formatCurrency(value: number | string | null | undefined, digits = 2) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: digits,
  }).format(Number(value ?? 0))
}

export function formatDate(value: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', opts ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}
