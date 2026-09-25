'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'

type Item = { href: string; label: string; icon: string; exact?: boolean }

// Barra inferior: máximo 5 itens por perfil (padrão de app mobile)
const userTabs: Item[] = [
  { href: '/dashboard', label: 'Início', icon: '🏠', exact: true },
  { href: '/rifas', label: 'Sorteios', icon: '🎲' },
  { href: '/meus-bilhetes', label: 'Bilhetes', icon: '🎫' },
  { href: '/perfil', label: 'Perfil', icon: '👤' },
  { href: '/suporte', label: 'Suporte', icon: '❓' },
]

const affiliateTabs: Item[] = [
  { href: '/comissoes', label: 'Saldo', icon: '💳' },
  { href: '/dashboard', label: 'Parceiros', icon: '🤝', exact: true },
  { href: '/divulgacao', label: 'Links', icon: '🔗' },
  { href: '/saque', label: 'Saque', icon: '💸' },
  { href: '/perfil', label: 'Perfil', icon: '👤' },
]

const adminTabs: Item[] = [
  { href: '/dashboard', label: 'Visão', icon: '📊', exact: true },
  { href: '/minhas-rifas', label: 'Rifas', icon: '🎰' },
  { href: '/criar-rifa', label: 'Criar', icon: '➕' },
  { href: '/admin', label: 'Admin', icon: '🔒' },
  { href: '/perfil', label: 'Perfil', icon: '👤' },
]

export function MobileNav({
  isAdmin,
  isAffiliate,
}: {
  userName: string
  email: string
  isAdmin: boolean
  isAffiliate: boolean
}) {
  const pathname = usePathname()
  const tabs = isAdmin ? adminTabs : isAffiliate ? affiliateTabs : userTabs

  return (
    <>
      {/* Topo: logo + tema + avatar */}
      <div className="lg:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
            L
          </div>
          <span className="font-semibold">Lab</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Barra inferior fixa */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`text-xl leading-none w-11 h-8 flex items-center justify-center rounded-xl transition ${
                    active ? 'bg-primary/15' : ''
                  }`}
                >
                  {t.icon}
                </span>
                {t.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
