import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const ALLOWED_FOLDERS = new Set(['rifas', 'avatars'])

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary não configurado no servidor' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const folder = ALLOWED_FOLDERS.has(body?.folder) ? body.folder : 'rifas'

    const timestamp = Math.round(Date.now() / 1000)

    const signature = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex')

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    })
  } catch (error: any) {
    console.error('Cloudinary signature error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar assinatura' },
      { status: 500 }
    )
  }
}
