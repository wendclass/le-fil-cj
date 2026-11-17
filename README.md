# Le Fil du bureau CJ

> **« Ce qu’on décide, on le suit. »**
> Plateforme de suivi du Club des étudiants en communication et journalisme de l’IPERMIC (Club CJ).
> **Phase 1 sur 4 : Fondations.**

---

## 1. Vue d’ensemble

« Le Fil du bureau CJ » résout le problème de désorganisation des instances étudiantes :
- Décisions prises en réunion tenues et suivies (responsable et échéance).
- Réunions cadrées de 45 minutes maximum.
- Validation transparente de l’information par l'ensemble des membres.
- Contrôle d'accès strict par liste blanche d'adresses Google invitées.

---

## 2. Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner les valeurs requises :

```bash
cp .env.example .env.local
```

| Variable | Portée | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Publique (Client & Serveur) | URL du projet Supabase (`https://<projet>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publique (Client & Serveur) | Clé publique anonyme du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secrète (Serveur & Amorçage)** | Clé de service Supabase (accès administrateur pour l'amorçage initial) |
| `NEXT_PUBLIC_SITE_URL` | Publique (Client & Serveur) | URL publique du site (ex: `http://localhost:3000` ou `https://le-fil-cj.vercel.app`) |
| `INITIAL_PLANNER_EMAILS` | Secrète (Script d’amorçage) | Deux adresses Google des planificateurs séparées par une virgule |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Publique (Client & Serveur) | Clé publique VAPID pour l'inscription push du navigateur |
| `VAPID_PUBLIC_KEY` | Serveur uniquement | Clé publique VAPID pour l'envoi de notifications Web Push |
| `VAPID_PRIVATE_KEY` | **Secrète (Serveur uniquement)** | Clé privée VAPID pour signer les requêtes Web Push |
| `VAPID_SUBJECT` | Serveur uniquement | Adresse de contact du club (`mailto:contact@club-cj.org`) |
| `CRON_SECRET` | Secrète (Serveur & Cron) | Clé secrète autorisant l'exécution périodique de `/api/cron/reminders` |

> [!CAUTION]
> Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` dans le code client ou sur le navigateur. Cette variable n'est utilisée que par le script d'amorçage sécurisé `scripts/seed-planners.ts`.

---

## 3. Configuration de l’authentification Google & Supabase

### A. Configuration du fournisseur Google dans la console Google Cloud
1. Créer ou ouvrir un projet dans la [Google Cloud Console](https://console.cloud.google.com/).
2. Configurer l'écran de consentement OAuth (usage externe).
3. Créer des identifiants **ID client OAuth 2.0** de type *Application Web*.
4. Renseigner l'URI de redirection autorisée fournie par Supabase :
   `https://<projet-supabase>.supabase.co/auth/v1/callback`
5. Récupérer l'**ID client** et le **Secret client**.

### B. Configuration dans le tableau de bord Supabase
1. Accéder à **Authentication > Providers > Google** dans votre projet Supabase.
2. Activer le fournisseur Google et saisir le `Client ID` et le `Client Secret`.
3. Dans **Authentication > URL Configuration** :
   - Définir la **Site URL** :
     - En développement : `http://localhost:3000`
     - En production : `{NEXT_PUBLIC_SITE_URL}` (ex: `https://le-fil-cj.vercel.app`)
   - Ajouter dans **Redirect URLs** les adresses suivantes :
     - `http://localhost:3000/auth/callback`
     - `{NEXT_PUBLIC_SITE_URL}/auth/callback` (ex: `https://le-fil-cj.vercel.app/auth/callback`)

---

## 4. Initialisation de la base de données & RLS

1. Exécuter les migrations SQL situées dans :
   - `supabase/migrations/20261117_init_schema.sql` (schéma initial, tables, fonctions de base et RLS)
   - `supabase/migrations/20261117_phase2_core_flow.sql` (fonctions d'approbation de priorité, publication de décisions, calculs d'échéances et mode direct)
   - `supabase/migrations/20261117_phase3_tracking_metrics.sql` (attribution de points, déblocage des badges, accusés de lecture et calcul des 5 indicateurs du club)
   directement dans le **SQL Editor** de Supabase ou via le Supabase CLI.
2. Cette migration :
   - Crée tous les types ENUM et l'ensemble des 16 tables.
   - Active la sécurité par ligne (**Row Level Security - RLS**) sur chaque table.
   - Définit les fonctions `is_member()`, `is_planner()`, `claim_invitation()`, et `update_task_status()`.
   - Garantit qu'un compte Google non invité n'a aucun profil et ne peut lire aucune ligne de données.

---

## 5. Amorçage des planificateurs initiaux

> [!IMPORTANT]
> Lors de la première installation, la base de données ne contient aucun membre ni planificateur. Aucun utilisateur ne peut accéder à `/equipe` tant que les planificateurs initiaux ne sont pas amorcés.

1. Renseigner dans `.env.local` :
   ```env
   INITIAL_PLANNER_EMAILS="adresse1@gmail.com,adresse2@gmail.com"
   ```
2. Exécuter le script d’amorçage :
   ```bash
   npm run seed
   ```
3. Le script vérifie la connexion administrateur et insère les deux adresses dans la table `invitations` avec le rôle `planner`.
4. Dès leur première connexion via le bouton « Continuer avec Google », leur profil planificateur sera automatiquement créé.

---

## 6. Lancement en local

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev
```

L'application est disponible à l'adresse [http://localhost:3000](http://localhost:3000).

---

## 7. Déploiement sur GitHub et Vercel

### Étape 1 : Dépôt GitHub
1. Initialiser le dépôt Git et commiter les fichiers :
   ```bash
   git init
   git add .
   git commit -m "feat: initialisation phase 1 fondations Le Fil du bureau CJ"
   ```
2. Créer un dépôt sur GitHub et pousser la branche principale :
   ```bash
   git remote add origin https://github.com/<organisation>/<depot>.git
   git branch -M main
   git push -u origin main
   ```

### Étape 2 : Déploiement sur Vercel
1. Se connecter à [Vercel](https://vercel.com) et cliquer sur **Add New > Project**.
2. Importer le dépôt GitHub créé à l'étape 1.
3. Dans la section **Environment Variables**, configurer :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (URL du domaine Vercel, ex: `https://le-fil-cj.vercel.app`)
   - `SUPABASE_SERVICE_ROLE_KEY` (si vous lancez des scripts en environnement de CI/CD)
4. Cliquer sur **Deploy**.
5. Une fois le déploiement terminé, retourner dans Supabase (**Authentication > URL Configuration**) et s'assurer que l'URL Vercel de production est bien déclarée dans **Site URL** et dans les **Redirect URLs** (`https://<votre-domaine>.vercel.app/auth/callback`).

---

## 8. Éléments de marque & Logos

- Le logo officiel doit être placé à l'emplacement :
  `/public/brand/club-cj-logo.png`
- Le pictogramme réduit (optionnel pour l'en-tête mobile) :
  `/public/brand/club-cj-mark.png`
- Les icônes PWA et favicons :
  `/public/brand/favicon.svg`, `/public/brand/icon-192.png`, `/public/brand/icon-512.png`

Si le logo est absent, l'application affiche un badge textuel conforme : `Logo Club CJ`.
