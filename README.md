# Front Pattern Catalog

Catalogue d'architecture à destination des architectes solutions : **10 combinaisons frontend, BFF, rendu et hébergement** avec des schémas, critères d'arbitrage, fiches de sécurité et export Markdown de fiches/ADR.

## Fonctionnalités
- Recherche et filtres : direct sans BFF, BFF REST, BFF GraphQL, serverless, SSR/SSG
- Schéma de flux et fiche détaillée pour chaque pattern
- Guide de présélection fondé sur le besoin d'agrégation, l'identité et le mode de déploiement (il ne remplace pas l'ADR)
- Comparaison de 2 à 3 architectures et copie d'un brouillon d'ADR
- PWA installable sur navigateur compatible, utilisable hors connexion après une première visite réussie
- 0 dépendance et 0 build ; données maintenues dans `patterns.json` (pas de backend, stockage utilisateur ou télémétrie intégrée)

## Exécution et déploiement
Lancer un serveur statique depuis la racine de ce dépôt :
```sh
python3 -m http.server 8080
# http://localhost:8080/
```

Après activation de GitHub Pages sur la branche `main` à la racine, le site sera disponible à l'adresse https://sims07.github.io/front-pattern-catalog/.

## Intégration au portail

Une PR distincte dans `Sims07/tools-portal` ajoute la vignette, l'ouverture en iframe, le lien GitHub, le suivi d'usage du portail et le raccourci PWA.

## Ajouter un pattern
Ajouter une entrée à `patterns.json` avec un identifiant unique, un ensemble de tags connus, des éléments de diagramme ordonnés, les bénéfices, limites, sécurité et observabilité. Les références sont résolues par identifiant depuis `sources`. Vérifier :
```sh
node --test tests/catalog.test.mjs
```

## Interprétation
- **BFF** = frontière dédiée à un type d'expérience, pas synonyme de proxy/gateway.
- **GraphQL** = protocole de consultation des données, possible avec ou sans BFF.
- **Serverless** = modèle d'exécution (fonctions, edge), compatible avec les BFF.
- **SSR/SSG/CSR** = stratégies de rendu ; elles peuvent cohabiter et ne dictent pas à elles seules le contrat API.
- Sécurité des applications web OAuth : voir **RFC 10017 (2026)**, notamment la différence BFF / token-mediating / client OAuth dans le navigateur.

Les patterns sont des archétypes, non des recettes universelles. Conserver les hypothèses de charge, sécurité, SLA, ownership et coûts dans l'ADR.
