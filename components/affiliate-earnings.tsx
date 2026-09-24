import { createClient } from '@/lib/supabase-server'
import { formatCurrency, formatDate } from '@/lib/get-session-user'
import { card, badgeClass } from '@/components/ui'
import { WithdrawForm } from '@/app/afiliados/withdraw-form'

export async function AffiliateEarnings({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: statsRaw } = await supabase.rpc('get_affiliate_stats', {
    p_user_id: userId,
  })
  const stats = (statsRaw ?? {}) as any

  const [{ data: commissions }, { data: allCommissions }, { data: sales }, { data: withdrawals }] = await Promise.all([
    supabase
      .from('affiliate_commissions')
      .select('*, order:orders(total_amount, created_at, raffle:raffles(title))')
      .eq('affiliate_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('affiliate_commissions')
      .select('level, amount, order_id')
      .eq('affiliate_id', userId),
    supabase
      .from('orders')
      .select('id, status, total_amount, quantity, created_at, paid_at, user:profiles(full_name, email), raffle:raffles(title)')
      .eq('affiliate_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const commissionByLevel = (lv: number) =>
    (allCommissions ?? [])
      .filter((c: any) => (lv === 1 ? c.level === 1 : c.level >= 2))
      .reduce((s: number, c: any) => s + Number(c.amount), 0)

  const directCommission = commissionByLevel(1)
  const networkCommission = commissionByLevel(2)
  const totalSold = (sales ?? [])
    .filter((o: any) => o.status === 'paid')
    .reduce((s: number, o: any) => s + Number(o.total_amount), 0)

  const commissionByOrder = new Map<string, number>(
    (allCommissions ?? [])
      .filter((c: any) => c.level === 1)
      .map((c: any) => [c.order_id, Number(c.amount)])
  )

  const cards = [
    { label: 'Saldo disponível', value: formatCurrency(stats.available), accent: true },
    { label: 'Total ganho', value: formatCurrency(stats.total_earned) },
    { label: 'Total vendido', value: formatCurrency(totalSold) },
    { label: 'Comissão direta (20%)', value: formatCurrency(directCommission) },
    { label: 'Comissões da rede (5%)', value: formatCurrency(networkCommission) },
    { label: 'Vendas diretas', value: String(stats.direct_sales ?? 0) },
    { label: 'Parceiros na rede', value: String(stats.downline_count ?? 0) },
    { label: 'Sacado', value: formatCurrency(stats.withdrawn) },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Sistema parceria</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Meu saldo</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe suas vendas, ganhos e solicite saques.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((s) => (
          <div key={s.label} className={`${card} p-4`}>
            <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
            <p className={`text-xl font-semibold ${s.accent ? 'text-primary' : ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* VENDAS PELO SEU LINK */}
      <section className={`${card} overflow-hidden`}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Vendas pelo seu link</h3>
          <span className="text-xs text-muted-foreground">
            {sales?.length ?? 0} {sales?.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>
        {sales && sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rifa</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comprador</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Números</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Venda</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comissão</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.map((o: any) => {
                  const buyer = o.user?.full_name || o.user?.email?.split('@')[0] || 'Participante'
                  const comm = commissionByOrder.get(o.id)
                  return (
                    <tr key={o.id} className="hover:bg-muted/30 transition">
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(o.paid_at || o.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium max-w-[180px] truncate">
                        {o.raffle?.title || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm max-w-[160px] truncate">{buyer}</td>
                      <td className="px-5 py-3.5 text-sm text-right tabular-nums">{o.quantity}</td>
                      <td className="px-5 py-3.5 text-sm text-right font-semibold tabular-nums">
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-right font-semibold text-primary tabular-nums">
                        {o.status === 'paid' ? (comm !== undefined ? `+${formatCurrency(comm)}` : '—') : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={badgeClass(o.status)}>
                          {o.status === 'paid' ? 'Pago' : o.status === 'pending' ? 'Pendente' : o.status === 'expired' ? 'Expirado' : 'Cancelado'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-muted-foreground text-sm">
            Nenhuma venda pelo seu link ainda. Compartilhe para começar!
          </p>
        )}
      </section>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <section className={`${card} overflow-hidden`}>
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Comissões recentes</h3>
          </div>
          {commissions && commissions.length > 0 ? (
            <div className="divide-y divide-border">
              {commissions.map((c: any) => (
                <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {c.order?.raffle?.title ?? 'Venda'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.level === 1 ? 'Venda direta (20%)' : `Rede nível ${c.level - 1} (5%)`} · {formatDate(c.created_at)}
                    </p>
                  </div>
                  <span className="text-primary font-semibold shrink-0">
                    +{formatCurrency(c.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-muted-foreground text-sm">
              Nenhuma comissão ainda. Compartilhe seu link para começar!
            </p>
          )}
        </section>

        <div className="space-y-6">
          <section className={`${card} p-5`}>
            <h3 className="font-semibold mb-1">Solicitar saque</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Disponível: <span className="text-primary font-semibold">{formatCurrency(stats.available)}</span>
            </p>
            <WithdrawForm userId={userId} available={Number(stats.available ?? 0)} />
          </section>

          {withdrawals && withdrawals.length > 0 && (
            <section className={`${card} overflow-hidden`}>
              <div className="p-5 border-b border-border">
                <h3 className="font-semibold">Saques</h3>
              </div>
              <div className="divide-y divide-border">
                {withdrawals.map((w: any) => (
                  <div key={w.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(w.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(w.created_at)}</p>
                    </div>
                    <span className={badgeClass(w.status)}>
                      {w.status === 'pending' ? 'Pendente' : w.status === 'paid' ? 'Pago' : 'Rejeitado'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
