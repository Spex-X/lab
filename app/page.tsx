import { createClient } from '@/lib/supabase-server'

export default async function Home() {
  const supabase = await createClient()

  // Teste de conexão
  const { data, error } = await supabase.from('raffles').select('count')

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-4">🎰 Sistema de Rifas</h1>

        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Erro de conexão com Supabase</p>
            <p className="text-sm">{error.message}</p>
            <p className="text-xs mt-2">Execute o schema.sql no painel do Supabase</p>
          </div>
        ) : (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">✅ Conexão com Supabase estabelecida!</p>
            <p className="text-sm">O banco de dados está configurado</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <h2 className="font-semibold text-blue-900 mb-2">Próximos passos:</h2>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Execute o schema.sql no SQL Editor do Supabase</li>
              <li>Configure a autenticação no Supabase</li>
              <li>Crie as páginas do sistema</li>
            </ol>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Arquivo schema: <code className="bg-gray-100 px-2 py-1 rounded">supabase/schema.sql</code></p>
          </div>
        </div>
      </div>
    </main>
  )
}
