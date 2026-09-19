import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Validar entrada
    const body = await request.json()
    const { raffleId, ticketIds } = body

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

    // Chamar função RPC para reserva atômica
    const { data: rpcResult, error: rpcError } = await supabase.rpc('reserve_tickets_atomic', {
      p_raffle_id: raffleId,
      p_user_id: session.user.id,
      p_ticket_numbers: ticketIds,
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
    })
  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
