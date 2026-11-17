# Protocole de tests de bout en bout : Le Fil du bureau CJ

Ce document détaille le protocole de vérification complète de la plateforme « Le Fil du bureau CJ », couvrant le parcours complet de bout en bout entre quatre profils d’utilisateurs :
- **P1** : Premier chargé de planification
- **P2** : Deuxième chargé de planification
- **M1** : Premier membre
- **M2** : Deuxième membre

---

## 1. Matrice des comptes de test

| Identifiant | Rôle | Adresse Google de test | Description |
| :--- | :--- | :--- | :--- |
| **P1** | `planner` | `planificateur1@gmail.com` | Crée les réunions, lance le direct, publie les décisions, relance les membres. |
| **P2** | `planner` | `planificateur2@gmail.com` | Approuve la priorité du mois (« La Seule Chose ») et participe à la gestion. |
| **M1** | `member` | `membre1@gmail.com` | Confirme sa présence, propose un sujet, valide les décisions rapidement. |
| **M2** | `member` | `membre2@gmail.com` | Membre passif au départ (relances WhatsApp, délai de validation, tâche finale). |
| **X** | *Aucun* | `inconnu@gmail.com` | Compte Google non invité pour tester le rejet strict et l’écran d’accès restreint. |

---

## 2. Déroulement du scénario de référence (9 étapes)

### Étape 1 : Amorçage, invitations et restriction d’accès strict
1. **Amorçage des planificateurs** :
   - Renseigner `INITIAL_PLANNER_EMAILS="planificateur1@gmail.com,planificateur2@gmail.com"` dans `.env.local`.
   - Exécuter `npm run seed`.
   - Vérifier dans la table Supabase `invitations` que les deux entrées ont le statut `pending` et le rôle `planner`.
2. **Connexion de P1** :
   - Se connecter avec `planificateur1@gmail.com` via « Continuer avec Google ».
   - Constater l’écran de bienvenue puis la redirection vers `/`. Le rôle affiché dans le profil est « Planificateur ».
3. **Invitation des membres M1 et M2 par P1** :
   - P1 se rend sur `/equipe`.
   - Saisir `membre1@gmail.com` avec le rôle « Membre », valider.
   - Saisir `membre2@gmail.com` avec le rôle « Membre », valider.
   - Constater que les deux invitations apparaissent dans la liste « Invitations en attente ».
4. **Tentative de connexion par un compte non invité (X)** :
   - Ouvrir une fenêtre de navigation privée.
   - Cliquer sur « Continuer avec Google » avec `inconnu@gmail.com`.
   - **Résultat attendu** :
     - Redirection immédiate vers `/acces-restreint`.
     - L’écran affiche « Accès restreint au bureau », rappelle que la plateforme est réservée aux membres invités du Club CJ.
     - Un bouton de contact WhatsApp permet de contacter un planificateur pour demander une invitation.
     - Aucune donnée de réunion, tâche ou décision n’est accessible ni exposée par les requêtes réseau (sécurité RLS).

---

### Étape 2 : Priorité du mois (« La Seule Chose »)
1. **P1 propose la priorité** :
   - P1 se rend sur `/priorite`.
   - Saisir l’intitulé : « Réussir le grand reportage semestriel de l’IPERMIC ».
   - Saisir le motif : « Donner une visibilité concrète aux travaux des étudiants avant les examens ».
   - Valider.
   - Le statut passe à « En attente de l’autre planificateur ».
2. **P2 examine et valide** :
   - Se connecter avec `planificateur2@gmail.com` (P2).
   - Accéder à `/priorite`. Constater la proposition de P1 et le bouton « Approuver cette priorité ».
   - P2 clique sur « Approuver cette priorité ».
3. **Activation sur l’accueil** :
   - Retourner sur `/` avec P1, P2, M1 ou M2 : la bannière « La Seule Chose du mois » est active avec le badge ocre et l’intitulé validé.

---

