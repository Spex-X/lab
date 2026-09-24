'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const COOKIE_NAME = 'rifa_ref'
const COOKIE_DAYS = 30

export function RefTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (!ref) return

    const code = ref.trim().toUpperCase()
    if (!/^[A-Z0-9]{4,20}$/.test(code)) return

    const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString()
    document.cookie = `${COOKIE_NAME}=${code}; expires=${expires}; path=/; SameSite=Lax`
  }, [searchParams])

  return null
}
