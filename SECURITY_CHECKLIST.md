# Audit de sécurité et liste de vérification : Le Fil du bureau CJ

> **Date de l'audit** : 17 novembre 2026
> **Statut global** : Conforme et verrouillé

Ce document détaille les 10 exigences de sécurité requises par le cahier des charges de la Phase 4, les vérifications effectuées dans le code et les garanties apportées au niveau de la base de données PostgreSQL / Supabase.

---

## 1. Sécurité par ligne (Row Level Security - RLS) activée sur toutes les tables sans exception

- [x] **Vérifié**
- **Détails** : L'ensemble des 16 tables de l'application possède la directive `alter table <table_name> enable row level security;` dans les migrations `20261117_init_schema.sql` et `20261117_phase4_hardening.sql`.
- **Tables auditées** :
  1. `invitations`
  2. `profiles`
  3. `priorities`
  4. `priority_approvals`
  5. `meetings`
  6. `agenda_items`
  7. `attendance`
  8. `decisions`
  9. `decision_validations`
  10. `tasks`
  11. `reads`
  12. `notifications`
  13. `push_subscriptions`
  14. `reminder_log`
  15. `points_log`
  16. `user_badges`

---

## 2. Compte Google non invité : zéro profil, lecture et écriture interdites

- [x] **Vérifié**
- **Détails** :
  - La fonction `claim_invitation()` vérifie si l'adresse e-mail issue du jeton Google figure dans `public.invitations`. Si elle est absente, la fonction s'interrompt avec l'erreur `'not_invited'` sans insérer de ligne dans `profiles`.
  - En l'absence de ligne dans `profiles`, la fonction `public.is_member()` renvoie `false`.
  - Toutes les politiques RLS de lecture des tables métier (`meetings`, `decisions`, `tasks`, `priorities`, etc.) exigent `public.is_member()`. Un utilisateur non invité reçoit donc `[]` (tableau vide) ou une erreur d'autorisation sur chaque requête.
  - La route `/acces-refuse` intercepte ces utilisateurs et ne leur affiche aucune donnée.

---

## 3. Restrictions strictes des membres : aucune action réservée aux planificateurs

- [x] **Vérifié**
- **Détails** :
  - **Création / modification de réunions** : protégée par la politique `meetings écriture planificateurs` (`using (public.is_planner())`).
  - **Création / publication de décisions** : protégée par la politique `decisions écriture planificateurs` (`using (public.is_planner())`). Les brouillons (`status = 'draft'`) sont invisibles aux membres grâce à la politique `using (status = 'published' or public.is_planner())`.
  - **Création / assignation de tâches** : réservée aux planificateurs (`tasks écriture planificateurs`).
  - **Modification de statut d'une tâche** : exécutée via la fonction RPC `update_task_status()`, qui valide côté base que `auth.uid() = assignee_id` ou `public.is_planner()`. Un membre ne peut pas modifier la tâche d'un autre.
  - **Invitations** : la table `invitations` est en lecture/écriture exclusive pour `is_planner()`.
  - **Accusés de lecture (`reads`)** : un membre ne peut insérer que sa propre lecture (`user_id = auth.uid()`) et ne peut lire que ses propres lectures ; seuls les planificateurs peuvent consulter les accusés de tous les membres.

---

## 4. Impossibilité pour un membre de s'auto-attribuer le rôle `planner`

- [x] **Vérifié**
- **Détails** :
  - Le trigger PostgreSQL `trg_protect_planner_profiles` sur la table `profiles` vérifie que si l'utilisateur modifiant une ligne n'est pas déjà planificateur (`not public.is_planner()`), toute tentative de modification de la colonne `role` est rejetée ou écrasée avec `new.role := old.role`.
  - Le rôle initial est exclusivement copié depuis `invitations.role` par `claim_invitation()`.

---

## 5. Zéro clé secrète exposée au client ou dans le dépôt

