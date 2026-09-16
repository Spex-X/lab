import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MyTicketsPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Buscar bilhetes do usuário com informações das rifas
  const { data: myTickets } = await supabase
    .from('tickets')
    .select(`
      *,
      raffles (
        id,
        title,
        prize_name,
        prize_image,
        draw_date,
        status,
        ticket_price
      )
    `)
    .eq('buyer_id', session.user.id)
    .eq('status', 'sold')
    .order('purchased_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Voltar
              </Link>
              <h1 className="text-2xl font-bold text-purple-600">🎫 Meus Bilhetes</h1>
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {myTickets?.length || 0} Bilhetes Comprados
          </h2>
        </div>

        {myTickets && myTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTickets.map((ticket: any) => {
              const raffle = ticket.raffles
              const isCompleted = raffle?.status === 'completed'
              const isDrawDatePassed = raffle?.draw_date && new Date(raffle.draw_date) < new Date()

              return (
                <div
                  key={ticket.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  {raffle?.prize_image && (
                    <div className="h-32 bg-gray-200">
                      <img
                        src={raffle.prize_image}
                        alt={raffle.prize_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{raffle?.title}</h3>
                        <p className="text-sm text-gray-600">{raffle?.prize_name}</p>
                      </div>
                      <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold text-lg">
                        #{ticket.ticket_number}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Valor pago:</span>
                        <span className="font-semibold text-green-600">R$ {raffle?.ticket_price}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Data da compra:</span>
                        <span className="font-semibold">
                          {new Date(ticket.purchased_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {raffle?.draw_date && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sorteio:</span>
                          <span className={`font-semibold ${isDrawDatePassed ? 'text-red-600' : 'text-blue-600'}`}>
                            {new Date(raffle.draw_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}

                      <div className={`mt-3 p-2 rounded text-center text-sm font-semibold ${
                        isCompleted ? 'bg-green-100 text-green-800' :
                        isDrawDatePassed ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {isCompleted ? 'Rifa Concluída' :
                         isDrawDatePassed ? 'Aguardando Resultado' :
                         'Rifa em Andamento'}
                      </div>
                    </div>

                    <Link
                      href={`/rifas/${raffle?.id}`}
                      className="block w-full mt-4 bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition text-center"
                    >
                      Ver Rifa
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Você ainda não comprou nenhum bilhete
            </h3>
            <p className="text-gray-600 mb-4">
              Participe de uma rifa para ter chances de ganhar!
            </p>
            <Link
              href="/rifas"
              className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition"
            >
              Ver Rifas Disponíveis
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
