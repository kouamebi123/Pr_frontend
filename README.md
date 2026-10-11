# Porteurs de Réveil — Application web

Application web responsive issue du document **APPLICATION PR.pdf**. La présentation téléphone reprend ses écrans, sa palette violette et crème, son monogramme et les images disponibles. Les écrans supplémentaires couvrent la préparation des événements, l’administration et toutes les « perspectives futures ».

Backend associé : https://github.com/kouamebi123/Pr_backend.

## Lancer l’application

Installer **Node.js 24 LTS**, puis cloner les deux dépôts dans le même dossier parent.

Dans `Pr_backend` :

```sh
cp .env.example .env
npm start
```

Dans un autre terminal, dans `Pr_frontend` :

```sh
cp .env.example .env
npm start
```

Ouvrir **http://localhost:3000**. Aucune installation de dépendances npm n’est nécessaire : frontend ES modules natifs, serveur Node et proxy API intégrés. La base, les sessions, favoris, fichiers et répertoires sont réellement enregistrés par le backend.

Pour tester sur un téléphone du même réseau, remplacer `FRONTEND_ORIGIN` du backend par `http://ADRESSE_IP_DU_PC:3000` (ou l’ajouter à la liste séparée par une virgule), puis ouvrir cette adresse sur le téléphone. Utiliser `NODE_ENV=development` en HTTP local.

Pour l’administration, créer le premier compte administrateur avec les instructions du README backend. L’application est réservée aux membres : une demande d’accès depuis l’interface crée un compte en attente, qu’un administrateur valide dans **Administration → Membres** (où il peut aussi créer des comptes avec mot de passe provisoire, désactiver un compte ou réinitialiser un mot de passe oublié).

## Écrans

| Écran | Route |
|---|---|
| Lancement violet PR | `/#welcome` |
| Accueil et ses quatre rubriques | `/#home` |
| Classement par événement | `/#events` |
| Classement par style et sous-style | `/#styles` |
| Recherche et recherches récentes | `/#search` |
| Catalogue complet et filtres combinés | `/#songs` |
| Exemple de liste CGA | `/#songs?category=event-1` |
| Favoris personnels | `/#favorites` |
| Fiche avec lecteur et trois raccourcis | `/#song/tu-es-digne` |
| Fiche étendue des perspectives futures | `/#song/tu-es-digne?view=expanded` |
| Paroles, accords transposables, référence, événements | `/#song/:id/lyrics`, `/chords`, `/reference`, `/history` |
| Répertoires, préparation et historique | `/#setlists`, `/#setlist/:id` |
| Calendrier et détail d’un événement | `/#calendar`, `/#event/:id` |
| Profil, connexion et demande d’accès | `/#profile`, `/#login`, `/#register` |
| Catalogue, catégories, rôles et journal | `/#admin` |

Sur téléphone, navigation inférieure Accueil / Recherche / Favoris / Profil. Sur ordinateur, navigation latérale et vues élargies. Aucune application native ni dépendance Expo n’est nécessaire pour cette version. Le manifeste et le service worker permettent un lancement depuis l’écran d’accueil ; les données métier restent en ligne et ne sont pas mises en cache hors connexion.

## Préparer un répertoire

1. Demander un accès (ou se faire créer un compte par un administrateur), puis créer un événement dans **Profil → Événements**.
2. Créer un répertoire personnel ou partagé avec l’équipe et l’associer à cet événement.
3. Ajouter des chants ; régler l’ordre, les tonalités et les notes.
4. Exporter en CSV, imprimer / enregistrer en PDF via le navigateur ou partager le lien avec les membres connectés.
5. Après l’événement, choisir **Marquer comme joué**. Les fiches des chants et l’événement affichent alors cet historique. Un événement futur ne peut pas être marqué comme joué.

Les chants cités dans le PDF contiennent leurs titres et artistes, pas de faux médias ou de fausses paroles. Un responsable peut ajouter ces éléments, importer des fichiers et modifier le classement depuis l’administration. Le chant **Élan de louange · Démonstration** contient un court exemple original complet pour tester audio, paroles et accords.

## Vérification et build

```sh
npm test
npm run check
npm run build
```

Le build est autonome dans `dist/` : `node dist/server.js`. Sept tests vérifient la transposition musicale, la recherche, l’échappement HTML, le réordonnancement, l’export CSV, la distribution des fichiers et le proxy de session. Les tests backend complètent ces contrôles par 22 parcours HTTP métier.

## Hébergement

`API_URL` désigne l’origine du backend ; il est lu uniquement par le serveur et n’est jamais envoyé au navigateur. Le navigateur utilise `/api` sur la même origine que l’application : les cookies fonctionnent aussi sur téléphone. `PORT` vaut `3000` par défaut. Sur Railway, régler `TRUST_PROXY=true` pour transmettre l’adresse client fournie par son en-tête `X-Real-IP` au limiteur de tentatives de connexion. Garder `false` pour un serveur directement exposé ; ne l’activer que si le proxy de confiance écrase cet en-tête ([documentation Railway](https://docs.railway.com/networking/public-networking/specs-and-limits)).

Les `Dockerfile`, `railway.json` et un `compose.yaml` de développement sont inclus. En production : frontend HTTPS, API privée, `FRONTEND_ORIGIN` réglé sur l’origine publique exacte, volume persistant backend, une réplique backend. Ne pas remplacer la base par des données locales au navigateur.

```sh
docker compose up --build
```

Le compose suppose que `../Pr_backend` est présent et expose l’application sur http://localhost:3000.

## Référence visuelle

Le monogramme, l’icône et les pochettes ont été extraits du PDF fourni. Les illustrations source sont des captures de faible définition : l’application ne dispose pas des visuels originaux haute résolution. L’interface reproduit la disposition des maquettes à l’échelle de l’écran réel, sans dessiner de faux cadre iPhone ni de fausse barre système. Les variantes lecteur et fiche étendue sont toutes deux disponibles. La validation visuelle réelle sur téléphone reste à réaliser lors de la recette.

Voir [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) pour la couverture détaillée et [docs/QA.md](docs/QA.md) pour la vérification.
