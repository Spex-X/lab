import { redirect } from 'next/navigation'
import { UserShell } from '@/components/user-shell'
import { getSessionUser, formatCurrency } from '@/lib/get-session-user'
import { card } from '@/components/ui'
import { CopyText } from '@/components/copy-text'
import { headers } from 'next/headers'

export default async function PromotionLinksPage() {
  const { supabase, session, userName, isAdmin, isAffiliate, profile } = await getSessionUser()

  if (!isAffiliate) redirect('/rifas')

  const { data: raffles } = await supabase
    .from('raffles')
    .select('id, title, prize_name, prize_image, ticket_price, draw_date')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  const origin = `${proto}://${host}`
  const code = profile?.affiliate_code ?? ''

  return (
    <UserShell userName={userName} email={session.user.email ?? ''} isAdmin={isAdmin}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Sistema parceria</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Links de divulgação</h1>
          <p className="text-muted-foreground mt-2">
            Compartilhe os links abaixo. Quem se cadastrar por eles fica vinculado a você pra sempre —
            e toda compra gera comissão.
          </p>
        </div>

        {/* LINKS POR RIFA */}
        <section>
          <h2 className="font-semibold mb-4">Links por rifa ({raffles?.length ?? 0})</h2>
          {raffles && raffles.length > 0 ? (
            <div className="space-y-4">
              {raffles.map((r) => {
                const link = `${origin}/rifas/${r.id}?ref=${code}`
                return (
                  <div key={r.id} className={`${card} p-4 flex flex-col md:flex-row md:items-center gap-4`}>
                    <div className="w-full md:w-20 h-24 md:h-20 rounded-xl bg-gradient-to-br from-primary/25 to-secondary/25 overflow-hidden shrink-0">
                      {r.prize_image ? (
                        <img src={r.prize_image} alt={r.prize_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🎁</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{r.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {r.prize_name} · {formatCurrency(r.ticket_price)}/número
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate mt-1.5">{link}</p>
                    </div>
                    <CopyText text={link} label="Copiar" />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
              Nenhuma rifa ativa no momento. O link geral continua valendo!
            </div>
          )}
        </section>
      </main>
    </UserShell>
  )
}
