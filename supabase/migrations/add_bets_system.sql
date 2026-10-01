/* Migração: modelo de "jogos" (apostas de 6 números entre 1 e 75)
   Substitui o modelo de bilhetes exclusivos. Números podem se repetir
   entre jogadores; o sorteio define 6 números e quem acertar mais ganha. */

/* ETAPA 1: Tabela de apostas */
create table if not exists bets (
  id uuid default gen_random_uuid() primary key,
  raffle_id uuid references raffles(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  numbers smallint[] not null check (array_length(numbers, 1) = 6),
  hits smallint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_bets_raffle_id on bets(raffle_id);
create index if not exists idx_bets_order_id on bets(order_id);
create index if not exists idx_bets_user_id on bets(user_id);

/* ETAPA 2: Resultado do sorteio + valor inicial do prêmio na rifa */
alter table raffles
  add column if not exists winning_numbers smallint[],
  add column if not exists drawn_at timestamp with time zone,
  add column if not exists base_prize numeric default 200;

alter table transactions
  add column if not exists order_id uuid references orders(id) on delete cascade;
create index if not exists idx_transactions_order_id on transactions(order_id);

/* ETAPA 3: RLS nas apostas */
alter table bets enable row level security;

drop policy if exists "Users can view own bets" on bets;
create policy "Users can view own bets" on bets
  for select using (auth.uid() = user_id);

drop policy if exists "Admins can view all bets" on bets;
create policy "Admins can view all bets" on bets
  for select using (is_admin());

drop policy if exists "Admins can update any raffle" on raffles;
create policy "Admins can update any raffle" on raffles
  for update using (is_admin());

drop policy if exists "Admins can view all orders" on orders;
create policy "Admins can view all orders" on orders
  for select using (is_admin());

/* ETAPA 4: Criar pedido com jogos (substitui reserve_tickets_atomic) */
create or replace function create_bets_order(
  p_raffle_id uuid,
  p_user_id uuid,
  p_bets smallint[][],
  p_affiliate_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raffle record;
  v_quantity integer;
  v_total_amount numeric;
  v_order_id uuid;
  v_affiliate_id uuid;
  v_bet smallint[];
begin
  if auth.uid() is not null and auth.uid() != p_user_id and not is_admin() then
    return json_build_object('error', 'Não autorizado');
  end if;

  select * into v_raffle
  from raffles
  where id = p_raffle_id and status = 'active';

  if not found then
    return json_build_object('error', 'Sorteio não encontrado ou não está ativo');
  end if;

  if not exists (select 1 from profiles where id = p_user_id) then
    return json_build_object('error', 'Usuário não encontrado');
  end if;

  if p_bets is null or array_length(p_bets, 1) is null or array_length(p_bets, 1) = 0 then
    return json_build_object('error', 'Adicione pelo menos um jogo');
  end if;

  if array_length(p_bets, 1) > 100 then
    return json_build_object('error', 'Máximo de 100 jogos por pedido');
  end if;

  foreach v_bet slice 1 in array p_bets
  loop
    if array_length(v_bet, 1) != 6 then
      return json_build_object('error', 'Cada jogo deve ter exatamente 6 números');
    end if;

    if array_length(array(select distinct unnest(v_bet)), 1) != 6 then
      return json_build_object('error', 'Jogo com números repetidos');
    end if;

    if exists (select 1 from unnest(v_bet) n where n < 1 or n > 75) then
      return json_build_object('error', 'Números devem estar entre 1 e 75');
    end if;
  end loop;

  select referred_by into v_affiliate_id
  from profiles
  where id = p_user_id;

  if v_affiliate_id is null
     and p_affiliate_id is not null
     and p_affiliate_id != p_user_id
     and exists (select 1 from profiles where id = p_affiliate_id) then
    v_affiliate_id := p_affiliate_id;
  end if;

  v_quantity := array_length(p_bets, 1);
  v_total_amount := v_raffle.ticket_price * v_quantity;

  insert into orders (
    user_id, raffle_id, status, quantity, total_amount, expires_at, affiliate_id
  ) values (
    p_user_id, p_raffle_id, 'pending', v_quantity, v_total_amount,
    timezone('utc'::text, now()) + interval '15 minutes',
    v_affiliate_id
  ) returning id into v_order_id;

  foreach v_bet slice 1 in array p_bets
  loop
    insert into bets (raffle_id, order_id, user_id, numbers)
    values (p_raffle_id, v_order_id, p_user_id, v_bet);
  end loop;

  return json_build_object(
    'success', true,
    'order_id', v_order_id,
    'quantity', v_quantity,
    'total_amount', v_total_amount,
    'expires_at', (timezone('utc'::text, now()) + interval '15 minutes')::text
  );

exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

/* ETAPA 5: Confirmar pagamento — aposta vale quando o pedido paga */
create or replace function confirm_order_payment(
  p_order_id uuid,
  p_payment_id text,
  p_external_reference text,
  p_pix_copy_paste text,
  p_pix_qr_code text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_upline_id uuid;
  v_level integer;
begin
  select * into v_order
  from orders
  where id = p_order_id and status = 'pending';

  if not found then
    return json_build_object('error', 'Pedido não encontrado ou não está pendente');
  end if;

  if v_order.expires_at < timezone('utc'::text, now()) then
    return json_build_object('error', 'Pedido expirado');
  end if;

  update orders
  set
    status = 'paid',
    mercado_pago_payment_id = p_payment_id,
    mercado_pago_external_reference = p_external_reference,
    pix_copy_paste = p_pix_copy_paste,
    pix_qr_code = p_pix_qr_code,
    paid_at = timezone('utc'::text, now())
  where id = p_order_id;

  insert into transactions (order_id, buyer_id, amount, status, payment_method)
  values (p_order_id, v_order.user_id, v_order.total_amount, 'completed', 'mercado_pago_pix');

  if v_order.affiliate_id is not null
     and (select is_affiliate from profiles where id = v_order.affiliate_id) then
    insert into affiliate_commissions (order_id, affiliate_id, level, percentage, amount)
    values (p_order_id, v_order.affiliate_id, 1, 20, round(v_order.total_amount * 0.20, 2))
    on conflict (order_id, affiliate_id, level) do nothing;

    v_level := 2;
    v_upline_id := v_order.affiliate_id;

    loop
      select referred_by into v_upline_id
      from profiles
      where id = v_upline_id;

      exit when v_upline_id is null or v_level > 3;

      if (select is_affiliate from profiles where id = v_upline_id) then
        insert into affiliate_commissions (order_id, affiliate_id, level, percentage, amount)
        values (p_order_id, v_upline_id, v_level, 5, round(v_order.total_amount * 0.05, 2))
        on conflict (order_id, affiliate_id, level) do nothing;
      end if;

      v_level := v_level + 1;
    end loop;
  end if;

  return json_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'paid'
  );

exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

/* ETAPA 6: Expirar pedidos pendentes (apostas morrem junto via order_id) */
create or replace function release_expired_orders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders
  set status = 'expired'
  where status = 'pending'
  and expires_at < timezone('utc'::text, now());
end;
$$;

/* ETAPA 7: Sortear — define os 6 números e calcula acertos de cada jogo */
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
    'winners_sena', (select count(*) from bets where raffle_id = p_raffle_id and hits = 6),
    'winners_quina', (select count(*) from bets where raffle_id = p_raffle_id and hits = 5),
    'winners_quadra', (select count(*) from bets where raffle_id = p_raffle_id and hits = 4)
  );

exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

/* ETAPA 8: Estatísticas por jogos (pedidos pagos/pendentes) */
create or replace function get_raffle_stats(p_raffle_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats json;
  v_base numeric;
  v_revenue numeric;
begin
  select coalesce(base_prize, 200) into v_base
  from raffles where id = p_raffle_id;

  select coalesce(sum(total_amount), 0) into v_revenue
  from orders where raffle_id = p_raffle_id and status = 'paid';

  /* O valor inicial é dividido nas 3 faixas na proporção das porcentagens
     (0,2529 / 0,0822 / 0,0949 de um total de 0,43) e cada pote cresce
     com a sua % da arrecadação */
  select json_build_object(
    'sold_bets', (select count(*) from bets b join orders o on b.order_id = o.id
                  where b.raffle_id = p_raffle_id and o.status = 'paid'),
    'pending_bets', (select count(*) from bets b join orders o on b.order_id = o.id
                     where b.raffle_id = p_raffle_id and o.status = 'pending'),
    'total_orders', (select count(*) from orders where raffle_id = p_raffle_id),
    'paid_orders', (select count(*) from orders where raffle_id = p_raffle_id and status = 'paid'),
    'revenue', v_revenue,
    'base_prize', v_base,
    'pot_sena', v_base * 0.2529 / 0.43 + v_revenue * 0.2529,
    'pot_quina', v_base * 0.0822 / 0.43 + v_revenue * 0.0822,
    'pot_quadra', v_base * 0.0949 / 0.43 + v_revenue * 0.0949,
    'prize_pool', v_base + v_revenue * 0.43
  ) into v_stats;

  return v_stats;
end;
$$;

/* ETAPA 9: Prêmio acumulativo gravado no banco.
   A cada pedido confirmado (status -> 'paid'), recalcula prize_value = pote total:
   base_prize (valor inicial definido na criação) + 43% da arrecadação
   (25,29% Sena + 8,22% Quina + 9,49% Quadra). */
create or replace function update_raffle_prize_pool()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and (old.status is distinct from 'paid') then
    update raffles
    set prize_value = coalesce(base_prize, 200) + (
      select coalesce(sum(total_amount), 0)
      from orders
      where raffle_id = new.raffle_id and status = 'paid'
    ) * 0.43
    where id = new.raffle_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_prize_pool on orders;
create trigger trg_orders_prize_pool
  after update of status on orders
  for each row execute function update_raffle_prize_pool();

/* Rifas antigas sem base definida ficam com R$ 200 de valor inicial */
update raffles set base_prize = 200 where base_prize is null;

/* Recalcula o prize_value de rifas que já têm vendas pagas */
update raffles r
set prize_value = coalesce(r.base_prize, 200) + (
  select coalesce(sum(total_amount), 0)
  from orders o
  where o.raffle_id = r.id and o.status = 'paid'
) * 0.43;
