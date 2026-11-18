# Front Pattern Catalog

Catalogue pédagogique de **19 architectures frontend**, pour architectes solutions et équipes produits, compatible GitHub Pages.

**Nouveautés :** explications sans jargon de CSR, SSR, SSG, BFF, GraphQL ; glossaire de 19 termes ; distinction **Web/PWA versus mobile natif** ; fiches avec **schémas verticaux multi-composants et flèches**, protocole de chaque liaison, déroulé étape par étape, exemples et points de vigilance ; section complète sur l'exécution **serverless** (trigger, compute, état, scalabilité, coûts/risques).

## Patterns

- **Direct (sans BFF)** : SPA/REST, SPA/GraphQL, mobile natif/REST, front statique + fonctions HTTP.
- **Autonome / local-first (sans backend métier)** : SPA + localStorage pour des modèles JSON modérés ; PWA + IndexedDB pour des objets structurés et des transactions asynchrones. Les ressources peuvent être servies par GitHub Pages et mises en cache pour le mode hors ligne.
- **BFF** : REST web, GraphQL web, BFF distincts pour web et mobile, SSR + BFF.
- **Rendu web** : CSR (navigateur), SSR (serveur), SSG (pages générées au build), SSR edge.
- **Serverless** : Functions REST avec BFF, GraphQL managé + résolveurs, Functions directes, traitements asynchrones avec queue et DLQ, workflows orchestrés.
- **Composition organisationnelle** : micro-frontends avec BFF par domaine.
- **Contenus** : CMS traditionnel couplé (rendu HTML par le CMS) et CMS headless (contenu éditorial exposé aux fronts web/mobile via API).

**Stockage local n'est pas cache PWA :** le service worker met en cache les ressources de l'application ; localStorage ou IndexedDB conserve les données métier. Le stockage reste attaché à l'origine et au profil du navigateur, sans synchronisation entre appareils, et peut être effacé (quota, éviction, action utilisateur). Pour les données importantes, prévoir des exports/restaurations. Voir [MDN — quotas et éviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

