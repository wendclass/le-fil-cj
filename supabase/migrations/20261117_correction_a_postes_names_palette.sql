-- ==============================================================================
-- Le Fil du bureau CJ : Migration Correctif A
-- Postes des membres, saisie et confirmation du nom, préparation nouvelle palette
-- ==============================================================================

-- 1. Table des Postes du bureau
create table if not exists public.postes (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  rank int not null default 100,          -- ordre d'affichage, le plus petit en premier
  created_at timestamptz not null default now()
);

-- Insertion des postes initiaux
insert into public.postes (label, rank)
values
  ('Chargé de planification', 10),
  ('Membre', 1000)
on conflict (label) do update set rank = excluded.rank;

-- 2. Évolution de la table profiles
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists name_confirmed_at timestamptz,
  add column if not exists poste_id uuid references public.postes(id) on delete set null;

-- 3. Évolution de la table invitations
alter table public.invitations
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists poste_id uuid references public.postes(id) on delete set null;

-- 4. Sécurité par ligne (RLS) sur postes
alter table public.postes enable row level security;

drop policy if exists "Postes lecture membres" on public.postes;
create policy "Postes lecture membres" on public.postes
  for select using (public.is_member());

drop policy if exists "Postes écriture planificateurs" on public.postes;
create policy "Postes écriture planificateurs" on public.postes
  for all using (public.is_planner());

-- 5. Rétro-compatibilité : initialisation des profils existants
update public.profiles
set
  first_name = coalesce(first_name, nullif(split_part(trim(coalesce(full_name, email)), ' ', 1), '')),
  last_name = coalesce(last_name, nullif(trim(substring(trim(coalesce(full_name, '')) from length(split_part(trim(coalesce(full_name, '')), ' ', 1)) + 1)), ''))
where first_name is null;

-- Attribution du poste initial aux profils existants si non défini
update public.profiles
set poste_id = (select id from public.postes where label = 'Chargé de planification' limit 1)
where role = 'planner' and poste_id is null;

update public.profiles
set poste_id = (select id from public.postes where label = 'Membre' limit 1)
where role = 'member' and poste_id is null;

-- 6. Trigger de synchronisation automatique de full_name sur profiles
create or replace function public.sync_profile_full_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.first_name is not null or new.last_name is not null then
    new.full_name := trim(concat(coalesce(new.first_name, ''), ' ', coalesce(new.last_name, '')));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_full_name on public.profiles;
create trigger trg_sync_profile_full_name
before insert or update of first_name, last_name on public.profiles
for each row execute function public.sync_profile_full_name();

-- 7. Fonction sécurisée de confirmation du nom par l'utilisateur
create or replace function public.confirm_my_name(
  p_first_name text,
  p_last_name text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_name_regex text := '^[A-Za-zÀ-ÖØ-öø-ÿĀ-ž''\s\-]+$';
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Non authentifié.');
  end if;

  v_first_name := trim(coalesce(p_first_name, ''));
  v_last_name := trim(coalesce(p_last_name, ''));

  -- Validation de la longueur (2 à 40 caractères)
  if length(v_first_name) < 2 or length(v_first_name) > 40 then
    return json_build_object('success', false, 'error', 'Ton prénom doit faire entre 2 et 40 lettres.');
  end if;

  if length(v_last_name) < 2 or length(v_last_name) > 40 then
    return json_build_object('success', false, 'error', 'Ton nom doit faire entre 2 et 40 lettres.');
  end if;

  -- Validation des caractères (lettres, accents, tirets, apostrophes et espaces uniquement)
  if not (v_first_name ~ v_name_regex) or not (v_last_name ~ v_name_regex) then
    return json_build_object('success', false, 'error', 'Les chiffres et les symboles ne sont pas autorisés.');
  end if;

  v_full_name := trim(concat(v_first_name, ' ', v_last_name));

  -- Mise à jour uniquement du profil de l'utilisateur connecté
  update public.profiles
  set
    first_name = v_first_name,
    last_name = v_last_name,
    full_name = v_full_name,
    name_confirmed_at = now()
  where id = v_user_id;

  return json_build_object(
    'success', true,
    'first_name', v_first_name,
    'last_name', v_last_name,
    'full_name', v_full_name,
    'name_confirmed_at', now()
  );
end;
$$;

-- 8. Mise à jour de claim_invitation pour reporter first_name, last_name et poste_id
create or replace function public.claim_invitation()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_raw_name text;
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_avatar_url text;
  v_invitation record;
  v_profile record;
  v_poste_id uuid;
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
  into v_raw_name, v_avatar_url
  from auth.users
  where id = v_user_id;

  -- Détermination du prénom et du nom
  v_first_name := coalesce(v_invitation.first_name, nullif(split_part(trim(v_raw_name), ' ', 1), ''));
  v_last_name := coalesce(v_invitation.last_name, nullif(trim(substring(trim(v_raw_name) from length(split_part(trim(v_raw_name), ' ', 1)) + 1)), ''));
  v_full_name := trim(concat(coalesce(v_first_name, ''), ' ', coalesce(v_last_name, '')));
  if v_full_name = '' then
    v_full_name := split_part(v_email, '@', 1);
  end if;

  -- Détermination du poste_id
  v_poste_id := v_invitation.poste_id;
  if v_poste_id is null then
    if v_invitation.role = 'planner' then
      select id into v_poste_id from public.postes where label = 'Chargé de planification' limit 1;
    else
      select id into v_poste_id from public.postes where label = 'Membre' limit 1;
    end if;
  end if;

  if v_profile.id is null then
    v_is_first_login := true;
    insert into public.profiles (
      id,
      email,
      first_name,
      last_name,
      full_name,
      avatar_url,
      role,
      poste_id,
      name_confirmed_at
    ) values (
      v_user_id,
      v_email,
      v_first_name,
      v_last_name,
      v_full_name,
      v_avatar_url,
      v_invitation.role,
      v_poste_id,
      null -- Exige confirmation via l'écran "Comment t'appelle-t-on ?"
    );
  else
    -- Mise à jour du rôle ou du poste si nécessaire
    update public.profiles
    set
      role = v_invitation.role,
      poste_id = coalesce(profiles.poste_id, v_poste_id),
      avatar_url = coalesce(profiles.avatar_url, v_avatar_url)
    where id = v_user_id;
  end if;

  -- Marquer l'invitation comme réclamée
  update public.invitations
  set claimed_at = now()
  where email = v_email and claimed_at is null;

  return json_build_object(
    'success', true,
    'first_login', v_is_first_login,
    'role', v_invitation.role,
    'first_name', v_first_name,
    'last_name', v_last_name,
    'full_name', v_full_name
  );
end;
$$;
