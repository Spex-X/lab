'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1)

export default function AdminResultadosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [raffles, setRaffles] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [drawPick, setDrawPick] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      loadRaffles()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadRaffles = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('raffles')
      .select('id, title, prize_name, status, draw_date, winning_numbers')
      .in('status', ['active', 'paused', 'completed'])
      .order('created_at', { ascending: false })
    setRaffles(data ?? [])
    setLoading(false)
  }

  const pendingDraw = raffles.filter((r) => !r.winning_numbers && r.status !== 'completed')
  const drawn = raffles.filter((r) => r.winning_numbers)

  const toggleNumber = (n: number) => {
    setDrawPick((prev) =>
      prev.includes(n) ? prev.filter((t) => t !== n) : prev.length < 6 ? [...prev, n] : prev
    )
  }

  const handleDraw = async () => {
    if (!selected || drawPick.length !== 6 || drawing) return
    if (
      !window.confirm(
        `Lançar resultado de "${selected.title}" com os números ${[...drawPick]
          .sort((a, b) => a - b)
          .join(', ')}? Isso encerra o sorteio e não pode ser desfeito.`
      )
    )
      return

    setDrawing(true)
    setError('')
    setSuccess('')
    try {
      const { data, error: rpcError } = await supabase.rpc('draw_raffle', {
        p_raffle_id: selected.id,
        p_winning_numbers: [...drawPick].sort((a, b) => a - b),
      })

      if (rpcError) throw rpcError
      if (data?.error) throw new Error(data.error)

      setSuccess(`Resultado lançado! ${data.winners_sena ?? 0} Sena · ${data.winners_quina ?? 0} Quina · ${data.winners_quadra ?? 0} Quadra.`)
      setSelected(null)
      setDrawPick([])
      loadRaffles()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDrawing(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">Resultados ao vivo</h2>
        <p className="text-muted-foreground mt-1">
          Lance os 6 números sorteados — o sistema encerra a campanha e calcula os acertos na hora.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Aguardando resultado */}
      <section className="bg-card rounded-lg border border-border p-6 mb-8">
        <h3 className="text-xl font-bold text-foreground mb-4">Aguardando resultado</h3>
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : pendingDraw.length > 0 ? (
          <div className="space-y-3">
            {pendingDraw.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.prize_name}</p>
                </div>
                <button
                  onClick={() => {
                    setSelected(r)
                    setDrawPick([])
                    setError('')
                    setSuccess('')
                  }}
                  className="shrink-0 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
                >
                  Lançar resultado
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhum sorteio aguardando resultado.</p>
        )}
      </section>

      {/* Painel de lançamento */}
      {selected && (
        <section className="bg-card rounded-lg border border-border p-6 mb-8 border-2 border-destructive/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">{selected.title}</h3>
              <p className="text-sm text-muted-foreground">Marque os 6 números sorteados ao vivo</p>
            </div>
            <button
              onClick={() => {
                setSelected(null)
                setDrawPick([])
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {NUMBERS.map((n) => {
              const picked = drawPick.includes(n)
              return (
                <button
                  key={n}
                  onClick={() => toggleNumber(n)}
                  className={`w-10 h-10 rounded-lg text-sm font-semibold transition ${
                    picked
                      ? 'bg-red-600 text-white'
                      : 'bg-muted text-foreground hover:bg-muted/60'
                  }`}
                >
                  {n}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {drawPick.length}/6 selecionados
              {drawPick.length > 0 && (
                <span className="font-semibold text-foreground">
                  {' '}· {[...drawPick].sort((a, b) => a - b).join(', ')}
                </span>
              )}
            </p>
            <button
              onClick={handleDraw}
              disabled={drawPick.length !== 6 || drawing}
              className="px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {drawing ? 'Lançando...' : 'Confirmar resultado'}
            </button>
          </div>
        </section>
      )}

      {/* Encerrados */}
      <section className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-4">Sorteios encerrados</h3>
        {drawn.length > 0 ? (
          <div className="space-y-3">
            {drawn.map((r) => (
              <div key={r.id} className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.prize_name}</p>
                  </div>
                  <Link
                    href={`/rifas/${r.id}/gerenciar`}
                    className="text-blue-600 hover:underline text-xs font-medium shrink-0"
                  >
                    Ver ganhadores
                  </Link>
                </div>
                <div className="flex gap-1.5 mt-3">
                  {[...r.winning_numbers].sort((a: number, b: number) => a - b).map((n: number) => (
                    <span
                      key={n}
                      className="w-9 h-9 rounded-lg bg-green-600 text-white flex items-center justify-center text-sm font-bold"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhum sorteio encerrado ainda.</p>
        )}
      </section>
    </main>
  )
}
