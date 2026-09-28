import { sendRecoveryLink } from '@/lib/password-reset'
import { emailDomainCanReceive } from '@/lib/email-domain'
import { NextResponse } from 'next/server'

// Recuperação de senha enviada pela nossa pipeline (Brevo API).
// Não depende do SMTP configurado no Supabase.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim() : ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'Formato de email inválido' }, { status: 400 })
    }

    if (!(await emailDomainCanReceive(email))) {
      return NextResponse.json(
        { ok: false, error: 'Este domínio de email não existe — confira o endereço' },
        { status: 400 }
      )
    }

    const origin = new URL(request.url).origin
    const result = await sendRecoveryLink(email, `${origin}/resetar-senha`)

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[auth] recover:', e)
    return NextResponse.json(
      { ok: false, error: e?.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
