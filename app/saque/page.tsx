import { redirect } from 'next/navigation'
import { UserShell } from '@/components/user-shell'
import { getSessionUser, formatCurrency, formatDate } from '@/lib/get-session-user'
import { card, badgeClass } from '@/components/ui'
import { WithdrawForm } from '@/app/afiliados/withdraw-form'

export default async function WithdrawPage() {
  const { supabase, session, userName, isAdmin, isAffiliate } = await getSessionUser()

  if (!isAffiliate) redirect('/rifas')

  const { data: statsRaw } = await supabase.rpc('get_affiliate_stats', {
    p_user_id: session.user.id,
  })
  const stats = (statsRaw ?? {}) as any

  const { data: withdrawals } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  return (
    <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Sistema parceria</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Saques</h1>
          <p className="text-muted-foreground mt-2">
            Solicite a transferência das suas comissões via PIX.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className={`${card} p-5`}>
            <p className="text-xs text-muted-foreground mb-2">Disponível</p>
            <p className="text-2xl font-semibold text-primary">{formatCurrency(stats.available)}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-xs text-muted-foreground mb-2">Pendente</p>
            <p className="text-2xl font-semibold">{formatCurrency(stats.pending_withdrawal)}</p>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-xs text-muted-foreground mb-2">Já sacado</p>
            <p className="text-2xl font-semibold">{formatCurrency(stats.withdrawn)}</p>
          </div>
        </div>

        <section className={`${card} p-6`}>
          <h2 className="font-semibold mb-4">Solicitar saque</h2>
          <WithdrawForm userId={session.user.id} available={Number(stats.available ?? 0)} />
        </section>

        <section className={`${card} overflow-hidden`}>
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold">Histórico de saques</h2>
          </div>
          {withdrawals && withdrawals.length > 0 ? (
            <div className="divide-y divide-border">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{formatCurrency(w.amount)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      PIX: {w.pix_key} · {formatDate(w.created_at)}
                    </p>
                  </div>
                  <span className={badgeClass(w.status)}>
                    {w.status === 'pending' ? 'Pendente' : w.status === 'paid' ? 'Pago' : 'Rejeitado'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-muted-foreground text-sm">
              Nenhum saque solicitado ainda.
            </p>
          )}
        </section>
      </main>
    </UserShell>
  )
}
