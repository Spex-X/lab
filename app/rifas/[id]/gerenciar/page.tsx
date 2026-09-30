'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImageUpload } from '@/components/image-upload'
import { prizePool } from '@/lib/prize'

const formatCurrency = (v: number | string | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v ?? 0))

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
  winning_numbers: number[] | null
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

interface DrawResult {
  winning_numbers: number[]
  total_bets: number
  winners: number
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
    prize_image: '',
    draw_date: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [drawPick, setDrawPick] = useState<number[]>([])
  const [drawing, setDrawing] = useState(false)
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null)
  const [winners, setWinners] = useState<any[]>([])
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
      if (raffleData.winning_numbers) loadWinners(raffleData.winning_numbers)
      setEditForm({
        title: raffleData.title,
        description: raffleData.description || '',
        prize_name: raffleData.prize_name,
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
        .from('bets')
        .select(`
          user_id,
          profiles!inner(email, full_name),
          orders!inner(status)
        `)
        .eq('raffle_id', params.id)
        .eq('orders.status', 'paid')

      if (participantsError) throw participantsError

      // Agrupar por participante
      const participantMap = new Map<string, Participant>()

      participantsData?.forEach((item: any) => {
        const userId = item.user_id
        const existing = participantMap.get(userId)

        if (existing) {
          existing.tickets_count += 1
          existing.total_spent += raffle?.ticket_price || 0
        } else {
          participantMap.set(userId, {
            id: userId,
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

  const loadWinners = async (winning: number[]) => {
    const { data } = await supabase
      .from('bets')
      .select('numbers, hits, profiles(email, full_name)')
      .eq('raffle_id', params.id)
      .gte('hits', 4)
      .order('hits', { ascending: false })
    setWinners(data || [])
  }

  const toggleDrawNumber = (n: number) => {
    setDrawPick((prev) =>
      prev.includes(n) ? prev.filter((t) => t !== n) : prev.length < 6 ? [...prev, n] : prev
    )
  }

  const handleDraw = async () => {
    if (drawPick.length !== 6 || drawing) return
    if (!window.confirm(`Sortear com os números ${[...drawPick].sort((a, b) => a - b).join(', ')}? Isso encerra a rifa e não pode ser desfeito.`)) return

    setDrawing(true)
    setError('')
    try {
      const { data, error: rpcError } = await supabase.rpc('draw_raffle', {
        p_raffle_id: params.id,
        p_winning_numbers: [...drawPick].sort((a, b) => a - b),
      })

      if (rpcError) throw rpcError
      if (data?.error) throw new Error(data.error)

      setDrawResult(data)
      setSuccess(`Sorteio realizado! ${data.winners} jogo(s) com 6 acertos.`)
      loadWinners(drawPick)
      loadRaffle()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDrawing(false)
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

  const handleDeleteRaffle = async () => {
    if (!raffle) return

    setDeleting(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('raffles')
        .delete()
        .eq('id', params.id)

      if (deleteError) throw deleteError

      router.push('/minhas-rifas')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleCancelRaffle = async () => {
    if (!raffle) return

    try {
      const { error: updateError } = await supabase
        .from('raffles')
        .update({ status: 'cancelled' })
        .eq('id', params.id)

      if (updateError) throw updateError

      setSuccess('Rifa cancelada com sucesso!')
      loadRaffle()
    } catch (err: any) {
      setError(err.message)
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

      return {
        soldTickets: stats.sold_bets || 0,
        reservedTickets: stats.pending_bets || 0,
        availableTickets: 0,
        revenue: stats.revenue || 0,
      }
    } catch (err) {
      return {
        soldTickets: 0,
        reservedTickets: 0,
        availableTickets: 0,
        revenue: 0,
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

  return (
    <div className="min-h-screen bg-muted">
      <nav className="bg-card border border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/minhas-rifas" className="text-muted-foreground hover:text-foreground">
                ← Voltar
              </Link>
              <h1 className="text-2xl font-bold text-purple-600">🎰 Gerenciar: {raffle.title}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                raffle.status === 'active' ? 'bg-primary/15 text-primary' :
                raffle.status === 'paused' ? 'bg-warning/15 text-warning' :
                'bg-muted text-muted-foreground'
              }`}>
                {raffle.status === 'active' ? 'Ativa' : raffle.status === 'paused' ? 'Pausada' : raffle.status}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-destructive px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-primary/15 border border-green-400 text-primary px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border mb-6">
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
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Jogos vendidos</p>
                    <p className="text-3xl font-bold text-foreground">{stats?.soldTickets || 0}</p>
                  </div>
                  <div className="text-4xl">🎫</div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Aguardando PIX</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats?.reservedTickets || 0}</p>
                  </div>
                  <div className="text-4xl">⏰</div>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Faturamento</p>
                    <p className="text-3xl font-bold text-purple-600">R$ {stats?.revenue?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-4xl">�</div>
                </div>
              </div>
            </div>

            {/* Sorteio */}
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Sorteio</h3>

              {raffle.winning_numbers ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Números sorteados:</p>
                    <div className="flex flex-wrap gap-2">
                      {raffle.winning_numbers.map((n: number) => (
                        <span key={n} className="w-10 h-10 rounded-lg bg-green-600 text-white font-bold flex items-center justify-center">
                          {String(n).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                  {winners.length > 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Melhores jogos (4+ acertos):</p>
                      <div className="space-y-2">
                        {winners.map((w: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
                            <span className="font-medium truncate">{w.profiles?.full_name || w.profiles?.email}</span>
                            <span className="font-mono shrink-0">{[...w.numbers].sort((a: number, b: number) => a - b).map((n: number) => String(n).padStart(2, '0')).join(' ')}</span>
                            <span className={`font-semibold shrink-0 ${w.hits === 6 ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {w.hits} acertos
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum jogo com 4+ acertos.</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Escolha os 6 números sorteados (1–75). Isso encerra a rifa e marca os jogos vencedores.
                  </p>
                  <div className="grid gap-1.5 mb-4 max-w-lg" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                    {Array.from({ length: 75 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => toggleDrawNumber(n)}
                        className={`aspect-square rounded text-xs font-semibold transition ${
                          drawPick.includes(n)
                            ? 'bg-green-600 text-white'
                            : 'bg-muted hover:bg-primary/15 text-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">
                      Selecionados: {[...drawPick].sort((a, b) => a - b).join(', ') || '—'} ({drawPick.length}/6)
                    </span>
                    <button
                      onClick={handleDraw}
                      disabled={drawPick.length !== 6 || drawing}
                      className="px-5 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition disabled:opacity-40"
                    >
                      {drawing ? 'Sorteando...' : '🎲 Confirmar sorteio'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h3>
              <div className="flex gap-4">
                <button
                  onClick={handleToggleStatus}
                  className={`px-4 py-2 rounded-md font-semibold transition ${
                    raffle.status === 'active'
                      ? 'bg-warning/100 text-white hover:bg-yellow-600'
                      : 'bg-primary/100 text-white hover:bg-green-600'
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
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Pedidos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Jogos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {order.user?.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {order.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          R$ {order.total_amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'paid' ? 'bg-primary/15 text-primary' :
                            order.status === 'pending' ? 'bg-warning/15 text-warning' :
                            order.status === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {order.status === 'paid' ? 'Pago' :
                             order.status === 'pending' ? 'Pendente' :
                             order.status === 'expired' ? 'Expirado' : order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
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
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Participantes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Participante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Jogos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Gasto
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {participants.length > 0 ? (
                    participants.map((participant) => (
                      <tr key={participant.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {participant.full_name || 'Sem nome'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {participant.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {participant.tickets_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          R$ {participant.total_spent.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-muted-foreground">
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
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-foreground">Configurações da Rifa</h3>
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
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nome do Prêmio
                  </label>
                  <input
                    type="text"
                    value={editForm.prize_name}
                    onChange={(e) => setEditForm({ ...editForm, prize_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="p-3 bg-muted rounded-md text-sm">
                  <span className="text-muted-foreground">Prêmio acumulado:</span>{' '}
                  <span className="font-semibold text-primary">{formatCurrency(prizePool(stats?.revenue ?? 0))}</span>
                  <p className="text-xs text-muted-foreground mt-1">Automático — acumula 17% de cada aposta vendida.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Imagem do Prêmio
                  </label>
                  <ImageUpload
                    value={editForm.prize_image}
                    onChange={(url) => setEditForm({ ...editForm, prize_image: url })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Data do Sorteio
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.draw_date}
                    onChange={(e) => setEditForm({ ...editForm, draw_date: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                        prize_image: raffle.prize_image || '',
                        draw_date: raffle.draw_date ? raffle.draw_date.slice(0, 16) : '',
                      })
                    }}
                    className="flex-1 bg-muted text-foreground py-2 rounded-md hover:bg-muted/60 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded">
                  <span className="text-muted-foreground">Título:</span>
                  <span className="font-semibold">{raffle.title}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded">
                  <span className="text-muted-foreground">Descrição:</span>
                  <span className="font-semibold">{raffle.description || 'Sem descrição'}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded">
                  <span className="text-muted-foreground">Prêmio:</span>
                  <span className="font-semibold">{raffle.prize_name}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded">
                  <span className="text-muted-foreground">Prêmio acumulado:</span>
                  <span className="font-semibold text-primary">{formatCurrency(prizePool(stats?.revenue ?? 0))}</span>
                </div>

                {raffle.draw_date && (
                  <div className="flex justify-between items-center p-3 bg-muted rounded">
                    <span className="text-muted-foreground">Data do Sorteio:</span>
                    <span className="font-semibold">
                      {new Date(raffle.draw_date).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-muted rounded">
                  <span className="text-muted-foreground">Criada em:</span>
                  <span className="font-semibold">
                    {new Date(raffle.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            )}

            {/* Zona de Perigo */}
            <div className="mt-8 border-2 border-destructive/30 rounded-lg p-5 bg-destructive/10">
              <h4 className="font-semibold text-destructive mb-2">⚠️ Zona de perigo</h4>

              {stats?.soldTickets > 0 ? (
                <div>
                  <p className="text-sm text-destructive mb-4">
                    Esta rifa já tem {stats.soldTickets} jogo(s) vendido(s) e não pode ser excluída.
                    Você pode cancelá-la — ela sairá do ar, mas os registros de venda serão mantidos.
                  </p>
                  {raffle.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        if (window.confirm('Cancelar esta rifa? Ela sairá do ar e não poderá mais receber vendas.')) {
                          handleCancelRaffle()
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition"
                    >
                      🚫 Cancelar rifa
                    </button>
                  )}
                  {raffle.status === 'cancelled' && (
                    <span className="text-sm text-destructive font-semibold">Esta rifa está cancelada.</span>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-destructive mb-4">
                    Excluir a rifa remove todos os jogos e pedidos associados.
                    Esta ação não pode ser desfeita.
                  </p>

                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition"
                    >
                      🗑️ Excluir rifa
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-destructive">Tem certeza?</span>
                      <button
                        onClick={handleDeleteRaffle}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-700 text-white rounded-md font-semibold hover:bg-red-800 transition disabled:opacity-50"
                      >
                        {deleting ? 'Excluindo...' : 'Sim, excluir'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-4 py-2 bg-muted text-foreground rounded-md font-semibold hover:bg-muted/60 transition"
                      >
                        Não
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
