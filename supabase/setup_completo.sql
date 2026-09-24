DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS raffles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  role text DEFAULT 'user',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE raffles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  prize_image text,
  prize_name text NOT NULL,
  prize_value numeric,
  total_tickets integer NOT NULL,
  ticket_price numeric NOT NULL,
  available_tickets integer NOT NULL,
  draw_date timestamp with time zone,
  status text DEFAULT 'active',
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  raffle_id uuid REFERENCES raffles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  quantity integer NOT NULL,
  total_amount numeric NOT NULL,
  mercado_pago_payment_id text,
  mercado_pago_external_reference text,
  pix_copy_paste text,
  pix_qr_code text,
  expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id uuid REFERENCES raffles(id) ON DELETE CASCADE,
  ticket_number integer NOT NULL,
  status text DEFAULT 'available',
  buyer_id uuid REFERENCES profiles(id),
  purchased_at timestamp with time zone,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  reserved_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(raffle_id, ticket_number)
);

CREATE TABLE transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES profiles(id),
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  payment_method text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_tickets_raffle_id ON tickets(raffle_id);
CREATE INDEX idx_tickets_buyer_id ON tickets(buyer_id);
CREATE INDEX idx_tickets_order_id ON tickets(order_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_raffles_status ON raffles(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_raffle_id ON orders(raffle_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_mercado_pago_payment_id ON orders(mercado_pago_payment_id);
CREATE INDEX idx_orders_mercado_pago_external_reference ON orders(mercado_pago_external_reference);
CREATE INDEX idx_orders_expires_at ON orders(expires_at);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view active raffles" ON raffles;
CREATE POLICY "Anyone can view active raffles" ON raffles FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Users can create raffles" ON raffles;
CREATE POLICY "Users can create raffles" ON raffles FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can update their raffles" ON raffles;
CREATE POLICY "Creators can update their raffles" ON raffles FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Anyone can view tickets" ON tickets;
CREATE POLICY "Anyone can view tickets" ON tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can buy tickets" ON tickets;
CREATE POLICY "Users can buy tickets" ON tickets FOR UPDATE USING (auth.uid() = buyer_id OR status = 'available');

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
CREATE POLICY "Users can create transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_raffles_updated_at ON raffles;
CREATE TRIGGER update_raffles_updated_at BEFORE UPDATE ON raffles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION reserve_tickets_atomic(
  p_raffle_id uuid,
  p_user_id uuid,
  p_ticket_numbers integer[]
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_raffle record;
  v_ticket_price numeric;
  v_quantity integer;
  v_total_amount numeric;
  v_order_id uuid;
  v_ticket record;
  v_ticket_ids uuid[];
BEGIN
  SELECT * INTO v_raffle
  FROM raffles
  WHERE id = p_raffle_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Rifa não encontrada ou não está ativa');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN json_build_object('error', 'Usuário não encontrado');
  END IF;

  IF array_length(p_ticket_numbers, 1) != array_length(array(SELECT DISTINCT unnest(p_ticket_numbers)), 1) THEN
    RETURN json_build_object('error', 'Números de bilhetes duplicados');
  END IF;

  FOR v_ticket IN
    SELECT id, ticket_number, status
    FROM tickets
    WHERE raffle_id = p_raffle_id
    AND ticket_number = ANY(p_ticket_numbers)
  LOOP
    IF v_ticket.status != 'available' THEN
      RETURN json_build_object('error', 'Bilhete ' || v_ticket.ticket_number || ' não está disponível');
    END IF;
    v_ticket_ids := array_append(v_ticket_ids, v_ticket.id);
  END LOOP;

  IF array_length(v_ticket_ids, 1) != array_length(p_ticket_numbers, 1) THEN
    RETURN json_build_object('error', 'Um ou mais bilhetes não pertencem a esta rifa');
  END IF;

  v_ticket_price := v_raffle.ticket_price;
  v_quantity := array_length(p_ticket_numbers, 1);
  v_total_amount := v_ticket_price * v_quantity;

  INSERT INTO orders (
    user_id,
    raffle_id,
    status,
    quantity,
    total_amount,
    expires_at
  ) VALUES (
    p_user_id,
    p_raffle_id,
    'pending',
    v_quantity,
    v_total_amount,
    timezone('utc'::text, now()) + INTERVAL '15 minutes'
  ) RETURNING id INTO v_order_id;

  UPDATE tickets
  SET
    status = 'reserved',
    order_id = v_order_id,
    buyer_id = p_user_id,
    reserved_until = timezone('utc'::text, now()) + INTERVAL '15 minutes'
  WHERE id = ANY(v_ticket_ids);

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'quantity', v_quantity,
    'total_amount', v_total_amount,
    'ticket_numbers', p_ticket_numbers,
    'expires_at', (timezone('utc'::text, now()) + INTERVAL '15 minutes')::text
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION release_expired_tickets()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tickets
  SET
    status = 'available',
    order_id = NULL,
    buyer_id = NULL,
    reserved_until = NULL
  WHERE order_id IN (
    SELECT id FROM orders
    WHERE status = 'pending'
    AND expires_at < timezone('utc'::text, now())
  );

  UPDATE orders
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < timezone('utc'::text, now());
END;
$$;

CREATE OR REPLACE FUNCTION confirm_order_payment(
  p_order_id uuid,
  p_payment_id text,
  p_external_reference text,
  p_pix_copy_paste text,
  p_pix_qr_code text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Pedido não encontrado ou não está pendente');
  END IF;

  IF v_order.expires_at < timezone('utc'::text, now()) THEN
    RETURN json_build_object('error', 'Pedido expirado');
  END IF;

  UPDATE orders
  SET
    status = 'paid',
    mercado_pago_payment_id = p_payment_id,
    mercado_pago_external_reference = p_external_reference,
    pix_copy_paste = p_pix_copy_paste,
    pix_qr_code = p_pix_qr_code,
    paid_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  UPDATE tickets
  SET
    status = 'sold',
    purchased_at = timezone('utc'::text, now()),
    reserved_until = NULL
  WHERE order_id = p_order_id;

  UPDATE raffles
  SET available_tickets = available_tickets - (
    SELECT count(*) FROM tickets WHERE order_id = p_order_id
  )
  WHERE id = v_order.raffle_id;

  INSERT INTO transactions (ticket_id, buyer_id, amount, status, payment_method)
  SELECT
    t.id,
    v_order.user_id,
    v_order.total_amount / (SELECT count(*) FROM tickets WHERE order_id = p_order_id),
    'completed',
    'mercado_pago_pix'
  FROM tickets t
  WHERE t.order_id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'paid'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION get_raffle_stats(p_raffle_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'sold_tickets', (SELECT count(*) FROM tickets WHERE raffle_id = p_raffle_id AND status = 'sold'),
    'reserved_tickets', (SELECT count(*) FROM tickets WHERE raffle_id = p_raffle_id AND status = 'reserved'),
    'available_tickets', (SELECT count(*) FROM tickets WHERE raffle_id = p_raffle_id AND status = 'available'),
    'total_orders', (SELECT count(*) FROM orders WHERE raffle_id = p_raffle_id),
    'paid_orders', (SELECT count(*) FROM orders WHERE raffle_id = p_raffle_id AND status = 'paid'),
    'revenue', (SELECT coalesce(sum(total_amount), 0) FROM orders WHERE raffle_id = p_raffle_id AND status = 'paid')
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

CREATE OR REPLACE FUNCTION promote_to_admin(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET role = 'admin'
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'user_id', p_user_id, 'role', 'admin');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION remove_admin_role(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET role = 'user'
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'user_id', p_user_id, 'role', 'user');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

DO $$
DECLARE
  v_user_email text := 'jhonne.af@gmail.com';
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado. Crie o usuário primeiro via interface do sistema.', v_user_email;
  END IF;

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (v_user_id, v_user_email, 'Administrador', 'admin')
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    full_name = 'Administrador';

  RAISE NOTICE 'Usuário % promovido a admin com sucesso!', v_user_email;
END $$;

SELECT * FROM profiles WHERE role = 'admin';

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';