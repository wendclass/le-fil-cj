-- ==============================================================================
-- Le Fil du bureau CJ : Migration Phase 3 - Suivi, notifications et indicateurs
-- Gamification, points, badges, lectures, et calculs des 5 indicateurs du club
-- ==============================================================================

-- 1. Fonction d'attribution de points (personnels)
create or replace function public.award_points(
  p_user_id uuid,
  p_delta int,
  p_reason text,
  p_ref_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insérer dans le journal d'historique des points
  insert into public.points_log (user_id, delta, reason, ref_id, created_at)
  values (p_user_id, p_delta, p_reason, p_ref_id, now());

  -- Mettre à jour le solde sur le profil
  update public.profiles
  set points = greatest(0, points + p_delta)
  where id = p_user_id;
end;
$$;

-- 2. Fonction de déblocage automatique des 6 badges
create or replace function public.check_and_unlock_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak int;
  v_best_streak int;
  v_done_tasks int;
  v_fast_validations int;
  v_validated_topics int;
  v_meetings_attended int;
begin
  -- Données de l'utilisateur
  select streak, best_streak into v_streak, v_best_streak
  from public.profiles
  where id = p_user_id;

  -- 1. Badge "first_task" : Première tâche terminée
  select count(*) into v_done_tasks
  from public.tasks
  where assignee_id = p_user_id and status = 'done';

  if v_done_tasks >= 1 and not exists (select 1 from public.user_badges where user_id = p_user_id and badge_key = 'first_task') then
    insert into public.user_badges (user_id, badge_key, earned_at) values (p_user_id, 'first_task', now());
    insert into public.notifications (user_id, kind, title, body, link)
    values (p_user_id, 'badge', 'Nouveau badge obtenu !', 'Tu as décroché le badge « Première tâche ».', '/profil');
  end if;

  -- 2. Badge "five_on_time" : Série de 5 à l'heure
  if (coalesce(v_streak, 0) >= 5 or coalesce(v_best_streak, 0) >= 5) and not exists (select 1 from public.user_badges where user_id = p_user_id and badge_key = 'five_on_time') then
    insert into public.user_badges (user_id, badge_key, earned_at) values (p_user_id, 'five_on_time', now());
    insert into public.notifications (user_id, kind, title, body, link)
    values (p_user_id, 'badge', 'Nouveau badge obtenu !', 'Tu as décroché le badge « Cinq à l’heure ».', '/profil');
  end if;

  -- 3. Badge "series_ten" : Série de 10
  if (coalesce(v_streak, 0) >= 10 or coalesce(v_best_streak, 0) >= 10) and not exists (select 1 from public.user_badges where user_id = p_user_id and badge_key = 'series_ten') then
    insert into public.user_badges (user_id, badge_key, earned_at) values (p_user_id, 'series_ten', now());
    insert into public.notifications (user_id, kind, title, body, link)
    values (p_user_id, 'badge', 'Nouveau badge obtenu !', 'Tu as décroché le badge « Série de 10 ».', '/profil');
  end if;

  -- 4. Badge "assiduous_reader" : 10 décisions validées en moins de 24 h
  select count(*) into v_fast_validations
  from public.decision_validations dv
  join public.decisions d on dv.decision_id = d.id
  where dv.user_id = p_user_id
    and d.published_at is not null
    and (dv.validated_at - d.published_at) <= interval '24 hours';

  if v_fast_validations >= 10 and not exists (select 1 from public.user_badges where user_id = p_user_id and badge_key = 'assiduous_reader') then
    insert into public.user_badges (user_id, badge_key, earned_at) values (p_user_id, 'assiduous_reader', now());
    insert into public.notifications (user_id, kind, title, body, link)
    values (p_user_id, 'badge', 'Nouveau badge obtenu !', 'Tu as décroché le badge « Lecteur assidu ».', '/profil');
  end if;

  -- 5. Badge "club_voice" : 3 sujets proposés validés
  select count(*) into v_validated_topics
  from public.agenda_items
  where proposed_by = p_user_id and status = 'validated';

  if v_validated_topics >= 3 and not exists (select 1 from public.user_badges where user_id = p_user_id and badge_key = 'club_voice') then
    insert into public.user_badges (user_id, badge_key, earned_at) values (p_user_id, 'club_voice', now());
    insert into public.notifications (user_id, kind, title, body, link)
    values (p_user_id, 'badge', 'Nouveau badge obtenu !', 'Tu as décroché le badge « Voix du club ».', '/profil');
  end if;

  -- 6. Badge "always_there" : Présence à 5 réunions
  select count(*) into v_meetings_attended
  from public.attendance
  where user_id = p_user_id and present = true;

  if v_meetings_attended >= 5 and not exists (select 1 from public.user_badges where user_id = p_user_id and badge_key = 'always_there') then
    insert into public.user_badges (user_id, badge_key, earned_at) values (p_user_id, 'always_there', now());
    insert into public.notifications (user_id, kind, title, body, link)
    values (p_user_id, 'badge', 'Nouveau badge obtenu !', 'Tu as décroché le badge « Toujours là ».', '/profil');
  end if;
end;
$$;

-- 3. Mise à jour de update_task_status avec calcul de série et attribution de points
create or replace function public.update_task_status(p_task_id uuid, p_status task_status)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due_date date;
  v_assignee_id uuid;
  v_old_status task_status;
  v_is_done boolean;
  v_completed_at timestamptz;
  v_on_time boolean;
  v_title text;
begin
  select due_date, assignee_id, status, title into v_due_date, v_assignee_id, v_old_status, v_title
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
    -- Fin du jour de due_date en Africa/Ouagadougou
    v_on_time := (v_completed_at <= ((v_due_date + 1)::text || ' 00:00:00 Africa/Ouagadougou')::timestamptz);

    -- Gestion de la série et des points si la tâche n'était pas déjà terminée
    if v_old_status != 'done' then
      if v_on_time then
        -- Série augmente de 1
        update public.profiles
        set
          streak = streak + 1,
          best_streak = greatest(best_streak, streak + 1)
        where id = v_assignee_id;

        -- +10 points
        perform public.award_points(v_assignee_id, 10, 'Tâche terminée dans les délais', p_task_id);
      else
        -- Série réinitialisée à 0
        update public.profiles
        set streak = 0
        where id = v_assignee_id;

        -- +3 points
        perform public.award_points(v_assignee_id, 3, 'Tâche terminée en retard', p_task_id);
      end if;

      -- Vérifier les badges
      perform public.check_and_unlock_badges(v_assignee_id);
    end if;
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

-- 4. Déclencheur sur decision_validations pour l'attribution des points
create or replace function public.handle_decision_validation_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_published_at timestamptz;
  v_elapsed interval;
begin
  select published_at into v_published_at
  from public.decisions
  where id = new.decision_id;

  if v_published_at is not null then
    v_elapsed := new.validated_at - v_published_at;

    if v_elapsed <= interval '24 hours' then
      perform public.award_points(new.user_id, 3, 'Décision validée dans les 24 premières heures', new.decision_id);
    elsif v_elapsed <= interval '48 hours' then
      perform public.award_points(new.user_id, 2, 'Décision validée entre 24 et 48 heures', new.decision_id);
    end if;

    perform public.check_and_unlock_badges(new.user_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_decision_validation_points on public.decision_validations;
create trigger trg_decision_validation_points
  after insert on public.decision_validations
  for each row
  execute function public.handle_decision_validation_points();

-- 5. Déclencheur sur attendance pour les points de présence et de RSVP
create or replace function public.handle_attendance_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starts_at timestamptz;
  v_already_rsvp boolean;
  v_already_present boolean;
begin
  select starts_at into v_starts_at
  from public.meetings
  where id = new.meeting_id;

  -- 1. Point RSVP (+1 point si confirmé avant la réunion)
  if new.rsvp is not null and (tg_op = 'INSERT' or old.rsvp is null) then
    if now() < v_starts_at then
      select exists (
        select 1 from public.points_log
        where user_id = new.user_id and reason = 'Confirmation de présence avant la réunion' and ref_id = new.meeting_id
      ) into v_already_rsvp;

      if not v_already_rsvp then
        perform public.award_points(new.user_id, 1, 'Confirmation de présence avant la réunion', new.meeting_id);
      end if;
    end if;
  end if;

  -- 2. Points présence (+5 points si présent coché par planificateur)
  if new.present = true and (tg_op = 'INSERT' or coalesce(old.present, false) = false) then
    select exists (
      select 1 from public.points_log
      where user_id = new.user_id and reason = 'Présence à une réunion' and ref_id = new.meeting_id
    ) into v_already_present;

    if not v_already_present then
      perform public.award_points(new.user_id, 5, 'Présence à une réunion', new.meeting_id);
      perform public.check_and_unlock_badges(new.user_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_attendance_points on public.attendance;
create trigger trg_attendance_points
  after insert or update on public.attendance
  for each row
  execute function public.handle_attendance_points();

-- 6. Déclencheur sur agenda_items pour les points de sujet validé (+3 points)
create or replace function public.handle_agenda_topic_validated_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already_awarded boolean;
begin
  if new.status = 'validated' and (tg_op = 'INSERT' or old.status != 'validated') and new.proposed_by is not null then
    select exists (
      select 1 from public.points_log
      where user_id = new.proposed_by and reason = 'Sujet proposé validé en réunion' and ref_id = new.id
    ) into v_already_awarded;

    if not v_already_awarded then
      perform public.award_points(new.proposed_by, 3, 'Sujet proposé validé en réunion', new.id);
      perform public.check_and_unlock_badges(new.proposed_by);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agenda_topic_validated_points on public.agenda_items;
create trigger trg_agenda_topic_validated_points
  after insert or update on public.agenda_items
  for each row
  execute function public.handle_agenda_topic_validated_points();

-- 7. Fonction de calcul des cinq indicateurs du club (côté base de données)
create or replace function public.get_club_metrics(p_period text default 'current_month')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_date date;
  v_end_date date;
  v_prev_start date;
  v_prev_end date;

  -- 1. Priorité
  v_priority record;
  v_priority_total_tasks int := 0;
  v_priority_done_tasks int := 0;
  v_priority_percent int := 0;
  v_days_remaining int := 0;

  -- 2. Décisions dans les délais
  v_tasks_due int := 0;
  v_tasks_on_time int := 0;
  v_ontime_rate int := 0;
  v_prev_ontime_rate int := 0;

  -- 3. Décisions validées & lues
  v_decisions_published int := 0;
  v_total_validations int := 0;
  v_total_reads int := 0;
  v_total_members int := 1;
  v_validated_rate int := 0;
  v_read_rate int := 0;
  v_prev_validated_rate int := 0;

  -- 4. Respect 45 minutes
  v_meetings_done int := 0;
  v_meetings_on_time int := 0;
  v_meeting_time_rate int := 0;
  v_avg_duration_minutes int := 0;
  v_prev_meeting_time_rate int := 0;

  -- 5. Participation
  v_attendance_slots int := 0;
  v_attendance_present int := 0;
  v_attendance_rsvp int := 0;
  v_presence_rate int := 0;
  v_rsvp_rate int := 0;
  v_prev_presence_rate int := 0;
begin
  -- Définition des bornes temporelles
  if p_period = 'last_month' then
    v_start_date := date_trunc('month', current_date - interval '1 month')::date;
    v_end_date := (date_trunc('month', current_date) - interval '1 day')::date;
    v_prev_start := date_trunc('month', current_date - interval '2 month')::date;
    v_prev_end := (date_trunc('month', current_date - interval '1 month') - interval '1 day')::date;
  elsif p_period = 'last_3_months' then
    v_start_date := date_trunc('month', current_date - interval '3 month')::date;
    v_end_date := current_date;
    v_prev_start := date_trunc('month', current_date - interval '6 month')::date;
    v_prev_end := (date_trunc('month', current_date - interval '3 month') - interval '1 day')::date;
  else -- 'current_month' par défaut
    v_start_date := date_trunc('month', current_date)::date;
    v_end_date := (date_trunc('month', current_date + interval '1 month') - interval '1 day')::date;
    v_prev_start := date_trunc('month', current_date - interval '1 month')::date;
    v_prev_end := (date_trunc('month', current_date) - interval '1 day')::date;
  end if;

  select count(*) into v_total_members from public.profiles;
  if v_total_members < 1 then v_total_members := 1; end if;

  -- 1. La Seule Chose du club
  select * into v_priority
  from public.priorities
  where status = 'active'
  order by created_at desc
  limit 1;

  if v_priority.id is not null then
    select count(*), count(*) filter (where status = 'done')
    into v_priority_total_tasks, v_priority_done_tasks
    from public.tasks
    where priority_id = v_priority.id;

    if v_priority_total_tasks > 0 then
      v_priority_percent := round((v_priority_done_tasks::numeric / v_priority_total_tasks::numeric) * 100);
    end if;

    v_days_remaining := greatest(0, (date_trunc('month', current_date + interval '1 month')::date - current_date));
  end if;

  -- 2. Décisions exécutées dans les délais (Tâches échues sur la période)
  select
    count(*),
    count(*) filter (where completed_on_time = true)
  into v_tasks_due, v_tasks_on_time
  from public.tasks
  where due_date between v_start_date and v_end_date
    and (status = 'done' or due_date < current_date);

  if v_tasks_due > 0 then
    v_ontime_rate := round((v_tasks_on_time::numeric / v_tasks_due::numeric) * 100);
  end if;

  -- Tendance période précédente
  declare
    v_prev_due int;
    v_prev_on_time int;
  begin
    select count(*), count(*) filter (where completed_on_time = true)
    into v_prev_due, v_prev_on_time
    from public.tasks
    where due_date between v_prev_start and v_prev_end
      and (status = 'done' or due_date < current_date);
    if v_prev_due > 0 then
      v_prev_ontime_rate := round((v_prev_on_time::numeric / v_prev_due::numeric) * 100);
    end if;
  end;

  -- 3. Décisions connues et validées
  select count(*) into v_decisions_published
  from public.decisions
  where status = 'published' and published_at::date between v_start_date and v_end_date;

  if v_decisions_published > 0 then
    select count(*) into v_total_validations
    from public.decision_validations dv
    join public.decisions d on dv.decision_id = d.id
    where d.status = 'published' and d.published_at::date between v_start_date and v_end_date;

    select count(*) into v_total_reads
    from public.reads r
    join public.decisions d on r.entity_id = d.id
    where r.entity_type = 'decision' and d.published_at::date between v_start_date and v_end_date;

    v_validated_rate := round((v_total_validations::numeric / (v_decisions_published * v_total_members)::numeric) * 100);
    v_read_rate := round((v_total_reads::numeric / (v_decisions_published * v_total_members)::numeric) * 100);
  end if;

  -- 4. Respect des 45 minutes
  select
    count(*),
    count(*) filter (where overrun = false and extract(epoch from (ended_at - started_at))/60 <= planned_minutes),
    coalesce(round(avg(extract(epoch from (ended_at - started_at))/60)), 0)
  into v_meetings_done, v_meetings_on_time, v_avg_duration_minutes
  from public.meetings
  where status = 'done'
    and starts_at::date between v_start_date and v_end_date
    and started_at is not null and ended_at is not null;

  if v_meetings_done > 0 then
    v_meeting_time_rate := round((v_meetings_on_time::numeric / v_meetings_done::numeric) * 100);
  end if;

  -- 5. Participation
  select
    count(*),
    count(*) filter (where present = true),
    count(*) filter (where rsvp is not null)
  into v_attendance_slots, v_attendance_present, v_attendance_rsvp
  from public.attendance a
  join public.meetings m on a.meeting_id = m.id
  where m.status in ('live', 'done') and m.starts_at::date between v_start_date and v_end_date;

  if v_attendance_slots > 0 then
    v_presence_rate := round((v_attendance_present::numeric / v_attendance_slots::numeric) * 100);
    v_rsvp_rate := round((v_attendance_rsvp::numeric / v_attendance_slots::numeric) * 100);
  end if;

  return json_build_object(
    'priority', json_build_object(
      'has_data', (v_priority.id is not null),
      'title', coalesce(v_priority.title, ''),
      'percent', v_priority_percent,
      'done_tasks', v_priority_done_tasks,
      'total_tasks', v_priority_total_tasks,
      'days_remaining', v_days_remaining
    ),
    'ontime_tasks', json_build_object(
      'has_data', (v_tasks_due > 0),
      'rate', v_ontime_rate,
      'tasks_on_time', v_tasks_on_time,
      'tasks_due', v_tasks_due,
      'diff_prev', (v_ontime_rate - v_prev_ontime_rate)
    ),
    'decisions_validated', json_build_object(
      'has_data', (v_decisions_published > 0),
      'rate', v_validated_rate,
      'read_rate', v_read_rate,
      'decisions_count', v_decisions_published
    ),
    'meeting_time', json_build_object(
      'has_data', (v_meetings_done > 0),
      'rate', v_meeting_time_rate,
      'avg_minutes', v_avg_duration_minutes,
      'meetings_done', v_meetings_done
    ),
    'participation', json_build_object(
      'has_data', (v_attendance_slots > 0),
      'presence_rate', v_presence_rate,
      'rsvp_rate', v_rsvp_rate,
      'sessions_count', v_attendance_slots
    )
  );
end;
$$;
