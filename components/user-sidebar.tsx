'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './theme-toggle'

const userItems = [
  { href: '/dashboard', label: 'Início', icon: '🏠', exact: true },
  { href: '/sorteios', label: 'Explorar sorteios', icon: '🎲' },
  { href: '/meus-bilhetes', label: 'Meus jogos', icon: '🎫' },
  { href: '/saque', label: 'Saque', icon: '�' },
  { href: '/perfil', label: 'Meu perfil', icon: '👤' },
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
  { href: '/admin/saldo', label: 'Saldo', icon: '💰' },
  { href: '/admin/ranking', label: 'Ranking', icon: '🏆' },
  { href: '/admin/resultados', label: 'Resultados', icon: '🎲' },
  { href: '/admin/ganhadores', label: 'Ganhadores', icon: '🏅' },
  { href: '/admin/saques', label: 'Saques', icon: '💸' },
  { href: '/admin/rifas', label: 'Jogos', icon: '🎰' },
  { href: '/criar-rifa', label: 'Criar jogo', icon: '➕' },
]

const ADMIN_ACTIVE = 'bg-secondary/20 text-secondary'

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function NavLink({ href, label, icon, exact, activeClass }: { href: string; label: string; icon: string; exact?: boolean; activeClass: string }) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
        active ? activeClass : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <span>{icon}</span>
      {label}
    </Link>
  )
}

export function UserSidebar({
  userName,
  email,
  isAdmin,
  isAffiliate,
  avatarUrl,
}: {
  userName: string
  email: string
  isAdmin: boolean
  isAffiliate: boolean
  avatarUrl?: string
}) {
  return (
    <aside className="w-64 shrink-0 bg-card border-r border-border hidden lg:flex flex-col sticky top-0 h-screen">
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            SR
          </div>
          <div>
            <div className="font-semibold leading-tight">Sorteios Rápidos</div>
            <div className="text-[11px] text-muted-foreground">Painel</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {isAdmin ? (
          <>
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administração
            </p>
            {adminItems.map((it) => (
              <NavLink key={it.href} {...it} activeClass={ADMIN_ACTIVE} />
            ))}
          </>
        ) : (
          <>
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Menu
            </p>
            {(isAffiliate ? affiliateItems : userItems).map((it) => (
              <NavLink key={it.href} {...it} activeClass="bg-primary/15 text-primary" />
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border space-y-3">
        <Link href="/perfil" className="flex items-center gap-3 px-2 py-1 rounded-xl hover:bg-muted transition">
          <div className="w-9 h-9 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              initials(userName)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/logout"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition"
          >
            Sair
          </Link>
        </div>
      </div>
    </aside>
  )
}
