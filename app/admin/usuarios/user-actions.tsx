'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

export function UserActions({
  userId,
  role,
  isAffiliate,
  isSelf,
}: {
  userId: string
  role: string
  isAffiliate: boolean
  isSelf: boolean
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const update = async (data: Record<string, unknown>) => {
    setLoading(true)
    const { error } = await supabase.from('profiles').update(data).eq('id', userId)
    setLoading(false)
    if (error) {
      alert('Erro ao atualizar: ' + error.message)
    } else {
      router.refresh()
    }
  }

  if (isSelf) {
    return <span className="text-muted-foreground text-xs">Você</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => update({ is_affiliate: !isAffiliate })}
        disabled={loading}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
          isAffiliate
            ? 'bg-secondary/15 text-secondary hover:bg-secondary/25'
            : 'bg-primary/15 text-primary hover:bg-primary/25'
        }`}
      >
        {isAffiliate ? 'Remover parceiro' : 'Tornar parceiro'}
      </button>
      <button
        onClick={() => update({ role: role === 'admin' ? 'user' : 'admin' })}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:text-foreground transition disabled:opacity-50"
      >
        {role === 'admin' ? 'Remover admin' : 'Tornar admin'}
      </button>
    </div>
  )
}
