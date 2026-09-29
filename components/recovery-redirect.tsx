'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

// Link de recuperação pode cair em qualquer página (Supabase cai na raiz
// quando o redirect_to não está na whitelist). Garante o caminho certo.
export function RecoveryRedirect() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') router.push('/resetar-senha')
    })
    return () => subscription.unsubscribe()
  }, [router])

  return null
}