- [x] **Vérifié**
- **Détails** :
  - `SUPABASE_SERVICE_ROLE_KEY` et `VAPID_PRIVATE_KEY` ne portent aucun préfixe `NEXT_PUBLIC_` et ne sont jamais importées dans des composants `use client`.
  - Elles ne sont utilisées que dans les routes API serveur (`/lib/push.ts`, `/app/api/cron/reminders/route.ts`) et dans les scripts d'amorçage CLI (`scripts/seed-planners.ts`).
  - `.env.local` et `.env` sont ignorés par `.gitignore`. Seul `.env.example` figure dans le dépôt avec des valeurs fictives.

---

## 6. Fonctions `security definer` verrouillées (`search_path`) et validation des paramètres

- [x] **Vérifié**
- **Détails** :
  - Toutes les fonctions PL/pgSQL avec privilèges élevés (`claim_invitation`, `approve_priority`, `publish_decisions`, `update_task_status`, `award_points`, `check_and_unlock_badges`, `get_club_metrics`, `check_planner_safety`) déclarent explicitement `set search_path = public` (ou `public, auth` pour OAuth).
  - Cela élimine le risque d'attaque par substitution de schéma (Search Path Hijacking).
  - Les identifiants et arguments sont typés (`uuid`, `task_status`, `text`) et vérifiés en début de bloc.

---

## 7. Limitation de longueur des entrées texte et échappement des injections

- [x] **Vérifié**
- **Détails** :
  - Tous les champs de saisie utilisateur comportent des attributs `maxLength` dans les formulaires (ex. : 80 caractères pour le titre de réunion/priorité, 300 pour la description).
  - Les requêtes SQL passent exclusivement par l'ORM Supabase paramétré (`.eq()`, `.insert()`, RPC), ce qui garantit une protection native contre les injections SQL.
  - Tous les liens pré-remplis WhatsApp (`https://wa.me/?text=...`) passent systématiquement par `encodeURIComponent()` dans `TrackingDashboard.tsx`, `LiveMeetingMode.tsx` et `TeamManager.tsx`.

---

## 8. Contrôle double (Serveur ET Base de données) sur les routes planificateurs

- [x] **Vérifié**
- **Détails** :
  - **Côté serveur** : les pages `/equipe`, `/suivi`, `/reunions/nouvelle` et `/reunions/[id]/direct` invoquent `await requirePlanner()`, qui vérifie la session Supabase et le rôle du profil avant d'effectuer toute requête, et redirige vers `/` en cas d'accès non autorisé.
  - **Côté base** : même si un attaquant tente de contourner le composant Next.js en envoyant directement des requêtes API vers PostgREST, les politiques RLS `is_planner()` rejettent systématiquement les opérations.

---

## 9. Protection contre l'auto-révocation et la suppression du dernier planificateur

- [x] **Vérifié**
- **Détails** :
  - **Dans l'interface** : `components/team/TeamManager.tsx` bloque le bouton de révocation si l'adresse ciblée correspond à celle de l'utilisateur connecté (`revokeSelfForbidden`).
  - **Dans la base de données** : le déclencheur `check_planner_safety()` sur `invitations` et `profiles` lève une exception bloquante si :
    1. Un planificateur tente de supprimer sa propre invitation (`old.email = auth.jwt() ->> 'email'`).
    2. La suppression ou rétrogradation laisserait le club avec moins d'un planificateur enregistré.

---

## 10. Limitation de débit des notifications de test (5 par heure par utilisateur)

- [x] **Vérifié**
- **Détails** :
  - La route `/api/push/test/route.ts` compte les notifications reçues par l'utilisateur connecté avec `kind = 'test'` au cours de la dernière heure (`created_at >= now() - interval '1 hour'`).
  - Dès la 5e notification atteinte dans l'heure, la route renvoie le code HTTP `429 Too Many Requests` avec le message : « Limite atteinte : 5 notifications de test par heure au maximum. ».
  - La fonction d'appui PostgreSQL `check_test_push_rate_limit()` assure également ce contrôle au niveau de la persistance.
