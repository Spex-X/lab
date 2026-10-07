-- Sorteios pausados e encerrados também são públicos.
-- Antes só 'active' era visível: o apostador não via o resultado do
-- próprio jogo em "Meus jogos" e /resultados ficava vazio.
-- Rascunhos/cancelados continuam visíveis só pro criador e admin.
drop policy if exists "Anyone can view active raffles" on raffles;
create policy "Anyone can view active raffles" on raffles
  for select using (status in ('active', 'paused', 'completed'));
