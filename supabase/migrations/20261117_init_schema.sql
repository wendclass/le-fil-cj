-- ==============================================================================
-- Le Fil du bureau CJ : Migration initiale des schémas, fonctions et sécurité (RLS)
-- Phase 1/4 : Fondations
-- ==============================================================================

-- 1. Types ENUM
create type user_role as enum ('planner', 'member');
create type meeting_status as enum ('planned', 'live', 'done', 'cancelled');
create type agenda_status as enum ('proposed', 'validated', 'rejected');
create type decision_status as enum ('draft', 'published');
create type task_status as enum ('todo', 'doing', 'done');
create type priority_status as enum ('proposed', 'active', 'archived');
create type rsvp_status as enum ('yes', 'no', 'maybe');

-- 2. Tables de base

-- Invitations
create table invitations (
  email text primary key,                         -- toujours en minuscules
  role user_role not null default 'member',
  invited_by uuid references auth.users,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

-- Profils utilisateurs (créés uniquement après validation de l'invitation)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'member',
  points int not null default 0,
  streak int not null default 0,
  best_streak int not null default 0,
  push_prompted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Priorités (« La Seule Chose » du mois)
create table priorities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  month date not null,                             -- premier jour du mois
  status priority_status not null default 'proposed',
  proposed_by uuid references profiles,
  created_at timestamptz not null default now()
);

create table priority_approvals (
  priority_id uuid references priorities on delete cascade,
  planner_id uuid references profiles,
  approved_at timestamptz not null default now(),
  primary key (priority_id, planner_id)
);

-- Réunions
create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  planned_minutes int not null default 45 check (planned_minutes between 10 and 45),
  location text,                                    -- lieu ou lien
  status meeting_status not null default 'planned',
  started_at timestamptz,
  ended_at timestamptz,
  overrun boolean not null default false,
  is_improvised boolean not null default false,
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);

create table agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings on delete cascade,
  title text not null,
  details text,
  allotted_minutes int not null default 5 check (allotted_minutes between 1 and 45),
  position int not null default 0,
  status agenda_status not null default 'proposed',
  proposed_by uuid references profiles,
  reject_reason text,
  started_at timestamptz,
  actual_seconds int,
  created_at timestamptz not null default now()
);

create table attendance (
  meeting_id uuid references meetings on delete cascade,
  user_id uuid references profiles,
  rsvp rsvp_status,
  present boolean not null default false,
  primary key (meeting_id, user_id)
);

-- Décisions
create table decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings on delete set null,
  agenda_item_id uuid references agenda_items on delete set null,
  text text not null,
  status decision_status not null default 'draft',
  published_at timestamptz,
  validation_deadline timestamptz,                  -- published_at + 48 h
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);

create table decision_validations (
  decision_id uuid references decisions on delete cascade,
  user_id uuid references profiles,
  validated_at timestamptz not null default now(),
  primary key (decision_id, user_id)
);

-- Tâches
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  decision_id uuid references decisions on delete set null,
  priority_id uuid references priorities on delete set null,
  assignee_id uuid references profiles not null,
  due_date date not null,                           -- échéance obligatoire
  status task_status not null default 'todo',
  completed_at timestamptz,
  completed_on_time boolean,
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);

-- Accusés de lecture
create table reads (
  user_id uuid references profiles,
  entity_type text check (entity_type in ('task','decision','meeting')),
  entity_id uuid,
  first_read_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

-- Notifications et Push
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table reminder_log (
  user_id uuid,
  kind text,
  ref_id uuid,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
);

-- Gamification (Points et Badges)
create table points_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  delta int not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create table user_badges (
  user_id uuid references profiles on delete cascade,
  badge_key text,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

-- 3. Fonctions de sécurité (Security Definer)

create or replace function public.is_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
  );
$$;

create or replace function public.is_planner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'planner'
  );
$$;

