# Statistiques communautaires et résidence

L’Explorer (`/`) affiche la fréquentation communautaire par année. La carte personnelle reste disponible sous `/profile/map`. Le profil (`/profile`) permet de choisir ou d’effacer son pays de résidence.

## API

- `GET /community/countries?year=2026` est public. L’année est obligatoire, sur quatre chiffres, entre `0001` et `9998`. Les paramètres supplémentaires sont rejetés.
- `GET /me/residence` retourne `{ residenceCountry: Country | null }` pour le compte authentifié.
- `PUT /me/residence` accepte uniquement `{ residenceCountryId: string | null }`. `null` efface la résidence. Un pays inconnu est rejeté avec `400`.

Les statistiques retournent `year`, `asOfDate` (date UTC) et tous les pays du référentiel. Chaque pays contient `country`, `travelers`, `travelersNow`, `trending` et `topOrigins`. Aucune identité individuelle ni donnée de voyage individuelle n’est renvoyée.

## Règles de calcul

- Un voyageur compte une seule fois par pays dans l’année, même avec plusieurs voyages.
- Un voyage est compté s’il chevauche l’année sélectionnée. Sans date de fin, seule la date de début compte. Les voyages futurs sont inclus.
- `travelersNow` compte les voyageurs dont le séjour contient la date UTC actuelle, bornes incluses, avec une date de fin renseignée. Ce nombre est indépendant de l’année sélectionnée et provient des dates déclarées, pas d’une géolocalisation.
- `trending` vaut `true` à partir de dix voyageurs dans l’année.
- Les cinq premiers pays de résidence sont classés par nombre de voyageurs distincts, puis par identifiant du pays en cas d’égalité. La résidence actuelle est utilisée ; ce n’est pas un historique des résidences. Les résidences non renseignées sont exclues du classement.
- Les réponses utilisent `Cache-Control: no-store` (également `private` pour la résidence). Une panne renvoie `503`, sans transformer une erreur en zéro voyageur.

## Base et validation

La migration `20260910T2245_user_residence_country` ajoute une colonne nullable, un index et une clé étrangère avec `ON DELETE SET NULL`. Les anciens comptes n’ont pas de résidence par défaut.

`npm run test:db:community --workspace=api` vérifie les agrégations et les modifications de résidence avec PostgreSQL et le runtime Prisma réels. Les fixtures sont intégralement annulées par transaction. Les validations d’entrée et le contrat HTTP sont aussi couverts par `npm test` et `npm run test:e2e --workspace=api`.

`npm run test:community --workspace=web` lance les scénarios navigateur communautaires, Explorer et passeport sur un serveur de test dédié au port 3098, avec des réponses API simulées. Les scénarios couvrent les formats bureau, tablette et mobile, la navigation clavier, les changements d’année et la récupération après erreur. Pour utiliser Chrome installé sous PowerShell :

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:community --workspace=web
```
