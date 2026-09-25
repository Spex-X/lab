'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

interface Raffle {
  id: string
  title: string
  description: string
  prize_name: string
  prize_value: number | null
  prize_image: string | null
  total_tickets: number
  available_tickets: number
  ticket_price: number
  draw_date: string | null
  status: string
}

interface Ticket {
  id: string
  ticket_number: number
  status: string
  buyer_id: string | null
}

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
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTickets, setSelectedTickets] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [error, setError] = useState('')
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'expired' | 'checking'>('pending')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPassword, setGuestPassword] = useState('')
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

      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('raffle_id', params.id)
        .order('ticket_number')

      if (ticketsError) throw ticketsError
      setTickets(ticketsData || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleTicket = (ticketNumber: number) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketNumber) ? prev.filter((t) => t !== ticketNumber) : [...prev, ticketNumber]
    )
  }

  const handleCreateOrder = async () => {
    if (selectedTickets.length === 0) {
      setError('Selecione pelo menos um bilhete')
      return
    }

    setCreatingOrder(true)
    setError('')

    try {
      const isGuest = isLoggedIn === false
      if (isGuest && (!guestName.trim() || !guestEmail.trim() || guestPassword.length < 6)) {
        throw new Error('Preencha nome, email e senha (mín. 6 caracteres) para continuar')
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raffleId: params.id,
          ticketIds: selectedTickets,
          ...(isGuest ? { guestName: guestName.trim(), guestEmail: guestEmail.trim(), guestPassword } : {}),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao criar pedido')

      // Conta criada na hora → faz login no navegador pro pagamento e área do usuário
      if (data.accountCreated) {
        await supabase.auth
          .signInWithPassword({ email: guestEmail.trim(), password: guestPassword })
          .catch(() => {})
        setIsLoggedIn(true)
      }

      setCurrentOrder({
        id: data.orderId,
        status: 'pending',
        quantity: data.quantity,
        total_amount: data.totalAmount,
        expires_at: data.expiresAt,
        pix_qr_code: null,
        pix_copy_paste: null,
        mercado_pago_payment_id: null,
      })

      setPaymentStatus('pending')
      setShowPaymentModal(true)
      setSelectedTickets([])
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
    if (paymentStatus === 'paid' || paymentStatus === 'expired') setCurrentOrder(null)
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
          <p className="text-lg font-semibold mb-2">Rifa não encontrada</p>
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          <Link href="/rifas" className="text-sm text-primary hover:underline">← Voltar para rifas</Link>
        </div>
      </div>
    )
  }

  const totalAmount = selectedTickets.length * raffle.ticket_price
  const sold = raffle.total_tickets - raffle.available_tickets
  const pct = Math.round((sold / raffle.total_tickets) * 100)
  const isPaused = raffle.status !== 'active'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/rifas" className="text-sm text-muted-foreground hover:text-foreground transition">← Voltar</Link>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">L</div>
            <span className="font-semibold hidden sm:block">Lab</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-[400px_1fr] gap-6">

          {/* INFO */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="h-52 bg-gradient-to-br from-primary/25 to-secondary/25">
                {raffle.prize_image ? (
                  <img src={raffle.prize_image} alt={raffle.prize_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🎁</div>
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
                  {raffle.prize_value && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Valor do prêmio</span>
                      <span className="font-medium text-primary">{fmt(raffle.prize_value)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Bilhete</span>
                    <span className="font-semibold">{fmt(raffle.ticket_price)}</span>
                  </div>
                  {raffle.draw_date && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Sorteio</span>
                      <span className="font-medium">{new Date(raffle.draw_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{sold} vendidos</span>
                    <span>{raffle.available_tickets} disponíveis</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* RESUMO */}
            <div className="rounded-2xl border border-border bg-card p-6">
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>
              )}

              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Bilhetes selecionados</span>
                <span className="font-semibold">{selectedTickets.length}</span>
              </div>
              <div className="flex justify-between items-end mb-5">
                <span className="text-muted-foreground text-sm">Total</span>
                <span className="text-3xl font-semibold tracking-tight">{fmt(totalAmount)}</span>
              </div>

              {selectedTickets.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {[...selectedTickets].sort((a, b) => a - b).map((n) => (
                    <button
                      key={n}
                      onClick={() => toggleTicket(n)}
                      className="px-2 py-1 rounded-md bg-primary/15 text-primary text-xs font-semibold hover:bg-destructive/15 hover:text-destructive transition"
                      title="Remover"
                    >
                      {String(n).padStart(3, '0')} ×
                    </button>
                  ))}
                </div>
              )}

              {isLoggedIn === false && (
                <div className="space-y-3 mb-5 pb-5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Cadastro rápido — sua conta é criada na hora
                  </p>
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
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="Seu email"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="password"
                    value={guestPassword}
                    onChange={(e) => setGuestPassword(e.target.value)}
                    placeholder="Crie uma senha (mín. 6)"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              <button
                onClick={handleCreateOrder}
                disabled={creatingOrder || selectedTickets.length === 0 || isPaused}
                className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPaused
                  ? 'Rifa pausada'
                  : creatingOrder
                  ? 'Reservando...'
                  : selectedTickets.length === 0
                  ? 'Selecione bilhetes'
                  : `Reservar ${selectedTickets.length} ${selectedTickets.length === 1 ? 'bilhete' : 'bilhetes'}`}
              </button>
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Reserva válida por 15 minutos · Pagamento via PIX
                {isLoggedIn === false && ' · Sem cadastro? Crie na hora acima'}
              </p>
            </div>
          </aside>

          {/* GRADE */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold">Escolha seus números</h2>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted border border-border" />Disponível</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary" />Selecionado</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-warning" />Reservado</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted-foreground/40" />Vendido</span>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {tickets.map((ticket) => {
                const isSelected = selectedTickets.includes(ticket.ticket_number)
                const isSold = ticket.status === 'sold'
                const isReserved = ticket.status === 'reserved'
                const disabled = isSold || isReserved || isPaused

                return (
                  <button
                    key={ticket.id}
                    onClick={() => !disabled && toggleTicket(ticket.ticket_number)}
                    disabled={disabled}
                    className={`aspect-square rounded-lg text-sm font-semibold tabular-nums transition ${
                      isSold
                        ? 'bg-muted-foreground/20 text-muted-foreground/60 cursor-not-allowed line-through'
                        : isReserved
                        ? 'bg-warning/25 text-warning cursor-not-allowed'
                        : isSelected
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                        : 'bg-muted border border-border hover:border-primary hover:text-primary'
                    }`}
                  >
                    {String(ticket.ticket_number).padStart(3, '0')}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      {/* MODAL PIX */}
      {showPaymentModal && currentOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-popover text-popover-foreground p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Pagamento PIX</h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground text-2xl leading-none">×</button>
            </div>

            {paymentStatus === 'paid' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-3xl mb-4">✓</div>
                <p className="text-lg font-semibold mb-1">Pagamento confirmado!</p>
                <p className="text-sm text-muted-foreground mb-6">Seus bilhetes já estão garantidos.</p>
                <button onClick={closeModal} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold">Fechar</button>
              </div>
            ) : paymentStatus === 'expired' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center text-3xl mb-4">⏰</div>
                <p className="text-lg font-semibold mb-1">Pedido expirado</p>
                <p className="text-sm text-muted-foreground mb-6">Os números foram liberados. Tente novamente.</p>
                <button onClick={closeModal} className="px-6 py-2.5 rounded-xl bg-muted font-semibold">Fechar</button>
              </div>
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
