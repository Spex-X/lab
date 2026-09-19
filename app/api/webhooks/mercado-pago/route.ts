import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Obter dados do webhook
    const body = await request.json()
    const { type, data } = body

    // Verificar se é uma notificação de pagamento
    if (type !== 'payment') {
      return NextResponse.json({ received: true })
    }

    const paymentId = data.id

    // Opcional: Verificar assinatura do webhook para segurança
    // const signature = request.headers.get('x-signature')
    // const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
    // if (signature && webhookSecret) {
    //   const expectedSignature = crypto
    //     .createHmac('sha256', webhookSecret)
    //     .update(JSON.stringify(body))
    //     .digest('hex')
    //   if (signature !== expectedSignature) {
    //     return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    //   }
    // }

    // Buscar pedido pelo external_reference (que é o order_id)
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('mercado_pago_payment_id', paymentId)
      .single()

    if (!order) {
      console.log(`Order not found for payment ID: ${paymentId}`)
      return NextResponse.json({ received: true })
    }

    // Buscar status atual do pagamento no Mercado Pago
    // (Idealmente usaríamos a SDK do Mercado Pago aqui, mas por simplicidade vamos confiar no webhook)
    const paymentStatus = body.action || 'unknown'

    // Se o pagamento foi aprovado, confirmar o pedido
    if (paymentStatus === 'payment.updated' || paymentStatus === 'payment.created') {
      // Aqui você faria uma chamada à API do Mercado Pago para verificar o status real
      // Por enquanto, vamos apenas registrar que recebemos a notificação
      console.log(`Payment notification received for order ${order.id}, payment ${paymentId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}
