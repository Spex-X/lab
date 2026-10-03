'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/usuarios', label: 'Usuários', icon: '👥' },
  { href: '/admin/saldo', label: 'Saldo', icon: '💰' },
  { href: '/admin/ranking', label: 'Ranking vendedores', icon: '🏆' },
  { href: '/admin/resultados', label: 'Resultados', icon: '🎲' },
  { href: '/admin/ganhadores', label: 'Ganhadores', icon: '🏅' },
  { href: '/admin/saques', label: 'Solicitações de saque', icon: '💸' },
  { href: '/admin/rifas', label: 'Jogos', icon: '🎰' },
  { href: '/criar-rifa', label: 'Criar jogo', icon: '➕' },
]

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 bg-card border-r border-border text-muted-foreground min-h-screen flex flex-col">
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            SR
          </div>
          <div>
            <div className="font-bold text-foreground leading-tight">Sorteios Rápidos</div>
            <div className="text-[11px] text-muted-foreground">Administração</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Painel
        </p>
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? 'bg-primary/15 text-primary'
                  : 'hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>{it.icon}</span>
              {it.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <div className="px-3 pb-1">
          <ThemeToggle />
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted hover:text-foreground transition"
        >
          <span>🏠</span>
          Voltar ao site
        </Link>
        <Link
          href="/logout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition"
        >
          <span>🚪</span>
          Sair
        </Link>
        <div className="px-3 pt-3 text-xs text-muted-foreground truncate">{email}</div>
      </div>
    </aside>
  )
}
