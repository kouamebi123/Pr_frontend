# Vérification — Porteurs de Réveil

## Tests exécutés

Le 11 octobre 2026 : **29 tests réussis, 0 échec** (22 backend et 7 frontend), contrôles de syntaxe et build frontend réussis.

- Création de compte, connexion, déconnexion, changement de mot de passe, absence d’élévation de privilèges à l’inscription, demandes d’accès validées par un administrateur, mots de passe provisoires, comptes désactivés.
- Sessions HttpOnly, protection d’origine, restrictions membre / responsable / administrateur et maintien du dernier administrateur.
- Catalogue, recherche sans accents, filtres combinés et sous-styles.
- Favoris et recherches récentes isolés par utilisateur.
- Création, modification et archivage des chants ; catégories ; validations de liens et conflits d’édition.
- Événements et dates valides ; répertoires personnels ou partagés avec l’équipe.
- Ajout, retrait, ordre, tonalité et notes des chants dans un répertoire.
- Réalisation d’un événement, historique, interdiction de réaliser un événement futur, duplication d’un répertoire déjà joué.
- Archivage préservant l’historique ; export respectant les droits.
- Import de médias, formats refusés, lecture partielle de l’audio.
- Persistance vérifiée en rouvrant la base PostgreSQL ; reprise unique des données de l’ancienne base SQLite.
- Transposition avec accords mineurs, altérations et basses renversées ; CSV protégé contre l’injection de formules.
- Échappement HTML, accès aux fichiers publics et refus des fichiers privés du serveur.
- Proxy HTTP transmettant le cookie de session, le corps et les paramètres à l’API ; IP client du proxy Railway conservée pour les limites de connexion, en-têtes falsifiés refusés en accès direct.
- Transposition préservant les titres de sections tels que `[Couplet]` et `[Bridge]`.

## Limites de recette

Contrôle réalisé dans Chrome sur la version Railway : accueil, images et monogramme, catégories d’événements, liste CGA, fiches de chants, lecture audio complète du fichier de démonstration (12 secondes, sans erreur), écran des accords et commande de transposition. Liaison frontend/API vérifiée en production ; connexion administrateur, cookie Secure + HttpOnly, accès au catalogue administratif et déconnexion vérifiés par requêtes HTTP réelles.

La recette visuelle sur un téléphone réel (Safari iOS et Chrome Android) reste à effectuer. Les dimensions responsives et écrans sont implémentés, mais la conformité pixel par pixel aux maquettes n’est pas attestée. Les images du PDF sont de faible définition.

Les vrais enregistrements audio, vidéos, paroles et accords des six chants du document ne sont pas fournis. L’import et la lecture sont testés sur des fichiers de test et le court exemple original préchargé. La disponibilité des liens externes dépendra de ceux ajoutés par le responsable.

## Parcours de recette manuelle

1. Téléphone : ouvrir accueil, événements, styles, CGA, recherche, favoris et les deux variantes de fiche chant.
2. Lire le chant de démonstration, déplacer le curseur, changer de page, mettre en pause via le mini lecteur.
3. Ouvrir paroles et accords, transposer, agrandir les paroles, consulter le lien de référence.
4. Administrateur : importer un média réel autorisé et compléter les paroles d’un chant.
5. Préparer un événement, ordonner un répertoire, partager avec un deuxième membre, imprimer et exporter.
6. Marquer l’événement passé comme joué puis vérifier les historiques.
7. Vérifier sur Safari iOS et Chrome Android le plein écran, les zones sûres, les formulaires, le clavier virtuel et l’installation sur l’écran d’accueil.
