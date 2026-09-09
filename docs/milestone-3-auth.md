# Milestone 3 — Authentication & User Session

Audit final du 9 septembre 2026 sur `feature/add-auth`.

**M3 STATUS: GO.** Les trois blocages de l'audit initial sont corrigés et
couverts par les régressions automatiques décrites ci-dessous. Les parcours
manuels réels validés par l'utilisateur restent consignés séparément ; ils
n'ont pas été rejoués avec Supabase réel pendant cette correction. Aucun commit
ni merge effectué, aucune nouvelle fonctionnalité métier.

## Corrections des trois blocages

1. **Isolation de session.** `usePrivateSession` maintient l'identité de session
   et une version qui change à chaque transition A/B/logout. La transition
   purge les clés `private-` immédiatement et `app.vue` recrée `NuxtPage` pour
   détruire aussi les brouillons, fichiers et résultats locaux de page.
   `useAuth` invalide les anciens `/me` par un numéro de requête ; le client API
   rejette les réponses de la session précédente et ne rejoue jamais sous B
   une requête partie sous A. Une mutation déjà reçue par le serveur ne peut
   pas être annulée rétroactivement ; elle reste rattachée à l'identité A
   vérifiée par NestJS, et sa réponse n'est pas réinjectée dans l'interface B.
2. **Destination du Bearer.** `useTripdexApi` refuse les URL absolues, chemins
   réseau, espaces et antislashs avant toute lecture de session ou requête.
   L'URL résolue doit rester dans l'origine et le chemin de base de l'API.
   Les redirections HTTP sont refusées et un header Authorization fourni par
   l'appelant est remplacé par l'access token du SDK, ou supprimé sans session.
3. **Routes privées.** Le middleware est désormais `auth.global.ts`. Il attend
   la restauration côté navigateur et redirige les anonymes vers `/login`.
   Le SSR diffère ce contrôle car la session réside dans le navigateur, sans
   rendre de données privées côté serveur. Explorer reste public. Les erreurs
   temporaires Auth ne déclenchent pas une redirection de déconnexion.

La suite `test/unit` exécute les vrais composables avec doubles des frontières
Nuxt/Supabase/HTTP et le vrai `app.vue` compilé avec un renderer Vue en mémoire.
Elle couvre les réponses tardives, changements de compte, logout multi-onglets,
redirections, retry 401 borné et destruction de l'état local des pages.

## Architecture Auth implémentée

Le client public Supabase est centralisé dans `supabase.client.ts`, avec
persistance, renouvellement automatique et PKCE. `useAuth` centralise inscription,
connexion, déconnexion, session et provisioning. Aucun appel direct au SDK
Supabase n'est dispersé dans les composants.

`useTripdexApi` obtient l'access token auprès du SDK et le transmet en Bearer.
Aucun refresh token n'est envoyé à NestJS. L'état Auth Nuxt contient un
instantané d'expiration, le statut et le profil TripDex ; l'état privé client
ajoute l'identité Auth et la version de session pour invalider les requêtes.
Les tokens restent dans la session du SDK navigateur.

`AuthGuard` valide le Bearer, appelle `SupabaseAuthService.verifyAccessToken()`,
puis `UsersService.resolveOrCreateUser()`. `getUser(accessToken)` vérifie
l'identité auprès du projet Supabase configuré. Les comptes anonymes, sans
email confirmé ou avec ID Auth invalide sont refusés. Le client serveur ne
persiste pas de session et ne renouvelle pas de token.

Un symbole interne porte l'utilisateur résolu ; `@CurrentUser()` l'injecte
dans les controllers. Les services métier reçoivent `User.id`, sans objets
Request/Response Express ni tokens. Controllers fins, DTO explicites,
repositories de persistance et mappers purs sont conservés. Aucun Prisma dans
les controllers ni abstraction manifestement prématurée identifiée.

La chaîne Auth/provisioning expose des erreurs contrôlées : 401 pour une
identité invalide, 409/422 pour les conflits ou usernames, 503 pour une
indisponibilité. Les détails techniques, tokens et secrets ne sont ni exposés
dans ces réponses ni loggés. Les logs Storage existants utilisent les chemins
d'objets, pas les clés ni les URLs signées.

## User.id, supabaseAuthId et provisioning lazy

`User.id` reste la clé métier d'ownership. `User.supabaseAuthId` est un UUID
nullable et unique reliant une identité Supabase vérifiée au compte métier.
Il n'est jamais présent dans les DTO HTTP. `GET /me` renvoie uniquement `id`,
`email` et `username`.

