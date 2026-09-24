'use client'

import { useRef, useState } from 'react'
import { uploadImage } from '@/lib/cloudinary'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
  folder?: string
}

export function ImageUpload({ value, onChange, label = 'Imagem do prêmio', folder }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Imagem muito grande (máx. 10MB)')
      return
    }

    setError('')
    setUploading(true)
    try {
      const url = await uploadImage(file, folder)
      onChange(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition disabled:opacity-50"
        >
          {uploading ? 'Enviando...' : value ? 'Trocar imagem' : 'Enviar imagem'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition"
          >
            Remover
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {value && (
        <div className="rounded-xl overflow-hidden border border-border max-w-xs">
          <img src={value} alt="Preview" className="w-full h-36 object-cover" />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
