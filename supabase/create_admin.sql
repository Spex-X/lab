-- Script para promover um usuário existente a admin
-- Execute este no SQL Editor do Supabase

-- Substitua pelo email do usuário que deseja promover
DO $$
DECLARE
  v_user_email text := 'jhonne.af@gmail.com'; -- Altere para o email do usuário
  v_user_id uuid;
BEGIN
  -- Buscar o ID do usuário pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado. Crie o usuário primeiro via interface do sistema.', v_user_email;
  END IF;

  -- Atualizar ou criar perfil com role admin
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (v_user_id, v_user_email, 'Administrador', 'admin')
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    full_name = 'Administrador';

  RAISE NOTICE 'Usuário % promovido a admin com sucesso!', v_user_email;
END $$;

-- Verificar se foi promovido
SELECT * FROM profiles WHERE role = 'admin';
