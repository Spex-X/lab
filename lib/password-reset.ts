import { createAdminClient } from '@/lib/supabase-admin'
import { sendPasswordSetupEmail } from '@/lib/email'

/**
 * Gera o link de recuperação/definição de senha via Admin API e envia
 * pelo nosso provedor (Brevo) — não depende do SMTP configurado no Supabase.
 */
export async function sendRecoveryLink(email: string, redirectTo: string): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin) {
    console.warn('[auth] SUPABASE_SECRET_KEY ausente — link de senha não enviado')
    return false
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  const link = data?.properties?.action_link
  if (error || !link) {
    console.error('[auth] generateLink falhou:', error?.message || 'sem action_link')
    return false
  }

  await sendPasswordSetupEmail(email, link)
  return true
}
