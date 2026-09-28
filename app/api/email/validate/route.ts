import { emailDomainCanReceive } from '@/lib/email-domain'
import { NextResponse } from 'next/server'

// Validação de email antes do cadastro — formato + domínio com MX
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Formato de email inválido' })
  }

  if (!(await emailDomainCanReceive(email))) {
    return NextResponse.json({
      ok: false,
      error: 'Este domínio de email não existe — confira o endereço',
    })
  }

  return NextResponse.json({ ok: true })
}
