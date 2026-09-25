import Link from 'next/link'
import { UserShell } from '@/components/user-shell'
import { getSessionUser, formatDate } from '@/lib/get-session-user'
import { card } from '@/components/ui'
import { ProfileForm } from './profile-form'

export default async function ProfilePage() {
  const { session, userName, email, isAdmin, isAffiliate, profile } = await getSessionUser()

  return (
    <UserShell userName={userName} email={email} isAdmin={isAdmin}>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 w-full">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Sua conta</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Meu perfil</h1>
        </div>

        <ProfileForm
          initialName={profile?.full_name || ''}
          initialAvatar={profile?.avatar_url || ''}
          email={email}
        />

        <section className={`${card} p-6`}>
          <h2 className="font-semibold mb-4">Informações da conta</h2>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium mt-0.5">{email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Membro desde</dt>
              <dd className="font-medium mt-0.5">{formatDate(session.user.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Código de parceiro</dt>
              <dd className="font-medium mt-0.5 font-mono">{profile?.affiliate_code || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tipo de conta</dt>
              <dd className="font-medium mt-0.5">{isAdmin ? 'Administrador' : isAffiliate ? 'Parceiro' : 'Usuário'}</dd>
            </div>
          </dl>
        </section>

        <section className={`${card} p-6 flex items-center justify-between gap-4`}>
          <div>
            <h2 className="font-semibold">Sair da conta</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Encerra sua sessão neste dispositivo.</p>
          </div>
          <Link
            href="/logout"
            className="px-5 py-2.5 rounded-xl border border-destructive/40 text-destructive text-sm font-semibold hover:bg-destructive/10 transition shrink-0"
          >
            Sair
          </Link>
        </section>
      </main>
    </UserShell>
  )
}
