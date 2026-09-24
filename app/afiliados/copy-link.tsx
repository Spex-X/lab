'use client'

import { useState } from 'react'

export function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${code}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border font-mono text-sm truncate">
        {url}
      </div>
      <button
        onClick={copy}
        className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition shrink-0"
      >
        {copied ? 'Copiado!' : 'Copiar link'}
      </button>
    </div>
  )
}
