interface CloudinarySignature {
  cloudName: string
  apiKey: string
  timestamp: number
  folder: string
  signature: string
}

export async function uploadImage(file: File, folder = 'rifas'): Promise<string> {
  const sigRes = await fetch('/api/uploads/cloudinary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder }),
  })

  if (!sigRes.ok) {
    const err = await sigRes.json().catch(() => null)
    throw new Error(err?.error || 'Erro ao preparar upload')
  }

  const sig: CloudinarySignature = await sigRes.json()

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', sig.apiKey)
  formData.append('timestamp', String(sig.timestamp))
  formData.append('folder', sig.folder)
  formData.append('signature', sig.signature)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error?.message || 'Erro ao enviar imagem')
  }

  const data = await res.json()
  return data.secure_url as string
}
