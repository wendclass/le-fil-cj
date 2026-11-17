-- ==============================================================================
-- Migration Phase 4 : Durcissement, sécurité RLS et protections planificateurs
-- ==============================================================================

-- 1. Ajout de la colonne téléphone optionnelle pour le support WhatsApp des planificateurs
alter table public.profiles add column if not exists phone text;

-- 2. Fonction de protection contre l'auto-révocation et la suppression du dernier planificateur
create or replace function public.check_planner_safety()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_email text;
  v_planner_invitations_count int;
  v_planner_profiles_count int;
begin
  -- Récupérer l'e-mail de l'utilisateur connecté via JWT
  v_current_user_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  -- Cas sur la table invitations
  if tg_table_name = 'invitations' then
    if tg_op = 'DELETE' or (tg_op = 'UPDATE' and new.role != 'planner' and old.role = 'planner') then
      -- Empêcher de retirer sa propre invitation
      if lower(old.email) = v_current_user_email then
        raise exception 'Action interdite : tu ne peux pas retirer ta propre invitation ou ton propre rôle.';
      end if;

      -- Vérifier qu'il reste au moins un planificateur invité
      select count(*) into v_planner_invitations_count
      from public.invitations
      where role = 'planner';

      if v_planner_invitations_count <= 1 then
        raise exception 'Action interdite : impossible de supprimer ou rétrograder le dernier planificateur.';
      end if;
    end if;
  end if;

  -- Cas sur la table profiles
  if tg_table_name = 'profiles' then
    if tg_op = 'DELETE' then
      if old.role = 'planner' then
        select count(*) into v_planner_profiles_count
        from public.profiles
        where role = 'planner';

        if v_planner_profiles_count <= 1 then
          raise exception 'Action interdite : impossible de supprimer le dernier profil planificateur.';
        end if;
      end if;
    elsif tg_op = 'UPDATE' then
      -- Empêcher un membre de s'auto-attribuer le rôle planner
      if not public.is_planner() and new.role != old.role then
        new.role := old.role;
      end if;

      -- Empêcher la rétrogradation du dernier planificateur
      if old.role = 'planner' and new.role != 'planner' then
        select count(*) into v_planner_profiles_count
        from public.profiles
        where role = 'planner';

        if v_planner_profiles_count <= 1 then
          raise exception 'Action interdite : le club doit conserver au moins un planificateur actif.';
        end if;
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

-- Triggers de protection
drop trigger if exists trg_protect_planner_invitations on public.invitations;
create trigger trg_protect_planner_invitations
  before delete or update on public.invitations
  for each row
  execute function public.check_planner_safety();

drop trigger if exists trg_protect_planner_profiles on public.profiles;
create trigger trg_protect_planner_profiles
  before delete or update on public.profiles
  for each row
  execute function public.check_planner_safety();

-- 3. Confidentialité stricte des points et badges personnels
-- Révocation de l'accès public des membres aux badges d'autrui
drop policy if exists "User badges lecture" on public.user_badges;
drop policy if exists "User badges lecture personnelle" on public.user_badges;
create policy "User badges lecture personnelle" on public.user_badges
  for select using (user_id = auth.uid());

-- Révocation de l'accès des planificateurs aux points individuels
drop policy if exists "Points log lecture" on public.points_log;
drop policy if exists "Points log lecture personnelle" on public.points_log;
create policy "Points log lecture personnelle" on public.points_log
  for select using (user_id = auth.uid());

-- 4. Fonction de limitation de débit des notifications de test
create or replace function public.check_test_push_rate_limit(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test_count int;
begin
  select count(*) into v_test_count
  from public.notifications
  where user_id = p_user_id
    and kind = 'test'
    and created_at > (now() - interval '1 hour');

  return (v_test_count < 5);
end;
$$;
