# RifaLab

Plataforma de sorteios/rifas online com pagamento via PIX, sistema de parceria (comissões em rede) e painéis administrativos.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4**
- **Supabase** — Auth, PostgreSQL, RLS, RPC functions
- **Mercado Pago** — pagamentos PIX (geração, polling e webhook)
- **Cloudinary** — upload de imagens (rifas e avatares)

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=your_mercado_pago_access_token
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=your_mercado_pago_public_key
MERCADO_PAGO_WEBHOOK_SECRET=your_webhook_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Setup do banco (Supabase)

No SQL Editor do Supabase, rode na ordem:

1. `supabase/setup_completo.sql` — tabelas, RLS, funções de reserva de bilhetes
2. `supabase/migrations/add_affiliate_system.sql` — sistema parceria (comissões, saques, rede)

Configurações recomendadas no Supabase:

- **Authentication → Providers → Email**: desligar "Confirm email" em dev (checkout de visitante cria conta e loga na hora)
- Criar o primeiro admin direto na tabela `profiles` (`role = 'admin'`) ou via `/admin/usuarios`

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

```bash
npx tsc --noEmit   # typecheck
npm run lint       # lint
npm run build      # build de produção
```

## Estrutura de usuários

| Tipo | Acesso |
|---|---|
| Visitante | Explora rifas e compra sem cadastro (conta criada automaticamente) |
| Usuário | Explorar rifas, Meus bilhetes, Perfil, Suporte |
| Parceiro | + Saldo, Convidar parceiros, Links de divulgação, Saque |
| Admin | + Painel admin (rifas, usuários, saques), criar/gerenciar rifas |

## Sistema parceria

- Parceiros raiz são ativados a dedo pelo admin em `/admin/usuarios`
- Convite `/cadastro-afiliado?ref=CODIGO` cria parceiro aprovado na rede do indicador
- Links normais (`?ref=CODIGO`) vinculam o comprador sem torná-lo parceiro
- Comissões: **20%** vendedor direto + **5%** para até 2 níveis acima (teto **30%** por venda)
- Comissão só é creditada após confirmação do PIX
- Saques solicitados pelo parceiro são aprovados em `/admin/saques`

## Pagamentos

- Reserva de bilhetes é atômica via RPC no Supabase (evita venda duplicada)
- Pedido pendente gera QR Code PIX do Mercado Pago
- Confirmação por polling (`/api/payments/status/[paymentId]`) e webhook (`/api/webhooks/mercado-pago`)
