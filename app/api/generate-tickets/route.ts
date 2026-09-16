import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { raffleId, totalTickets } = await request.json()

    if (!raffleId || !totalTickets) {
      return NextResponse.json(
        { error: 'raffleId e totalTickets são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Gerar bilhetes
    const tickets = Array.from({ length: totalTickets }, (_, i) => ({
      raffle_id: raffleId,
      ticket_number: i + 1,
      status: 'available',
    }))

    const { error } = await supabase.from('tickets').insert(tickets)

    if (error) throw error

    return NextResponse.json({ success: true, count: totalTickets })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
