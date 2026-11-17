# Le Fil du bureau CJ

> **« Ce qu’on décide, on le suit. »**
> Plateforme de suivi du Club des étudiants en communication et journalisme de l’IPERMIC (Club CJ).
> **Version finale de production (Phases 1 à 4 terminées).**

---

## 1. Vue d’ensemble

« Le Fil du bureau CJ » est l’application interne conçue pour structurer et dynamiser le travail du bureau du Club CJ de l’IPERMIC :
- **Priorité du mois** : « La Seule Chose » concertée et validée par les deux planificateurs.
- **Réunions cadrées** : 45 minutes chrono avec chronomètre temps réel, ordre du jour collaboratif, appel des présences et mode direct.
- **Suivi des décisions** : chaque engagement pris devient une décision claire validée par l’ensemble des membres sous 48 heures.
- **Responsabilité et tâches** : chaque tâche a un responsable unique et une échéance obligatoire, reliée ou non à la priorité du mois.
- **Accompagnement et relances** : notifications Web Push automatiques, détection des tâches non vues, relance WhatsApp en un clic.
- **Transparence et santé du club** : tableau de bord à 5 indicateurs stratégiques mesurés en temps réel.
- **Sécurité et souveraineté** : contrôle d’accès strict par liste blanche d’adresses Google invitées et sécurité par ligne (**Row Level Security - RLS**) intégrale.

---

## 2. Variables d’environnement

Copier `.env.example` vers `.env.local` et renseigner les valeurs requises :

```bash
cp .env.example .env.local
```

### Répertoire des variables d’environnement