### Étape 3 : Convocation de réunion et ordre du jour participatif
1. **Création de la réunion par P1** :
   - P1 clique sur « Convoquer une réunion » (`/reunions/nouvelle`).
   - Saisir la date : dans 8 jours à 16 h 00.
   - Saisir le lieu : « Salle de conférence IPERMIC ».
   - Saisir 3 points à l’ordre du jour :
     1. Approbation du compte-rendu précédent (5 min).
     2. Organisation du tournage du reportage (25 min).
     3. Point budget et logistique (15 min).
   - Constater que le total fait exactement 45 minutes.
   - Enregistrer.
2. **Notifications push reçues par M1 et M2** :
   - M1 et M2 (ayant activé les notifications dans leur profil) reçoivent une notification Web Push : « Nouvelle réunion convoquée : Réunion ordinaire ».
3. **Proposition d’un point par M1** :
   - M1 se connecte, ouvre la réunion dans `/reunions`.
   - Clique sur « Proposer un sujet à l’ordre du jour ».
   - Saisit : « Matériel photo manquant pour l’équipe 2 » (5 min).
   - Le statut du point est « En attente de validation ».
4. **Validation par P1** :
   - P1 ouvre la réunion, voit la suggestion de M1, clique sur « Accepter dans l’ordre du jour ».
   - Le point est intégré à la réunion.

---

### Étape 4 : Confirmation de présence et rappels automatiques
1. **Confirmation de M1** :
   - M1 clique sur « Je viens » sur la fiche de la réunion.
   - Le compteur de présences confirmées passe à 1.
2. **Silence de M2 et rappels programmés** :
   - M2 ne répond pas.
   - Vérifier via l’appel de test du cron `/api/cron/reminders` (ou exécution de `send-reminders`) :
     - À J-1 (18 h 00) : un rappel push est envoyé aux membres sans réponse.
     - À J-0 (H-2) : un second rappel push est envoyé.

---

### Étape 5 : Réunion en direct de 45 minutes chrono
1. **Démarrage par P1** :
   - Le jour de la réunion, P1 clique sur « Démarrer la réunion » (`/reunions/[id]/direct`).
   - L’en-tête du site affiche désormais la pastille rouge avec le point pulsant « Réunion en direct ».
2. **Suivi temps réel par M1** :
   - M1 consulte la page de la réunion ou l’accueil : les changements de points et le chronomètre s’actualisent en temps réel sans rechargement de page (Supabase Realtime).
3. **Appel des présences et saisie des décisions** :
   - P1 marque les présences (appel rapide).
   - P1 valide le déroulement des points.
   - P1 saisit deux décisions :
     - Décision 1 : « Réservation de 3 caméras au magasin de matériel », confiée à M2 avec échéance dans 5 jours, cochée comme contribuant à « La Seule Chose ».
     - Décision 2 : « Validation du synopsis par le secrétariat », confiée à P2 pour dans 3 jours.
4. **Clôture et publication** :
   - À la 42e minute (avant les 45 minutes fatidiques), P1 clique sur « Clôturer la réunion ».
   - P1 relit la synthèse et clique sur « Publier les décisions ».
   - La durée réelle est enregistrée (42 min) et la réunion est marquée comme terminée dans les délais.

---

### Étape 6 : Validation des décisions sous 48 heures
1. **Validation immédiate par M1** :
   - M1 se rend sur `/decisions`.
   - Il consulte les deux décisions publiées et clique sur « Valider cette décision » pour chacune d’elles.
   - La mention « Tu as validé le [date] » s’affiche.
2. **Délai et expiration pour M2** :
   - M2 ne se connecte pas pendant 48 heures.
   - Après 48 heures, sur `/decisions/[id]`, M2 apparaît dans la liste rouge « N’ont pas encore validé ».
   - Le badge « Délai dépassé » est visible sur les décisions non validées à temps.

---

### Étape 7 : Suivi des tâches, non-lecture et relance WhatsApp
1. **Détection de la tâche non consultée** :
   - La décision 1 a généré automatiquement une tâche assignée à M2 sur `/taches`.
   - M2 n’a pas ouvert la plateforme pendant 24 heures : la tâche apparaît dans la section « Tâches non vues » de l’accueil du planificateur P1.
