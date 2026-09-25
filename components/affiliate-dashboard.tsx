import { createClient } from '@/lib/supabase-server'
import { card } from '@/components/ui'
import { CopyText } from '@/components/copy-text'
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
      .select('id, full_name, email, referred_by, created_at')
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
  let frontier = children.get(userId) ?? []
  while (frontier.length > 0) {
    levels.push(frontier)
    frontier = frontier.flatMap((p: any) => children.get(p.id) ?? [])
  }
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
    {
      title: 'Nível 3+ — fora do seu alcance',
      hint: 'Não geram comissão pra você (teto de 30% por venda)',
      members: levels.slice(2).flat(),
      earning: false,
    },
  ]
  const totalNetwork = levelGroups.reduce((sum, g) => sum + g.members.length, 0)

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  const inviteLink = `${proto}://${host}/cadastro-afiliado?ref=${affiliateCode}`

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
            Você recebe 5% das vendas até o nível 2. Nível 3 em diante não gera comissão pra você.
          </p>
        </div>
        {totalNetwork > 0 ? (
          <div className="divide-y divide-border">
            {levelGroups.map((group) => (
              <div key={group.title}>
                <div className="px-5 py-3 bg-muted/40 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {group.title} <span className="text-muted-foreground font-normal">({group.members.length})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{group.hint}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${
                      group.earning ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {group.earning ? '+5%' : '0%'}
                  </span>
                </div>
                {group.members.length > 0 && (
                  <div className="divide-y divide-border">
                    {group.members.map((d: any) => (
                      <div key={d.id} className="px-5 py-3.5">
                        <p className="text-sm font-medium truncate">{d.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground truncate">{d.email}</p>
                      </div>
                    ))}
                  </div>
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
    </main>
  )
}