-- Fonction d'attribution de l'invitation appelée lors du retour OAuth
create or replace function public.claim_invitation()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_full_name text;
  v_avatar_url text;
  v_invitation record;
  v_profile record;
  v_is_first_login boolean := false;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', 'unauthenticated');
  end if;

  -- Récupération et normalisation de l'e-mail Google
  select lower(trim(email)) into v_email
  from auth.users
  where id = v_user_id;

  if v_email is null or v_email = '' then
    -- Essayer depuis auth.jwt() si disponible
    v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  end if;

  if v_email is null or v_email = '' then
    return json_build_object('success', false, 'error', 'no_email');
  end if;

  -- Vérification de l'invitation préalable
  select * into v_invitation
  from public.invitations
  where email = v_email;

  if not found then
    -- Aucun profil n'est créé pour les utilisateurs non invités
    return json_build_object('success', false, 'error', 'not_invited');
  end if;

  -- Récupération du profil existant si déjà connecté auparavant
  select * into v_profile
  from public.profiles
  where id = v_user_id;

  -- Métadonnées Google pour nom et avatar
  select
    coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', split_part(v_email, '@', 1)),
    raw_user_meta_data ->> 'avatar_url'
  into v_full_name, v_avatar_url
  from auth.users
  where id = v_user_id;

  if v_profile.id is null then
    v_is_first_login := true;
    insert into public.profiles (
      id,
      email,
      full_name,
      avatar_url,
      role
    ) values (
      v_user_id,
      v_email,
      v_full_name,
      v_avatar_url,
      v_invitation.role
    );
  else
    -- Mise à jour des informations si déjà existant
    update public.profiles
    set
      full_name = coalesce(v_full_name, full_name),
      avatar_url = coalesce(v_avatar_url, avatar_url),
      role = v_invitation.role
    where id = v_user_id;
  end if;

  -- Mettre à jour l'invitation comme réclamée
  update public.invitations
  set claimed_at = coalesce(claimed_at, now())
  where email = v_email;

  return json_build_object(
    'success', true,
    'role', v_invitation.role,
    'first_login', v_is_first_login
  );
end;
$$;

