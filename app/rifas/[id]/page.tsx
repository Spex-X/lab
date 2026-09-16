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

export default function RaffleDetailPage() {
  const [raffle, setRaffle] = useState<Raffle | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTickets, setSelectedTickets] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState('')
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadRaffle()
  }, [params.id])

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

  const handleBuyTickets = async () => {
    if (selectedTickets.length === 0) {
      setError('Selecione pelo menos um bilhete')
      return
    }

    setBuying(true)
    setError('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Verificar se o perfil existe
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!profile) {
        await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email,
        })
      }

      // Comprar bilhetes
      const totalAmount = selectedTickets.length * (raffle?.ticket_price || 0)

      for (const ticketNumber of selectedTickets) {
        const { error: ticketError } = await supabase
          .from('tickets')
          .update({
            status: 'sold',
            buyer_id: session.user.id,
            purchased_at: new Date().toISOString(),
          })
          .eq('raffle_id', params.id)
          .eq('ticket_number', ticketNumber)
          .eq('status', 'available')

        if (ticketError) throw ticketError

        // Criar transação
        await supabase.from('transactions').insert({
          ticket_id: tickets.find((t) => t.ticket_number === ticketNumber)?.id,
          buyer_id: session.user.id,
          amount: raffle?.ticket_price || 0,
          status: 'completed',
          payment_method: 'pending',
        })
      }

      // Atualizar bilhetes disponíveis
      const newAvailableTickets = (raffle?.available_tickets || 0) - selectedTickets.length
      await supabase
        .from('raffles')
        .update({ available_tickets: newAvailableTickets })
        .eq('id', params.id)

      alert(`Compra realizada! ${selectedTickets.length} bilhetes comprados com sucesso.`)
      setSelectedTickets([])
      loadRaffle()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBuying(false)
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

  const availableTickets = tickets.filter((t) => t.status === 'available')
  const soldTickets = tickets.filter((t) => t.status === 'sold')
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
              onClick={handleBuyTickets}
              disabled={buying || selectedTickets.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {buying ? 'Processando...' : selectedTickets.length === 0 ? 'Selecione bilhetes' : `Comprar ${selectedTickets.length} bilhetes`}
            </button>
          </div>

          {/* Grade de Bilhetes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Selecione os Bilhetes</h3>

            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
              {tickets.map((ticket) => {
                const isSelected = selectedTickets.includes(ticket.ticket_number)
                const isSold = ticket.status === 'sold'

                return (
                  <button
                    key={ticket.id}
                    onClick={() => !isSold && toggleTicket(ticket.ticket_number)}
                    disabled={isSold}
                    className={`
                      p-3 rounded-md font-semibold transition
                      ${isSold
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
