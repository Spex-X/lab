-- Script para criar o primeiro usuário admin
-- Execute este no SQL Editor do Supabase

-- Substitua pelos valores desejados
DO $$
DECLARE
  v_email text := 'admin@seusistema.com';
  v_password text := 'senha_segura_aqui';
  v_full_name text := 'Administrador';
  v_user_id uuid;
BEGIN
  -- Criar usuário no auth
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
  VALUES (
    v_email,
    crypt(v_password, gen_salt('bf')),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_user_id;

  -- Criar perfil com role admin
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (v_user_id, v_email, v_full_name, 'admin');

  RAISE NOTICE 'Usuário admin criado com sucesso! Email: %', v_email;
END $$;

-- Verificar se foi criado
SELECT * FROM profiles WHERE role = 'admin';
