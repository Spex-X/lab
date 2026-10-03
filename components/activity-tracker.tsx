'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Envia a página visitada pro servidor. Fire-and-forget — não bloqueia navegação.
export function ActivityTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastSent = useRef<string | null>(null)

  useEffect(() => {
    const search = searchParams.toString()
    const path = search ? `${pathname}?${search}` : pathname
    if (path === lastSent.current) return
    lastSent.current = path

    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname, searchParams])

  return null
}
