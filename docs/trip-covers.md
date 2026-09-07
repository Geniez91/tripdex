# Covers de voyages — configuration et validation

## Action manuelle dans Supabase

Dans le dashboard du projet associé à PostgreSQL :

1. Ouvrir **Storage → New bucket**, nommer le bucket `trip-covers`.
2. Laisser **Public bucket désactivé** : ce bucket doit être **privé**, de type standard.
3. Dans les réglages du bucket, limiter la taille à **5 242 880 octets (5 Mio)** et
   les MIME à **`image/jpeg`, `image/png`, `image/webp`**. La limite globale de
   Storage doit autoriser au moins cette taille. Ne pas autoriser `image/*`.
4. Dans **Storage → Policies**, ne créer aucune policy donnant accès à ce bucket
   aux rôles `anon` ou `authenticated`. Vérifier que d'éventuelles policies
   générales existantes ne donnent pas accès à tous les buckets. NestJS utilise
   la service-role key, qui contourne RLS ; l'ownership est donc contrôlé dans NestJS.
5. Copier l'URL du projet depuis **Connect** (ou les réglages API) et la clé
   **service_role** depuis **Project Settings → API Keys → Legacy anon, service_role API keys**
   dans `apps/api/.env` uniquement :

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=VALEUR_LOCALE_UNIQUEMENT
   SUPABASE_TRIP_COVERS_BUCKET=trip-covers
   ```

6. Redémarrer NestJS. Aucune variable Supabase n'est nécessaire dans Nuxt.

Le code ne crée et ne modifie aucun bucket ni policy. Sans configuration, les
voyages sans cover fonctionnent et l'upload renvoie une erreur lisible. Un bucket
public est refusé avant tout upload.

Références : [buckets privés et restrictions](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[contrôle d'accès et service key](https://supabase.com/docs/guides/storage/security/access-control),
[URL signées](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl).

## Architecture

- Nuxt crée le voyage via `POST /trips`, puis transmet le fichier en multipart à
  `PUT /me/trips/:id/cover` (champ `cover`, aucun autre champ accepté).
- `CurrentUserService` est la seule source d'identité. L'identité de développement
  reste partagée et strictement limitée au mode local existant ; Supabase Auth
  est reporté à un autre incrément.
- NestJS vérifie le propriétaire, la limite de 5 Mio, le MIME et la signature
  binaire JPEG/PNG/WebP. Cette vérification de signature n'est pas un décodage
  complet de l'image. SVG et autres formats sont refusés.
- Le serveur génère `users/{userId}/trips/{tripId}/cover/{uuid}.{extension}`.
  Le nom du fichier client n'est jamais utilisé. Les identifiants et les chemins
  persistés sont contrôlés avant leur utilisation dans Storage.
- PostgreSQL conserve exclusivement `Trip.coverStoragePath`, nullable. Le contrat
  Prisma et les migrations restent inchangés. `POST /trips` refuse désormais
  tout champ `coverStoragePath`, même `null`.
- `GET /me/trips` et `GET /me/trips/:id` ajoutent `coverUrl`, signée pour **900 s**.
  Sans cover, avec un objet manquant ou une erreur de signature, `coverUrl` vaut
  `null`. Le chemin reste conservé pour diagnostic et remplacement. Ces réponses
  portent `Cache-Control: private, no-store`. Recharger la page renouvelle les URL.
- La nouvelle image est envoyée sans écrasement, son existence est vérifiée,
  puis une URL signée est obtenue avant la mise à jour DB. La mise à jour compare
  aussi l'ancien chemin : un changement concurrent renvoie `409` et le nouvel
  objet inutilisé est nettoyé. L'ancienne cover est supprimée après cette écriture.
- `DELETE /me/trips/:id/cover` contrôle le propriétaire, détache conditionnellement
  la cover en DB puis supprime l'objet. Sans cover, cette opération est idempotente.
- En cas d'échec de l'upload dans le formulaire, les champs restent affichés et
  verrouillés puisque le voyage est déjà enregistré. La photo reste sélectionnée ;
  réessayer renvoie uniquement cette photo. Retirer la sélection permet de terminer
  sans cover. La page de détail permet ensuite remplacement et suppression.

## Limites et nettoyage

Storage et PostgreSQL ne partagent pas de transaction atomique. Les compensations
sont tentées immédiatement, avec trois tentatives de suppression. Si elles
échouent, le serveur journalise `Cover cleanup required: {path}` et une opération
réussie renvoie `cleanupPending: true`. Un crash entre upload et écriture DB, ou
entre écriture et nettoyage, peut aussi laisser un objet orphelin.

Si l'accusé de réception DB est perdu, le serveur relit le voyage avant tout
nettoyage pour ne pas supprimer une cover qui aurait été enregistrée. Si cette
lecture échoue, il journalise `Cover reconciliation required: {path}`. Ne supprimer
manuellement un objet qu'après avoir vérifié qu'aucun `Trip.coverStoragePath` ne
le référence et qu'aucun upload n'est en cours. Aucune suppression automatique
globale ni migration n'est introduite.

Une URL signée déjà délivrée est un lien temporaire partageable ; elle ne doit
pas être journalisée ni persistée. L'UI masque les images dont le chargement échoue.
La sélection locale et l'ID du voyage créé sont conservés pendant la vie du
formulaire, pas après fermeture ou rechargement de la page. Une réponse perdue
du `POST /trips` reste une création non confirmée, comme dans l'incrément précédent.

## Validation après configuration manuelle

1. Créer un voyage sans photo : journal et détail s'affichent sans image cassée.
2. Créer un voyage avec une petite image PNG/JPEG/WebP : aperçu, état d'envoi,
   puis image visible dans le journal et le détail.
3. Vérifier dans Storage le chemin généré et dans PostgreSQL la présence du
   seul chemin, jamais d'une URL ni d'un token.
4. Remplacer la cover dans le détail : nouveau chemin et suppression de l'ancien
   objet. Supprimer ensuite la cover : champ DB `null`, objet supprimé.
5. Vérifier les refus MIME/taille et que le bucket n'est pas accessible via une
   URL publique. Les tests automatiques couvrent l'isolation avec plusieurs
   identités simulées, sans intégrer Supabase Auth.

Les tests unitaires et HTTP utilisent un Storage simulé. Le test PostgreSQL utilise
le vrai runtime Prisma et annule ses fixtures par transaction ; Storage y reste
simulé. Les tests Playwright `covers.spec.ts` interceptent l'API et ne créent aucun
objet Supabase. Aucun test sur Storage réel ne doit être lancé avant la création
manuelle du bucket et la configuration serveur.

Après configuration, le test réel peut être exécuté explicitement depuis
`apps/api` (PowerShell) :

```powershell
$env:RUN_STORAGE_INTEGRATION='true'
$env:NODE_ENV='development'
npm run test:storage
```

Ce test passe par NestJS avec le vrai `CurrentUserService`, PostgreSQL et Storage.
Ses données PostgreSQL sont annulées par transaction et ses objets Storage sont
nettoyés. Il contrôle les restrictions du bucket, le refus du téléchargement
public, les signatures, l'ownership, le remplacement et les objets manquants.
Les exceptions réseau sont résumées par étape, sans afficher les requêtes ni les
secrets. La configuration serveur est chargée par l'application ; le test
n'inspecte jamais la valeur de la clé.

Pour inclure le parcours navigateur réel `covers.live.spec.ts`, démarrer API et
Nuxt puis lancer depuis la racine :

```powershell
$env:RUN_STORAGE_INTEGRATION='true'
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:e2e --workspace=web
```

`WEB_TEST_URL` et `API_TEST_URL` permettent de choisir les adresses des serveurs.
Nuxt doit utiliser la même API via `NUXT_PUBLIC_API_BASE`. Aucun secret serveur
n'est nécessaire dans l'environnement du navigateur. Ce parcours crée et conserve
un voyage de démonstration `Cover validation ...`, puis supprime sa cover. Le test
historique conserve aussi son voyage `Japan 2026`.

## Fichiers de cet incrément

- API, dans `apps/api/src/trips/` : `cover-file.ts`, `cover-storage.service.ts`,
  `trip-covers.service.ts`, `trip-covers.controller.ts`, `create-trip.pipe.ts`,
  `trips.service.ts`, `trips.module.ts`, `trips.journal.controller.ts`.
- Tests API : `src/trips/cover-storage.service.spec.ts`,
  `src/trips/trip-covers.service.spec.ts`, `src/trips/create-trip.pipe.spec.ts`,
  `test/covers.e2e-spec.ts`, `test/trips.e2e-spec.ts`, `test/database.integration.mjs`,
  `test/covers.storage.integration.mjs`.
- Nuxt, dans `apps/web/` : `app/components/CoverPicker.vue`,
  `app/components/TripCover.vue`, `app/components/TripForm.vue`,
  `app/pages/journal.vue`, `app/pages/trips/[id].vue`, `app/types/tripdex.ts`,
  `test/covers.spec.ts`, `test/covers.live.spec.ts`, `test/creation-flow.spec.ts`.
- Configuration et documentation : `apps/api/.env.example`, `apps/api/package.json`,
  `package-lock.json`, `README.md`, `docs/trip-covers.md`.

## Rapport après configuration — 8 septembre 2026

Toutes les validations sont réussies :

| Validation | Résultat |
| --- | --- |
| TypeScript API et Nuxt | OK |
| ESLint API et formatage | OK |
| Builds API et Nuxt | OK |
| Tests unitaires | 58/58 |
| Tests HTTP NestJS | 18/18 |
| Vérification PostgreSQL / contrat Prisma | Conforme, sans avertissement de schéma |
| Intégration PostgreSQL et idempotence du seed | 2/2 au dernier passage |
| Intégration réelle NestJS / PostgreSQL / Supabase Storage | 1/1 |
| Playwright Chrome | 14 scénarios validés, dont le parcours Storage réel |

Le bucket `trip-covers` a été vérifié privé, avec une limite positive au plus
égale à 5 Mio et les trois MIME prévus. Un téléchargement public de l'objet de
test est refusé ; son téléchargement signé fonctionne. Le contrôle ne crée ni
ne modifie le bucket ou ses policies. L'isolation est vérifiée par l'ownership
NestJS avec le véritable `CurrentUserService`, sans Supabase Auth.

Le test réel confirme : création sans cover, upload valide, refus des fichiers
invalides/trop gros et des champs client non autorisés, refus d'un voyage appartenant
à un autre utilisateur, stockage du seul chemin en DB, lecture journal/détail,
remplacement et suppression de l'ancien objet, objet manquant et suppression.
Les erreurs Storage et les conflits/accusés DB perdus sont couverts par les tests
simulés. Le navigateur confirme également l'affichage réel, le rechargement et
l'absence de débordement mobile dans le détail.

Deux incidents de validation ont été résolus :

- Le premier passage du test de seed a ajouté les **15 villes** attendues,
  absentes de cette base. Le second passage confirme son idempotence ; les voyages
  et associations existants sont conservés. Aucun changement du code du seed.
- Le premier parcours Chrome réel a échoué sur le chargement réseau de l'image
  sous sandbox (13 autres scénarios passaient). Sa relance avec l'accès réseau
  autorisé réussit. Aucun correctif de l'UI n'a été nécessaire.

Les tests Storage avec transaction ont annulé leurs données PostgreSQL et nettoyé
leurs objets. Les tests navigateur conservent trois voyages de démonstration :

- `b5861a73-68b4-461b-be69-832a40267752` : premier essai cover sous sandbox ;
- `ac0f9621-60c0-4966-97e1-471efaada64c` : parcours historique `Japan 2026` ;
- `261134ee-8617-48a5-a06b-743363e62877` : parcours cover réel réussi.

Leurs `coverStoragePath` et `coverUrl` ont été vérifiés `null` après nettoyage.
Aucun voyage existant n'a été supprimé. Aucun secret réel n'a été consulté,
affiché ou ajouté aux fichiers Git ; seul le code serveur charge la configuration
nécessaire à Storage. Contrat Prisma inchangé, aucune migration, aucun commit ni merge.

Aucune action manuelle Supabase supplémentaire n'est requise pour cet incrément.
La limite de compensation après crash ou panne persistante décrite plus haut
reste applicable ; aucune file durable de nettoyage n'est introduite.
