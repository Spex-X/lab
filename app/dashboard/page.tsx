import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Buscar perfil para verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Buscar estatísticas
  const [
    { count: totalRaffles },
    { count: activeRaffles },
    { count: myTickets },
  ] = await Promise.all([
    supabase.from('raffles').select('*', { count: 'exact', head: true }),
    supabase.from('raffles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('buyer_id', session.user.id),
  ])

  // Buscar rifas recentes
  const { data: recentRaffles } = await supabase
    .from('raffles')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-purple-600">🎰 Sistema de Rifas</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition flex items-center gap-2"
                >
                  🛡️ Admin
                </Link>
              )}
              <span className="text-gray-700">{session.user.email}</span>
              <Link
                href="/logout"
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
              >
                Sair
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">Bem-vindo ao sistema de rifas!</p>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total de Rifas</p>
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
                <p className="text-gray-500 text-sm">Meus Bilhetes</p>
                <p className="text-3xl font-bold text-purple-600">{myTickets || 0}</p>
              </div>
              <div className="text-4xl">🎫</div>
            </div>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            href="/rifas"
            className="bg-purple-600 text-white p-6 rounded-lg shadow-md hover:bg-purple-700 transition text-center"
          >
            <div className="text-4xl mb-2">🎰</div>
            <div className="font-semibold">Ver Rifas</div>
            <div className="text-sm opacity-80">Rifas disponíveis</div>
          </Link>

          <Link
            href="/criar-rifa"
            className="bg-green-600 text-white p-6 rounded-lg shadow-md hover:bg-green-700 transition text-center"
          >
            <div className="text-4xl mb-2">➕</div>
            <div className="font-semibold">Criar Rifa</div>
            <div className="text-sm opacity-80">Nova rifa</div>
          </Link>

          <Link
            href="/minhas-rifas"
            className="bg-blue-600 text-white p-6 rounded-lg shadow-md hover:bg-blue-700 transition text-center"
          >
            <div className="text-4xl mb-2">📋</div>
            <div className="font-semibold">Minhas Rifas</div>
            <div className="text-sm opacity-80">Gerenciar rifas</div>
          </Link>

          <Link
            href="/meus-bilhetes"
            className="bg-orange-600 text-white p-6 rounded-lg shadow-md hover:bg-orange-700 transition text-center"
          >
            <div className="text-4xl mb-2">🎫</div>
            <div className="font-semibold">Meus Bilhetes</div>
            <div className="text-sm opacity-80">Bilhetes comprados</div>
          </Link>
        </div>

        {/* Rifas recentes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Rifas Recentes</h3>
          {recentRaffles && recentRaffles.length > 0 ? (
            <div className="space-y-4">
              {recentRaffles.map((raffle) => (
                <Link
                  key={raffle.id}
                  href={`/rifas/${raffle.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:border-purple-500 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{raffle.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{raffle.prize_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {raffle.available_tickets} / {raffle.total_tickets} disponíveis
                      </p>
                      <p className="text-lg font-bold text-purple-600">
                        R$ {raffle.ticket_price}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Nenhuma rifa disponível no momento.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
