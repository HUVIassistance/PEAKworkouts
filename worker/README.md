# PEAK API — Worker Cloudflare ↔ Notion

Pont serveur entre l'app `train.huvioptimisation.com` et le workspace Notion de Hugo.
Le token Notion vit **uniquement** ici (secret Cloudflare) : il ne touche jamais le navigateur.

## Routes

| Route | Méthode | Rôle |
|---|---|---|
| `/health` | GET | ping (`hasNotionToken` indique si le secret est en place) |
| `/program` | GET | programme **actif** Notion + workouts + exercices + planning |
| `/session` | POST | crée une page dans « Calendrier d'entrainement (Séances) », dédupliqué par `Session ID` |
| `/promote` | POST | réécrit la **prescription** du workout Notion avec le réalisé (`3x12-15 @ 5` → `4x12 @ 5/5/5/6`) |

Toutes les routes (sauf `/health`) exigent l'en-tête `x-peak-key`.

## Sources de vérité dans Notion

- **Programme actif** : base `Programmes` (`3fd084dd…`), filtre `Actif ?` = coché.
  Si plusieurs sont cochés → le plus récent (`Date`, puis `created_time`).
- **Planning hebdo** : les 3 champs numériques de la fiche programme
  (`Séances muscu/sem.`, `Cardio/sem.`, `Repos/sem.`).
- **Exercices et leur ordre** : le **contenu** de la page du workout, pas les relations.
  Format attendu :

  ```
  Superset 1 :
  Push-ups 3x12-15
  Goblet squats 3x 12
  Fin
  ```

  Une page peut contenir plusieurs sections (`Séance A :`, `Séance B :`) :
  la section importée est celle qui correspond au `(Séance N)` du titre, sinon la première.
- **Charges** : base `Exercices` liée au workout, colonnes `Série 1 (Lbs)` →
  **converties en kg** (1 lb = 0,45359237 kg, arrondi à 0,5 kg). Un exercice sans
  charge déclarée sort à `0 kg` (poids du corps) et l'app le signale.
- **Séances terminées** : base `Calendrier d’entrainement (Séances)` (`ba7adb2f…`).
  Propriétés écrites : Titre, Date, Durée (min), Séries faites/prévues, Volume (kg),
  Session ID, Source = `PEAK app`, Notes, Workout lié. Le détail des séries va dans
  le corps de la page.

## Déploiement

```bash
cd worker
export CLOUDFLARE_API_TOKEN=…        # /opt/data/.cf-token
export CLOUDFLARE_ACCOUNT_ID=c313b5e26cdeb331bd39d7a511ae3c57
npx wrangler deploy --config wrangler.toml
```

Secrets (une seule fois, ou à chaque rotation) :

```bash
cat /opt/data/.notion_token | npx wrangler secret put NOTION_TOKEN --config wrangler.toml
printf '%s' '<clé>'         | npx wrangler secret put PEAK_KEY      --config wrangler.toml
```

En local : copier `.dev.vars.template` → `.dev.vars` (gitignoré), puis `npx wrangler dev`.

## Pièges connus

- **`force_orphan`** côté GitHub Pages n'a rien à voir ici, mais le Worker porte le
  domaine `peak-api.huvioptimisation.com` qui exige `Zone → Workers Routes: Edit`
  **et** `DNS: Edit` sur le token de déploiement.
- **Noms d'exercices** : la correspondance contenu ↔ base `Exercices` se fait par nom
  normalisé (+ alias des parenthèses). « Bar dips » vs « Dips on bar » ne matchent pas :
  la charge sort à 0. Corriger le nom dans Notion, pas dans le code.
- **Ordre** : il vient de l'ordre d'apparition dans le contenu ; la propriété `Ordre`
  de la base `Exercices` n'est pas utilisée (doublons et `null` constatés).
