import { createClient } from '@/lib/supabase-server'
import { createPixPayment } from '@/lib/mercado-pago'
import { sendWelcomeEmail } from '@/lib/email'
import { sendRecoveryLink } from '@/lib/password-reset'
import { emailDomainCanReceive } from '@/lib/email-domain'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    let {
      data: { user },
    } = await supabase.auth.getUser()

    // Validar entrada
    const body = await request.json()
    const { raffleId, bets, guestName, guestEmail } = body

    let accountCreated = false

    // Guest checkout: cria a conta com senha aleatória e loga antes de reservar
    if (!user) {
      if (!guestName?.trim() || !guestEmail?.trim()) {
        return NextResponse.json(
          { error: 'Informe nome e email para continuar', needsAccount: true },
          { status: 400 }
        )
      }

      const email = guestEmail.trim()

      // Domínio precisa existir de verdade — impede contas com typo (gmail.comd)
      if (!(await emailDomainCanReceive(email))) {
        return NextResponse.json(
          { error: 'Email inválido — confira o endereço digitado' },
          { status: 400 }
        )
      }

      const tempPassword = crypto.randomBytes(24).toString('hex')
      const cookieStorePre = await cookies()
      const refCodePre = cookieStorePre.get('rifa_ref')?.value

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            full_name: guestName.trim(),
            ...(refCodePre ? { referred_by_code: refCodePre } : {}),
          },
        },
      })

      // Email já cadastrado → precisa logar pela página de login
      const alreadyExists =
        signUpError?.message?.toLowerCase().includes('already') ||
        (signUpData?.user && signUpData.user.identities?.length === 0)

      if (alreadyExists) {
        return NextResponse.json(
          { error: 'Este email já tem conta. Faça login para continuar.', needsLogin: true },
          { status: 409 }
        )
      }

      if (signUpError || !signUpData.user) {
        return NextResponse.json(
          { error: signUpError?.message || 'Não foi possível criar a conta' },
          { status: 400 }
        )
      }

      // Loga a conta recém-criada para o RPC rodar com auth.uid() dela
      const { error: reloginError } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword,
      })

      if (reloginError) {
        return NextResponse.json(
          { error: 'Conta criada! Faça login para concluir a compra.', needsLogin: true },
          { status: 400 }
        )
      }

      accountCreated = true
      // Boas-vindas + "defina sua senha" em background — não podem travar a reserva
      sendWelcomeEmail(email, guestName.trim()).catch(() => {})
      sendRecoveryLink(email, `${new URL(request.url).origin}/resetar-senha`).catch(() => {})

      const { data: userData } = await supabase.auth.getUser()
      user = userData.user

      if (!user) {
        return NextResponse.json(
          { error: 'Não foi possível autenticar. Tente fazer login.' },
          { status: 401 }
        )
      }
    }

    if (!raffleId || !bets || !Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json(
        { error: 'raffleId e bets são obrigatórios' },
        { status: 400 }
      )
    }

    // Cada jogo: exatamente 6 números únicos entre 1 e 75
    const validBet = (bet: any) =>
      Array.isArray(bet) &&
      bet.length === 6 &&
      new Set(bet).size === 6 &&
      bet.every((n: any) => Number.isInteger(n) && n >= 1 && n <= 75)

    if (!bets.every(validBet)) {
      return NextResponse.json(
        { error: 'Cada jogo deve ter 6 números diferentes entre 1 e 75' },
        { status: 400 }
      )
    }

    // Resolver afiliado pelo cookie de referência
    const cookieStore = await cookies()
    const refCode = cookieStore.get('rifa_ref')?.value
    let affiliateId: string | null = null

    if (refCode) {
      const { data: affiliate } = await supabase
        .from('profiles')
        .select('id')
        .eq('affiliate_code', refCode.toUpperCase())
        .single()

      if (affiliate && affiliate.id !== user.id) {
        affiliateId = affiliate.id
      }
    }

    // Criar pedido com os jogos (transação única no banco)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_bets_order', {
      p_raffle_id: raffleId,
      p_user_id: user.id,
      p_bets: bets,
      p_affiliate_id: affiliateId,
    })

    if (rpcError) {
      console.error('RPC Error:', rpcError)
      return NextResponse.json(
        { error: rpcError.message || 'Erro ao registrar jogos' },
        { status: 400 }
      )
    }

    // Verificar resultado da RPC
    const result = rpcResult as any
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Checkout transparente: o PIX já nasce junto com a reserva
    let pix: { paymentId: string; qrCodeBase64: string; copyPaste: string } | null = null
    try {
      const { data: raffle } = await supabase
        .from('raffles')
        .select('title')
        .eq('id', raffleId)
        .single()

      const pixPayment = await createPixPayment({
        orderId: result.order_id,
        totalAmount: result.total_amount,
        description: `${result.quantity}x jogos - ${raffle?.title || 'Sorteio'}`,
        payerEmail: user.email || undefined,
      })

      await supabase
        .from('orders')
        .update({
          mercado_pago_payment_id: pixPayment.paymentId,
          mercado_pago_external_reference: pixPayment.externalReference,
          pix_copy_paste: pixPayment.copyPaste,
          pix_qr_code: pixPayment.qrCodeBase64,
        })
        .eq('id', result.order_id)

      pix = {
        paymentId: pixPayment.paymentId,
        qrCodeBase64: pixPayment.qrCodeBase64,
        copyPaste: pixPayment.copyPaste,
      }
    } catch (e) {
      // Falha no PIX não invalida a reserva — o front oferece "Gerar QR" de novo
      console.error('PIX generation failed:', e)
    }

    // Retornar sucesso
    return NextResponse.json({
      success: true,
      orderId: result.order_id,
      quantity: result.quantity,
      totalAmount: result.total_amount,
      betCount: result.quantity,
      expiresAt: result.expires_at,
      accountCreated,
      ...pix,
    })
  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
