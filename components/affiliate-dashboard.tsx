import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { card } from '@/components/ui'
import { CopyText } from '@/components/copy-text'
import { formatCurrency } from '@/lib/get-session-user'
import { headers } from 'next/headers'

export async function AffiliateDashboard({
  userId,
  affiliateCode,
}: {
  userId: string
  affiliateCode: string
}) {
  const supabase = await createClient()

  const [{ data: allProfiles }, { data: statsRaw }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, referred_by, is_affiliate, created_at')
      .not('referred_by', 'is', null)
      .order('created_at', { ascending: false }),
    supabase.rpc('get_affiliate_stats', { p_user_id: userId }),
  ])
  const stats = (statsRaw ?? {}) as any

  // Monta a árvore: nível 1 = indicados diretos, nível 2 = indicados dos indicados, nível 3+ = fora do alcance
  const children = new Map<string, any[]>()
  for (const p of allProfiles ?? []) {
    const list = children.get(p.referred_by) ?? []
    list.push(p)
    children.set(p.referred_by, list)
  }
  const levels: any[][] = []
  const visited = new Set<string>([userId])
  let frontier = children.get(userId) ?? []
  while (frontier.length > 0 && levels.length < 10) {
    const level = frontier.filter((p: any) => !visited.has(p.id))
    if (level.length === 0) break
    level.forEach((p: any) => visited.add(p.id))
    // Só parceiros aprovados aparecem na rede — usuário normal não entra na lista
    const affiliates = level.filter((p: any) => p.is_affiliate)
    if (affiliates.length > 0) levels.push(affiliates)
    frontier = level.flatMap((p: any) => children.get(p.id) ?? [])
  }
  // Só exibe quem está dentro do alcance da comissão (níveis 1 e 2)
  const levelGroups = [
    {
      title: 'Nível 1 — seus indicados diretos',
      hint: 'Você ganha 5% em cada venda deles',
      members: levels[0] ?? [],
      earning: true,
    },
    {
      title: 'Nível 2 — indicados dos seus indicados',
      hint: 'Você ganha 5% em cada venda deles',
      members: levels[1] ?? [],
      earning: true,
    },
  ]
  const totalNetwork = levelGroups.reduce((sum, g) => sum + g.members.length, 0)

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  const inviteLink = `${proto}://${host}/cadastro-parceiro?ref=${affiliateCode}`

  // Jogos do próprio afiliado (ele também pode jogar)
  const { data: myBets } = await supabase
    .from('bets')
    .select('id, numbers, hits, raffles(id, title, winning_numbers)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  // potes/ganhadores por sorteio pra mostrar o valor do prêmio
  const betRaffleIds = [...new Set((myBets ?? []).map((b: any) => b.raffles?.id).filter(Boolean))]
  const statsEntries = await Promise.all(
    betRaffleIds.map(async (id) => {
      const { data } = await supabase.rpc('get_raffle_stats', { p_raffle_id: id as string })
      return [id, data] as const
    })
  )
  const statsByRaffle = new Map<string, any>(statsEntries)
  const tierKey = (hits: number) => (hits === 6 ? 'sena' : hits === 5 ? 'quina' : 'quadra')
  const prizeFor = (raffleId: string, hits: number) => {
    const s = statsByRaffle.get(raffleId)
    if (!s) return 0
    const pot = Number(s[`pot_${tierKey(hits)}`] ?? 0)
    const w = Number(s[`winners_${tierKey(hits)}`] ?? 0)
    return w > 0 ? pot / w : 0
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Sistema parceria</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Convidar parceiros</h1>
        <p className="text-muted-foreground mt-2">
          Ganhe <span className="text-primary font-semibold">20%</span> em todas as compras de quem você indicar
          e <span className="text-secondary font-semibold">5%</span> em cada venda da sua rede até 2 níveis acima.
        </p>
      </div>

      <section className={`${card} p-6 space-y-4 border-primary/30`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Convidar parceiros</h2>
          <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs font-semibold shrink-0">
            +5% da rede
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Convide outros parceiros: quem se cadastrar por este link vira parceiro aprovado
          na sua rede — e você ganha 5% em cada venda que ele fizer.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border font-mono text-sm truncate">
            {inviteLink}
          </div>
          <CopyText text={inviteLink} label="Copiar convite" />
        </div>
      </section>

      <section className={`${card} overflow-hidden`}>
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold">Sua rede ({totalNetwork})</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Só aparecem parceiros dentro do seu alcance de comissão (até o nível 2).
          </p>
        </div>
        {totalNetwork > 0 ? (
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {levelGroups.map((group) => (
              <div key={group.title}>
                <div className="px-5 py-3 bg-muted/40 flex items-center justify-between gap-3 border-b border-border">
                  <div>
                    <p className="text-sm font-semibold">
                      {group.title} <span className="text-muted-foreground font-normal">({group.members.length})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{group.hint}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 bg-primary/15 text-primary">
                    +5%
                  </span>
                </div>
                {group.members.length > 0 ? (
                  <div className="divide-y divide-border">
                    {group.members.map((d: any) => (
                      <div key={d.id} className="px-5 py-3.5">
                        <p className="text-sm font-medium truncate">{d.full_name || 'Sem nome'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-5 py-6 text-center text-xs text-muted-foreground">
                    Nenhum parceiro neste nível ainda
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-muted-foreground text-sm">
            Ninguém se cadastrou pelo seu link ainda. Use o convite acima para começar!
          </p>
        )}
      </section>

      {/* MEUS JOGOS */}
      <section className={`${card} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Meus jogos</h3>
          <Link href="/meus-bilhetes" className="text-sm text-muted-foreground hover:text-foreground transition">
            Ver todos →
          </Link>
        </div>
        {myBets && myBets.length > 0 ? (
          <div className="space-y-2">
            {myBets.map((b: any) => {
              const drawn = b.raffles?.winning_numbers as number[] | null
              const won = b.hits != null && b.hits >= 4
              return (
                <div key={b.id} className="flex items-center gap-3 flex-wrap text-sm">
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">{b.raffles?.title}</span>
                  <div className="flex gap-1">
                    {[...b.numbers].sort((a: number, z: number) => a - z).map((n: number) => {
                      const hit = drawn?.includes(n)
                      return (
                        <span
                          key={n}
                          className={`px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums ${
                            hit ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {String(n).padStart(2, '0')}
                        </span>
                      )
                    })}
                  </div>
                  {b.hits != null && (
                    <span className={`text-xs font-semibold ${won ? 'text-primary' : 'text-muted-foreground'}`}>
                      {won
                        ? `🏆 ${b.hits === 6 ? 'Sena' : b.hits === 5 ? 'Quina' : 'Quadra'} · ${formatCurrency(prizeFor(b.raffles?.id, b.hits))}`
                        : `${b.hits} acertos — não ganhou`}
                    </span>
                  )}
                  {b.hits == null && !drawn && (
                    <span className="text-xs text-muted-foreground">aguardando sorteio</span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você ainda não jogou. <Link href="/sorteios" className="text-primary font-semibold hover:underline">Explorar sorteios →</Link>
          </p>
        )}
      </section>
    </main>
  )
}
