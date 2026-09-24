'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  id: string
  title: string
  soldCount: number
}

export function RaffleQuickActions({ id, title, soldCount }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (soldCount > 0) {
      alert(`"${title}" já tem ${soldCount} bilhete(s) vendido(s) e não pode ser excluída. Use "Editar" para cancelá-la.`)
      return
    }

    if (!window.confirm(`Excluir "${title}"? Todos os bilhetes serão apagados. Não pode ser desfeito.`)) {
      return
    }

    setLoading(true)
    const { error } = await supabase.from('raffles').delete().eq('id', id)

    if (error) {
      alert('Erro ao excluir: ' + error.message)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/rifas/${id}/gerenciar`}
        className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition"
      >
        Editar
      </Link>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive text-xs font-semibold hover:bg-destructive/25 transition disabled:opacity-50"
      >
        {loading ? '...' : 'Excluir'}
      </button>
    </div>
  )
}
