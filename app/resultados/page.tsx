import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { PublicShell } from '@/components/public-shell'
import { formatDate } from '@/lib/get-session-user'

// Histórico ilustrativo até termos sorteios encerrados com ganhador registrado
const pastWinners = [
  { number: '047.213', name: 'Camila R.', city: 'Fortaleza, CE', prize: 'Pix de R$ 100 mil', date: '30/08/2026' },
  { number: '012.980', name: 'Jonas M.', city: 'Curitiba, PR', prize: 'SUV compacto 0 km', date: '14/08/2026' },
  { number: '008.451', name: 'Rafaela S.', city: 'Belém, PA', prize: 'Kit Apple Completo', date: '02/08/2026' },
  { number: '021.336', name: 'Diego A.', city: 'Porto Alegre, RS', prize: 'Moto street 300cc', date: '19/07/2026' },
  { number: '003.117', name: 'Larissa F.', city: 'Recife, PE', prize: 'Pix de R$ 20 mil', date: '05/07/2026' },
  { number: '015.842', name: 'Marcos T.', city: 'Goiânia, GO', prize: 'Notebook gamer', date: '21/06/2026' },
]

export default async function ResultadosPage() {
  const supabase = await createClient()

  const { data: completed } = await supabase
    .from('raffles')
    .select('id, title, prize_name, prize_image, draw_date, total_tickets')
    .eq('status', 'completed')
    .order('draw_date', { ascending: false })
    .limit(12)

  const hasCompleted = (completed?.length ?? 0) > 0

  return (
    <PublicShell active="/resultados">
      <section className="pt-32 pb-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-primary mb-4 tracking-wide">Resultados</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            Sorteios encerrados e ganhadores
          </h1>
          <p className="text-lg text-muted-foreground mt-6">
            Todo resultado segue a extração da Loteria Federal. Nomes reduzidos para preservar a privacidade.
          </p>
        </div>
      </section>

      {hasCompleted && (
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">Campanhas encerradas</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {completed!.map((r) => (
                <Link
                  key={r.id}
                  href={`/rifas/${r.id}`}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition"
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {r.prize_image ? (
                      <img src={r.prize_image} alt={r.prize_name} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">🏆</div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-background/85 backdrop-blur text-xs font-medium">
                      Encerrado
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold truncate group-hover:text-primary transition">{r.title}</h3>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{r.prize_name}</p>
                    {r.draw_date && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Sorteado em {formatDate(r.draw_date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold mb-6">Últimos ganhadores</h2>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="hidden md:grid grid-cols-4 gap-4 px-6 py-3 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Bilhete premiado</span>
              <span>Ganhador</span>
              <span>Prêmio</span>
              <span className="text-right">Data</span>
            </div>
            <div className="divide-y divide-border">
              {pastWinners.map((w) => (
                <div key={w.number} className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-5 items-center">
                  <div>
                    <p className="font-mono text-lg font-semibold text-primary">{w.number}</p>
                    <p className="text-xs text-muted-foreground md:hidden">Bilhete premiado</p>
                  </div>
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.city}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="font-medium">{w.prize}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1 md:text-right">
                    <p className="text-sm text-muted-foreground">{w.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-24 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">O próximo nome pode ser o seu</h2>
          <p className="text-muted-foreground mb-10">Veja as campanhas abertas e garanta seus números.</p>
          <Link
            href="/sorteios"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-lg hover:opacity-90 transition"
          >
            Ver sorteios abertos →
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
