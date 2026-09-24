import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'

type NavKey = 'dashboard' | 'rifas' | 'numeros' | 'explorar' | 'afiliados' | 'admin' | 'none'

interface AppNavProps {
  active?: NavKey
  userName?: string
  isAdmin?: boolean
  subtitle?: string
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function AppNav({ active = 'none', userName = 'Usuário', isAdmin = false, subtitle = 'Painel operacional' }: AppNavProps) {
  const items: { key: NavKey; href: string; label: string }[] = [
    { key: 'dashboard', href: '/dashboard', label: 'Visão geral' },
    { key: 'rifas', href: '/minhas-rifas', label: 'Rifas' },
    { key: 'numeros', href: '/meus-bilhetes', label: 'Números' },
    { key: 'explorar', href: '/rifas', label: 'Explorar' },
    { key: 'afiliados', href: '/afiliados', label: 'Parceria' },
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
            R
          </div>
          <div className="hidden sm:block">
            <div className="font-semibold leading-tight">RifaLab</div>
            <div className="text-[11px] text-muted-foreground">{subtitle}</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-muted rounded-xl p-1">
          {items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className={`px-4 py-1.5 rounded-lg text-sm transition ${
                active === it.key
                  ? 'bg-card text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {it.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-4 py-1.5 rounded-lg text-sm transition ${
                active === 'admin' ? 'bg-card text-accent font-medium shadow-sm' : 'text-accent hover:text-foreground'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/criar-rifa"
            className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
          >
            Criar rifa
          </Link>
          <ThemeToggle />
          <Link
            href="/logout"
            className="w-9 h-9 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-semibold text-sm"
            title="Sair"
          >
            {initials(userName)}
          </Link>
        </div>
      </div>
    </header>
  )
}
