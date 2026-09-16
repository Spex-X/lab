-- Tabela de perfis (estende auth.users)
create table profiles (
  id uuid references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Tabela de rifas
create table raffles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  prize_image text,
  prize_name text not null,
  prize_value numeric,
  total_tickets integer not null,
  ticket_price numeric not null,
  available_tickets integer not null,
  draw_date timestamp with time zone,
  status text default 'active', -- active, completed, cancelled
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de bilhetes
create table tickets (
  id uuid default gen_random_uuid() primary key,
  raffle_id uuid references raffles(id) on delete cascade,
  ticket_number integer not null,
  status text default 'available', -- available, sold, reserved
  buyer_id uuid references profiles(id),
  purchased_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(raffle_id, ticket_number)
);

-- Tabela de transações
create table transactions (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references tickets(id) on delete cascade,
  buyer_id uuid references profiles(id),
  amount numeric not null,
  status text default 'pending', -- pending, completed, failed
  payment_method text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para performance
create index idx_tickets_raffle_id on tickets(raffle_id);
create index idx_tickets_buyer_id on tickets(buyer_id);
create index idx_transactions_buyer_id on transactions(buyer_id);
create index idx_raffles_status on raffles(status);

-- Row Level Security
alter table profiles enable row level security;
alter table raffles enable row level security;
alter table tickets enable row level security;
alter table transactions enable row level security;

-- Políticas RLS básicas
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Anyone can view active raffles" on raffles for select using (status = 'active');
create policy "Users can create raffles" on raffles for insert with check (auth.uid() = created_by);
create policy "Creators can update their raffles" on raffles for update using (auth.uid() = created_by);

create policy "Anyone can view tickets" on tickets for select using (true);
create policy "Users can buy tickets" on tickets for update using (auth.uid() = buyer_id or status = 'available');

create policy "Users can view own transactions" on transactions for select using (auth.uid() = buyer_id);
create policy "Users can create transactions" on transactions for insert with check (auth.uid() = buyer_id);

-- Trigger para atualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_raffles_updated_at before update on raffles
  for each row execute procedure update_updated_at_column();
