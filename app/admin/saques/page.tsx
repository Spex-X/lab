import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { WithdrawalActions } from './withdrawal-actions'

export default async function AdminWithdrawalsPage() {
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

  const { data: withdrawals } = await supabase
    .from('withdrawal_requests')
    .select('*, user:profiles(email, full_name)')
    .order('created_at', { ascending: false })

  const pending = withdrawals?.filter((w: any) => w.status === 'pending') ?? []

  return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {pending.length} saque(s) pendente(s)
          </h2>
        </div>

        {withdrawals && withdrawals.length > 0 ? (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Parceiro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Chave PIX</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {withdrawals.map((w: any) => (
                  <tr key={w.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">
                        {w.user?.full_name || 'Sem nome'}
                      </div>
                      <div className="text-sm text-muted-foreground">{w.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                      R$ {Number(w.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">
                      {w.pix_key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(w.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        w.status === 'paid' ? 'bg-primary/15 text-primary' :
                        w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-warning/15 text-warning'
                      }`}>
                        {w.status === 'paid' ? 'Pago' : w.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {w.status === 'pending' && <WithdrawalActions id={w.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <div className="text-6xl mb-4">💸</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma solicitação de saque
            </h3>
          </div>
        )}
      </main>
  )
}
