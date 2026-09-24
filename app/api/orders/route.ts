import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    let {
      data: { user },
    } = await supabase.auth.getUser()

    // Validar entrada
    const body = await request.json()
    const { raffleId, ticketIds, guestName, guestEmail, guestPassword } = body

    let accountCreated = false

    // Guest checkout: cria a conta (ou loga) antes de reservar
    if (!user) {
      if (!guestName?.trim() || !guestEmail?.trim() || !guestPassword) {
        return NextResponse.json(
          { error: 'Informe nome, email e senha para continuar', needsAccount: true },
          { status: 400 }
        )
      }
      if (guestPassword.length < 6) {
        return NextResponse.json(
          { error: 'A senha deve ter pelo menos 6 caracteres' },
          { status: 400 }
        )
      }

      const cookieStorePre = await cookies()
      const refCodePre = cookieStorePre.get('rifa_ref')?.value

      // Tenta login primeiro (email pode já estar cadastrado)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: guestEmail.trim(),
        password: guestPassword,
      })

      if (signInError) {
        // Não existe ou senha errada → tenta criar a conta
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: guestEmail.trim(),
          password: guestPassword,
          options: {
            data: {
              full_name: guestName.trim(),
              ...(refCodePre ? { referred_by_code: refCodePre } : {}),
            },
          },
        })

        if (signUpError) {
          return NextResponse.json(
            { error: signUpError.message },
            { status: 400 }
          )
        }

        // Email já cadastrado (Supabase retorna user sem identities)
        if (!signUpData.user || signUpData.user.identities?.length === 0) {
          return NextResponse.json(
            { error: 'Este email já tem conta. Use a senha correta ou faça login.', needsLogin: true },
            { status: 409 }
          )
        }

        // Loga a conta recém-criada para o RPC rodar com auth.uid() dela
        const { error: reloginError } = await supabase.auth.signInWithPassword({
          email: guestEmail.trim(),
          password: guestPassword,
        })

        if (reloginError) {
          return NextResponse.json(
            { error: 'Conta criada! Confirme seu email e faça login para concluir a compra.', needsLogin: true },
            { status: 400 }
          )
        }

        accountCreated = true
      }

      const { data: userData } = await supabase.auth.getUser()
      user = userData.user

      if (!user) {
        return NextResponse.json(
          { error: 'Não foi possível autenticar. Tente fazer login.' },
          { status: 401 }
        )
      }
    }

    if (!raffleId || !ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json(
        { error: 'raffleId e ticketIds são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar que ticketIds são números
    if (!ticketIds.every((id: any) => typeof id === 'number' && id > 0)) {
      return NextResponse.json(
        { error: 'ticketIds deve conter apenas números positivos' },
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

    // Chamar função RPC para reserva atômica
    const { data: rpcResult, error: rpcError } = await supabase.rpc('reserve_tickets_atomic', {
      p_raffle_id: raffleId,
      p_user_id: user.id,
      p_ticket_numbers: ticketIds,
      p_affiliate_id: affiliateId,
    })

    if (rpcError) {
      console.error('RPC Error:', rpcError)
      return NextResponse.json(
        { error: rpcError.message || 'Erro ao reservar bilhetes' },
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

    // Retornar sucesso
    return NextResponse.json({
      success: true,
      orderId: result.order_id,
      quantity: result.quantity,
      totalAmount: result.total_amount,
      ticketNumbers: result.ticket_numbers,
      expiresAt: result.expires_at,
      accountCreated,
    })
  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
