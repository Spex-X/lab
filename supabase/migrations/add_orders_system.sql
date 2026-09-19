-- Migração para adicionar sistema de pedidos e Mercado Pago

-- ETAPA 1: Adicionar campos à tabela tickets
alter table tickets
add column order_id uuid references orders(id) on delete set null,
add column reserved_until timestamp with time zone;

-- ETAPA 2: Criar tabela orders
create table orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  raffle_id uuid references raffles(id) on delete cascade,
  status text default 'pending', -- pending, paid, expired, cancelled
  quantity integer not null,
  total_amount numeric not null,
  mercado_pago_payment_id text,
  mercado_pago_external_reference text,
  pix_copy_paste text,
  pix_qr_code text,
  expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ETAPA 3: Adicionar índices
create index idx_tickets_order_id on tickets(order_id);
create index idx_tickets_status on tickets(status);
create index idx_orders_user_id on orders(user_id);
create index idx_orders_raffle_id on orders(raffle_id);
create index idx_orders_status on orders(status);
create index idx_orders_mercado_pago_payment_id on orders(mercado_pago_payment_id);
create index idx_orders_mercado_pago_external_reference on orders(mercado_pago_external_reference);
create index idx_orders_expires_at on orders(expires_at);

-- ETAPA 4: Habilitar RLS na tabela orders
alter table orders enable row level security;

-- ETAPA 5: Adicionar políticas RLS para orders
create policy "Users can view own orders" on orders for select using (auth.uid() = user_id);
create policy "Users can create orders" on orders for insert with check (auth.uid() = user_id);
create policy "Users can update own orders" on orders for update using (auth.uid() = user_id);

-- ETAPA 6: Adicionar trigger para updated_at em orders
create trigger update_orders_updated_at before update on orders
  for each row execute procedure update_updated_at_column();

-- ETAPA 7: Criar função RPC para reserva atômica
create or replace function reserve_tickets_atomic(
  p_raffle_id uuid,
  p_user_id uuid,
  p_ticket_numbers integer[]
)
returns json
language plpgsql
as $$
declare
  v_raffle record;
  v_ticket_price numeric;
  v_quantity integer;
  v_total_amount numeric;
  v_order_id uuid;
  v_ticket record;
  v_ticket_ids uuid[];
begin
  -- Validar rifa
  select * into v_raffle
  from raffles
  where id = p_raffle_id and status = 'active';

  if not found then
    return json_build_object('error', 'Rifa não encontrada ou não está ativa');
  end if;

  -- Validar usuário
  if not exists (select 1 from profiles where id = p_user_id) then
    return json_build_object('error', 'Usuário não encontrado');
  end if;

  -- Validar que não há números duplicados
  if array_length(p_ticket_numbers, 1) != array_length(array(select distinct unnest(p_ticket_numbers)), 1) then
    return json_build_object('error', 'Números de bilhetes duplicados');
  end if;

  -- Verificar que todos os tickets pertencem à rifa e estão available
  for v_ticket in
    select id, ticket_number, status
    from tickets
    where raffle_id = p_raffle_id
    and ticket_number = any(p_ticket_numbers)
  loop
    if v_ticket.status != 'available' then
      return json_build_object('error', 'Bilhete ' || v_ticket.ticket_number || ' não está disponível');
    end if;
    v_ticket_ids := array_append(v_ticket_ids, v_ticket.id);
  end loop;

  -- Verificar que encontrou todos os tickets solicitados
  if array_length(v_ticket_ids, 1) != array_length(p_ticket_numbers, 1) then
    return json_build_object('error', 'Um ou mais bilhetes não pertencem a esta rifa');
  end if;

  -- Calcular valores
  v_ticket_price := v_raffle.ticket_price;
  v_quantity := array_length(p_ticket_numbers, 1);
  v_total_amount := v_ticket_price * v_quantity;

  -- Criar pedido
  insert into orders (
    user_id,
    raffle_id,
    status,
    quantity,
    total_amount,
    expires_at
  ) values (
    p_user_id,
    p_raffle_id,
    'pending',
    v_quantity,
    v_total_amount,
    timezone('utc'::text, now()) + interval '15 minutes'
  ) returning id into v_order_id;

  -- Reservar bilhetes
  update tickets
  set
    status = 'reserved',
    order_id = v_order_id,
    buyer_id = p_user_id,
    reserved_until = timezone('utc'::text, now()) + interval '15 minutes'
  where id = any(v_ticket_ids);

  -- Retornar pedido criado
  return json_build_object(
    'success', true,
    'order_id', v_order_id,
    'quantity', v_quantity,
    'total_amount', v_total_amount,
    'ticket_numbers', p_ticket_numbers,
    'expires_at', (timezone('utc'::text, now()) + interval '15 minutes')::text
  );

exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$;

-- ETAPA 8: Criar função para liberar bilhetes de pedidos expirados
create or replace function release_expired_tickets()
returns void
language plpgsql
as $$
begin
  -- Atualizar bilhetes de pedidos expirados
  update tickets
  set
    status = 'available',
    order_id = null,
    buyer_id = null,
    reserved_until = null
  where order_id in (
    select id from orders
    where status = 'pending'
    and expires_at < timezone('utc'::text, now())
  );

  -- Marcar pedidos como expirados
  update orders
  set status = 'expired'
  where status = 'pending'
  and expires_at < timezone('utc'::text, now());
end;
$$;

-- ETAPA 9: Criar função para confirmar pagamento
create or replace function confirm_order_payment(
  p_order_id uuid,
  p_payment_id text,
  p_external_reference text,
  p_pix_copy_paste text,
  p_pix_qr_code text
)
returns json
language plpgsql
as $$
declare
  v_order record;
  v_ticket_count integer;
begin
  -- Buscar pedido
  select * into v_order
  from orders
  where id = p_order_id and status = 'pending';

  if not found then
    return json_build_object('error', 'Pedido não encontrado ou não está pendente');
  end if;

  -- Verificar se não expirou
  if v_order.expires_at < timezone('utc'::text, now()) then
    return json_build_object('error', 'Pedido expirado');
  end if;

  -- Atualizar pedido com dados do pagamento
  update orders
  set
    status = 'paid',
    mercado_pago_payment_id = p_payment_id,
    mercado_pago_external_reference = p_external_reference,
    pix_copy_paste = p_pix_copy_paste,
    pix_qr_code = p_pix_qr_code,
    paid_at = timezone('utc'::text, now())
  where id = p_order_id;

  -- Atualizar bilhetes para sold
  update tickets
  set
    status = 'sold',
    purchased_at = timezone('utc'::text, now()),
    reserved_until = null
  where order_id = p_order_id;

  -- Atualizar bilhetes disponíveis na rifa
  update raffles
  set available_tickets = available_tickets - (
    select count(*) from tickets where order_id = p_order_id
  )
  where id = v_order.raffle_id;

  -- Criar transações para cada bilhete
  insert into transactions (ticket_id, buyer_id, amount, status, payment_method)
  select
    t.id,
    v_order.user_id,
    v_order.total_amount / (select count(*) from tickets where order_id = p_order_id),
    'completed',
    'mercado_pago_pix'
  from tickets t
  where t.order_id = p_order_id;

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
