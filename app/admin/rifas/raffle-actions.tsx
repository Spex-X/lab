'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function RaffleActions({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const toggleStatus = async () => {
    const newStatus = status === 'active' ? 'paused' : 'active'
    setLoading(true)
    const { error } = await supabase
      .from('raffles')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      alert('Erro: ' + error.message)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  const deleteRaffle = async () => {
    if (!window.confirm('Excluir esta rifa? Todos os bilhetes e pedidos serão apagados. Esta ação não pode ser desfeita.')) {
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('raffles')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Erro ao excluir: ' + error.message)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="flex gap-2">
      <Link
        href={`/rifas/${id}/gerenciar`}
        className="px-3 py-1 rounded text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition"
      >
        Editar
      </Link>
      {status !== 'cancelled' && (
        <button
          onClick={toggleStatus}
          disabled={loading}
          className={`px-3 py-1 rounded text-xs font-semibold transition disabled:opacity-50 ${
            status === 'active'
              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {status === 'active' ? 'Pausar' : 'Ativar'}
        </button>
      )}
      <button
        onClick={deleteRaffle}
        disabled={loading}
        className="px-3 py-1 rounded text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
      >
        Excluir
      </button>
    </div>
  )
}
