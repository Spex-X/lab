-- Registro de navegação por usuário (página visitada + horário)
create table if not exists user_activity (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_user_activity_user on user_activity(user_id, created_at desc);

alter table user_activity enable row level security;

-- Cada usuário só grava a própria atividade
drop policy if exists "Users log own activity" on user_activity;
create policy "Users log own activity" on user_activity
  for insert with check (auth.uid() = user_id);

-- Só admin lê a atividade
drop policy if exists "Admins read activity" on user_activity;
create policy "Admins read activity" on user_activity
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
