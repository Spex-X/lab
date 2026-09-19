import mercadopago from 'mercadopago'

// Configurar Mercado Pago com access token do servidor
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
})

export interface CreatePixPaymentParams {
  orderId: string
  totalAmount: number
  description: string
}

export interface PixPaymentResponse {
  qrCode: string
  qrCodeBase64: string
  copyPaste: string
  paymentId: string
  externalReference: string
}

export async function createPixPayment(params: CreatePixPaymentParams): Promise<PixPaymentResponse> {
  try {
    const { orderId, totalAmount, description } = params

    // Criar pagamento PIX
    const paymentData = {
      transaction_amount: totalAmount,
      description: description || `Pedido #${orderId}`,
      payment_method_id: 'pix',
      payer: {
        email: 'pagador@example.com', // Será atualizado pelo frontend se necessário
        first_name: 'Pagador',
        last_name: 'Anônimo',
        identification: {
          type: 'CPF',
          number: '00000000000', // CPF genérico, pode ser atualizado
        },
        address: {
          zip_code: '00000000',
          street_name: 'Rua Exemplo',
          street_number: '123',
          city: 'São Paulo',
          federal_unit: 'SP',
        },
      },
      external_reference: orderId,
      metadata: {
        order_id: orderId,
      },
    }

    const payment = await mercadopago.payment.create(paymentData)

    if (payment.status !== 201) {
      throw new Error('Erro ao criar pagamento PIX')
    }

    const paymentResponse = payment.body

    // Extrair dados do PIX
    const pixData = paymentResponse.point_of_interaction?.transaction_data

    if (!pixData) {
      throw new Error('Dados do PIX não encontrados na resposta')
    }

    return {
      qrCode: pixData.qr_code || '',
      qrCodeBase64: pixData.qr_code_base64 || '',
      copyPaste: pixData.ticket_url || '',
      paymentId: paymentResponse.id.toString(),
      externalReference: paymentResponse.external_reference || orderId,
    }
  } catch (error: any) {
    console.error('Mercado Pago error:', error)
    throw new Error(error.message || 'Erro ao criar pagamento PIX')
  }
}

export async function getPaymentStatus(paymentId: string) {
  try {
    const payment = await mercadopago.payment.get(paymentId)
    return payment.body
  } catch (error: any) {
    console.error('Mercado Pago get payment error:', error)
    throw new Error(error.message || 'Erro ao buscar status do pagamento')
  }
}
