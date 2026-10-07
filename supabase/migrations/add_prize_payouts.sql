/* Prêmios creditados no saldo do ganhador.
   Rode DEPOIS de add_affiliate_system.sql e add_bets_system.sql — este arquivo
   redefine draw_raffle, get_affiliate_stats e request_withdrawal. */

/* ETAPA 1: tabela de prêmios (1 linha por jogo premiado) */
create table if not exists prize_payouts (
  id uuid default gen_random_uuid() primary key,
  raffle_id uuid references raffles(id) on delete cascade not null,
  bet_id uuid references bets(id) on delete cascade not null unique,
  user_id uuid references profiles(id) on delete cascade not null,
  hits smallint not null,
  amount numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_prize_payouts_user on prize_payouts(user_id);
create index if not exists idx_prize_payouts_raffle on prize_payouts(raffle_id);

alter table prize_payouts enable row level security;

drop policy if exists "Users view own prizes" on prize_payouts;
create policy "Users view own prizes" on prize_payouts
  for select using (auth.uid() = user_id);

drop policy if exists "Admins view all prizes" on prize_payouts;
create policy "Admins view all prizes" on prize_payouts
  for select using (is_admin());

/* ETAPA 2: credita os prêmios de um sorteio encerrado.
   Pote da faixa = fatia do valor inicial + % da arrecadação paga,
   dividido igualmente entre os jogos da faixa (arredonda pra baixo no centavo).
   Idempotente: bet_id é único, rodar de novo não duplica. */
create or replace function credit_raffle_prizes(p_raffle_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base numeric;
  v_revenue numeric;
  v_tier record;
  v_count integer;
  v_each numeric;
  v_inserted integer := 0;
  v_rows integer;
begin
  select coalesce(base_prize, 200) into v_base from raffles where id = p_raffle_id;

  select coalesce(sum(total_amount), 0) into v_revenue
  from orders where raffle_id = p_raffle_id and status = 'paid';

  for v_tier in
    select * from (values (6, 0.2529), (5, 0.0822), (4, 0.0949)) as t(hits, rate)
  loop
    select count(*) into v_count
    from bets b join orders o on o.id = b.order_id
    where b.raffle_id = p_raffle_id and o.status = 'paid' and b.hits = v_tier.hits;

    continue when v_count = 0;

    v_each := floor(((v_base * v_tier.rate / 0.43) + v_revenue * v_tier.rate) / v_count * 100) / 100;

    insert into prize_payouts (raffle_id, bet_id, user_id, hits, amount)
    select p_raffle_id, b.id, b.user_id, b.hits, v_each
    from bets b join orders o on o.id = b.order_id
    where b.raffle_id = p_raffle_id and o.status = 'paid' and b.hits = v_tier.hits
    on conflict (bet_id) do nothing;

    get diagnostics v_rows = row_count;
    v_inserted := v_inserted + v_rows;
  end loop;

  return v_inserted;
end;
$$;

/* Só roda por dentro do draw_raffle (ou pelo SQL Editor) — ninguém chama pela API */
revoke execute on function credit_raffle_prizes(uuid) from public, anon, authenticated;

/* ETAPA 3: draw_raffle agora credita os prêmios ao encerrar */
create or replace function draw_raffle(
  p_raffle_id uuid,
  p_winning_numbers smallint[]
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raffle record;
  v_winners integer;
  v_paid_bets integer;
  v_credited integer;
begin
  select * into v_raffle from raffles where id = p_raffle_id;

  if not found then
    return json_build_object('error', 'Sorteio não encontrado');
  end if;

  if auth.uid() != v_raffle.created_by and not is_admin() then
    return json_build_object('error', 'Não autorizado');
  end if;

  if v_raffle.winning_numbers is not null then
    return json_build_object('error', 'Este sorteio já foi realizado');
  end if;

  if p_winning_numbers is null
     or array_length(p_winning_numbers, 1) != 6
     or array_length(array(select distinct unnest(p_winning_numbers)), 1) != 6 then
    return json_build_object('error', 'Informe exatamente 6 números diferentes');
  end if;

  if exists (select 1 from unnest(p_winning_numbers) n where n < 1 or n > 75) then
    return json_build_object('error', 'Números devem estar entre 1 e 75');
  end if;

  update bets b
  set hits = (
    select count(*)::smallint
    from unnest(b.numbers) n
    where n = any(p_winning_numbers)
  )
  from orders o
  where b.order_id = o.id
    and o.status = 'paid'
    and b.raffle_id = p_raffle_id;

  update raffles
  set
    winning_numbers = p_winning_numbers,
    drawn_at = timezone('utc'::text, now()),
    status = 'completed'
  where id = p_raffle_id;

  v_credited := credit_raffle_prizes(p_raffle_id);

  select count(*) into v_paid_bets
  from bets b join orders o on b.order_id = o.id
  where b.raffle_id = p_raffle_id and o.status = 'paid';

  /* Ganha a partir de 4 acertos (Quadra, Quina, Sena) */
  select count(*) into v_winners
  from bets where raffle_id = p_raffle_id and hits >= 4;

  return json_build_object(
    'success', true,
    'winning_numbers', p_winning_numbers,
    'total_bets', v_paid_bets,
    'winners', v_winners,
    'credited', v_credited,
    'winners_sena', (select count(*) from bets where raffle_id = p_raffle_id and hits = 6),
    'winners_quina', (select count(*) from bets where raffle_id = p_raffle_id and hits = 5),
    'winners_quadra', (select count(*) from bets where raffle_id = p_raffle_id and hits = 4)
  );

exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

/* ETAPA 4: saldo = comissões + prêmios − saques. Só o dono (ou admin) consulta. */
create or replace function get_affiliate_stats(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commissions numeric;
  v_prizes numeric;
  v_total_earned numeric;
  v_available numeric;
  v_withdrawn numeric;
  v_pending_withdrawal numeric;
  v_direct_sales bigint;
  v_downline_count bigint;
  v_downline_sales bigint;
begin
  if auth.uid() is distinct from p_user_id and not is_admin() then
    return json_build_object('error', 'Não autorizado');
  end if;

  select coalesce(sum(amount), 0) into v_commissions
  from affiliate_commissions where affiliate_id = p_user_id;

  select coalesce(sum(amount), 0) into v_prizes
  from prize_payouts where user_id = p_user_id;

  v_total_earned := v_commissions + v_prizes;

  select coalesce(sum(amount), 0) into v_withdrawn
  from withdrawal_requests where user_id = p_user_id and status = 'paid';

  select coalesce(sum(amount), 0) into v_pending_withdrawal
  from withdrawal_requests where user_id = p_user_id and status = 'pending';

  v_available := v_total_earned - v_withdrawn - v_pending_withdrawal;
  if v_available < 0 then v_available := 0; end if;

  select count(*) into v_direct_sales
  from affiliate_commissions where affiliate_id = p_user_id and level = 1;

  select count(*) into v_downline_count
  from profiles where referred_by = p_user_id;

  select count(*) into v_downline_sales
  from affiliate_commissions where affiliate_id = p_user_id and level in (2, 3);

  return json_build_object(
    'total_earned', v_total_earned,
    'commissions_total', v_commissions,
    'prizes_total', v_prizes,
    'available', v_available,
    'withdrawn', v_withdrawn,
    'pending_withdrawal', v_pending_withdrawal,
    'direct_sales', v_direct_sales,
    'downline_count', v_downline_count,
    'downline_sales', v_downline_sales
  );
end;
$$;

/* ETAPA 5: saque só do próprio saldo */
create or replace function request_withdrawal(p_user_id uuid, p_amount numeric, p_pix_key text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats json;
  v_available numeric;
begin
  if auth.uid() is distinct from p_user_id then
    return json_build_object('error', 'Não autorizado');
  end if;

  if p_amount <= 0 then
    return json_build_object('error', 'Valor inválido');
  end if;

  if p_pix_key is null or length(trim(p_pix_key)) < 3 then
    return json_build_object('error', 'Informe uma chave PIX válida');
  end if;

  /* Trava por usuário: dois pedidos simultâneos não sacam o mesmo saldo */
  perform pg_advisory_xact_lock(hashtext('withdrawal:' || p_user_id::text));

  v_stats := get_affiliate_stats(p_user_id);
  v_available := (v_stats->>'available')::numeric;

  if p_amount > v_available then
    return json_build_object('error', 'Saldo insuficiente. Disponível: R$ ' || v_available::text);
  end if;

  insert into withdrawal_requests (user_id, amount, pix_key, status)
  values (p_user_id, p_amount, trim(p_pix_key), 'pending');

  return json_build_object('success', true, 'amount', p_amount);

exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

/* ETAPA 6: credita os sorteios que já foram encerrados antes desta migration */
do $$
declare r record;
begin
  for r in select id from raffles where status = 'completed' and winning_numbers is not null loop
    perform credit_raffle_prizes(r.id);
  end loop;
end $$;
