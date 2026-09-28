const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sender() {
  const from = process.env.EMAIL_FROM || ''
  const match = from.match(/^\s*(?:"?([^"<]+)"?\s*)?<([^>]+)>\s*$/)
  if (match) return { name: match[1].trim() || 'Sorteios Rápidos', email: match[2].trim() }
  return { name: 'Sorteios Rápidos', email: from.trim() || 'noreply@sorteiosrelampagos.com.br' }
}

export type EmailResult = { ok: boolean; error?: string }

async function sendEmail(
  to: { email: string; name?: string | null },
  subject: string,
  html: string
): Promise<EmailResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY não configurada — pulando:', subject)
    return { ok: false, error: 'BREVO_API_KEY não configurada' }
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: sender(),
        to: [{ email: to.email, ...(to.name ? { name: to.name } : {}) }],
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[email] Brevo recusou:', res.status, body)
      return { ok: false, error: `Brevo recusou (${res.status}): ${body}` }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('[email] Falha ao enviar:', err)
    return { ok: false, error: err?.message || 'Falha de rede ao enviar' }
  }
}

function layout(title: string, body: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="padding:24px 32px;border-bottom:1px solid #e4e4e7;">
    <span style="display:inline-block;background:#14b8a6;color:#ffffff;font-weight:bold;font-size:14px;border-radius:10px;padding:6px 10px;vertical-align:middle;">SR</span>
    <span style="font-size:18px;font-weight:bold;color:#18181b;margin-left:8px;vertical-align:middle;">Sorteios Rápidos</span>
  </td></tr>
  <tr><td style="padding:32px;">
    <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">${title}</h1>
    ${body}
  </td></tr>
  <tr><td style="padding:20px 32px;background:#fafafa;color:#71717a;font-size:12px;">
    Sorteios Rápidos — sorteios online. Você recebeu este email porque tem uma conta na plataforma.
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#14b8a6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:12px;">${label}</a>`
}

export async function sendWelcomeEmail(email: string, name?: string | null): Promise<EmailResult> {
  const firstName = name?.split(' ')[0]
  return sendEmail(
    { email, name },
    'Bem-vindo ao Sorteios Rápidos!',
    layout(
      `Bem-vindo${firstName ? `, ${esc(firstName)}` : ''}!`,
      `<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Sua conta foi criada com sucesso. Agora você já pode participar dos sorteios,
        acompanhar seus números e concorrer aos prêmios.
      </p>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px;">
        É só escolher seus números e pagar com Pix.
      </p>
      ${button(`${SITE_URL}/sorteios`, 'Explorar sorteios')}`
    )
  )
}

export async function sendPasswordSetupEmail(email: string, actionLink: string): Promise<EmailResult> {
  return sendEmail(
    { email },
    'Defina sua senha — Sorteios Rápidos',
    layout(
      'Definir senha de acesso',
      `<p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Use o botão abaixo para definir (ou alterar) a senha da sua conta.
        O link é válido por tempo limitado e só pode ser usado uma vez.
      </p>
      <p style="margin:0 0 24px;">
        ${button(actionLink, 'Definir minha senha')}
      </p>
      <p style="color:#71717a;font-size:13px;line-height:1.6;margin:0;">
        Se você não pediu isso, pode ignorar este email com segurança.
      </p>`
    )
  )
}

export async function sendPurchaseEmail(opts: {
  email: string
  name?: string | null
  raffleTitle: string
  ticketNumbers: number[]
  totalAmount: number
}): Promise<EmailResult> {
  const total = opts.totalAmount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
  const chips = [...opts.ticketNumbers]
    .sort((a, b) => a - b)
    .map(
      (n) =>
        `<span style="display:inline-block;background:#f0fdfa;border:1px solid #99f6e4;color:#0f766e;font-weight:600;border-radius:8px;padding:4px 10px;margin:0 6px 6px 0;">${n}</span>`
    )
    .join('')

  return sendEmail(
    { email: opts.email, name: opts.name },
    'Pagamento confirmado — seus números!',
    layout(
      'Pagamento confirmado!',
      `<p style="color:#3f3f46;font-size:15px;margin:0 0 4px;">
        Sorteio: <strong>${esc(opts.raffleTitle)}</strong>
      </p>
      <p style="color:#3f3f46;font-size:15px;margin:0 0 20px;">
        Total pago: <strong>${total}</strong>
      </p>
      <p style="color:#71717a;font-size:13px;margin:0 0 8px;">Seus números:</p>
      <div style="margin:0 0 20px;">${chips || '—'}</div>
      <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Boa sorte! Acompanhe o resultado na plataforma.
      </p>
      ${button(`${SITE_URL}/meus-bilhetes`, 'Ver meus bilhetes')}`
    )
  )
}
