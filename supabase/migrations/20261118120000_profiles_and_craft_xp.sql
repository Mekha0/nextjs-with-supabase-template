create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  name text not null default '',
  last_name text not null default '',
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Create profiles for accounts that already existed before this migration.
with source_users as (
  select
    u.id,
    lower(coalesce(
      nullif(u.raw_user_meta_data->>'username', ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'user'
    )) as base_username,
    coalesce(
      nullif(u.raw_user_meta_data->>'name', ''),
      nullif(u.raw_user_meta_data->>'first_name', ''),
      ''
    ) as name,
    coalesce(nullif(u.raw_user_meta_data->>'last_name', ''), '') as last_name,
    case
      when coalesce(u.raw_user_meta_data->>'xp', '') ~ '^[0-9]+$'
        then (u.raw_user_meta_data->>'xp')::integer
      else 0
    end as xp
  from auth.users as u
),
unique_usernames as (
  select
    source_users.*,
    row_number() over (partition by base_username order by id) as username_rank
  from source_users
)
insert into public.profiles (id, username, name, last_name, xp, level)
select
  id,
  case when username_rank = 1 then base_username else base_username || '_' || left(id::text, 8) end,
  name,
  last_name,
  xp,
  floor(xp::numeric / 500)::integer + 1
from unique_usernames
on conflict (id) do nothing;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_xp integer;
begin
  v_username := lower(coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'user'
  ));
  v_xp := case
    when coalesce(new.raw_user_meta_data->>'xp', '') ~ '^[0-9]+$'
      then (new.raw_user_meta_data->>'xp')::integer
    else 0
  end;

  begin
    insert into public.profiles (id, username, name, last_name, xp, level)
    values (
      new.id,
      v_username,
      coalesce(nullif(new.raw_user_meta_data->>'name', ''), nullif(new.raw_user_meta_data->>'first_name', ''), ''),
      coalesce(nullif(new.raw_user_meta_data->>'last_name', ''), ''),
      v_xp,
      floor(v_xp::numeric / 500)::integer + 1
    );
  exception when unique_violation then
    insert into public.profiles (id, username, name, last_name, xp, level)
    values (
      new.id,
      v_username || '_' || left(new.id::text, 8),
      coalesce(nullif(new.raw_user_meta_data->>'name', ''), nullif(new.raw_user_meta_data->>'first_name', ''), ''),
      coalesce(nullif(new.raw_user_meta_data->>'last_name', ''), ''),
      v_xp,
      floor(v_xp::numeric / 500)::integer + 1
    );
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- Match the documented ownership model after profiles exist for every user.
alter table public.items drop constraint if exists items_user_id_fkey;
alter table public.items
  add constraint items_user_id_fkey foreign key (user_id)
  references public.profiles (id) on delete cascade;
alter table public.crafts drop constraint if exists crafts_user_id_fkey;
alter table public.crafts
  add constraint crafts_user_id_fkey foreign key (user_id)
  references public.profiles (id) on delete cascade;

drop function if exists public.complete_craft(uuid, jsonb);

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
        level = floor((xp + 50)::numeric / 500)::integer + 1,
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

revoke all on function public.complete_craft(uuid) from public;
grant execute on function public.complete_craft(uuid) to authenticated;
