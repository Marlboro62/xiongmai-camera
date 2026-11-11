# Changements

## 0.1.0-beta.21

- **Entités Home Assistant par MQTT** : un appareil par caméra, créé automatiquement (découverte MQTT) :
  - interrupteurs **Détection de mouvement**, **Image miroir**, **Image retournée**, **Cloud XMEye** ;
  - **Sensibilité de la détection** (1 à 6) et **Mode jour / nuit** (liste) ;
  - boutons **Redémarrer** et **Mettre à l'heure de Home Assistant** ;
  - capteurs **Connexion** et **Temps de fonctionnement**.
  États relus toutes les minutes, et juste après chaque commande.
- Broker : l'application Mosquitto de Home Assistant est trouvée toute seule ; sinon options `mqtt_host`, `mqtt_port`, `mqtt_username`, `mqtt_password`, `mqtt_tls`, `mqtt_tls_insecure`. Option `mqtt` pour tout couper.

## 0.1.0-beta.20

- Nouvelle page **Flux et accès** :
  - **aperçu** de la caméra en direct (une image par seconde environ), avec pause ;
  - adresses **RTSP** des flux principal et secondaire, prêtes à copier (format des firmwares V4), avec le test du port et l'état du serveur RTSP ;
  - **ONVIF** : test du service (port 8899) et paramètres pour l'intégration ONVIF de Home Assistant ; réglages ONVIF du firmware s'il en propose ;
  - **HTTP** : adresse de l'image fixe et lien vers la page web de la caméra ;
  - boutons vers les réglages RTSP et les ports (page Réseau). Les mots de passe sont masqués à l'écran.

## 0.1.0-beta.19

- **Info-bulles** : un bouton **i** à côté de près de 100 réglages (image, couleurs, vidéo, textes, détection, réseau, système) explique à quoi sert le réglage, avec un exemple concret. Un clic ouvre ou ferme l'explication, aussi au doigt sur téléphone.

## 0.1.0-beta.18

- Correction : couleurs des textes à l'écran, le rouge et le bleu étaient inversés (ainsi que jaune / cyan et orange). L'ordre est maintenant vérifié sur une vraie caméra.

## 0.1.0-beta.17

- Correction : l'application ne recevait pas son accès à Home Assistant (jeton du Supervisor), car l'image de base la lance par s6-overlay sans transmettre cette variable. Elle la relit maintenant là où s6 la range : l'heure de Home Assistant, le fuseau horaire et l'option `snapshot_entity` fonctionnent.

## 0.1.0-beta.16

- **Couleurs** : plus de titres en double (« Couleurs › Couleurs › Couleurs 1 ») ; les deux réglages s'appellent « Réglage selon l'heure 1 / 2 », et leur plage horaire s'affiche « de 00:00 à 24:00 » avec un interrupteur au lieu de `0 00:00:00-24:00:00`.
- Une section qui ne contient qu'un élément (une seule caméra) n'ajoute plus de niveau de titre.
- **Langue** : explication corrigée (menus intégrés de l'appareil ; la langue de NetSurveillance se choisit sur sa page de connexion).

## 0.1.0-beta.15

- Sécurité : si l'heure de Home Assistant ne peut pas être lue, la page l'indique et le bouton **Mettre la caméra à l'heure** est désactivé (au lieu d'envoyer l'heure UTC). La cause est écrite une fois dans le journal de l'application.

## 0.1.0-beta.14

- Correction : **les interrupteurs ne réagissaient pas au clic** (depuis la première bêta). Ils fonctionnent maintenant partout (réglages, plages horaires).
- Après chaque enregistrement, l'application relit la section sur la caméra : si la caméra a répondu « OK » mais ignoré une valeur (réglage non pris en charge par le modèle), un message le dit au lieu d'annoncer un succès.

## 0.1.0-beta.13

- **Heure d'été** comme dans NetSurveillance : « le dernier dimanche de mars à 2 h 00 » (jour de la semaine) ou une date précise, au lieu des chiffres Jour / Semaine / Mois / Année.
- **Jours ouvrés** en cases à cocher (lun. → dim.) au lieu du nombre 62.

## 0.1.0-beta.12

- **Langue** : liste des langues proposées par la caméra elle-même (Anglais, Français…), au lieu d'un champ texte qui ne montrait que la valeur actuelle. C'est la langue des menus de la caméra (NetSurveillance, CMS), pas celle de cette page, qui reste en français.
- Listes en français au lieu de champs texte : format de la date et de l'heure, séparateur, standard vidéo, heure d'été, type de contact, disque plein, débit, codec, résolution, priorité réseau.
- Calendrier iranien en interrupteur.

## 0.1.0-beta.11

- Page **Infos et actions** en clair : entrées audio, sorties vidéo, caméras IP et mode combiné (enregistreurs), dernière mise à jour du firmware (« Jamais »), mise à jour en attente (« Aucune ») ; « Unknown » devient « Non renseigné ».
- Numéro de série masqué par défaut (bouton **Afficher**), pour ne pas le publier par erreur sur une capture.

## 0.1.0-beta.10

- Nouveaux noms en français : intervalle entre deux photos, nombre de canaux et type d'appareil (à ne pas modifier), autres fonctions, numéro de série réseau, adresses IPv6 ; explication de la sortie vidéo.

## 0.1.0-beta.9

- Nouveaux noms en français : réglage automatique de l'image, force de la correction de déformation, texte de l'alerte, envoi au logiciel CMS, message multimédia (MMS), message vocal (type, intervalle), serveurs DNS du cloud.
- Nouveau bouton **Infos et actions › Lister les réglages sans nom français** : il parcourt toutes les sections et donne la liste des noms encore en anglais (noms seulement, aucune valeur), à copier dans une issue.

## 0.1.0-beta.8

- **Image (avancé)** en clair : interrupteurs (correction de la déformation de l'objectif, mode faible luminosité, éviter la surexposition, mode couloir, stabilisation), listes (mesure de la lumière, détection du jour et de la nuit, style d'image) et explications.
- **Textes à l'écran** : position en % de l'image (horizontal, vertical) au lieu de `[7521,0,255,24]` ; zones masquées en % (gauche, haut, droite, bas). Une position non modifiée est renvoyée exactement telle quelle.

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
