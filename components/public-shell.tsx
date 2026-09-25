import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

const navLinks = [
  { href: '/sorteios', label: 'Sorteios' },
  { href: '/como-funciona', label: 'Como funciona' },
  { href: '/resultados', label: 'Resultados' },
]

export function PublicShell({ children, active }: { children: React.ReactNode; active?: string }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              L
            </div>
            <span className="font-semibold text-lg">Lab</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`transition ${active === l.href ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
            >
              Entrar
            </Link>
            <Link
              href="/sorteios"
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              Quero participar
            </Link>
          </div>
        </div>
      </nav>

      {children}

      <footer className="border-t border-border px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              L
            </div>
            <p className="text-muted-foreground">Lab — sorteios auditados pela Loteria Federal.</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground">
            <Link href="/como-funciona" className="hover:text-foreground transition">Regulamento</Link>
            <Link href="/resultados" className="hover:text-foreground transition">Resultados</Link>
            <Link href="/login" className="hover:text-foreground transition">Minha conta</Link>
            <span className="text-xs">Proibido para menores de 18 anos.</span>
          </nav>
        </div>
      </footer>
    </main>
  )
}
