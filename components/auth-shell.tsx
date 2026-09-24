import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Lado esquerdo - marketing */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12 border-r border-border">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />

        <div className="relative max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl mb-8">
            R
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-4">RifaLab</h1>
          <p className="text-lg text-muted-foreground mb-10">
            Participe de rifas emocionantes e concorra a prêmios incríveis. Gestão simples e completa das suas campanhas.
          </p>

          <div className="space-y-5">
            {[
              ['🎫', 'Bilhetes digitais', 'Selecione seus números favoritos'],
              ['💳', 'Pagamento PIX', 'Rápido, seguro e instantâneo'],
              ['🏆', 'Prêmios incríveis', 'Participe e ganhe!'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-xl">{icon}</div>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito - formulário */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link href="/" className="flex items-center gap-2 lg:invisible">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">R</div>
            <span className="font-semibold">RifaLab</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}

export const authInput =
  'w-full px-4 py-3 rounded-xl bg-card border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition'

export const authButton =
  'w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