-- Fonction de mise à jour du statut d'une tâche par son responsable
create or replace function public.update_task_status(
  p_task_id uuid,
  p_status task_status
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due_date date;
  v_assignee_id uuid;
begin
  select due_date, assignee_id into v_due_date, v_assignee_id
  from public.tasks
  where id = p_task_id;

  if not found then
    raise exception 'Tâche introuvable';
  end if;

  if v_assignee_id != auth.uid() and not public.is_planner() then
    raise exception 'Action non autorisée sur cette tâche';
  end if;

  update public.tasks
  set
    status = p_status,
    completed_at = case when p_status = 'done' then now() else null end,
    completed_on_time = case when p_status = 'done' then (current_date <= v_due_date) else null end
  where id = p_task_id;

  return json_build_object('success', true, 'status', p_status);
end;
$$;

-- 4. Activation de la sécurité par ligne (RLS) sur TOUTES les tables

alter table invitations enable row level security;
alter table profiles enable row level security;
alter table priorities enable row level security;
alter table priority_approvals enable row level security;
alter table meetings enable row level security;
alter table agenda_items enable row level security;
alter table attendance enable row level security;
alter table decisions enable row level security;
alter table decision_validations enable row level security;
alter table tasks enable row level security;
alter table reads enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;
alter table reminder_log enable row level security;
alter table points_log enable row level security;
alter table user_badges enable row level security;

-- 5. Politiques RLS (Row Level Security)

-- Invitations : Seuls les planificateurs peuvent lire et écrire
create policy "Invitations lecture planificateurs" on invitations
  for select using (public.is_planner());

create policy "Invitations insertion planificateurs" on invitations
  for insert with check (public.is_planner());

create policy "Invitations mise a jour planificateurs" on invitations
  for update using (public.is_planner());

create policy "Invitations suppression planificateurs" on invitations
  for delete using (public.is_planner());

-- Profils : Tous les membres lisent les profils (nom, avatar, rôle)
create policy "Profils lecture membres" on profiles
  for select using (public.is_member());

create policy "Profils mise a jour proprietaire ou planificateur" on profiles
  for update using (auth.uid() = id or public.is_planner());

-- Priorités : Lecture membre, écriture planificateur
create policy "Priorités lecture membres" on priorities
  for select using (public.is_member());

create policy "Priorités écriture planificateurs" on priorities
  for all using (public.is_planner());

create policy "Priorité Approbations lecture membres" on priority_approvals
  for select using (public.is_member());

create policy "Priorité Approbations écriture planificateurs" on priority_approvals
  for all using (public.is_planner());

-- Réunions : Lecture membre, écriture planificateur
create policy "Réunions lecture membres" on meetings
  for select using (public.is_member());

create policy "Réunions écriture planificateurs" on meetings
  for all using (public.is_planner());

-- Points d'ordre du jour : Lecture membre, proposition par membre, écriture planificateur
create policy "Ordre du jour lecture membres" on agenda_items
  for select using (public.is_member());

create policy "Ordre du jour proposition membre" on agenda_items
  for insert with check (
    public.is_member()
    and proposed_by = auth.uid()
    and status = 'proposed'
  );

create policy "Ordre du jour écriture planificateurs" on agenda_items
  for update using (public.is_planner());

create policy "Ordre du jour suppression planificateurs" on agenda_items
  for delete using (public.is_planner());

-- Présence (Attendance) : Lecture membre, modification de sa propre présence
create policy "Présence lecture membres" on attendance
  for select using (public.is_member());

create policy "Présence insertion propre utilisateur" on attendance
  for insert with check (public.is_member() and user_id = auth.uid());

create policy "Présence mise à jour propre utilisateur" on attendance
  for update using (public.is_member() and user_id = auth.uid());

create policy "Présence suppression par planificateur ou propre utilisateur" on attendance
  for delete using (public.is_planner() or (public.is_member() and user_id = auth.uid()));

-- Décisions : Lecture décisions publiées par membres, brouillons par planificateurs
create policy "Décisions lecture membres" on decisions
  for select using (
    public.is_planner()
    or (public.is_member() and status = 'published')
  );

create policy "Décisions écriture planificateurs" on decisions
  for all using (public.is_planner());

-- Validations de décisions : Lecture nominative réservée aux planificateurs et à soi-même
create policy "Validations décisions lecture" on decision_validations
  for select using (
    public.is_planner()
    or (public.is_member() and user_id = auth.uid())
  );

create policy "Validations décisions insertion propre utilisateur" on decision_validations
  for insert with check (public.is_member() and user_id = auth.uid());

create policy "Validations décisions suppression propre utilisateur ou planificateur" on decision_validations
  for delete using (public.is_planner() or (public.is_member() and user_id = auth.uid()));

-- Tâches : Lecture membres, création/suppression/assignation planificateurs
create policy "Tâches lecture membres" on tasks
  for select using (public.is_member());

create policy "Tâches écriture planificateurs" on tasks
  for all using (public.is_planner());

-- Accusés de lecture (Reads) : Écriture par soi-même, lecture nominative planificateurs ou soi
create policy "Lectures consultation" on reads
  for select using (
    public.is_planner()
    or (public.is_member() and user_id = auth.uid())
  );

create policy "Lectures insertion propre utilisateur" on reads
  for insert with check (public.is_member() and user_id = auth.uid());

-- Notifications : Strictement personnelles
create policy "Notifications lecture propre utilisateur" on notifications
  for select using (user_id = auth.uid());

create policy "Notifications mise à jour propre utilisateur" on notifications
  for update using (user_id = auth.uid());

create policy "Notifications insertion système ou planificateur" on notifications
  for insert with check (public.is_planner() or user_id = auth.uid());

-- Abonnements Push : Strictement personnels
create policy "Push subscriptions personnel" on push_subscriptions
  for all using (user_id = auth.uid());

-- Reminder log : Personnel ou planificateur
create policy "Reminder log lecture" on reminder_log
  for select using (user_id = auth.uid() or public.is_planner());

create policy "Reminder log insertion planificateur" on reminder_log
  for insert with check (public.is_planner());

-- Points log et Badges : Lecture personnelle ou planificateurs, écriture planificateurs
create policy "Points log lecture" on points_log
  for select using (user_id = auth.uid() or public.is_planner());

create policy "Points log écriture planificateurs" on points_log
  for all using (public.is_planner());

create policy "User badges lecture" on user_badges
  for select using (public.is_member());

create policy "User badges écriture planificateurs" on user_badges
  for all using (public.is_planner());
