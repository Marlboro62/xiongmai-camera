# Changements

## 0.1.0-beta.2

- Ajout : l'image de la caméra sous la grille des zones de détection, avec le bouton **Actualiser l'image** (option `snapshot_entity` pour prendre l'image d'une entité caméra de Home Assistant, sinon la caméra elle-même).
- Correction : la grille n'affiche plus que les lignes réelles de la caméra (22 × 18 en général, au lieu des 32 lignes renvoyées par certains firmwares) ; les lignes en plus sont renvoyées sans changement.
- Correction : l'application prend le fuseau horaire de Home Assistant. Avant, **Mettre la caméra à l'heure** envoyait l'heure UTC (une heure de retard en hiver en France) et les journaux étaient en UTC.

## 0.1.0-beta.1

- Première bêta : page de réglages dans Home Assistant (image, vidéo, détection de mouvement avec grille des zones, alarmes, réseau, système), éditeur JSON, mise à l'heure, redémarrage, sauvegarde automatique avant chaque écriture et export de la configuration, plusieurs caméras.