2. **Relance en un clic sur WhatsApp** :
   - P1 clique sur le bouton « Relancer sur WhatsApp » à côté du nom de M2.
   - WhatsApp s’ouvre avec un message prérempli personnalisé :
     « Salut [Prénom], tu as une tâche sur Le Fil du bureau CJ : "Réservation de 3 caméras au magasin de matériel", à rendre pour le [Date]. Tout est bon pour toi ? »

---

### Étape 8 : Réalisation de la tâche et gamification
1. **M2 prend en charge la tâche** :
   - M2 se connecte, ouvre `/taches`.
   - Il déplace la tâche vers « En cours », puis clique sur « Marquer comme terminée » avant l’échéance.
2. **Attribution des récompenses** :
   - Le statut passe à « Terminé dans les délais ».
   - Un toast de félicitations s’affiche : « +10 points pour ponctualité ! ».
   - Le compteur de points de M2 passe de 0 à 10.
   - Sa série active passe à 1.
   - Le badge « Première tâche » est débloqué et s’affiche avec sa pastille dorée sur son profil (`/profil`).

---

### Étape 9 : Vérification de la cohérence des 5 indicateurs
P1 et P2 ouvrent la page `/indicateurs` :
1. **Réunions à l’heure** : `100 %` (1 réunion tenue sur 1 programmée, sans dépassement des 45 min).
2. **Durée moyenne des réunions** : `42 min` (inférieure au plafond de 45 min, tendance verte).
3. **Taux de présence** : `100 %` (les membres présents enregistrés lors de l’appel).
4. **Décisions validées sous 48 h** : `50 %` (M1 a validé dans les 48 h, M2 est hors délai).
5. **Tâches terminées dans les délais** : `100 %` (1 tâche terminée sur 1, sans retard).

---

## 3. Tests des cas limites et de résilience

### A. Test hors ligne (PWA & Service Worker)
1. Ouvrir l’application dans Chrome ou Firefox.
2. Ouvrir les DevTools > onglet Réseau > cocher « Hors ligne ».
3. **Bannière d’avertissement** : la bannière orange « Hors ligne : affichage des dernières données reçues » apparaît immédiatement en haut de l’écran.
4. **Navigation hors ligne** : naviguer vers une page non mise en cache : la page de secours stylisée `/hors-ligne` s’affiche avec le logo Club CJ et un bouton « Vérifier la connexion ».
5. **Sauvegarde locale des brouillons** :
   - Remplir partiellement le formulaire d’une réunion ou d’une tâche.
   - Recharger la page ou fermer l’onglet sans valider.
   - Rouvrir : les champs saisis sont automatiquement restaurés depuis `localStorage`.
   - Une alerte `beforeunload` prévient l’utilisateur s’il tente de quitter un formulaire non soumis.

### B. Test des pages d’erreur (404 et 500)
1. Naviguer vers une URL inexistante comme `/page-qui-n-existe-pas`.
   - **Résultat** : la page 404 personnalisée s’affiche (`app/not-found.tsx`), avec le logo du club, le message « Page introuvable » et un bouton de retour à l’accueil.
2. Simuler une erreur de rendu inattendue.
   - **Résultat** : le composant de secours `app/error.tsx` (ou `app/global-error.tsx`) capture l’exception sans écran blanc et propose un bouton « Réessayer ».

### C. Test de protection des planificateurs (Sécurité SQL)
1. Se connecter avec le compte P1 sur `/equipe`.
2. Tenter de retirer son propre accès :
   - L’interface désactive le bouton et affiche « Tu ne peux pas retirer ta propre invitation ».
3. Si un appel API tente de supprimer le profil ou l’invitation du dernier planificateur :
   - Le déclencheur PostgreSQL `trg_prevent_last_planner_removal` lève l’exception `Impossible de supprimer le dernier planificateur du club`.

### D. Test du débit limite des notifications push de test
1. Ouvrir `/profil` et cliquer plus de 5 fois de suite sur « Tester la notification ».
2. À la 6e tentative dans l’heure :
   - L’API `/api/push/test` renvoie un code HTTP 429 (« Limite atteinte : maximum 5 notifications de test par heure »).
   - L’interface informe l’utilisateur avec bienveillance.
