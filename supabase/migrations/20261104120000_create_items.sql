create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 64),
  quantity integer not null default 1 check (quantity >= 1),
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items enable row level security;

create policy "Users can view their own items"
  on public.items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own items"
  on public.items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own items"
  on public.items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own items"
  on public.items for delete
  to authenticated
  using ((select auth.uid()) = user_id);
