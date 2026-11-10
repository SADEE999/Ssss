-- SADEE PRO STORE: Google customer account linkage
-- Run once in Supabase SQL Editor after the existing orders schema.
alter table public.store_orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists store_orders_user_id_created_at_idx on public.store_orders(user_id, created_at desc);
