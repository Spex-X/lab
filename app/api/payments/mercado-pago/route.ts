import { createClient } from '@/lib/supabase-server'
import { createPixPayment } from '@/lib/mercado-pago'
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
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar pedido do banco
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado ou não pertence ao usuário' },
        { status: 404 }
      )
    }

    // Verificar status do pedido
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Pedido não está pendente', currentStatus: order.status },
        { status: 400 }
      )
    }

    // Verificar se o pedido não expirou
    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Pedido expirado' },
        { status: 400 }
      )
    }

    // Buscar informações da rifa para descrição
    const { data: raffle } = await supabase
      .from('raffles')
      .select('title, prize_name')
      .eq('id', order.raffle_id)
      .single()

    const description = `${order.quantity}x bilhetes - ${raffle?.title || 'Rifa'}`

    // Criar pagamento PIX no Mercado Pago
    const pixPayment = await createPixPayment({
      orderId: order.id,
      totalAmount: order.total_amount,
      description,
    })

    // Atualizar pedido com dados do pagamento
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        mercado_pago_payment_id: pixPayment.paymentId,
        mercado_pago_external_reference: pixPayment.externalReference,
        pix_copy_paste: pixPayment.copyPaste,
        pix_qr_code: pixPayment.qrCodeBase64,
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Error updating order with payment data:', updateError)
      // Continuar mesmo se falhar a atualização, pois o pagamento foi criado
    }

    // Retornar dados do pagamento
    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentId: pixPayment.paymentId,
      qrCode: pixPayment.qrCode,
      qrCodeBase64: pixPayment.qrCodeBase64,
      copyPaste: pixPayment.copyPaste,
      totalAmount: order.total_amount,
      expiresAt: order.expires_at,
    })
  } catch (error: any) {
    console.error('Mercado Pago payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar pagamento' },
      { status: 500 }
    )
  }
}
