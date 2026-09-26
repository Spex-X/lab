import nodemailer from 'nodemailer'

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
  if (match) return { name: match[1].trim() || 'Lab', email: match[2].trim() }
  return { name: 'Lab', email: from.trim() || 'noreply@lab.app' }
}

async function sendEmail(
  to: { email: string; name?: string | null },
  subject: string,
  html: string
) {
  const user = process.env.BREVO_SMTP_USER
  const pass = process.env.BREVO_SMTP_KEY
  if (!user || !pass) {
    console.warn('[email] BREVO_SMTP_USER/BREVO_SMTP_KEY não configuradas — pulando:', subject)
    return
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: Number(process.env.BREVO_SMTP_PORT) || 2525,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    })
    const from = sender()
    await transporter.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to: to.name ? `"${to.name}" <${to.email}>` : to.email,
      subject,
      html,
    })
  } catch (err) {
    console.error('[email] Falha ao enviar:', err)
  }
}

function layout(title: string, body: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="padding:24px 32px;border-bottom:1px solid #e4e4e7;">
    <span style="display:inline-block;background:#14b8a6;color:#ffffff;font-weight:bold;font-size:18px;border-radius:10px;padding:6px 12px;vertical-align:middle;">L</span>
    <span style="font-size:18px;font-weight:bold;color:#18181b;margin-left:8px;vertical-align:middle;">Lab</span>
  </td></tr>
  <tr><td style="padding:32px;">
    <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">${title}</h1>
    ${body}
  </td></tr>
  <tr><td style="padding:20px 32px;background:#fafafa;color:#71717a;font-size:12px;">
    Lab — Sorteios online. Você recebeu este email porque tem uma conta na plataforma.
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#14b8a6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:12px;">${label}</a>`
}

export async function sendWelcomeEmail(email: string, name?: string | null) {
  const firstName = name?.split(' ')[0]
  await sendEmail(
    { email, name },
    'Bem-vindo ao Lab!',
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

export async function sendPurchaseEmail(opts: {
  email: string
  name?: string | null
  raffleTitle: string
  ticketNumbers: number[]
  totalAmount: number
}) {
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

  await sendEmail(
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
