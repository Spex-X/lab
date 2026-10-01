import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { PublicShell } from '@/components/public-shell'

const steps = [
  {
    n: '01',
    title: 'Escolha a campanha',
    desc: 'Navegue pelos sorteios abertos e escolha o prêmio que você quer concorrer. Cada campanha mostra o preço do jogo e a data do sorteio.',
  },
  {
    n: '02',
    title: 'Monte seus jogos',
    desc: 'Escolha 6 números entre 1 e 75 para cada jogo — ou use a Surpresinha pra montar um jogo aleatório. Quantos jogos quiser, cada um é uma chance de ganhar.',
  },
  {
    n: '03',
    title: 'Pague por Pix',
    desc: 'Um QR Code é gerado na hora. Assim que o pagamento cai, seus jogos ficam confirmados no seu nome — sem burocracia.',
  },
  {
    n: '04',
    title: 'Acompanhe pela conta',
    desc: 'Seus jogos ficam salvos em "Meus jogos". Você acompanha o andamento da campanha e vê quantos números acertou quando sai o resultado.',
  },
]

const faq = [
  {
    q: 'Como é feito o sorteio?',
    a: 'Na data indicada na campanha são sorteados 6 números entre 1 e 75. Ganha quem acertar 4 (Quadra), 5 (Quina) ou 6 (Sena) números — cada faixa tem um prêmio próprio, dividido entre os ganhadores. O resultado completo fica publicado na página do sorteio e na seção de resultados.',
  },
  {
    q: 'Preciso ter conta pra participar?',
    a: 'Não. Você pode montar os jogos e pagar direto — a conta é criada automaticamente com o email informado. Assim seus jogos ficam registrados no seu nome.',
  },
  {
    q: 'Quanto tempo tenho pra pagar?',
    a: 'O pedido vale por 15 minutos após gerar o Pix. Se o pagamento não for identificado nesse prazo, o pedido expira e você precisa gerar outro.',
  },
  {
    q: 'Como recebo o prêmio?',
    a: 'Entramos em contato pelo email e telefone cadastrados. Documentação, transporte e transferência ficam por nossa conta, em qualquer estado do Brasil.',
  },
  {
    q: 'Posso participar de vários sorteios?',
    a: 'Sim! Não há limite de campanhas nem de jogos por pessoa. Cada campanha é independente.',
  },
  {
    q: 'Quem pode participar?',
    a: 'Somente maiores de 18 anos residentes no Brasil, com CPF válido e chave Pix própria.',
  },
]

export default async function ComoFuncionaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <PublicShell active="/como-funciona" loggedIn={!!user}>
      <section className="pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-primary mb-4 tracking-wide">Como funciona</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            Participar leva menos de dois minutos
          </h1>
          <p className="text-lg text-muted-foreground mt-6">
            Escolha, pague por Pix e acompanhe. Transparência do início ao fim, com resultado publicado na plataforma.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-7">
              <p className="text-sm font-mono text-primary mb-4">{s.n}</p>
              <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-6 py-20 border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: '⚡', title: 'Confirmação imediata', desc: 'O Pix é reconhecido em segundos e seus jogos aparecem na sua conta na hora.' },
            { icon: '🔒', title: 'Resultado transparente', desc: 'Os 6 números sorteados são publicados na campanha e nos resultados — seus acertos são calculados automaticamente.' },
            { icon: '🚚', title: 'Entrega garantida', desc: 'Prêmio físico ou Pix, entregue com documentação e sem custo pra você.' },
          ].map((b) => (
            <div key={b.title}>
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-xl mb-4">{b.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{b.title}</h3>
              <p className="text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-6 py-20 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">Perguntas frequentes</h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {faq.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium">
                  {f.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition text-xl leading-none">+</span>
                </summary>
                <p className="text-muted-foreground mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-24 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Pronto pra tentar a sorte?</h2>
          <p className="text-muted-foreground mb-10">Veja as campanhas abertas e escolha seus números.</p>
          <Link
            href="/sorteios"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition"
          >
            Ver sorteios abertos →
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
