'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { suggestEmailCorrection } from '@/lib/email-suggest'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { PrizeVisual } from '@/components/prize-visual'
import { tierPot, prizePool, PRIZE_TIERS } from '@/lib/prize'

interface Raffle {
  id: string
  title: string
  description: string
  prize_name: string
  prize_value: number | null
  base_prize: number | null
  prize_image: string | null
  total_tickets: number
  available_tickets: number
  ticket_price: number
  draw_date: string | null
  status: string
  winning_numbers: number[] | null
}

const NUMBERS_POOL = Array.from({ length: 75 }, (_, i) => i + 1)
const BET_SIZE = 6

interface Order {
  id: string
  status: string
  quantity: number
  total_amount: number
  expires_at: string
  pix_qr_code: string | null
  pix_copy_paste: string | null
  mercado_pago_payment_id: string | null
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function RaffleDetailPage() {
  const [raffle, setRaffle] = useState<Raffle | null>(null)
  const [pick, setPick] = useState<number[]>([])
  const [jogos, setJogos] = useState<number[][]>([])
  const [loading, setLoading] = useState(true)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [error, setError] = useState('')
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'expired' | 'checking'>('pending')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const [emailAcknowledged, setEmailAcknowledged] = useState(false)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [arrecadado, setArrecadado] = useState(0)
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadRaffle()
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user))
  }, [params.id])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (currentOrder && paymentStatus === 'pending') {
      interval = setInterval(checkPaymentStatus, 5000)
    }
    return () => clearInterval(interval)
  }, [currentOrder, paymentStatus])

  const loadRaffle = async () => {
    try {
      const { data: raffleData, error: raffleError } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', params.id)
        .single()

      if (raffleError) throw raffleError
      setRaffle(raffleData)

      // RPC security definer: a RLS de orders só mostra os pedidos do próprio usuário
      const { data: stats } = await supabase.rpc('get_raffle_stats', { p_raffle_id: params.id })
      setArrecadado(Number((stats as any)?.revenue ?? 0))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleNumber = (n: number) => {
    setPick((prev) => {
      if (prev.includes(n)) return prev.filter((t) => t !== n)
      if (prev.length >= BET_SIZE) return prev
      return [...prev, n]
    })
  }

  const addJogo = (numbers?: number[]) => {
    const bet = numbers ?? pick
    if (bet.length !== BET_SIZE) return
    setJogos((prev) => [...prev, [...bet].sort((a, b) => a - b)])
    setPick([])
  }

  const surpresinha = () => {
    const shuffled = [...NUMBERS_POOL].sort(() => Math.random() - 0.5)
    addJogo(shuffled.slice(0, BET_SIZE))
  }

  const removeJogo = (index: number) => {
    setJogos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBuyClick = () => {
    if (jogos.length === 0 || creatingOrder) return
    setError('')
    setNeedsLogin(false)
    setPaymentStatus('pending')
    if (currentOrder && currentOrder.status !== 'pending') setCurrentOrder(null)
    setShowPaymentModal(true)
    if (isLoggedIn !== false) submitOrder()
  }

  const submitOrder = async () => {
    if (creatingOrder) return

    const isGuest = isLoggedIn === false
    if (isGuest && (!guestName.trim() || !guestEmail.trim())) {
      setError('Preencha nome e email para continuar')
      return
    }
    if (isGuest && emailSuggestion && !emailAcknowledged) {
      setEmailAcknowledged(true)
      setError(`Confira seu email — você quis dizer ${emailSuggestion}?`)
      return
    }

    setCreatingOrder(true)
    setError('')
    setNeedsLogin(false)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raffleId: params.id,
          bets: jogos,
          ...(isGuest ? { guestName: guestName.trim(), guestEmail: guestEmail.trim() } : {}),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (data.needsLogin) setNeedsLogin(true)
        throw new Error(data.error || 'Erro ao criar pedido')
      }

      // Conta criada na hora → o servidor já logou via cookies
      if (data.accountCreated) {
        setIsLoggedIn(true)
        router.refresh()
      }

      setCurrentOrder({
        id: data.orderId,
        status: 'pending',
        quantity: data.quantity,
        total_amount: data.totalAmount,
        expires_at: data.expiresAt,
        pix_qr_code: data.qrCodeBase64 || null,
        pix_copy_paste: data.copyPaste || null,
        mercado_pago_payment_id: data.paymentId || null,
      })

      setPaymentStatus('pending')
      setJogos([])
      setPick([])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreatingOrder(false)
    }
  }

  const handleCreatePayment = async () => {
    if (!currentOrder) return
    try {
      const response = await fetch('/api/payments/mercado-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: currentOrder.id }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao criar pagamento')

      setCurrentOrder({
        ...currentOrder,
        pix_qr_code: data.qrCodeBase64,
        pix_copy_paste: data.copyPaste,
        mercado_pago_payment_id: data.paymentId,
      })
    } catch (err: any) {
      setError(err.message)
    }
  }

  const checkPaymentStatus = async () => {
    if (!currentOrder?.mercado_pago_payment_id) return
    try {
      setPaymentStatus('checking')
      const response = await fetch(`/api/payments/status/${currentOrder.mercado_pago_payment_id}`)
      const data = await response.json()

      if (data.success) {
        if (data.paymentStatus === 'approved' || data.orderStatus === 'paid') {
          setPaymentStatus('paid')
          loadRaffle()
        } else if (data.orderStatus === 'expired') {
          setPaymentStatus('expired')
          loadRaffle()
        } else {
          setPaymentStatus('pending')
        }
      }
    } catch (err) {
      console.error('Error checking payment status:', err)
      setPaymentStatus('pending')
    }
  }

  const copyPixCode = () => {
    if (currentOrder?.pix_copy_paste) navigator.clipboard.writeText(currentOrder.pix_copy_paste)
  }

  const closeModal = () => {
    setShowPaymentModal(false)
    if (paymentStatus === 'paid' || paymentStatus === 'expired') {
      setCurrentOrder(null)
      setPaymentStatus('pending')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Carregando...
        </div>
      </div>
    )
  }

  if (!raffle) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-md">
          <p className="text-lg font-semibold mb-2">Jogo não encontrado</p>
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          <Link href="/sorteios" className="text-sm text-primary hover:underline">← Voltar para sorteios</Link>
        </div>
      </div>
    )
  }

  const totalAmount = jogos.length * raffle.ticket_price
  const isPaused = raffle.status !== 'active'
  const isDrawn = !!raffle.winning_numbers

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/sorteios" className="text-sm text-muted-foreground hover:text-foreground transition">← Voltar</Link>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">SR</div>
            <span className="font-semibold hidden sm:block">Sorteios Rápidos</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 py-8 ${(jogos.length > 0 || pick.length > 0 || (currentOrder && paymentStatus === 'pending')) && !showPaymentModal ? 'pb-28' : ''}`}>
        <div className="grid lg:grid-cols-[400px_1fr] gap-6">

          {/* INFO */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="h-52">
                {raffle.prize_image ? (
                  <img src={raffle.prize_image} alt={raffle.prize_name} className="w-full h-full object-cover" />
                ) : (
                  <PrizeVisual size="lg" value={prizePool(arrecadado, raffle.base_prize)} />
                )}
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h1 className="text-2xl font-semibold tracking-tight">{raffle.title}</h1>
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold ${isPaused ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'}`}>
                    {isPaused ? 'Pausada' : 'Ativa'}
                  </span>
                </div>
                {raffle.description && <p className="text-sm text-muted-foreground mb-5">{raffle.description}</p>}

                <div className="text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Prêmio</span>
                    <span className="font-medium text-right">{raffle.prize_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Sena (6 acertos)</span>
                    <span className="font-semibold text-primary">{fmt(tierPot(PRIZE_TIERS[0], arrecadado, raffle.base_prize))}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Quina (5 acertos)</span>
                    <span className="font-medium">{fmt(tierPot(PRIZE_TIERS[1], arrecadado, raffle.base_prize))}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Quadra (4 acertos)</span>
                    <span className="font-medium">{fmt(tierPot(PRIZE_TIERS[2], arrecadado, raffle.base_prize))}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Jogo (6 números)</span>
                    <span className="font-semibold">{fmt(raffle.ticket_price)}</span>
                  </div>
                  {raffle.draw_date && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Sorteio</span>
                      <span className="font-medium">{new Date(raffle.draw_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                {isDrawn && (
                  <div className="mt-5 rounded-xl bg-primary/10 border border-primary/30 p-4">
                    <p className="text-xs font-semibold text-primary mb-2">🎉 Números sorteados</p>
                    <div className="flex flex-wrap gap-1.5">
                      {raffle.winning_numbers!.map((n) => (
                        <span key={n} className="w-8 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                          {String(n).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-5">
                  <p className="text-xs text-muted-foreground">
                    Monte jogos de 6 números entre 1 e 75. Ganha quem acertar 4, 5 ou 6 números (Quadra, Quina ou Sena).
                  </p>
                </div>
              </div>
            </div>

            {/* RESUMO */}
            <div className="rounded-2xl border border-border bg-card p-6">
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  {error}
                  {needsLogin && (
                    <Link
                      href={`/login?next=${encodeURIComponent(`/rifas/${params.id}`)}`}
                      className="block mt-2 font-semibold text-primary hover:underline"
                    >
                      Fazer login →
                    </Link>
                  )}
                </div>
              )}

              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Jogos no pedido</span>
                <span className="font-semibold">{jogos.length}</span>
              </div>
              <div className="flex justify-between items-end mb-5">
                <span className="text-muted-foreground text-sm">Total</span>
                <span className="text-3xl font-semibold tracking-tight">{fmt(totalAmount)}</span>
              </div>

              {jogos.length > 0 && (
                <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
                  {jogos.map((jogo, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {jogo.map((n) => (
                          <span key={n} className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-xs font-semibold tabular-nums">
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => removeJogo(i)}
                        className="text-muted-foreground hover:text-destructive text-lg leading-none shrink-0"
                        title="Remover jogo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleBuyClick}
                disabled={creatingOrder || jogos.length === 0 || isPaused || isDrawn}
                className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDrawn
                  ? 'Sorteio encerrado'
                  : isPaused
                  ? 'Jogo pausado'
                  : creatingOrder
                  ? 'Gerando PIX...'
                  : jogos.length === 0
                  ? 'Monte um jogo de 6 números'
                  : `Comprar ${jogos.length} ${jogos.length === 1 ? 'jogo' : 'jogos'}`}
              </button>
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                PIX gerado na hora · Reserva de 15 minutos
                {isLoggedIn === false && ' · Sem cadastro, só nome e email'}
              </p>
            </div>
          </aside>

          {/* GRADE */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold">Escolha 6 números</h2>
                <p className="text-xs text-muted-foreground mt-0.5">De 1 a 75 · cada jogo vale uma chance</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted border border-border" />Livre</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary" />No jogo</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-5">
              <button
                onClick={surpresinha}
                disabled={isPaused || isDrawn}
                className="px-3 py-1.5 rounded-lg border border-border bg-muted text-xs font-semibold hover:border-primary hover:text-primary transition disabled:opacity-40"
              >
                🎲 Surpresinha (jogo aleatório)
              </button>
              {pick.length > 0 && (
                <button
                  onClick={() => setPick([])}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive transition"
                >
                  Limpar seleção
                </button>
              )}
            </div>

            {/* Jogo em montagem */}
            <div className="mb-5 rounded-xl border border-dashed border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                  {pick.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Toque nos números abaixo — faltam 6</span>
                  ) : (
                    [...pick].sort((a, b) => a - b).map((n) => (
                      <button
                        key={n}
                        onClick={() => toggleNumber(n)}
                        className="w-8 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                        title="Remover"
                      >
                        {String(n).padStart(2, '0')}
                      </button>
                    ))
                  )}
                  {pick.length > 0 && pick.length < 6 && (
                    <span className="text-xs text-muted-foreground ml-1">faltam {6 - pick.length}</span>
                  )}
                </div>
                <button
                  onClick={() => addJogo()}
                  disabled={pick.length !== 6}
                  className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Adicionar jogo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
              {NUMBERS_POOL.map((n) => {
                const isSelected = pick.includes(n)
                const isWinning = raffle.winning_numbers?.includes(n)
                const disabled = isPaused || isDrawn || (!isSelected && pick.length >= 6)

                return (
                  <button
                    key={n}
                    onClick={() => toggleNumber(n)}
                    disabled={disabled}
                    className={`aspect-square rounded-lg text-sm font-semibold tabular-nums transition ${
                      isWinning
                        ? 'bg-secondary text-secondary-foreground ring-2 ring-primary'
                        : isSelected
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                        : 'bg-muted border border-border hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-current'
                    }`}
                  >
                    {String(n).padStart(2, '0')}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      {/* BARRA DE COMPRA FIXA */}
      {jogos.length > 0 && !showPaymentModal && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {jogos.length} {jogos.length === 1 ? 'jogo' : 'jogos'} de 6 números
              </p>
              <p className="text-lg font-semibold tabular-nums">{fmt(totalAmount)}</p>
            </div>
            <button
              onClick={handleBuyClick}
              disabled={isPaused || creatingOrder}
              className="px-6 sm:px-8 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40"
            >
              Pagar com PIX
            </button>
          </div>
        </div>
      )}

      {/* PIX PENDENTE — reabre o QR se fechou o modal */}
      {!showPaymentModal && jogos.length === 0 && currentOrder && paymentStatus === 'pending' && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">PIX pendente — aguardando pagamento</p>
              <p className="text-lg font-semibold tabular-nums">{fmt(currentOrder.total_amount)}</p>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-6 sm:px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Ver QR Code
            </button>
          </div>
        </div>
      )}

      {/* MODAL PIX */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-popover text-popover-foreground p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                {paymentStatus === 'paid' ? 'Tudo certo!' : currentOrder ? 'Pagamento PIX' : 'Quase lá!'}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground text-2xl leading-none">×</button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
                {needsLogin && (
                  <Link
                    href={`/login?next=${encodeURIComponent(`/rifas/${params.id}`)}`}
                    className="block mt-2 font-semibold text-primary hover:underline"
                  >
                    Fazer login →
                  </Link>
                )}
              </div>
            )}

            {paymentStatus === 'paid' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-3xl mb-4">✓</div>
                <p className="text-lg font-semibold mb-1">Pagamento confirmado!</p>
                <p className="text-sm text-muted-foreground mb-6">Seus jogos já estão garantidos.</p>
                <button onClick={closeModal} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold">Fechar</button>
              </div>
            ) : paymentStatus === 'expired' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center text-3xl mb-4">⏰</div>
                <p className="text-lg font-semibold mb-1">Pedido expirado</p>
                <p className="text-sm text-muted-foreground mb-6">O pedido venceu. Monte seus jogos novamente.</p>
                <button onClick={closeModal} className="px-6 py-2.5 rounded-xl bg-muted font-semibold">Fechar</button>
              </div>
            ) : !currentOrder ? (
              creatingOrder ? (
                <div className="text-center py-10">
                  <span className="inline-block w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">Registrando seus jogos e gerando o PIX...</p>
                </div>
              ) : isLoggedIn === false ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-muted p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {jogos.length} {jogos.length === 1 ? 'jogo' : 'jogos'} de 6 números
                      </p>
                      <p className="text-2xl font-semibold tabular-nums">{fmt(totalAmount)}</p>
                    </div>
                    <div className="space-y-1 max-w-[200px]">
                      {jogos.slice(0, 3).map((jogo, i) => (
                        <p key={i} className="text-xs font-mono text-muted-foreground text-right truncate">
                          {jogo.map((n) => String(n).padStart(2, '0')).join(' ')}
                        </p>
                      ))}
                      {jogos.length > 3 && (
                        <p className="text-xs text-muted-foreground text-right">+{jogos.length - 3} jogos</p>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value)
                      setEmailSuggestion(suggestEmailCorrection(e.target.value))
                      setEmailAcknowledged(false)
                    }}
                    placeholder="Seu email"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {emailSuggestion && (
                    <button
                      type="button"
                      onClick={() => {
                        setGuestEmail(emailSuggestion)
                        setEmailSuggestion(null)
                        setEmailAcknowledged(false)
                        setError('')
                      }}
                      className="text-left text-xs text-secondary font-medium hover:underline"
                    >
                      Você quis dizer <strong>{emailSuggestion}</strong>? Clique para corrigir.
                    </button>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Sua conta é criada automaticamente — você recebe um email para definir a senha.
                  </p>

                  <button
                    onClick={submitOrder}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
                  >
                    Gerar PIX de {fmt(totalAmount)}
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-4">Não foi possível gerar o pedido.</p>
                  <button onClick={submitOrder} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold">
                    Tentar novamente
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl bg-muted p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor a pagar</p>
                    <p className="text-2xl font-semibold">{fmt(currentOrder.total_amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Expira às</p>
                    <p className="font-medium text-secondary">
                      {new Date(currentOrder.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {!currentOrder.pix_qr_code ? (
                  <button onClick={handleCreatePayment} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition">
                    Gerar QR Code PIX
                  </button>
                ) : (
                  <>
                    <div className="rounded-xl bg-white p-4">
                      <img src={`data:image/png;base64,${currentOrder.pix_qr_code}`} alt="QR Code PIX" className="w-56 h-56 mx-auto" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">PIX copia e cola</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={currentOrder.pix_copy_paste || ''}
                          readOnly
                          className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono truncate"
                        />
                        <button onClick={copyPixCode} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Copiar</button>
                      </div>
                    </div>

                    <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      {paymentStatus === 'checking' ? 'Verificando pagamento...' : 'Aguardando pagamento'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
