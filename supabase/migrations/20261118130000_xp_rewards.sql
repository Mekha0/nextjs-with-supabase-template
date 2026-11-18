-- Move level thresholds from 500 XP to 200 XP without changing existing XP.
update public.profiles
set level = floor(xp::numeric / 200)::integer + 1,
    updated_at = now();

alter table public.crafts
  add column if not exists started_at timestamptz;

-- Completing awards 50 XP once. XP and level remain in the same transaction as
-- the craft status update.
create or replace function public.complete_craft(p_craft_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_craft public.crafts;
  v_xp integer;
  v_level integer;
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

  if v_craft.status <> 'complete' then
    update public.crafts
    set status = 'complete',
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where id = p_craft_id and user_id = v_user_id
    returning * into v_craft;

    update public.profiles
    set xp = xp + 50,
        level = floor((xp + 50)::numeric / 200)::integer + 1,
        updated_at = now()
    where id = v_user_id
    returning xp, level into v_xp, v_level;
    if not found then
      raise exception 'Profile not found for authenticated user';
    end if;
  else
    select xp, level into v_xp, v_level
    from public.profiles
    where id = v_user_id;
  end if;

  return jsonb_build_object(
    'craft', to_jsonb(v_craft),
    'user', jsonb_build_object('xp', v_xp, 'level', v_level)
  );
end;
$$;

-- Award 20 XP the first time a project is started. started_at stays set on
-- reopen, so moving a project between statuses cannot farm the start bonus.
create or replace function public.start_craft(p_craft_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_craft public.crafts;
  v_xp integer;
  v_level integer;
  v_first_start boolean;
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

  v_first_start := v_craft.started_at is null and v_craft.status = 'todo';
  update public.crafts
  set status = 'in_progress',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = p_craft_id and user_id = v_user_id
  returning * into v_craft;

  if v_first_start then
    update public.profiles
    set xp = xp + 20,
        level = floor((xp + 20)::numeric / 200)::integer + 1,
        updated_at = now()
    where id = v_user_id
    returning xp, level into v_xp, v_level;
    if not found then
      raise exception 'Profile not found for authenticated user';
    end if;
  else
    select xp, level into v_xp, v_level
    from public.profiles
    where id = v_user_id;
  end if;

  return jsonb_build_object(
    'craft', to_jsonb(v_craft),
    'user', jsonb_build_object('xp', v_xp, 'level', v_level)
  );
end;
$$;

-- Add or merge supply and award 10 XP for each unit added, atomically.
create or replace function public.add_supply(
  p_name text,
  p_quantity integer,
  p_photo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.items;
  v_created boolean := false;
  v_xp integer;
  v_level integer;
  v_award integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 64 then
    raise exception 'Supply name must be between 1 and 64 characters' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Supply quantity must be at least 1' using errcode = '22023';
  end if;

  v_award := p_quantity * 10;

  -- Serialize same-user adds of the same normalized supply name so concurrent
  -- requests do not create duplicate rows or lose quantity updates.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || lower(btrim(p_name)), 0)
  );

  select * into v_item
  from public.items
  where user_id = v_user_id and lower(name) = lower(btrim(p_name))
  order by created_at
  limit 1
  for update;

  if found then
    update public.items
    set quantity = quantity + p_quantity,
        updated_at = now()
    where id = v_item.id
    returning * into v_item;
  else
    insert into public.items (user_id, name, quantity, photo_url)
    values (v_user_id, btrim(p_name), p_quantity, p_photo_url)
    returning * into v_item;
    v_created := true;
  end if;

  update public.profiles
  set xp = xp + v_award,
      level = floor((xp + v_award)::numeric / 200)::integer + 1,
      updated_at = now()
  where id = v_user_id
  returning xp, level into v_xp, v_level;
  if not found then
    raise exception 'Profile not found for authenticated user';
  end if;

  return jsonb_build_object(
    'item', to_jsonb(v_item),
    'user', jsonb_build_object('xp', v_xp, 'level', v_level),
    'created', v_created
  );
end;
$$;

revoke all on function public.complete_craft(uuid) from public;
revoke all on function public.start_craft(uuid) from public;
revoke all on function public.add_supply(text, integer, text) from public;
grant execute on function public.complete_craft(uuid) to authenticated;
grant execute on function public.start_craft(uuid) to authenticated;
grant execute on function public.add_supply(text, integer, text) to authenticated;
