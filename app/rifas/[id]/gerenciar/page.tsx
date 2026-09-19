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
  created_at: string
}

interface Order {
  id: string
  status: string
  quantity: number
  total_amount: number
  created_at: string
  paid_at: string | null
  user: {
    email: string
    full_name: string | null
  }
}

interface Participant {
  id: string
  email: string
  full_name: string | null
  tickets_count: number
  total_spent: number
}

type TabType = 'overview' | 'orders' | 'participants' | 'settings'

export default function RaffleManagePage() {
  const [raffle, setRaffle] = useState<Raffle | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    prize_name: '',
    prize_value: '',
    prize_image: '',
    draw_date: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadRaffle()
  }, [params.id])

  useEffect(() => {
    if (activeTab === 'orders') loadOrders()
    if (activeTab === 'participants') loadParticipants()
  }, [activeTab])

  const loadRaffle = async () => {
    try {
      const { data: raffleData, error: raffleError } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', params.id)
        .single()

      if (raffleError) throw raffleError

      setRaffle(raffleData)
      setEditForm({
        title: raffleData.title,
        description: raffleData.description || '',
        prize_name: raffleData.prize_name,
        prize_value: raffleData.prize_value?.toString() || '',
        prize_image: raffleData.prize_image || '',
        draw_date: raffleData.draw_date ? raffleData.draw_date.slice(0, 16) : '',
      })

      // Carregar estatísticas
      const statsData = await calculateStats()
      setStats(statsData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          user:profiles(email, full_name)
        `)
        .eq('raffle_id', params.id)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      setOrders(ordersData || [])
    } catch (err: any) {
      console.error('Error loading orders:', err)
    }
  }

  const loadParticipants = async () => {
    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from('tickets')
        .select(`
          buyer_id,
          profiles!inner(email, full_name)
        `)
        .eq('raffle_id', params.id)
        .eq('status', 'sold')

      if (participantsError) throw participantsError

      // Agrupar por participante
      const participantMap = new Map<string, Participant>()

      participantsData?.forEach((item: any) => {
        const buyerId = item.buyer_id
        const existing = participantMap.get(buyerId)

        if (existing) {
          existing.tickets_count += 1
          existing.total_spent += raffle?.ticket_price || 0
        } else {
          participantMap.set(buyerId, {
            id: buyerId,
            email: item.profiles.email,
            full_name: item.profiles.full_name,
            tickets_count: 1,
            total_spent: raffle?.ticket_price || 0,
          })
        }
      })

      setParticipants(Array.from(participantMap.values()))
    } catch (err: any) {
      console.error('Error loading participants:', err)
    }
  }

  const handleUpdateRaffle = async () => {
    setEditing(false)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase
        .from('raffles')
        .update({
          title: editForm.title,
          description: editForm.description,
          prize_name: editForm.prize_name,
          prize_value: editForm.prize_value ? parseFloat(editForm.prize_value) : null,
          prize_image: editForm.prize_image || null,
          draw_date: editForm.draw_date ? new Date(editForm.draw_date).toISOString() : null,
        })
        .eq('id', params.id)

      if (updateError) throw updateError

      setSuccess('Rifa atualizada com sucesso!')
      loadRaffle()
    } catch (err: any) {
      setError(err.message)
      setEditing(true)
    }
  }

  const handleToggleStatus = async () => {
    if (!raffle) return

    const newStatus = raffle.status === 'active' ? 'paused' : 'active'

    try {
      const { error: updateError } = await supabase
        .from('raffles')
        .update({ status: newStatus })
        .eq('id', params.id)

      if (updateError) throw updateError

      setSuccess(`Rifa ${newStatus === 'active' ? 'ativada' : 'pausada'} com sucesso!`)
      loadRaffle()
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (activeTab === 'overview' && raffle) {
      calculateStats().then(setStats)
    }
  }, [activeTab, raffle])

  const calculateStats = async () => {
    if (!raffle) return null

    try {
      const { data: statsData, error: statsError } = await supabase.rpc('get_raffle_stats', {
        p_raffle_id: params.id,
      })

      if (statsError) throw statsError

      const stats = statsData as any
      const soldTickets = stats.sold_tickets || 0
      const reservedTickets = stats.reserved_tickets || 0
      const availableTickets = stats.available_tickets || 0
      const revenue = stats.revenue || 0
      const progress = raffle.total_tickets > 0 ? (soldTickets / raffle.total_tickets) * 100 : 0

      return {
        soldTickets,
        reservedTickets,
        availableTickets,
        revenue,
        progress,
      }
    } catch (err) {
      // Fallback para cálculo manual se a RPC falhar
      const soldTickets = raffle.total_tickets - raffle.available_tickets
      const revenue = soldTickets * raffle.ticket_price
      const progress = raffle.total_tickets > 0 ? (soldTickets / raffle.total_tickets) * 100 : 0

      return {
        soldTickets,
        reservedTickets: 0,
        availableTickets: raffle.available_tickets,
        revenue,
        progress,
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Carregando...</div>
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

  const stats = calculateStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/rifas" className="text-gray-600 hover:text-gray-900">
                ← Voltar
              </Link>
              <h1 className="text-2xl font-bold text-purple-600">🎰 Gerenciar: {raffle.title}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                raffle.status === 'active' ? 'bg-green-100 text-green-800' :
                raffle.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {raffle.status === 'active' ? 'Ativa' : raffle.status === 'paused' ? 'Pausada' : raffle.status}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview' as TabType, label: 'Visão Geral' },
              { id: 'orders' as TabType, label: 'Pedidos' },
              { id: 'participants' as TabType, label: 'Participantes' },
              { id: 'settings' as TabType, label: 'Configurações' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Bilhetes Vendidos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.soldTickets || 0}</p>
                  </div>
                  <div className="text-4xl">🎫</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Reservados</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats?.reservedTickets || 0}</p>
                  </div>
                  <div className="text-4xl">⏰</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Disponíveis</p>
                    <p className="text-3xl font-bold text-green-600">{stats?.availableTickets || 0}</p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Faturamento</p>
                    <p className="text-3xl font-bold text-purple-600">R$ {stats?.revenue?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-4xl">�</div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso de Vendas</h3>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-purple-600 h-4 rounded-full transition-all"
                  style={{ width: `${stats?.progress || 0}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>{stats?.soldTickets || 0} vendidos</span>
                <span>{stats?.reservedTickets || 0} reservados</span>
                <span>{stats?.availableTickets || 0} disponíveis</span>
                <span>total: {raffle.total_tickets}</span>
              </div>
              <div className="mt-4 text-center">
                <span className="text-2xl font-bold text-blue-600">{stats?.progress?.toFixed(1) || '0'}%</span>
                <span className="text-gray-600 ml-2">concluído</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="flex gap-4">
                <button
                  onClick={handleToggleStatus}
                  className={`px-4 py-2 rounded-md font-semibold transition ${
                    raffle.status === 'active'
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {raffle.status === 'active' ? '⏸️ Pausar Rifa' : '▶️ Ativar Rifa'}
                </button>

                <Link
                  href={`/rifas/${params.id}`}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 transition"
                >
                  👁️ Ver Página Pública
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Pedidos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.user?.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          R$ {order.total_amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'paid' ? 'bg-green-100 text-green-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status === 'paid' ? 'Pago' :
                             order.status === 'pending' ? 'Pendente' :
                             order.status === 'expired' ? 'Expirado' : order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Nenhum pedido encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Participantes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bilhetes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Gasto
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.length > 0 ? (
                    participants.map((participant) => (
                      <tr key={participant.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {participant.full_name || 'Sem nome'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.tickets_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          R$ {participant.total_spent.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Nenhum participante encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Configurações da Rifa</h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 transition"
                >
                  ✏️ Editar
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Prêmio
                  </label>
                  <input
                    type="text"
                    value={editForm.prize_name}
                    onChange={(e) => setEditForm({ ...editForm, prize_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor do Prêmio (R$)
                  </label>
                  <input
                    type="number"
                    value={editForm.prize_value}
                    onChange={(e) => setEditForm({ ...editForm, prize_value: e.target.value })}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL da Imagem
                  </label>
                  <input
                    type="url"
                    value={editForm.prize_image}
                    onChange={(e) => setEditForm({ ...editForm, prize_image: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data do Sorteio
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.draw_date}
                    onChange={(e) => setEditForm({ ...editForm, draw_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleUpdateRaffle}
                    className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setEditForm({
                        title: raffle.title,
                        description: raffle.description || '',
                        prize_name: raffle.prize_name,
                        prize_value: raffle.prize_value?.toString() || '',
                        prize_image: raffle.prize_image || '',
                        draw_date: raffle.draw_date ? raffle.draw_date.slice(0, 16) : '',
                      })
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-600">Título:</span>
                  <span className="font-semibold">{raffle.title}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-600">Descrição:</span>
                  <span className="font-semibold">{raffle.description || 'Sem descrição'}</span>
                </div>

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

                {raffle.draw_date && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Data do Sorteio:</span>
                    <span className="font-semibold">
                      {new Date(raffle.draw_date).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-600">Criada em:</span>
                  <span className="font-semibold">
                    {new Date(raffle.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
