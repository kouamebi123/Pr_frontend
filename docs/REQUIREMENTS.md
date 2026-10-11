# Couverture du cahier des charges

Référence : APPLICATION PR.pdf fourni par le propriétaire, 5 pages. Version web uniquement ; présentation téléphone inspirée directement des maquettes. Aucun développement natif mobile dans cette livraison.

| Demande du document | Implémentation |
|---|---|
| Regrouper les chants | Catalogue persistant, liste complète, fiches détaillées |
| Classement par événement (CGA, PDA…) | 8 catégories préchargées, catégories administrables, classement multiple |
| Classement par style (louange, adoration…) | 9 catégories principales, styles administrables |
| Sous-styles Seben / Nigérian | Hiérarchie de styles, filtrage par parent ou enfant |
| Chant présent dans plusieurs catégories | Table de relations multiple côté backend, cases multiples côté administration |
| Accueil | 4 accès de la maquette, navigation inférieure mobile, navigation latérale ordinateur |
| Recherche directe | Titres, artistes, paroles, notes, langues et catégories ; recherche insensible aux accents |
| Favoris | Favoris personnels persistants et isolés entre membres |
| Liste des chants par événement | Listes filtrées, dont CGA |
| Liste de tous les chants | Catalogue avec filtres combinés |
| Recherches récentes | 10 dernières recherches, dédoublonnage et effacement |
| Lecteur audio affiché dans la maquette | Lecture, pause, déplacement temporel, mini lecteur persistant pendant la navigation |
| Paroles — perspective future | Saisie par responsable, lecture dédiée, agrandissement et impression |
| Lien du chant de référence — perspective future | Lien HTTP(S), lien vidéo, ouverture dédiée |
| Accords — perspective future | Saisie, vue dédiée, transposition, tonalité, notes de préparation |
| Événements où un chant a déjà été utilisé | Historique alimenté lors de la réalisation d’un répertoire daté |
| Sélection pour un prochain événement | Événements datés et association de répertoires |
| Création d’un répertoire dans l’application | Création, ajout/retrait/ordre des chants, notes et tonalité par élément |
| Trace des répertoires dans le temps | Brouillon, prêt, joué ; répertoire joué immuable ; duplication et archives |
| Écran de lancement PR | Route welcome, palette violette, monogramme issu du document |
| Fiche chant de la page 4 | Vue lecteur avec pochette, cœur, curseur et raccourcis |
| Fiche chant de la page 5 | Variante étendue avec en-tête illustré et liens en liste |
| Profil de la navigation | Compte, favoris, répertoires, événements, installation, mot de passe |

## Écrans complémentaires nécessaires

Inscription / connexion, calendrier, détail d’un événement, liste et éditeur de répertoires, sélection de chants, réglages d’un chant dans le répertoire, administration du catalogue, catégories et sous-styles, gestion des rôles et journal d’activité. Les répertoires se partagent avec l’équipe connectée et s’exportent en CSV ou par impression / PDF navigateur.

## Contenus et exactitude visuelle

Les six titres et artistes visibles dans le PDF sont fournis comme données initiales d’exemple. Leurs contenus audio, paroles et accords n’ont pas été fournis : les champs sont disponibles mais ne sont pas remplis par des contenus inventés. Un septième chant original de démonstration permet de tester ces fonctions. Les catégories associées sont des exemples modifiables, pas l’historique réel du groupe.

Le logo et les pochettes sont extraits du PDF. La disposition mobile, les couleurs, les cartes et la navigation sont reproduites en interface web ; la conformité pixel par pixel nécessite une recette visuelle sur appareil. La version ordinateur adapte l’espace disponible avec une navigation latérale.
