-- Telefone no perfil (login por SMS). Copiado de auth.users automaticamente.
alter table profiles add column if not exists phone text;

create or replace function sync_profile_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    phone = coalesce(nullif(new.phone, ''), phone),
    email = coalesce(nullif(new.email, ''), email)
  where id = new.id;
  return new;
end;
$$;

-- Nome começa com "on_auth_user_s..." pra rodar depois de on_auth_user_created
-- (Postgres dispara triggers em ordem alfabética), quando o perfil já existe.
drop trigger if exists on_auth_user_sync_contact on auth.users;
create trigger on_auth_user_sync_contact
  after insert or update of phone, email on auth.users
  for each row execute function sync_profile_contact();

-- Preenche quem já existe
update profiles p
set phone = u.phone
from auth.users u
where u.id = p.id and coalesce(u.phone, '') <> '' and p.phone is null;
