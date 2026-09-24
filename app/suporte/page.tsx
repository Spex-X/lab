import { UserShell } from '@/components/user-shell'
import { getSessionUser } from '@/lib/get-session-user'
import { card } from '@/components/ui'

const faqs = [
  {
    q: 'Como faço para participar de uma rifa?',
    a: 'Acesse "Explorar rifas", escolha o sorteio, selecione seus números disponíveis e finalize o pagamento via PIX. Seus números ficam salvos em "Meus bilhetes".',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'O pagamento é feito via PIX com QR Code ou código copia e cola. Assim que o pagamento é confirmado, seus números são marcados como comprados automaticamente.',
  },
  {
    q: 'Meu pagamento não foi confirmado. E agora?',
    a: 'A confirmação do PIX pode levar alguns minutos. Se passou mais de 30 minutos, verifique se o pagamento foi concluído no seu banco. Reservas expiram automaticamente.',
  },
  {
    q: 'Onde vejo meus números comprados?',
    a: 'Na página "Meus bilhetes" você vê todos os números comprados e reservados, agrupados por rifa, com o status de cada um.',
  },
  {
    q: 'Como acompanho o resultado do sorteio?',
    a: 'Acompanhe a rifa na página dela. Quando o sorteio for realizado, o ganhador aparece na página da rifa e na seção de resultados.',
  },
  {
    q: 'Como funciona o sistema parceria?',
    a: 'Divulgando seu link de parceiro, você ganha 20% de comissão nas compras de quem se cadastrar por ele, mais 5% de cada venda da sua rede de indicados.',
  },
]

export default async function SupportPage() {
  const { userName, email, isAdmin } = await getSessionUser()

  return (
    <UserShell userName={userName} email={email} isAdmin={isAdmin}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 w-full">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Central de ajuda</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Suporte</h1>
          <p className="text-muted-foreground mt-2">
            Tire suas dúvidas sobre rifas, pagamentos e sua conta.
          </p>
        </div>

        <section className={`${card} p-6`}>
          <h2 className="font-semibold mb-4">Perguntas frequentes</h2>
          <div className="divide-y divide-border">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4 first:pt-0 last:pb-0">
                <summary className="flex items-center justify-between cursor-pointer font-medium text-sm md:text-base list-none">
                  {f.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          <div className={`${card} p-6`}>
            <div className="text-2xl mb-3">📧</div>
            <h3 className="font-semibold mb-1">Email</h3>
            <p className="text-sm text-muted-foreground mb-3">Resposta em até 24h úteis</p>
            <a href="mailto:suporte@oranjicom.br" className="text-sm text-primary font-medium hover:underline">
              suporte@oranjicom.br
            </a>
          </div>
          <div className={`${card} p-6`}>
            <div className="text-2xl mb-3">💬</div>
            <h3 className="font-semibold mb-1">WhatsApp</h3>
            <p className="text-sm text-muted-foreground mb-3">Atendimento em horário comercial</p>
            <a
              href="https://wa.me/5500000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary font-medium hover:underline"
            >
              Abrir conversa →
            </a>
          </div>
        </section>
      </main>
    </UserShell>
  )
}
