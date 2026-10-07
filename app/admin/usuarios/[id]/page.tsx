import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatPhoneBR } from '@/lib/phone'

const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('pt-BR') : '—'

export default async function AdminUserActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  // Último login e mudanças na conta via Admin API (precisa da chave secreta)
  const admin = createAdminClient()
  const { data: authData } = admin
    ? await admin.auth.admin.getUserById(id)
    : { data: { user: null } }
  const authUser = authData?.user

  const { data: activity } = await supabase
    .from('user_activity')
    .select('path, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/admin/usuarios" className="text-sm text-muted-foreground hover:text-foreground">
        ← Voltar para usuários
      </Link>

      <div className="mt-4 mb-8 flex items-center gap-4">
        <div className="shrink-0 h-14 w-14 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-semibold text-lg">
              {(profile.full_name || profile.email || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-semibold">{profile.full_name || 'Sem nome'}</h2>
          <p className="text-sm text-muted-foreground">
            {[profile.email, formatPhoneBR(profile.phone ?? authUser?.phone)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Último login</p>
          <p className="text-lg font-semibold">{fmtDateTime(authUser?.last_sign_in_at)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Conta alterada em</p>
          <p className="text-lg font-semibold">{fmtDateTime(authUser?.updated_at)}</p>
          <p className="text-xs text-muted-foreground mt-1">Senha, email ou dados da conta</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cadastro</p>
          <p className="text-lg font-semibold">{fmtDateTime(profile.created_at)}</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-3">
        Navegação recente {activity ? `(${activity.length})` : ''}
      </h3>
      {activity && activity.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Página
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">
                  Horário
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activity.map((a: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30 transition">
                  <td className="px-6 py-3 text-sm font-mono">{a.path}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(a.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border text-center py-12">
          <div className="text-4xl mb-3">🧭</div>
          <p className="text-muted-foreground">Nenhuma navegação registrada ainda.</p>
        </div>
      )}
    </main>
  )
}
