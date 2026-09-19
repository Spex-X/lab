-- Migração para adicionar campo role à tabela profiles
-- Execute este no SQL Editor do Supabase

-- Adicionar campo role se não existir
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Atualizar valores existentes para 'user'
UPDATE profiles
SET role = 'user'
WHERE role IS NULL;

-- Verificar
SELECT * FROM profiles LIMIT 5;