La migration `20260908T2156_user_supabase_auth_id` ajoute la colonne et sa
contrainte sans réattribuer les comptes historiques. Les preuves de préflight
conservées dans `artifacts/m3-preflight` documentent les contrôles avant/après
et la conservation des six tables métier hors nouvelle colonne. La vérification
Prisma stricte du schéma réel a été renouvelée pendant cet audit.

Le provisioning intervient au premier appel protégé, généralement `/me`, après
confirmation Auth. Le service cherche d'abord par l'ID Auth vérifié. Un compte
déjà lié conserve son ID, son email et son username DB, quelles que soient les
métadonnées modifiées ensuite. Sinon, le service valide le username et crée le
profil. Les contraintes PostgreSQL tranchent les collisions.

Après un échec de création, une relecture uniquement par ID Auth récupère une
création concurrente ou une réponse perdue. Aucune liaison automatique par
email/username, aucun cache d'échec, aucune suppression du compte Supabase.
Une indisponibilité reste retentable.

## Username

L'inscription transmet `user_metadata.username`. Cette métadonnée modifiable
est une saisie de profil, jamais une preuve d'identité, de rôle ou d'ownership.
Le backend applique trim, minuscules, puis 3 à 30 caractères ASCII parmi
lettres, chiffres et `_`. Aucun username n'est généré.

| Code                            | Réponse                                       |
| ------------------------------- | --------------------------------------------- |
| `USERNAME_REQUIRED`             | 422, demander un username                     |
| `USERNAME_INVALID`              | 422, corriger le username                     |
| `USERNAME_TAKEN`                | 409, choisir un autre username                |
| `ACCOUNT_LINK_CONFLICT`         | 409, assistance sans rattachement automatique |
| `USER_PROVISIONING_UNAVAILABLE` | 503, réessayer sans détail interne            |

`/auth/username` met à jour la métadonnée via le SDK puis rappelle `/me`.
La redirection automatique de récupération couvre surtout `USERNAME_TAKEN` ;
`USERNAME_REQUIRED` et `USERNAME_INVALID` ne sont pas raccordés de façon
équivalente. Un conflit email exige une intervention ; aucune fusion de comptes
n'est implémentée.

## Session Nuxt

`initialize()` lit `getSession()` puis charge `/me`. Le listener traite
connexion, déconnexion et refresh. Un 401 autorise un refresh et une seconde
tentative seulement ; `$fetch` utilise `retry: 0`. Un 503 ou une erreur réseau
ne déclenche pas `signOut()` dans le wrapper.

Le logout explicite invalide les requêtes et efface les données avant d'attendre
`signOut()`. Un refresh pendant la déconnexion ne restaure pas l'ancien profil.
Un échec de déconnexion est signalé par un message contrôlé. Les événements
`SIGNED_OUT` et changements d'identité appliquent la même purge. Un refresh du
même compte conserve les données et ne redémarre pas un `/me` déjà en cours,
ce qui évite une boucle de refresh au-delà du retry borné du wrapper.

Le plugin `auth-init` dépend explicitement du plugin nommé `supabase`.
Le listener est installé avant la lecture initiale de session ; son traitement
invalide les données immédiatement et diffère les appels SDK hors du callback
Supabase. La reprise automatique complète du profil après indisponibilité reste
limitée : un nouveau login ou événement de session peut relancer le provisioning.

## Routes et isolation

| Surface                                                     | Accès constaté                                     |
| ----------------------------------------------------------- | -------------------------------------------------- |
| API `GET /`, `GET /countries`, `GET /cities`                | Public                                             |
| API `GET /me`                                               | Bearer vérifié et provisioning                     |
| API `POST /trips`                                           | Bearer vérifié, identité serveur                   |
| API `GET /me/trips`, `GET /me/trips/:id`                    | Bearer et ownership                                |
| API `GET /me/visited-countries`                             | Bearer et filtrage utilisateur                     |
| API `PUT/DELETE /me/trips/:id/cover`                        | Bearer, ownership avant Storage                    |
| Web `/` (Explorer), `/login`, `/register`, `/auth/callback` | Public                                             |
| Web `/auth/username`                                        | Récupération du provisioning pour une session Auth |
| Web `/journal`, `/trips/:id`, `/profile`                    | Middleware global, session navigateur              |

Aucune route personnelle API n'utilise l'identité dev ou un fallback silencieux.
Un `userId` frontend ne devient jamais source d'ownership. Le pipe de création
rejette les champs non prévus. Les repositories filtrent voyages et pays
visités par `User.id`. Les revisites sélectionnent en DB les voyages antérieurs
de cet utilisateur, puis leurs liens pays. Les lectures des jonctions partent
des voyages déjà autorisés.

Les covers vérifient le voyage et le préfixe propriétaire avant Storage.
Un échec d'ownership arrête upload/delete/cleanup. Les tests A/B et l'assertion
d'absence de cleanup sont conservés. La signature d'URL intervient après la
lecture autorisée du voyage et la validation de son chemin.

