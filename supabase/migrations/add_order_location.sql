-- Local aproximado (pelo IP) de onde o pedido foi feito.
-- Preenchido pela API com os cabeçalhos de geolocalização da Vercel.
alter table orders add column if not exists city text;
alter table orders add column if not exists region text;   -- UF, ex: SP
alter table orders add column if not exists country text;  -- ex: BR
