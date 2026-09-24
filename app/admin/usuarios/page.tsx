import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { UserActions } from './user-actions'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">Gestão de contas</p>
        <h2 className="text-2xl font-semibold">
          {users?.length || 0} {users?.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
        </h2>
      </div>

      {users && users.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cadastro
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-muted/30 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="shrink-0 h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-semibold">
                            {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium">{user.full_name || 'Sem nome'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{user.affiliate_code || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                          user.role === 'admin' ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                      {user.is_affiliate && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/15 text-primary">
                          Parceiro
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <UserActions
                      userId={user.id}
                      role={user.role}
                      isAffiliate={!!user.is_affiliate}
                      isSelf={user.id === session.user.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border text-center py-16">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-xl font-semibold">Nenhum usuário encontrado</h3>
        </div>
      )}
    </main>
  )
}