## Variables d'environnement

Noms uniquement, sans valeur de secret :

- API : `DATABASE_URL`, `HOST`, `PORT`, `WEB_ORIGIN`, `NODE_ENV`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_TRIP_COVERS_BUCKET`.
- Nuxt public : `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_SUPABASE_URL`,
  `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Historique local : `DEV_AUTH_ENABLED`, sans effet sur les routes M3.
- Tests : `RUN_STORAGE_INTEGRATION`, `WEB_TEST_URL`, `API_TEST_URL`,
  `PLAYWRIGHT_CHANNEL`.

La service-role key reste exclusivement côté API. Aucun branchement vers le
runtimeConfig public Nuxt n'a été trouvé. Les fichiers d'environnement privés
sont ignorés par Git ; Nuxt utilise la clé publique.

## Callback Supabase

Configurer la Site URL de l'application et autoriser l'URL exacte de son origine
suivie de `/auth/callback` dans les Redirect URLs de Supabase Auth. Prévoir les
origines de développement et de déploiement. L'inscription construit
`emailRedirectTo` avec l'origine du navigateur et ce chemin. La confirmation
email est activée dans le parcours manuel validé.

Le SDK navigateur, configuré en PKCE et avec détection de session dans l'URL,
échange le code ; NestJS reçoit uniquement l'access token ensuite. Le retour
doit disposer du vérificateur PKCE dans le contexte navigateur. Le callback
charge `/me`, puis ouvre le journal ou le parcours username. La branche sans
confirmation email existe, mais n'appartient pas aux tests manuels déclarés.

## CurrentUserService

`CurrentUserService` et son module sont conservés. Aucun module applicatif ne
les importe désormais. Le service garde ses tests historiques et une référence
dans `test/covers.storage.integration.mjs`. Ce workflow utile est déjà
incompatible avec M3 : `app.get(CurrentUserService)` ne peut plus le résoudre,
et les requêtes privées ne transmettent pas de Bearer.

Il faudra adapter ce test Storage à une identité de test et au guard Auth, puis
décider de supprimer le service historique. Il ne faut pas restaurer l'identité
dev dans les routes. `DEVELOPMENT_USER` reste utile au seed et au test DB ; ce
n'est pas un fallback HTTP. `docs/trip-covers.md` décrit le jalon antérieur sans
Supabase Auth ; ce document remplace ses affirmations d'identité pour M3.

## Validation automatique du 9 septembre 2026

Depuis la racine sauf mention contraire :

La nouvelle commande `npm run test:unit --workspace=web` réussit : **30 tests**
AAA répartis dans quatre fichiers, avec Node Test Runner et les dépendances
TypeScript/Vue déjà présentes. Aucun navigateur ni nouvelle dépendance requis.
Playwright exclut ce dossier pour ne pas collecter les tests du runner Node.

| Vérification                                                                       | Résultat                                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `npm run test --workspace=api -- --runInBand --no-cache`                           | 13 suites, 102 tests réussis                                  |
| `npm run test:e2e --workspace=api`                                                 | 4 suites, 29 tests réussis                                    |
| `node --test test/database.integration.mjs` dans `apps/api`                        | 1 test réussi : isolation, revisites, covers, rollback        |
| `node --test test/users.integration.mjs` dans `apps/api`                           | 5 tests réussis : provisioning, contraintes, historiques      |
| `npm run typecheck --workspace=api`                                                | Réussi, strict activé                                         |
| `npm run build --workspace=api`                                                    | Réussi                                                        |
| ESLint ciblé sur Auth, Users, fichiers Trips M3 et e2e modifiés                    | Réussi                                                        |
| `node ../../node_modules/prisma/dist/prisma.js db verify --strict` dans `apps/api` | Réussi, schéma conforme sans avertissement                    |
| `npm run typecheck --workspace=web`                                                | Réussi                                                        |
| `npm run build --workspace=web`                                                    | Réussi                                                        |
| Prettier ciblé sur tous les fichiers web M3                                        | Réussi                                                        |
| `npm run test:e2e --workspace=web -- --max-failures=1`                             | Chromium absent : 1 échec au lancement, 13 tests non exécutés |

Les validations API ont été relancées après correction. Les six tests DB ont
été exécutés ensemble avec `node --test --test-concurrency=1
test/database.integration.mjs test/users.integration.mjs` depuis `apps/api`.
Un premier accès a été refusé par la sandbox (EACCES), puis la relance autorisée
a réussi. L'audit initial avait aussi rencontré des échecs mémoire/crash Node
résolus par des relances séparées. Nuxt émet un avertissement de dépréciation
de dépendance, sans échec de build.

