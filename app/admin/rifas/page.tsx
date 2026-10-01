import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { RaffleActions } from './raffle-actions'

export default async function AdminRafflesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: raffles } = await supabase
    .from('raffles')
    .select('*, creator:profiles!raffles_created_by_fkey(email, full_name)')
    .order('created_at', { ascending: false })

  // Jogos vendidos (pedidos pagos) por rifa
  const raffleIds = (raffles ?? []).map((r: any) => r.id)
  const { data: paidOrders } = raffleIds.length
    ? await supabase
        .from('orders')
        .select('raffle_id, quantity')
        .in('raffle_id', raffleIds)
        .eq('status', 'paid')
    : { data: [] }

  const jogosPorRifa = new Map<string, number>()
  ;(paidOrders ?? []).forEach((o: any) => {
    jogosPorRifa.set(o.raffle_id, (jogosPorRifa.get(o.raffle_id) ?? 0) + Number(o.quantity))
  })

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-primary/15 text-primary',
      paused: 'bg-warning/15 text-warning',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    const labels: Record<string, string> = {
      active: 'Ativa',
      paused: 'Pausada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${map[status] || 'bg-muted text-muted-foreground'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {raffles?.length || 0} jogo(s) na plataforma
          </h2>
        </div>

        {raffles && raffles.length > 0 ? (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Jogo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Criador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Jogos vendidos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Preço/jogo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {raffles.map((r: any) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">{r.title}</div>
                      <div className="text-sm text-muted-foreground">{r.prize_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{r.creator?.full_name || 'Sem nome'}</div>
                      <div className="text-sm text-muted-foreground">{r.creator?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {jogosPorRifa.get(r.id) ?? 0}
                      {r.winning_numbers && (
                        <span className="ml-2 text-xs text-green-600 font-semibold">✓ sorteada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      R$ {Number(r.ticket_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {statusBadge(r.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RaffleActions id={r.id} status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <div className="text-6xl mb-4">🎰</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum jogo cadastrado
            </h3>
          </div>
        )}
      </main>
  )
}
