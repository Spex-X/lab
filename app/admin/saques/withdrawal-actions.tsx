'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export function WithdrawalActions({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const update = async (status: 'paid' | 'rejected') => {
    setLoading(true)
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status, processed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      alert('Erro: ' + error.message)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => update('paid')}
        disabled={loading}
        className="px-3 py-1 rounded text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50"
      >
        Marcar pago
      </button>
      <button
        onClick={() => update('rejected')}
        disabled={loading}
        className="px-3 py-1 rounded text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
      >
        Rejeitar
      </button>
    </div>
  )
}
