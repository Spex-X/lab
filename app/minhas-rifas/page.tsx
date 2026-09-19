import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MyRafflesPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: myRaffles } = await supabase
    .from('raffles')
    .select('*')
    .eq('created_by', session.user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Voltar
              </Link>
              <h1 className="text-2xl font-bold text-purple-600">📋 Minhas Rifas</h1>
            </div>
            <div className="flex items-center space-x-4">
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
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {myRaffles?.length || 0} Rifas Criadas
          </h2>
          <Link
            href="/criar-rifa"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
          >
            + Criar Nova Rifa
          </Link>
        </div>

        {myRaffles && myRaffles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myRaffles.map((raffle) => {
              const availablePercentage = (raffle.available_tickets / raffle.total_tickets) * 100
              const soldPercentage = 100 - availablePercentage
              const isCompleted = raffle.status === 'completed'
              const isCancelled = raffle.status === 'cancelled'
              const isPaused = raffle.status === 'paused'

              return (
                <div
                  key={raffle.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  {raffle.prize_image && (
                    <div className="h-48 bg-gray-200">
                      <img
                        src={raffle.prize_image}
                        alt={raffle.prize_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{raffle.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        isCompleted ? 'bg-green-100 text-green-800' :
                        isCancelled ? 'bg-red-100 text-red-800' :
                        isPaused ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {isCompleted ? 'Concluída' : isCancelled ? 'Cancelada' : isPaused ? 'Pausada' : 'Ativa'}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{raffle.description}</p>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Prêmio:</span>
                        <span className="font-semibold">{raffle.prize_name}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Valor do bilhete:</span>
                        <span className="font-bold text-purple-600">R$ {raffle.ticket_price}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Vendidos:</span>
                        <span className="font-semibold text-green-600">
                          {raffle.total_tickets - raffle.available_tickets} / {raffle.total_tickets}
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${soldPercentage}%` }}
                        />
                      </div>

                      {raffle.draw_date && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sorteio:</span>
                          <span className="font-semibold">
                            {new Date(raffle.draw_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Arrecadado:</span>
                        <span className="font-bold text-green-600">
                          R$ {((raffle.total_tickets - raffle.available_tickets) * raffle.ticket_price).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Link
                        href={`/rifas/${raffle.id}/gerenciar`}
                        className="block w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition text-center"
                      >
                        ⚙️ Gerenciar
                      </Link>
                      <Link
                        href={`/rifas/${raffle.id}`}
                        className="block w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition text-center"
                      >
                        👁️ Ver Detalhes
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Você ainda não criou nenhuma rifa
            </h3>
            <p className="text-gray-600 mb-4">
              Comece criando sua primeira rifa!
            </p>
            <Link
              href="/criar-rifa"
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
            >
              Criar Nova Rifa
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
