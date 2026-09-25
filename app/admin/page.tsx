import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Buscar estatísticas globais
  const [
    { count: totalUsers },
    { count: totalRaffles },
    { count: activeRaffles },
    { count: totalOrders },
    { count: paidOrders },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('raffles').select('*', { count: 'exact', head: true }),
    supabase.from('raffles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('orders').select('total_amount').eq('status', 'paid'),
  ])

  const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

  // Buscar usuários recentes
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  // Buscar rifas recentes
  const { data: recentRaffles } = await supabase
    .from('raffles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h2>
          <p className="text-gray-600 mt-1">Visão geral do sistema</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Usuários</p>
                <p className="text-3xl font-bold text-gray-900">{totalUsers || 0}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Rifas</p>
                <p className="text-3xl font-bold text-gray-900">{totalRaffles || 0}</p>
              </div>
              <div className="text-4xl">🎰</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Rifas Ativas</p>
                <p className="text-3xl font-bold text-green-600">{activeRaffles || 0}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Pedidos</p>
                <p className="text-3xl font-bold text-gray-900">{totalOrders || 0}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pedidos Pagos</p>
                <p className="text-3xl font-bold text-green-600">{paidOrders || 0}</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Faturamento</p>
                <p className="text-3xl font-bold text-purple-600">R$ {totalRevenue.toFixed(2)}</p>
              </div>
              <div className="text-4xl">💵</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Usuários Recentes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Usuários Recentes</h3>
            {recentUsers && recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-semibold">{user.full_name || 'Sem nome'}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum usuário encontrado</p>
            )}
          </div>

          {/* Rifas Recentes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rifas Recentes</h3>
            {recentRaffles && recentRaffles.length > 0 ? (
              <div className="space-y-3">
                {recentRaffles.map((raffle: any) => (
                  <div key={raffle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-semibold">{raffle.title}</p>
                      <p className="text-sm text-gray-600">{raffle.prize_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        raffle.status === 'active' ? 'bg-green-100 text-green-800' :
                        raffle.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {raffle.status === 'active' ? 'Ativa' : raffle.status === 'paused' ? 'Pausada' : raffle.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(raffle.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhuma rifa encontrada</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Ações Administrativas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/usuarios"
              className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition text-center"
            >
              <div className="text-3xl mb-2">👥</div>
              <div className="font-semibold">Gerenciar Usuários</div>
              <div className="text-sm opacity-80">Promover/remover admins</div>
            </Link>

            <Link
              href="/admin/rifas"
              className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition text-center"
            >
              <div className="text-3xl mb-2">🎰</div>
              <div className="font-semibold">Gerenciar Rifas</div>
              <div className="text-sm opacity-80">Todas as rifas do sistema</div>
            </Link>

            <Link
              href="/admin/saques"
              className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition text-center"
            >
              <div className="text-3xl mb-2">�</div>
              <div className="font-semibold">Saques de Parceiros</div>
              <div className="text-sm opacity-80">Aprovar pagamentos</div>
            </Link>
          </div>
        </div>
      </main>
  )
}
