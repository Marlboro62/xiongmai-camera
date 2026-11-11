# Changements

## 0.1.0-beta.7

- Les copies d'un réglage pour des canaux que la caméra n'a pas (« Exposition… 2 » à « 16 ») ne sont plus affichées ; elles restent conservées telles quelles.
- **Balance des blancs** (Automatique, Intérieur, Extérieur) et **Mode du filtre infrarouge** (Synchronisé avec les LED infrarouges, Automatique) en liste ; temps d'exposition manuel en millisecondes.

## 0.1.0-beta.6

- Exposition et jour / nuit en clair : **Mode jour / nuit** (Automatique, Toujours en couleur, Toujours en noir et blanc) et **Obturateur lent** (Désactivé, Faible, Moyen, Fort) en liste ; temps d'exposition en millisecondes avec l'équivalent « ≈ 1/25 s » au lieu de `0x10000` ; **Gain automatique** et **Inverser le filtre infrarouge** en interrupteurs.

## 0.1.0-beta.5

- Actions des alertes en clair :
  - masques `0x000…` (enregistrement, photo, sortie d'alarme, message…) remplacés par un interrupteur par canal (« Cette caméra », « Sortie 1 ») ;
  - action PTZ par canal en liste (Aucune, Aller au préréglage n°, Lancer la ronde n°, Lancer le parcours n°) ;
  - plage horaire en tableau Lundi → Dimanche, avec des heures « de 08:00 à 18:00 », bouton **+ plage**, **Tous les jours, 24 h / 24** et **Copier le lundi sur tous les jours**.
- Libellés des réglages réservés aux enregistreurs ou caméras motorisées (matrice, ronde, PTZ).

## 0.1.0-beta.4

- Textes à l'écran : couleur du texte et du fond choisies par leur nom (Blanc, Noir, Rouge, Transparent…) au lieu des codes hexadécimaux ; une couleur inconnue reste proposée telle quelle.

## 0.1.0-beta.3

- Correction : **Mettre la caméra à l'heure** envoyait encore l'heure UTC. L'heure est maintenant demandée directement à Home Assistant (fuseau et heure d'été compris).

## 0.1.0-beta.2

- Ajout : l'image de la caméra sous la grille des zones de détection, avec le bouton **Actualiser l'image** (option `snapshot_entity` pour prendre l'image d'une entité caméra de Home Assistant, sinon la caméra elle-même).
- Correction : la grille n'affiche plus que les lignes réelles de la caméra (22 × 18 en général, au lieu des 32 lignes renvoyées par certains firmwares) ; les lignes en plus sont renvoyées sans changement.
- Correction : l'application prend le fuseau horaire de Home Assistant. Avant, **Mettre la caméra à l'heure** envoyait l'heure UTC (une heure de retard en hiver en France) et les journaux étaient en UTC.

## 0.1.0-beta.1

- Première bêta : page de réglages dans Home Assistant (image, vidéo, détection de mouvement avec grille des zones, alarmes, réseau, système), éditeur JSON, mise à l'heure, redémarrage, sauvegarde automatique avant chaque écriture et export de la configuration, plusieurs caméras.
