import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Teste de conexão
  const { data, error } = await supabase.from('raffles').select('count')

  // Se estiver logado, redirecionar para dashboard
  if (session) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-6">🎰 Sistema de Rifas</h1>
          <p className="text-xl text-white mb-8 opacity-90">
            Participe de rifas emocionantes e concorra a prêmios incríveis!
          </p>

          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8 max-w-md mx-auto">
              <p className="font-bold">Erro de conexão com Supabase</p>
              <p className="text-sm">{error.message}</p>
              <p className="text-xs mt-2">Execute o schema.sql no painel do Supabase</p>
            </div>
          ) : (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-8 max-w-md mx-auto">
              <p className="font-bold">✅ Sistema Online!</p>
              <p className="text-sm">O banco de dados está configurado e funcionando</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="text-4xl mb-4">🎟️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Compre Bilhetes</h3>
              <p className="text-gray-600">Escolha seus números favoritos e aumente suas chances</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="text-4xl mb-4">🎰</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Crie Rifas</h3>
              <p className="text-gray-600">Organize suas próprias rifas de forma simples</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ganhe Prêmios</h3>
              <p className="text-gray-600">Participe e concorra a prêmios incríveis</p>
            </div>
          </div>

          <div className="space-x-4">
            <Link
              href="/login"
              className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="bg-purple-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-900 transition inline-block"
            >
              Cadastrar
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
