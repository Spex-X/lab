import { createAdminClient } from '@/lib/supabase-admin'
import { sendPasswordSetupEmail, type EmailResult } from '@/lib/email'

/**
 * Gera o link de recuperação/definição de senha via Admin API e envia
 * pelo nosso provedor (Brevo) — não depende do SMTP configurado no Supabase.
 */
export async function sendRecoveryLink(email: string, redirectTo: string): Promise<EmailResult> {
  const admin = createAdminClient()
  if (!admin) {
    console.warn('[auth] SUPABASE_SECRET_KEY ausente — link de senha não enviado')
    return { ok: false, error: 'SUPABASE_SECRET_KEY não configurada no servidor' }
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  const link = data?.properties?.action_link
  if (error || !link) {
    console.error('[auth] generateLink falhou:', error?.message || 'sem action_link')
    const friendly = error?.message?.toLowerCase().includes('not found')
      ? 'Email não cadastrado'
      : `generateLink: ${error?.message || 'sem link retornado'}`
    return { ok: false, error: friendly }
  }

  return sendPasswordSetupEmail(email, link)
}
