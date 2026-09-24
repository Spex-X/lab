import { MercadoPagoConfig, Payment } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

const paymentClient = new Payment(client)

export interface CreatePixPaymentParams {
  orderId: string
  totalAmount: number
  description: string
  payerEmail?: string
}

export interface PixPaymentResponse {
  qrCode: string
  qrCodeBase64: string
  copyPaste: string
  ticketUrl: string
  paymentId: string
  externalReference: string
}

export async function createPixPayment(params: CreatePixPaymentParams): Promise<PixPaymentResponse> {
  try {
    const { orderId, totalAmount, description, payerEmail } = params

    const payment = await paymentClient.create({
      body: {
        transaction_amount: Number(totalAmount.toFixed(2)),
        description: description || `Pedido #${orderId}`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail || 'pagador@rifalab.app',
        },
        external_reference: orderId,
        metadata: {
          order_id: orderId,
        },
      },
      requestOptions: { idempotencyKey: orderId },
    })

    const pixData = payment.point_of_interaction?.transaction_data

    if (!pixData || !payment.id) {
      throw new Error('Dados do PIX não encontrados na resposta')
    }

    return {
      qrCode: pixData.qr_code || '',
      qrCodeBase64: pixData.qr_code_base64 || '',
      copyPaste: pixData.qr_code || '',
      ticketUrl: pixData.ticket_url || '',
      paymentId: String(payment.id),
      externalReference: payment.external_reference || orderId,
    }
  } catch (error: any) {
    console.error('Mercado Pago error:', error)
    throw new Error(error.message || 'Erro ao criar pagamento PIX')
  }
}

export async function getPaymentStatus(paymentId: string) {
  try {
    return await paymentClient.get({ id: paymentId })
  } catch (error: any) {
    console.error('Mercado Pago get payment error:', error)
    throw new Error(error.message || 'Erro ao buscar status do pagamento')
  }
}
