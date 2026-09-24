'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'
import { initials } from './user-sidebar'

const userItems = [
  { href: '/rifas', label: 'Explorar rifas', icon: '🎲' },
  { href: '/meus-bilhetes', label: 'Meus bilhetes', icon: '🎫' },
  { href: '/perfil', label: 'Meu perfil', icon: '👤' },
  { href: '/suporte', label: 'Suporte', icon: '❓' },
]

const affiliateItems = [
  { href: '/comissoes', label: 'Saldo', icon: '💳' },
  { href: '/dashboard', label: 'Convidar parceiros', icon: '🤝', exact: true },
  { href: '/divulgacao', label: 'Links de divulgação', icon: '🔗' },
  { href: '/saque', label: 'Saque', icon: '💸' },
  { href: '/suporte', label: 'Suporte', icon: '❓' },
]

const adminItems = [
  { href: '/dashboard', label: 'Visão geral', icon: '📊', exact: true },
  { href: '/minhas-rifas', label: 'Minhas rifas', icon: '🎰' },
  { href: '/criar-rifa', label: 'Criar rifa', icon: '➕' },
  { href: '/admin', label: 'Painel Admin', icon: '🔒' },
]

export function MobileNav({
  userName,
  email,
  isAdmin,
  isAffiliate,
}: {
  userName: string
  email: string
  isAdmin: boolean
  isAffiliate: boolean
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const linkCls = (href: string, exact?: boolean) => {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
      active ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
    }`
  }

  return (
    <div className="lg:hidden sticky top-0 z-40">
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl">
        <Link href={isAdmin || isAffiliate ? '/dashboard' : '/rifas'} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
            R
          </div>
          <span className="font-semibold">RifaLab</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-lg"
            aria-label="Menu"
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-14 bg-card border-b border-border shadow-xl p-3 space-y-1">
          {(isAffiliate && !isAdmin ? affiliateItems : userItems).map((it) => (
            <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className={linkCls(it.href)}>
              <span>{it.icon}</span>
              {it.label}
            </Link>
          ))}
          {isAdmin &&
            adminItems.map((it) => (
              <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className={linkCls(it.href, it.exact)}>
                <span>{it.icon}</span>
                {it.label}
              </Link>
            ))}
          <div className="border-t border-border pt-3 mt-3 flex items-center justify-between px-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-semibold text-xs shrink-0">
                {initials(userName)}
              </div>
              <span className="text-sm truncate">{userName}</span>
            </div>
            <Link href="/logout" className="text-sm text-destructive font-medium">
              Sair
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