| Variable | Portée | Obligatoire | Description |
| :--- | :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Publique (Client & Serveur) | Oui | URL du projet Supabase (`https://<projet>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publique (Client & Serveur) | Oui | Clé publique anonyme du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secrète (Serveur & Amorçage)** | Oui | Clé de service Supabase (accès administrateur utilisé uniquement pour l’amorçage) |
| `NEXT_PUBLIC_SITE_URL` | Publique (Client & Serveur) | Oui | URL publique du site (ex: `http://localhost:3000` ou `https://le-fil-cj.vercel.app`) |
| `INITIAL_PLANNER_EMAILS` | Secrète (Script d’amorçage) | Oui | Deux adresses Google des planificateurs séparées par une virgule |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Publique (Client & Serveur) | Oui | Clé publique VAPID pour l’abonnement push du navigateur |
| `VAPID_PUBLIC_KEY` | Serveur uniquement | Oui | Clé publique VAPID pour l’envoi de notifications Web Push |
| `VAPID_PRIVATE_KEY` | **Secrète (Serveur uniquement)** | Oui | Clé privée VAPID pour signer les requêtes Web Push |
| `VAPID_SUBJECT` | Serveur uniquement | Oui | Adresse de contact du club au format mailto (`mailto:contact@club-cj.org`) |
| `CRON_SECRET` | **Secrète (Serveur & Cron)** | Oui | Clé secrète autorisant l’exécution périodique de `/api/cron/reminders` |

> [!CAUTION]
> Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` ni `VAPID_PRIVATE_KEY` dans le code client ou sur le navigateur. `SUPABASE_SERVICE_ROLE_KEY` n’est utilisée que côté serveur ou par le script sécurisé `scripts/seed-planners.ts`.

---

## 3. Configuration de l’authentification Google & Supabase

### A. Configuration du fournisseur Google dans la console Google Cloud
1. Ouvrir la [Google Cloud Console](https://console.cloud.google.com/).
2. Créer un projet ou sélectionner le projet dédié au Club CJ.
3. Configurer l’**Écran de consentement OAuth** :
   - Type d’utilisateur : **Externe**.
   - Nom de l’application : `Le Fil du bureau CJ`.
   - Adresses e-mail d’assistance et de contact du développeur.
   - Champs d’application (scopes) : `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
4. Créer les identifiants OAuth :
   - Accéder à **Identifiants > Créer des identifiants > ID client OAuth**.
   - Type d’application : **Application Web**.
   - Nom : `Le Fil Client Web`.
   - Dans **URI de redirection autorisés**, ajouter l’URI fourni par Supabase :
     `https://<id-du-projet-supabase>.supabase.co/auth/v1/callback`
5. Récupérer l’**ID client** et le **Code secret du client**.

### B. Configuration dans le tableau de bord Supabase
1. Accéder à votre projet Supabase, puis à **Authentication > Providers > Google**.
2. Activer le fournisseur Google.
3. Renseigner le `Client ID` et le `Client Secret` obtenus sur Google Cloud.
4. Dans **Authentication > URL Configuration** :
   - Définir la **Site URL** :
     - En développement : `http://localhost:3000`
     - En production : `https://le-fil-cj.vercel.app` (votre domaine Vercel)
   - Ajouter dans **Redirect URLs** :
     - `http://localhost:3000/auth/callback`
     - `https://<votre-domaine>.vercel.app/auth/callback`

---

## 4. Initialisation de la base de données & Migrations SQL

Les migrations doivent être exécutées dans l’ordre chronologique strict dans le **SQL Editor** de Supabase :

1. `supabase/migrations/20261117_init_schema.sql` :
   - Crée les types ENUM (`user_role`, `meeting_type`, `meeting_status`, `agenda_status`, `attendance_status`, `task_status`, `priority_status`).
   - Crée l’ensemble des tables relationnelles (`invitations`, `profiles`, `monthly_priorities`, `meetings`, `agenda_items`, `attendances`, `decisions`, `decision_validations`, `tasks`).
   - Active la sécurité par ligne (**Row Level Security - RLS**) sur chaque table.
   - Définit les fonctions d’autorisation `is_member()`, `is_planner()` et la fonction de réclamation d’invitation `claim_invitation()`.
2. `supabase/migrations/20261117_phase2_core_flow.sql` :
   - Procédures d’approbation de la priorité du mois (`approve_monthly_priority`).
   - Procédures de réunion en direct, publication en masse des décisions et calcul de durée réelle.
   - Fonction d’avancement des tâches avec horodatage de clôture (`update_task_status`).
   - Publication Supabase Realtime sur `meetings`, `agenda_items` et `decisions`.
3. `supabase/migrations/20261117_phase3_tracking_metrics.sql` :
   - Tables de gamification (`points_log`, `user_badges`).
   - Tables de suivi de lecture et relances (`item_reads`, `push_subscriptions`, `reminder_logs`).
   - Attribution des points de ponctualité (+10 pts) et déblocage automatique des badges.
   - Fonction analytique calculant les 5 indicateurs du club (`get_club_metrics`).
4. `supabase/migrations/20261117_phase4_hardening.sql` :
   - Ajout de la colonne `phone` sur `profiles` (support WhatsApp direct des planificateurs).
   - Protection stricte du dernier planificateur (`check_planner_safety`).
   - Débit limite des tests push (maximum 5 par heure par utilisateur).
   - RLS stricte sur les points et badges personnels.

---

## 5. Amorçage des planificateurs initiaux

> [!IMPORTANT]
> Par conception de sécurité, aucun compte Google ne peut accéder aux données sans y avoir été préalablement invité. Deux planificateurs initiaux doivent être amorcés avant la première mise en service.

1. Renseigner les adresses Google des deux planificateurs dans `.env.local` :
   ```env
   INITIAL_PLANNER_EMAILS="planificateur1@gmail.com,planificateur2@gmail.com"
   ```
2. Exécuter le script d’amorçage :
   ```bash
   npm run seed
   ```
3. Le script insère les deux adresses dans la table `invitations` avec le rôle `planner`.
4. Dès leur première connexion avec leur compte Google respectif, leur profil de planificateur est automatiquement activé.

---

## 6. Génération des clés VAPID pour les notifications Push

Pour permettre l’envoi de notifications Web Push (norme standard W3C) :

1. Générer une paire de clés VAPID en ligne de commande :
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Reporter les clés obtenues dans les variables d’environnement :
   ```env
   NEXT_PUBLIC_VAPID_PUBLIC_KEY="<clé publique générée>"
   VAPID_PUBLIC_KEY="<clé publique générée>"
   VAPID_PRIVATE_KEY="<clé privée générée>"
   VAPID_SUBJECT="mailto:contact@club-cj.org"
   ```

---

## 7. Automatisation des rappels de réunions

Pour envoyer automatiquement les rappels (la veille à 18 h 00 et le jour même 2 heures avant la réunion), deux options sont prévues :

### Option A : Tâche cron Vercel (Recommandée)
Le projet contient la configuration de cron intégrée dans `vercel.json` qui appelle la route d’API `/api/cron/reminders` toutes les 5 minutes (`*/5 * * * *`).
- Définir `CRON_SECRET` dans les variables d’environnement de Vercel.
- Vercel injecte l’en-tête `Authorization: Bearer <CRON_SECRET>` lors de chaque déclenchement automatique.

### Option B : Supabase `pg_cron` & Edge Function `send-reminders`
Si vous préférez exécuter les rappels directement depuis l’infrastructure Supabase :
1. Activer l’extension `pg_cron` dans le tableau de bord Supabase (**Database > Extensions**).
2. Déployer l’Edge Function `send-reminders` via le Supabase CLI :
   ```bash
   supabase functions deploy send-reminders
   ```
3. Programmer l’exécution toutes les 5 minutes dans `pg_cron` :
   ```sql
   select cron.schedule(
     'send-reminders-every-5-minutes',
     '*/5 * * * *',
     $$
     select
       net.http_post(
         url:='https://<id-projet>.functions.supabase.co/send-reminders',
         headers:=jsonb_build_object('Content-Type','application/json', 'Authorization', 'Bearer <ANON_KEY>')
       ) as request_id;
     $$
   );
   ```

---

## 8. Avertissement sur le niveau gratuit Supabase (Free Tier Pause)

> [!WARNING]
> Les projets hébergés sur le forfait gratuit de Supabase sont automatiquement mis en pause après **7 jours consécutifs d’inactivité** (aucune requête API reçue).
> - Si le projet est mis en pause, la connexion au site affichera une erreur de connexion à la base de données.
> - Pour réactiver le projet, connectez-vous au tableau de bord Supabase et cliquez sur **Restore Project**.
> - Pour éviter la mise en pause automatique pendant les périodes de vacances universitaires, la tâche cron toutes les 5 minutes (Section 7) effectue des requêtes régulières qui maintiennent le projet actif en continu.

---

## 9. Environnements de test et de production

Il est fortement recommandé d’utiliser deux environnements distincts :
1. **Environnement de test (Staging / Dev)** :
   - Un projet Supabase dédié de test (ex: `le-fil-cj-dev`).
   - URL Vercel de prévisualisation (`preview`).
   - Permet de dérouler le protocole complet `TESTS.md` sans polluer les données réelles du bureau.
2. **Environnement de production** :
   - Projet Supabase de production (`le-fil-cj-prod`).
   - Déploiement sur le domaine de production officiel.
   - Seuls les véritables membres du bureau sont invités.

---

## 10. Déploiement sur GitHub et Vercel

### Étape 1 : Dépôt GitHub
```bash
git add .
git commit -m "feat(phase-4): finition, sécurisation et mise en ligne Le Fil du bureau CJ"
git push origin master
```

### Étape 2 : Déploiement sur Vercel
1. Se connecter sur [Vercel](https://vercel.com) et importer le dépôt GitHub.
2. Déclarer toutes les variables d’environnement listées à la **Section 2**.
3. Cliquer sur **Deploy**.
4. Une fois déployé, vérifier dans Supabase (**Authentication > URL Configuration**) que l’URL de production est bien enregistrée dans **Site URL** et dans **Redirect URLs** (`https://<domaine-vercel>.vercel.app/auth/callback`).

---

## 11. Fonctionnalités PWA et Mode Hors Ligne

- **Service Worker v3** : met en cache les ressources fondamentales du shell (`/`, `/hors-ligne`, `/installer`, manifest, logo).
- **Page de secours** : en cas de perte de connexion, toute tentative de navigation est redirigée proprement vers `/hors-ligne`.
- **Bannière hors ligne** : informe l’utilisateur en direct (« Hors ligne : affichage des dernières données reçues »).
- **Protection des saisies** : les formulaires de réunions et de tâches sauvegardent automatiquement les brouillons dans le stockage local du navigateur (`localStorage`) pour éviter toute perte en cas de fermeture accidentelle ou de coupure réseau.
- **Invitation discrète d’installation** : une bannière discrète apparaît à la 2e visite (`club_cj_visit_count >= 2`), et peut être fermée en un clic.
- **Guide d’installation dédié** : accessible sur `/installer` avec instructions détaillées pour Android (Chrome) et iPhone/iPad (Safari).

---

## 12. Protocole de vérification de référence

Consultez le fichier [`TESTS.md`](file:///c:/Users/HP/Downloads/Club%20CJ%20-%20Identité%20Visuelle/04_Solutions%20web/00_Le%20fil/TESTS.md) pour exécuter pas à pas le scénario de test complet couvrant les 4 profils utilisateurs (P1, P2, M1, M2).
