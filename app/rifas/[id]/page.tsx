'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadRaffle()
  }, [params.id])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (currentOrder && paymentStatus === 'pending') {
      interval = setInterval(checkPaymentStatus, 5000) // Verificar a cada 5 segundos
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
      prev.includes(ticketNumber)
        ? prev.filter((t) => t !== ticketNumber)
        : [...prev, ticketNumber]
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
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raffleId: params.id,
          ticketIds: selectedTickets,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pedido')
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

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pagamento')
      }

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
          setShowPaymentModal(false)
          setCurrentOrder(null)
          loadRaffle()
          alert('Pagamento confirmado! Bilhetes comprados com sucesso.')
        } else if (data.orderStatus === 'expired') {
          setPaymentStatus('expired')
          setShowPaymentModal(false)
          setCurrentOrder(null)
          loadRaffle()
          alert('Pedido expirado. Por favor, tente novamente.')
        } else {
          setPaymentStatus('pending')
        }
      }
    } catch (err: any) {
      console.error('Error checking payment status:', err)
      setPaymentStatus('pending')
    }
  }

  const copyPixCode = () => {
    if (currentOrder?.pix_copy_paste) {
      navigator.clipboard.writeText(currentOrder.pix_copy_paste)
      alert('Código PIX copiado!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Carregando...</div>
      </div>
    )
  }

  if (error && !raffle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (!raffle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Rifa não encontrada</div>
      </div>
    )
  }

  const totalAmount = selectedTickets.length * raffle.ticket_price

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/rifas" className="text-gray-600 hover:text-gray-900">
                ← Voltar
              </Link>
              <h1 className="text-2xl font-bold text-purple-600">🎰 {raffle.title}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informações da Rifa */}
          <div className="bg-white rounded-lg shadow-md p-6">
            {raffle.prize_image && (
              <div className="mb-6">
                <img
                  src={raffle.prize_image}
                  alt={raffle.prize_name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            )}

            <h2 className="text-3xl font-bold text-gray-900 mb-4">{raffle.title}</h2>
            <p className="text-gray-600 mb-6">{raffle.description}</p>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Prêmio:</span>
                <span className="font-semibold">{raffle.prize_name}</span>
              </div>

              {raffle.prize_value && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-600">Valor do Prêmio:</span>
                  <span className="font-semibold text-green-600">R$ {raffle.prize_value}</span>
                </div>
              )}

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Preço do Bilhete:</span>
                <span className="font-semibold text-purple-600">R$ {raffle.ticket_price}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600">Bilhetes Disponíveis:</span>
                <span className="font-semibold">{raffle.available_tickets} / {raffle.total_tickets}</span>
              </div>

              {raffle.draw_date && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-600">Data do Sorteio:</span>
                  <span className="font-semibold">
                    {new Date(raffle.draw_date).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="bg-purple-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Bilhetes selecionados:</span>
                <span className="font-bold text-purple-600">{selectedTickets.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Total a pagar:</span>
                <span className="font-bold text-2xl text-purple-600">R$ {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={creatingOrder || selectedTickets.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingOrder ? 'Criando pedido...' : selectedTickets.length === 0 ? 'Selecione bilhetes' : `Reservar ${selectedTickets.length} bilhetes`}
            </button>
          </div>

          {/* Grade de Bilhetes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Selecione os Bilhetes</h3>

            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {tickets.map((ticket) => {
                const isSelected = selectedTickets.includes(ticket.ticket_number)
                const isSold = ticket.status === 'sold'
                const isReserved = ticket.status === 'reserved'

                return (
                  <button
                    key={ticket.id}
                    onClick={() => !isSold && !isReserved && toggleTicket(ticket.ticket_number)}
                    disabled={isSold || isReserved}
                    className={`
                      p-3 rounded-md font-semibold transition
                      ${isSold
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isReserved
                        ? 'bg-yellow-300 text-yellow-700 cursor-not-allowed'
                        : isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border-2 border-purple-300 text-purple-600 hover:bg-purple-50'
                      }
                    `}
                  >
                    {ticket.ticket_number}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-purple-300 rounded" />
                <span>Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 rounded" />
                <span>Selecionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded" />
                <span>Vendido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-300 rounded" />
                <span>Reservado</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Pagamento */}
      {showPaymentModal && currentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">💳 Pagamento PIX</h3>

            {paymentStatus === 'paid' ? (
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-green-600 font-semibold text-lg">Pagamento Confirmado!</p>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="mt-4 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
                >
                  Fechar
                </button>
              </div>
            ) : paymentStatus === 'expired' ? (
              <div className="text-center">
                <div className="text-6xl mb-4">⏰</div>
                <p className="text-red-600 font-semibold text-lg">Pedido Expirado</p>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="mt-4 bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-gray-600 mb-2">Valor a pagar:</p>
                    <p className="text-3xl font-bold text-purple-600">
                      R$ {currentOrder.total_amount.toFixed(2)}
                    </p>
                  </div>

                  {!currentOrder.pix_qr_code ? (
                    <button
                      onClick={handleCreatePayment}
                      className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition"
                    >
                      Gerar QR Code PIX
                    </button>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-lg">
                        {currentOrder.pix_qr_code && (
                          <img
                            src={`data:image/png;base64,${currentOrder.pix_qr_code}`}
                            alt="QR Code PIX"
                            className="w-full max-w-xs mx-auto"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Código PIX (Copie e Cole)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={currentOrder.pix_copy_paste || ''}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                          />
                          <button
                            onClick={copyPixCode}
                            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-3 rounded-md">
                        <p className="text-sm text-yellow-800">
                          ⏰ O pedido expira em:{' '}
                          {new Date(currentOrder.expires_at).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>

                      {paymentStatus === 'checking' && (
                        <div className="text-center text-blue-600">
                          <p>Verificando status do pagamento...</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="mt-4 w-full bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
