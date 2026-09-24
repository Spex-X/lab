import { createClient } from '@/lib/supabase-server'
import { getPaymentStatus } from '@/lib/mercado-pago'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function verifySignature(request: Request, paymentId: string): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
  if (!secret) return true // Sem segredo configurado, aceita (dev)

  const signatureHeader = request.headers.get('x-signature')
  const requestId = request.headers.get('x-request-id')

  if (!signatureHeader || !requestId) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k.trim(), v?.trim()]
    })
  )

  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const body = await request.json().catch(() => ({}))

    const paymentId =
      searchParams.get('data.id') ||
      searchParams.get('id') ||
      body?.data?.id?.toString() ||
      body?.id?.toString()

    const type = body?.type || body?.action || searchParams.get('type')

    // Só processa notificações de pagamento
    if (!paymentId || (type && !String(type).includes('payment'))) {
      return NextResponse.json({ received: true })
    }

    if (!verifySignature(request, paymentId)) {
      console.error('Webhook: assinatura inválida')
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    }

    // Consulta o status real do pagamento na API do Mercado Pago
    const payment = await getPaymentStatus(paymentId)

    if (payment.status !== 'approved') {
      return NextResponse.json({ received: true, status: payment.status })
    }

    const orderId = payment.external_reference
    if (!orderId) {
      console.error('Webhook: pagamento sem external_reference', paymentId)
      return NextResponse.json({ received: true })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('confirm_order_payment', {
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_external_reference: payment.external_reference || '',
      p_pix_copy_paste: payment.point_of_interaction?.transaction_data?.qr_code || '',
      p_pix_qr_code: payment.point_of_interaction?.transaction_data?.qr_code_base64 || '',
    })

    if (error) {
      console.error('Webhook: erro ao confirmar pedido', error)
    }
    if (data?.error) {
      console.log('Webhook: pedido não confirmado -', data.error)
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
