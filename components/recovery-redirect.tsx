'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

// Link de recuperação pode cair em qualquer página (Supabase cai na raiz
// quando o redirect_to não está na whitelist). Garante o caminho certo.
export function RecoveryRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Caminho 1: o token ainda está no hash — preserva e manda direto
    if (window.location.hash.includes('type=recovery')) {
      window.location.replace(`/resetar-senha${window.location.hash}`)
      return
    }

    // Caminho 2: o SDK consumiu o hash e dispara o evento de recovery
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
