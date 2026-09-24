import { createClient } from '@/lib/supabase-server'
import { getPaymentStatus } from '@/lib/mercado-pago'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { paymentId } = await params

    // Buscar status do pagamento no Mercado Pago
    const paymentData = await getPaymentStatus(paymentId)

    // Buscar pedido correspondente
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('mercado_pago_payment_id', paymentId)
      .eq('user_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Se o pagamento foi aprovado e o pedido ainda está pendente, atualizar
    if (paymentData.status === 'approved' && order.status === 'pending') {
      const { error: updateError } = await supabase.rpc('confirm_order_payment', {
        p_order_id: order.id,
        p_payment_id: paymentId,
        p_external_reference: paymentData.external_reference || '',
        p_pix_copy_paste: order.pix_copy_paste || '',
        p_pix_qr_code: order.pix_qr_code || '',
      })

      if (updateError) {
        console.error('Error confirming order payment:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      paymentStatus: paymentData.status,
      orderStatus: order.status,
      paymentData: {
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        date_approved: paymentData.date_approved,
        date_of_expiration: paymentData.date_of_expiration,
      },
    })
  } catch (error: any) {
    console.error('Payment status error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar status do pagamento' },
      { status: 500 }
    )
  }
}