Les trois nouvelles suites unitaires Auth/Users respectent explicitement
Arrange/Act/Assert. Aucun test unitaire préexistant n'est modifié par M3. Les
tests Auth, provisioning et isolation A/B sont conservés. Aucun nouveau `any`
ou double cast de contournement trouvé dans le code M3. Les assertions frontend
sur la forme des erreurs pourraient être resserrées ; le mode strict n'est pas
affaibli. Les DTO et doubles backend sont typés.

Limites : aucun runner unitaire frontend n'était configuré avant M3 ; le runner
Node couvre désormais les régressions Auth. Les tests Playwright
historiques n'établissent pas encore de session M3 et certains appellent l'API
privée sans Bearer ; installer Chromium seul ne suffirait pas à certifier Auth.
Le test Storage réel n'a pas été lancé pour les raisons décrites plus haut.
Le test seed n'a pas été relancé car il réécrit les référentiels réels ; les
tests DB retenus annulent leurs fixtures par rollback. La course de provisioning
est testée avec doubles, pas avec deux connexions PostgreSQL committant
simultanément. Ces limites ne bloquent pas à elles seules la clôture de M3.

## Validations manuelles déclarées

Validées par l'utilisateur avec Supabase réel avant cet audit, sans prétendre
les avoir rejouées pendant cette passe :

- Inscription User A, confirmation email et callback PKCE.
- Provisioning via `GET /me`, login, restauration après F5 sur `/journal`.
- Création et lecture des données personnelles, isolation réelle A/B.
- Japan 2025 de B n'influence pas la revisite Japan 2026 de A.
- Cover persistante après reconnexion.
- A → logout → B sans fuite/flash dans le parcours testé.
- Mauvais mot de passe correctement géré.
- Accès anonymous à `/journal` redirigé vers `/login`.
- Explorer reste public.

La divergence initiale entre la redirection déclarée et le middleware du
checkout est corrigée et couverte automatiquement. Un smoke test réel de F5,
callback et A → logout → B sur le build final reste recommandé ; cette passe
ne prétend pas avoir rejoué ces parcours avec de vrais comptes Supabase.

## Nettoyage et Git

Suppression du paramètre `tripId` inutilisé de `findRevisitedCountryIds` et de
son argument d'appel. Suppression des dix caches temporaires `artifacts/jest-m3*`.
Conservation des preuves de migration, fixtures et outils historiques utiles.
Aucun refactor global, normalisation CRLF, nouvelle feature ou changement de
secret. Les fichiers générés de contrat/migration restent requis.

Diff final inspecté : `git diff --check` réussi, index sans changement staged.
Le scan des fichiers modifiés/nouveaux n'a trouvé aucun des motifs de secrets
testés (JWT, clé secrète Supabase, clé privée, URL PostgreSQL avec mot de passe).
Ce contrôle par motifs complète la revue du flux de configuration.

Les corrections Auth et leurs régressions sont incluses dans le plan de commits.
La branche constatée est `feature/add-auth` ; la branche demandée pour la suite est
`feature/auth-user-session`. Destination future : `develop`, jamais `master`
à ce stade. Aucun commit, changement de branche ou merge exécuté.

## Plan de commits proposé, non exécuté

Depuis la racine du dépôt, après revue du diff :

```powershell
git branch -m feature/auth-user-session

git add -- apps/api/package.json apps/web/package.json package-lock.json
git commit -m "chore(deps): prepare Supabase authentication tooling"

git add -- apps/api/migrations apps/api/src/prisma/contract.prisma apps/api/src/prisma/contract.json apps/api/src/prisma/contract.d.ts apps/api/src/users apps/api/test/users.integration.mjs apps/api/tsconfig.json
git commit -m "feat(api): add lazy TripDex user provisioning"

git add -- apps/api/src/auth apps/api/src/trips apps/api/src/app.module.ts apps/api/test/me.e2e-spec.ts apps/api/test/trips.e2e-spec.ts apps/api/test/covers.e2e-spec.ts apps/api/test/database.integration.mjs
git commit -m "feat(api): protect personal routes with verified authentication"

git add -- apps/web/app apps/web/nuxt.config.ts apps/web/.env.example apps/web/playwright.config.ts apps/web/test/unit
git commit -m "feat(web): add isolated authentication sessions with regression tests"

git add -- docs/milestone-3-auth.md
git commit -m "docs(auth): document M3 architecture and final validation"
```

Le premier commit prépare les dépendances et commandes de test ; la suite
frontend correspondante arrive avec le commit web. Les corrections de sécurité
et leurs régressions restent ensemble. Aucune commande de merge n'est exécutée.
