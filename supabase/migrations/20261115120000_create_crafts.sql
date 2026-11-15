create table if not exists public.crafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 128),
  description text check (description is null or char_length(description) <= 2000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'complete')),
  photo_url text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crafts enable row level security;

create policy "Users can view their own crafts"
  on public.crafts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own crafts"
  on public.crafts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own crafts"
  on public.crafts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own crafts"
  on public.crafts for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.complete_craft(p_craft_id uuid, p_changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_craft public.crafts;
  v_was_transition boolean;
  v_xp integer;
  v_level integer;
  v_metadata jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_craft
  from public.crafts
  where id = p_craft_id and user_id = v_user_id
  for update;

  if not found then
    return null;
  end if;

  v_was_transition := v_craft.status <> 'complete'
    and p_changes->>'status' = 'complete'
    and v_craft.completed_at is null;

  update public.crafts set
    title = case when p_changes ? 'title' then p_changes->>'title' else v_craft.title end,
    description = case when p_changes ? 'description' then p_changes->>'description' else v_craft.description end,
    status = case when p_changes ? 'status' then p_changes->>'status' else v_craft.status end,
    photo_url = case when p_changes ? 'photo_url' then p_changes->>'photo_url' else v_craft.photo_url end,
    completed_at = case
      when p_changes->>'status' = 'complete' then coalesce(v_craft.completed_at, now())
      else v_craft.completed_at
    end,
    updated_at = now()
  where id = p_craft_id and user_id = v_user_id
  returning * into v_craft;

  select coalesce(raw_user_meta_data, '{}'::jsonb) into v_metadata
  from auth.users where id = v_user_id for update;
  v_xp := case
    when coalesce(v_metadata->>'xp', '') ~ '^[0-9]+$' then (v_metadata->>'xp')::integer
    else 0
  end;

  if v_was_transition then
    v_xp := v_xp + 50;
    v_metadata := jsonb_set(v_metadata, '{xp}', to_jsonb(v_xp), true);
  end if;
  v_level := floor(v_xp::numeric / 500)::integer + 1;
  v_metadata := jsonb_set(v_metadata, '{level}', to_jsonb(v_level), true);

  if v_was_transition then
    update auth.users set raw_user_meta_data = v_metadata where id = v_user_id;
  end if;

  return jsonb_build_object(
    'craft', to_jsonb(v_craft),
    'user', jsonb_build_object('xp', v_xp, 'level', v_level)
  );
end;
$$;

revoke all on function public.complete_craft(uuid, jsonb) from public;
grant execute on function public.complete_craft(uuid, jsonb) to authenticated;
