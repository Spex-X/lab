ALTER TABLE profiles ADD COLUMN IF NOT EXISTS affiliate_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_affiliate boolean DEFAULT false;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES profiles(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_affiliate_code ON profiles(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_id ON orders(affiliate_id);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  affiliate_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  level integer NOT NULL,
  percentage numeric NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'available',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(order_id, affiliate_id, level)
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  pix_key text NOT NULL,
  status text DEFAULT 'pending',
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_order_id ON affiliate_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);

ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Affiliates can view own commissions" ON affiliate_commissions;
CREATE POLICY "Affiliates can view own commissions" ON affiliate_commissions
  FOR SELECT USING (auth.uid() = affiliate_id);

DROP POLICY IF EXISTS "Admins can view all commissions" ON affiliate_commissions;
CREATE POLICY "Admins can view all commissions" ON affiliate_commissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Users can view own withdrawals" ON withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all withdrawals" ON withdrawal_requests;
CREATE POLICY "Admins can view all withdrawals" ON withdrawal_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update withdrawals" ON withdrawal_requests;
CREATE POLICY "Admins can update withdrawals" ON withdrawal_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE affiliate_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_ref_code text;
BEGIN
  v_ref_code := NEW.raw_user_meta_data->>'referred_by_code';

  IF v_ref_code IS NOT NULL AND v_ref_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE affiliate_code = v_ref_code
    AND id != NEW.id;
  END IF;

  -- Afiliado automático SÓ se veio pelo cadastro de afiliado (wants_affiliate).
  -- Link normal de divulgação → usuário normal (só fica vinculado pela comissão).
  INSERT INTO profiles (id, email, full_name, avatar_url, affiliate_code, referred_by, is_affiliate)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    generate_affiliate_code(),
    v_referrer_id,
    (NEW.raw_user_meta_data->>'wants_affiliate') = 'true'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION ensure_affiliate_code(p_user_id uuid, p_ref_code text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_referrer_id uuid;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO profiles (id, email, affiliate_code)
    SELECT id, email, generate_affiliate_code()
    FROM auth.users WHERE id = p_user_id
    RETURNING * INTO v_profile;
  END IF;

  IF v_profile.affiliate_code IS NULL THEN
    UPDATE profiles SET affiliate_code = generate_affiliate_code()
    WHERE id = p_user_id
    RETURNING * INTO v_profile;
  END IF;

  IF v_profile.referred_by IS NULL AND p_ref_code IS NOT NULL AND p_ref_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE affiliate_code = p_ref_code
    AND id != p_user_id;

    -- Vincula o padrinho (comissão), sem virar afiliado
    IF v_referrer_id IS NOT NULL THEN
      UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_user_id;
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'affiliate_code', v_profile.affiliate_code);
END;
$$;

DROP FUNCTION IF EXISTS reserve_tickets_atomic(uuid, uuid, integer[]);

CREATE OR REPLACE FUNCTION reserve_tickets_atomic(
  p_raffle_id uuid,
  p_user_id uuid,
  p_ticket_numbers integer[],
  p_affiliate_id uuid DEFAULT NULL
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
  v_affiliate_id uuid;
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

  -- Afiliação é eterna: prioriza o padrinho permanente do comprador
  SELECT referred_by INTO v_affiliate_id
  FROM profiles
  WHERE id = p_user_id;

  -- Se não tem padrinho, usa o afiliado do link (se válido)
  IF v_affiliate_id IS NULL
     AND p_affiliate_id IS NOT NULL
     AND p_affiliate_id != p_user_id
     AND EXISTS (SELECT 1 FROM profiles WHERE id = p_affiliate_id) THEN
    v_affiliate_id := p_affiliate_id;
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
      RETURN json_build_object('error', 'Um ou mais números acabaram de ser reservados por outra pessoa.');
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
    expires_at,
    affiliate_id
  ) VALUES (
    p_user_id,
    p_raffle_id,
    'pending',
    v_quantity,
    v_total_amount,
    timezone('utc'::text, now()) + INTERVAL '15 minutes',
    v_affiliate_id
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

CREATE OR REPLACE FUNCTION confirm_order_payment(
  p_order_id uuid,
  p_payment_id text,
  p_external_reference text,
  p_pix_copy_paste text,
  p_pix_qr_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_upline_id uuid;
  v_level integer;
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

  -- Só paga comissão para afiliados aprovados (is_affiliate = true)
  IF v_order.affiliate_id IS NOT NULL
     AND (SELECT is_affiliate FROM profiles WHERE id = v_order.affiliate_id) THEN
    -- Nível 1: afiliado que vendeu = 20%
    INSERT INTO affiliate_commissions (order_id, affiliate_id, level, percentage, amount)
    VALUES (p_order_id, v_order.affiliate_id, 1, 20, round(v_order.total_amount * 0.20, 2))
    ON CONFLICT (order_id, affiliate_id, level) DO NOTHING;

    -- Sobe a árvore: até 2 ancestrais AFILIADOS ganham 5% (teto total = 30%)
    v_level := 2;
    v_upline_id := v_order.affiliate_id;

    LOOP
      SELECT referred_by INTO v_upline_id
      FROM profiles
      WHERE id = v_upline_id;

      EXIT WHEN v_upline_id IS NULL OR v_level > 3;

      IF (SELECT is_affiliate FROM profiles WHERE id = v_upline_id) THEN
        INSERT INTO affiliate_commissions (order_id, affiliate_id, level, percentage, amount)
        VALUES (p_order_id, v_upline_id, v_level, 5, round(v_order.total_amount * 0.05, 2))
        ON CONFLICT (order_id, affiliate_id, level) DO NOTHING;
      END IF;

      v_level := v_level + 1;
    END LOOP;
  END IF;

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

CREATE OR REPLACE FUNCTION get_affiliate_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_earned numeric;
  v_available numeric;
  v_withdrawn numeric;
  v_pending_withdrawal numeric;
  v_direct_sales bigint;
  v_downline_count bigint;
  v_downline_sales bigint;
BEGIN
  SELECT coalesce(sum(amount), 0) INTO v_total_earned
  FROM affiliate_commissions WHERE affiliate_id = p_user_id;

  SELECT coalesce(sum(amount), 0) INTO v_withdrawn
  FROM withdrawal_requests WHERE user_id = p_user_id AND status = 'paid';

  SELECT coalesce(sum(amount), 0) INTO v_pending_withdrawal
  FROM withdrawal_requests WHERE user_id = p_user_id AND status = 'pending';

  v_available := v_total_earned - v_withdrawn - v_pending_withdrawal;
  IF v_available < 0 THEN v_available := 0; END IF;

  SELECT count(*) INTO v_direct_sales
  FROM affiliate_commissions WHERE affiliate_id = p_user_id AND level = 1;

  SELECT count(*) INTO v_downline_count
  FROM profiles WHERE referred_by = p_user_id;

  SELECT count(*) INTO v_downline_sales
  FROM affiliate_commissions WHERE affiliate_id = p_user_id AND level IN (2, 3);

  RETURN json_build_object(
    'total_earned', v_total_earned,
    'available', v_available,
    'withdrawn', v_withdrawn,
    'pending_withdrawal', v_pending_withdrawal,
    'direct_sales', v_direct_sales,
    'downline_count', v_downline_count,
    'downline_sales', v_downline_sales
  );
END;
$$;

CREATE OR REPLACE FUNCTION request_withdrawal(p_user_id uuid, p_amount numeric, p_pix_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats json;
  v_available numeric;
BEGIN
  IF p_amount <= 0 THEN
    RETURN json_build_object('error', 'Valor inválido');
  END IF;

  IF p_pix_key IS NULL OR length(trim(p_pix_key)) < 3 THEN
    RETURN json_build_object('error', 'Informe uma chave PIX válida');
  END IF;

  v_stats := get_affiliate_stats(p_user_id);
  v_available := (v_stats->>'available')::numeric;

  IF p_amount > v_available THEN
    RETURN json_build_object('error', 'Saldo insuficiente. Disponível: R$ ' || v_available::text);
  END IF;

  INSERT INTO withdrawal_requests (user_id, amount, pix_key, status)
  VALUES (p_user_id, p_amount, trim(p_pix_key), 'pending');

  RETURN json_build_object('success', true, 'amount', p_amount);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Função is_admin (SECURITY DEFINER evita recursão de RLS em profiles)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$;

-- Admin pode atualizar qualquer perfil (ativar/desativar afiliado, mudar role)
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (is_admin());

UPDATE profiles SET affiliate_code = generate_affiliate_code() WHERE affiliate_code IS NULL;
