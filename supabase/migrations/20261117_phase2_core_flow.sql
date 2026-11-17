-- ==============================================================================
-- Le Fil du bureau CJ : Migration Phase 2 - Flux principal
-- Fonctions d'approbation de priorité, publication de décisions, calculs et déclencheurs
-- ==============================================================================

-- 1. Fonction approve_priority(priority_id)
create or replace function public.approve_priority(p_priority_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_planner boolean;
  v_approvals_count int;
  v_total_planners int;
  v_is_active boolean := false;
begin
  -- Vérifier que l'utilisateur est bien planificateur
  select (role = 'planner') into v_is_planner
  from public.profiles
  where id = v_user_id;

  if not coalesce(v_is_planner, false) then
    raise exception 'Seuls les planificateurs peuvent approuver la priorité du mois.';
  end if;

  -- Insérer ou mettre à jour l'approbation du planificateur
  insert into public.priority_approvals (priority_id, planner_id, approved_at)
  values (p_priority_id, v_user_id, now())
  on conflict (priority_id, planner_id) do update
  set approved_at = now();

  -- Compter les approbations distinctes pour cette priorité
  select count(distinct planner_id) into v_approvals_count
  from public.priority_approvals
  where priority_id = p_priority_id;

  -- Nombre total de planificateurs enregistrés dans le club
  select count(*) into v_total_planners
  from public.profiles
  where role = 'planner';

  -- Si un seul planificateur est inscrit pour le moment, attendre 2 planificateurs minimum
  if v_total_planners < 2 then
    v_total_planners := 2;
  end if;

  -- Quand tous les planificateurs ont approuvé
  if v_approvals_count >= v_total_planners then
    -- Archiver l'éventuelle priorité active précédente
    update public.priorities
    set status = 'archived'
    where status = 'active';

    -- Activer la nouvelle priorité
    update public.priorities
    set status = 'active'
    where id = p_priority_id;

    v_is_active := true;
  end if;

  return json_build_object(
    'success', true,
    'approvals_count', v_approvals_count,
    'total_planners', v_total_planners,
    'is_active', v_is_active
  );
end;
$$;

-- 2. Fonction publish_decisions(meeting_id)
create or replace function public.publish_decisions(p_meeting_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_planner() then
    raise exception 'Seuls les planificateurs peuvent publier les décisions.';
  end if;

  update public.decisions
  set
    status = 'published',
    published_at = now(),
    validation_deadline = now() + interval '48 hours'
  where meeting_id = p_meeting_id and status = 'draft';

  get diagnostics v_count = row_count;

  return json_build_object(
    'success', true,
    'published_count', v_count
  );
end;
$$;

-- 3. Fonction update_task_status(task_id, status) avec respect du fuseau Africa/Ouagadougou
create or replace function public.update_task_status(p_task_id uuid, p_status task_status)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due_date date;
  v_assignee_id uuid;
  v_is_done boolean;
  v_completed_at timestamptz;
  v_on_time boolean;
begin
  select due_date, assignee_id into v_due_date, v_assignee_id
  from public.tasks
  where id = p_task_id;

  if not found then
    raise exception 'Tâche introuvable.';
  end if;

  if v_assignee_id != auth.uid() and not public.is_planner() then
    raise exception 'Tu ne peux modifier que le statut de tes propres tâches.';
  end if;

  v_is_done := (p_status = 'done');

  if v_is_done then
    v_completed_at := now();
    -- Fin du jour de due_date en Africa/Ouagadougou (23:59:59.999 Ouaga)
    v_on_time := (v_completed_at <= ((v_due_date + 1)::text || ' 00:00:00 Africa/Ouagadougou')::timestamptz);
  else
    v_completed_at := null;
    v_on_time := null;
  end if;

  update public.tasks
  set
    status = p_status,
    completed_at = v_completed_at,
    completed_on_time = v_on_time
  where id = p_task_id;

  return json_build_object(
    'success', true,
    'status', p_status,
    'completed_at', v_completed_at,
    'completed_on_time', v_on_time
  );
end;
$$;

-- 4. Déclencheur sur meetings : calcul d'improvisation (< 24 h ou aucun point validé en direct)
create or replace function public.handle_meeting_improvised()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- À la création : si la réunion démarre dans moins de 24 h
  if tg_op = 'INSERT' then
    if (new.starts_at - now()) < interval '24 hours' then
      new.is_improvised := true;
    end if;
  end if;

  -- À la mise en direct : si aucun point de l'ordre du jour n'a le statut 'validated'
  if tg_op = 'UPDATE' then
    if new.status = 'live' and old.status != 'live' then
      new.started_at := coalesce(new.started_at, now());
      if not exists (
        select 1 from public.agenda_items
        where meeting_id = new.id and status = 'validated'
      ) then
        new.is_improvised := true;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_meeting_improvised on public.meetings;
create trigger trg_meeting_improvised
  before insert or update on public.meetings
  for each row
  execute function public.handle_meeting_improvised();

-- 5. Contrainte sur agenda_items : la somme des points validés ne dépasse pas planned_minutes (45 max)
create or replace function public.validate_agenda_item_minutes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meeting_planned_minutes int;
  v_total_minutes int;
begin
  if new.status = 'validated' then
    select planned_minutes into v_meeting_planned_minutes
    from public.meetings
    where id = new.meeting_id;

    select coalesce(sum(allotted_minutes), 0) into v_total_minutes
    from public.agenda_items
    where meeting_id = new.meeting_id
      and status = 'validated'
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if (v_total_minutes + new.allotted_minutes) > coalesce(v_meeting_planned_minutes, 45) then
      raise exception 'Il n’y a plus de temps : réduis un autre point ou refuse celui-ci';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agenda_item_minutes on public.agenda_items;
create trigger trg_agenda_item_minutes
  before insert or update on public.agenda_items
  for each row
  execute function public.validate_agenda_item_minutes();
