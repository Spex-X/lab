'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PRIZE_TIERS, tierPot } from '@/lib/prize'

const NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1)
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

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
  // Ganhadores (4+ acertos) e arrecadação de cada sorteio encerrado
  const [winnersByRaffle, setWinnersByRaffle] = useState<Record<string, any[]>>({})
  const [revenueByRaffle, setRevenueByRaffle] = useState<Record<string, number>>({})

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
      .select('id, title, prize_name, status, draw_date, winning_numbers, base_prize')
      .in('status', ['active', 'paused', 'completed'])
      .order('created_at', { ascending: false })
    setRaffles(data ?? [])
    setLoading(false)

    const drawnIds = (data ?? []).filter((r) => r.winning_numbers).map((r) => r.id)
    if (!drawnIds.length) return
    const [{ data: bets }, stats] = await Promise.all([
      supabase
        .from('bets')
        .select('id, numbers, hits, raffle_id, profiles(full_name, email)')
        .in('raffle_id', drawnIds)
        .gte('hits', 4)
        .order('hits', { ascending: false }),
      Promise.all(drawnIds.map((id) => supabase.rpc('get_raffle_stats', { p_raffle_id: id }))),
    ])
    const grouped: Record<string, any[]> = {}
    ;(bets ?? []).forEach((b: any) => {
      ;(grouped[b.raffle_id] ??= []).push(b)
    })
    const revenue: Record<string, number> = {}
    stats.forEach(({ data: s }, i) => {
      revenue[drawnIds[i]] = Number((s as any)?.revenue ?? 0)
    })
    setWinnersByRaffle(grouped)
    setRevenueByRaffle(revenue)
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
                    href="/admin/ganhadores"
                    className="text-primary hover:underline text-xs font-medium shrink-0"
                  >
                    Todos os ganhadores →
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

                {(() => {
                  const ws = winnersByRaffle[r.id] ?? []
                  if (!ws.length) {
                    return <p className="text-xs text-muted-foreground mt-3">Nenhum ganhador (4+ acertos) nesse sorteio.</p>
                  }
                  return (
                    <div className="mt-4 pt-3 border-t border-border space-y-1.5">
                      {ws.map((w: any) => {
                        const tier = PRIZE_TIERS.find((t) => t.hits === w.hits)
                        const n = ws.filter((x: any) => x.hits === w.hits).length
                        const prize = tier ? tierPot(tier, revenueByRaffle[r.id], r.base_prize) / Math.max(n, 1) : 0
                        return (
                          <div key={w.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                            <span className="font-medium text-foreground">
                              {w.profiles?.full_name || w.profiles?.email || 'Participante'}
                              {w.profiles?.full_name && (
                                <span className="text-xs text-muted-foreground font-normal"> · {w.profiles.email}</span>
                              )}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {[...w.numbers]
                                .sort((a: number, b: number) => a - b)
                                .map((x: number) => String(x).padStart(2, '0'))
                                .join(' ')}
                            </span>
                            <span className={`font-semibold tabular-nums ${w.hits === 6 ? 'text-primary' : 'text-foreground'}`}>
                              {w.hits === 6 ? '🏆 ' : ''}
                              {tier?.label} ({w.hits}) · {formatCurrency(prize)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
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
