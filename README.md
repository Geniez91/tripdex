# TripDex

Un carnet de voyage social : logger un voyage et retrouver ses pays sur une carte
du monde. Ce milestone implémente uniquement les pays, les voyages et la carte.

## Démarrage local

Prérequis : Node.js 24 (version utilisée pour la validation), npm et la base
PostgreSQL Supabase déjà initialisée avec le contrat du projet.

```sh
npm install
```

Créer `apps/api/.env` à partir de `apps/api/.env.example` **seulement s’il n’existe
pas déjà**, puis renseigner la connexion PostgreSQL dans ce fichier local.
Ne jamais copier la connexion dans le frontend ou la committer.

- API : `PORT=3001`, `HOST=127.0.0.1`, `WEB_ORIGIN=http://localhost:3000`.
- Identité locale : `DEV_AUTH_ENABLED=true` et `NODE_ENV=development` dans
  l’environnement API (également pour créer l’utilisateur local avec le seed).
  Ajouter `NODE_ENV=development` aux anciens fichiers `.env` si nécessaire.
- Web : `NUXT_PUBLIC_API_BASE` vaut `http://localhost:3001` par défaut.
  `apps/web/.env.example` permet de changer cette adresse publique.

```sh
npm run db:verify
npm run db:seed
```

Le seed est transactionnel et idempotent. Il insère/met à jour les 249 entrées ISO
par `iso2`, conserve les IDs existants et ne supprime aucune donnée. Il crée aussi
l’utilisateur local si le mode développement est activé. Aucun voyage n’est créé
par le seed. Les sources géographiques sont déjà incluses dans le dépôt ; voir
[data/README.md](data/README.md) pour les licences et la régénération.

Dans deux terminaux, depuis la racine :

```sh
npm run dev:api
```

```sh
npm run dev:web
```

Ouvrir **http://localhost:3000**. L’API écoute sur **http://localhost:3001**.

## Scénario du milestone

1. Saisir `Japan 2026`, une date de début et éventuellement une date de fin.
2. Rechercher `Japan`, cocher le pays, puis enregistrer.
3. Nuxt appelle `POST /trips`. NestJS écrit `Trip` et `TripCountry` dans une
   transaction Prisma 8.
4. Nuxt recharge `GET /me/visited-countries`. `JPN` colore le Japon sur la carte.
5. Recharger la page : le Japon reste visité grâce aux données de PostgreSQL.

Les pays utilisent leurs noms anglais dans ce premier référentiel. La carte SVG
plate utilise `d3-geo`, des polygones GeoJSON locaux et des marqueurs pour les
petits territoires. Elle permet le survol, le clic, le focus clavier et Entrée/Espace.

## API

| Endpoint                    | Réponse / entrée                                                           |
| --------------------------- | -------------------------------------------------------------------------- |
| `GET /countries`            | Pays triés par nom : `id`, `iso2`, `iso3`, `name`, `slug`, `continentCode` |
| `POST /trips`               | `201` avec le voyage créé et ses pays                                      |
| `GET /me/visited-countries` | Pays distincts des voyages de l’utilisateur courant                        |

Exemple de corps JSON pour `POST /trips` :

```json
{
  "title": "Japan 2026",
  "startDate": "2026-04-01",
  "endDate": "2026-04-14",
  "countryIds": ["ID_DE_JAPAN_RETOURNE_PAR_GET_COUNTRIES"]
}
```

Le titre est nettoyé et limité à 160 caractères. Le début est obligatoire ; la
fin peut être omise ou `null` et ne peut pas précéder le début. Les dates entrent
au format `YYYY-MM-DD` et sont conservées à minuit UTC dans les champs
`TimestamptzString` existants. Un voyage contient au moins un pays, sans doublons.
Les pays inconnus et les champs non prévus, dont `userId`, sont rejetés (`400`).

Un pays est considéré comme visité dès qu’un voyage enregistré lui est associé,
même si ses dates sont futures. Aucune distinction voyage prévu/passé n’est
introduite dans ce milestone.

`CurrentUserService` constitue le point d’intégration pour Supabase Auth. En
attendant, les routes privées utilisent un utilisateur partagé de développement,
sans identité fournie par le navigateur. Ce mode exige `DEV_AUTH_ENABLED=true`
et un `NODE_ENV` explicitement égal à `development` ou `test`. Toute autre valeur,
y compris une valeur absente, est refusée (`401`). `start:dev` impose
`development` et `start:prod` impose `production` avant de charger l’application,
même si l’environnement hérité indique autre chose. Le lancement local
de l’API charge `apps/api/.env` via dotenv.

## Prisma 8 conservé

- Configuration : `apps/api/prisma.config.ts`.
- Source : `apps/api/src/prisma/contract.prisma`.
- Artefacts générés : `contract.json` et `contract.d.ts`.
- ORM : `@prisma/orm-postgres/runtime`, `db.orm.public.*`, `db.transaction(...)`.
- Le client partagé est fourni à NestJS par `DatabaseModule` et fermé à l’arrêt.

Le milestone n’exige aucune modification du contrat ni migration. Ne pas relancer
`db init` sur cette base existante. Pour une future évolution du domaine, utiliser
le workflow de contrat/migration Prisma 8 fourni avec le projet ; ne pas éditer
les artefacts générés à la main.

## Vérifications

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e --workspace=api
npm run build
npm run db:verify
npm run test:db --workspace=api
```

Les tests unitaires et HTTP remplacent la connexion DB. Les tests `test:db`
utilisent **le véritable runtime Prisma 8 et PostgreSQL** : création multi-pays,
isolation, déduplication des visites et rollback après échec d’une association.
Les fixtures sont annulées par transaction, sans suppression de données existantes.
Le test de seed le relance et vérifie que les IDs, voyages et associations sont
conservés. Il nécessite un seed initial et le mode d’identité de développement.

Pour le test navigateur, démarrer API et web, puis :

```sh
npm exec --workspace=web -- playwright install chromium
npm run test:e2e --workspace=web
```

Si Chrome est déjà installé, définir `PLAYWRIGHT_CHANNEL=chrome` évite de
télécharger Chromium. Les URLs peuvent être remplacées par `WEB_TEST_URL` et
`API_TEST_URL`. **Ce test crée et conserve un voyage de démonstration `Japan 2026`
à chaque exécution**. Il vérifie la réponse HTTP, la carte après rechargement,
l’absence de débordement mobile et l’état d’erreur API. Les captures sont placées
dans `artifacts/`, ignoré par Git.

Les builds peuvent émettre un avertissement de dépréciation d’une dépendance Vue
et Jest signale ses modules VM expérimentaux ; ils n’empêchent pas les contrôles.

Le dossier fourni contient un dépôt Git imbriqué dans `apps/api`, mais aucun
dépôt Git à la racine du monorepo. Aucun commit ni changement d’organisation Git
n’est effectué par cette implémentation.
