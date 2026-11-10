-- SADEE PRO STORE: working customer accounts + private avatar ownership
-- Safe additive migration. Run AFTER SUPABASE_FULL_SETUP.sql and
-- supabase/google-customer-accounts.sql. Does not drop existing data.

begin;

-- Link every authenticated customer's future orders to their auth account.
alter table public.store_orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists store_orders_user_id_created_at_idx
  on public.store_orders(user_id, created_at desc);

-- Avatar bucket: public read for displaying avatars; uploads/changes/deletes
-- are restricted to a folder named with the authenticated user's UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-avatars', 'customer-avatars', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Customer avatars are publicly readable" on storage.objects;
create policy "Customer avatars are publicly readable"
on storage.objects for select to public
using (bucket_id = 'customer-avatars');

drop policy if exists "Customers upload own avatar" on storage.objects;
create policy "Customers upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'customer-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Customers update own avatar" on storage.objects;
create policy "Customers update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'customer-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'customer-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Customers delete own avatar" on storage.objects;
create policy "Customers delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'customer-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