**Exemple réel :** [Enterprise Capacity Mapper](https://github.com/Sims07/enterprise-capacity-mapper) utilise aujourd'hui localStorage pour ses modèles, sa bibliothèque et ses préférences, derrière un port `ModelRepository`, avec export/import JSON et migrations. L'adaptateur IndexedDB y est une évolution envisagée, pas son implémentation actuelle.

**Un pattern n'est pas une stack exclusive :** le mode de rendu (SSR/SSG/CSR), le contrat API (REST/GraphQL), la frontière BFF et l'hébergement (serverless ou non) sont des dimensions souvent combinables.

## L'interface

- Cartes : **teasers lisibles sans défilement**, 3 repères métier sur une seule ligne, une phrase de valeur, le nombre de composants détaillés et un lien vers la fiche complète. Chaque teaser est défini dans `patterns.json` (`cardPreview.steps` / `cardPreview.value`). Les schémas riches restent réservés aux fiches de détail ; canaux, filtres et recherche inchangés.
- Fiche **sur une page dédiée** (`pattern.html?id=...`) : explication « En clair », grand schéma **de haut en bas** (nœuds, branches, liaisons), sommaire d'ancres, exemple, sécurité et points transverses. **Aucune fenêtre pop-up pour les fiches**.
- Sections : parcours étape par étape, exemple d'utilisation, avantages, compromis, sécurité, mise en œuvre, exploitation ; encart approfondi pour les 5 patterns serverless.
- Comparer 2–3 patterns ; copier l'ADR Markdown et les fiches avec étapes et architecture.
- Assistant d'orientation indicatif : canal web/mobile, choix d'un stockage local sans backend ou d'APIs distantes, agrégation d'APIs, identité et hébergement.

Une **page dédiée à l'arbre de décision intégral** (`decision-tree.html`) affiche **toutes les questions, leurs branches et les résultats** dans un **graphe panoramique** avec nœuds alignés par niveau, liaisons visibles, zoom, déplacement et mini-carte, y compris les alternatives non choisies. Les décisions retenues sont surlignées, conservées dans le panneau latéral et dans l'URL (`#path=...`) : changer une réponse ne masque pas le reste de l'arbre. Les fiches s'ouvrent sur une page indépendante et un retour depuis la fiche conserve le chemin (`treePath`). L'arbre propose aussi la branche « application autonome sans backend », puis l'arbitrage localStorage / IndexedDB ; il peut ouvrir directement une comparaison.
Pour les graphes complexes, la vue de lecture s'ouvre à **100 %** pour conserver une typographie nette, avec des translations alignées sur les pixels physiques ; la vue d'ensemble permet de dézoomer volontairement. La carte utilise presque toute la largeur disponible (jusqu'à 2048 px), et le panneau **Mon parcours** peut être masqué pour libérer l'espace horizontal, sans perdre les décisions retenues.

La **comparaison** est accessible dans une barre fixe dès la première sélection. À deux ou trois architectures, le bouton « Comparer les architectures » ouvre une fenêtre avec un tableau et un export ADR ; il n'est plus nécessaire de descendre en bas du catalogue.

Les diagrammes montrent des architectures *illustratives*, pas une obligation d'installer chaque brique. Les liaisons CDN/ressources statiques sont distinguées des appels API ; en particulier, le mobile natif ne télécharge pas la SPA du CDN. Les branches du graphe décrivent les flux entre composants ; les chemins d'authentification et la télémétrie peuvent figurer dans les éléments transverses.

## Implémentation / exploitation

- Site statique en HTML, CSS, JS ; aucune compilation ni dépendance runtime.
- `patterns.json` : textes, références, canaux, architecture à étages `stages/nodes/links`, glossaire ; notamment les fiches `spa-localstorage` et `pwa-indexeddb`.
- `decision-tree.html`, `decision-tree.js`, `decision-map.css` et `decision-tree.json` : graphe de décisions interactif à niveaux alignés, exploration par zoom/déplacement, aperçu général et chemin conservé dans l'URL (sans stockage utilisateur).
- `pattern.html`, `pattern-detail.js`, `pattern-detail.css` : fiches d'architecture standalone, sommaire, sections de mise en œuvre et navigation précédente/suivante.
- `diagrams.js` : mini-flux de carte sans scroll (3 étapes représentatives, jamais un graphe complet réduit) et moteur SVG autonome pour les fiches (flèches colorées par type, branches, niveaux et protocole).
- PWA : cache versionné `sw.js` avec **pages séparées pour l'accueil, l'arbre et les fiches**, `manifest.webmanifest` et icônes. La navigation hors ligne affiche la bonne page au lieu de substituer systématiquement l'accueil.
- Aucun backend ou stockage de données personnelles.
- Sources officielles : Microsoft Azure BFF, MDN rendu web, IETF OAuth, AWS Lambda/serverless, Next.js, Apollo GraphQL.

## Tester

```sh
node --test tests/catalog.test.mjs
python3 -m http.server 8080
# http://localhost:8080/
```

## Déployer

Activer GitHub Pages dans les paramètres du dépôt : **Deploy from a branch → main → / (root)** après fusion de la PR.
Site : https://sims07.github.io/front-pattern-catalog/

Le portail principal référence ce site via https://sims07.github.io/tools-portal/ et son lien GitHub.

## Ajouter ou ajuster un pattern

Modifier `patterns.json` : une fiche contient les champs existants, `audience` (`web`, `mobile`), `simple`, `steps`, `implementation`, `example`, `preview`, `architecture.stages` (chaque nœud a un ID unique, un titre, une description et une catégorie), `architecture.links` (références aux IDs, protocole, catégorie du flux) et, pour les cas concernés, `serverless`. Les tests valident les liens et les couvertures. Les références des sources sont résolues par leur identifiant.

La logique de décision est versionnée dans `decision-tree.json` : chaque option renvoie soit vers un autre nœud (`to`), soit vers une courte liste d'IDs de patterns (`patterns`), complétée par une raison (`why`). Les tests vérifient la validité du graphe et les liens vers les fiches.


## Licence

Contenu documentaire réutilisable sous les conditions de la licence du projet.
