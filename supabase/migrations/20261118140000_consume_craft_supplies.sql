alter table public.crafts
  add column if not exists required_materials text[] not null default '{}';

-- Preserve materials from crafts saved before the dedicated column existed.
update public.crafts
set required_materials = case
  when regexp_match(description, '(?m)^Materials you have: (.+)$') is not null
    then regexp_split_to_array(
      (regexp_match(description, '(?m)^Materials you have: (.+)$'))[1],
      '\s*,\s*'
    )
  else '{}'::text[]
end
where cardinality(required_materials) = 0
  and description is not null;

create or replace function public.complete_craft(p_craft_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_craft public.crafts;
  v_material text;
  v_item_id uuid;
  v_item_quantity integer;
  v_xp integer;
  v_level integer;
  v_first_completion boolean;
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

  v_first_completion := v_craft.status <> 'complete'
    and v_craft.completed_at is null;

  if v_craft.status <> 'complete' then
    -- Consume one unit of each owned required material. Tools and missing
    -- materials are not included in required_materials and are never deducted.
    if v_first_completion then
      foreach v_material in array coalesce(v_craft.required_materials, '{}'::text[])
      loop
        select id, quantity into v_item_id, v_item_quantity
        from public.items
        where user_id = v_user_id
          and lower(name) = lower(btrim(v_material))
        order by created_at
        limit 1
        for update;

        if found then
          if v_item_quantity <= 1 then
            delete from public.items where id = v_item_id;
          else
            update public.items
            set quantity = quantity - 1,
                updated_at = now()
            where id = v_item_id;
          end if;
        end if;
      end loop;
    end if;

    update public.crafts
    set status = 'complete',
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where id = p_craft_id and user_id = v_user_id
    returning * into v_craft;

    if v_first_completion then
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
