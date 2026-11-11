# Caméra XiongMai

Cette application règle les caméras IP **XiongMai / XMEye / NetSurveillance** depuis Home Assistant, sans ActiveX ni Internet Explorer. Elle utilise le protocole de la caméra (DVRIP, port TCP **34567**), le même que l'interface NetSurveillance WEB et le logiciel CMS.

## Configuration

```yaml
cameras:
  - name: Palier
    host: 192.168.1.50
    port: 34567
    username: admin
    password: ""
```

| Option | Rôle |
| --- | --- |
| `name` | Nom affiché dans la page |
| `host` | Adresse IP de la caméra |
| `port` | Port DVRIP de la caméra : **34567** par défaut (celui du logiciel CMS, pas le port web 80) |
| `username` | Utilisateur de la caméra, souvent `admin` |
| `password` | Mot de passe ; vide si la caméra n'en a pas |
| `http_port` | Facultatif : port web de la caméra (80 par défaut), pour son image |
| `snapshot_entity` | Facultatif : entité caméra de Home Assistant (par exemple celle de l'intégration ONVIF, `camera.palier_profile_000`) qui fournit l'image sous la grille de détection |

Plusieurs caméras : ajoutez une ligne par caméra. Redémarrez l'application après chaque changement de configuration.

## La page de réglages

Ouvrez **Caméra XiongMai** dans la barre latérale.

- **Infos et actions** : modèle, version et date du firmware, temps de fonctionnement ; heure de la caméra et de Home Assistant, avec le bouton **Mettre la caméra à l'heure de Home Assistant** ; **Exporter toute la configuration** ; **Redémarrer la caméra** (deux clics).
- **Une page par section** (Image, Vidéo, Détection, Alarmes, Réseau, Système) : les réglages lus sur la caméra, avec leur nom en français et leur nom d'origine en petit. Modifiez puis cliquez sur **Enregistrer sur la caméra**.
  - Les interrupteurs remplacent les valeurs `0x00000000` / `0x00000001`.
  - Les adresses IP s'affichent en clair (`192.168.1.50`), la caméra les stocke en hexadécimal.
  - **Zones de détection** : la grille (22 × 18 cases en général) est posée sur l'image actuelle de la caméra ; cliquez ou glissez pour choisir les zones surveillées ; boutons **Tout**, **Rien** et **Actualiser l'image**. L'image vient de `snapshot_entity` si elle est renseignée, sinon de la caméra elle-même (protocole DVRIP, puis page web). Si aucune ne répond, la grille reste utilisable sans image.
- **Charger les valeurs d'usine** remplit le formulaire avec les valeurs d'usine de la section, sans rien envoyer : il faut ensuite **Enregistrer**.
- **Éditeur JSON** (Avancé) : lisez et écrivez n'importe quelle section du firmware par son nom (`Record`, `NetWork.NetEmail`, `Uart.Comm`…).

Après certains réglages (réseau surtout), la caméra demande un redémarrage : un message l'indique.

## Heure

**Mettre la caméra à l'heure** envoie l'heure locale de Home Assistant (fuseau et heure d'été compris). C'est un réglage ponctuel : pour que la caméra reste à l'heure et passe seule à l'heure d'été et d'hiver, activez **Heure par Internet (NTP)** avec le bon fuseau, et la règle d'heure d'été dans **Langue, date et heure d'été**.

## Flux et accès

La page **Flux et accès** montre un aperçu de la caméra et les adresses de ses flux :

- **RTSP** (vidéo en direct) : flux principal et secondaire, à copier dans la caméra générique de Home Assistant, go2rtc, VLC ou Frigate. Le mot de passe y figure sous forme d'empreinte : ne publiez pas ces adresses.
- **ONVIF** : l'intégration ONVIF de Home Assistant (hôte de la caméra, port 8899) crée la caméra et un capteur de mouvement.
- **HTTP** : image fixe JPEG et page web de la caméra.

Chaque accès est testé (port ouvert ou fermé).

## Sauvegardes

Avant chaque écriture, l'application relit la section sur la caméra et l'enregistre dans `/data/backups/<caméra>/<section>/` (les 30 dernières par section). Elles sont incluses dans les sauvegardes de Home Assistant. Pour revenir en arrière : liste **Revenir à une sauvegarde…** de la section, puis **Enregistrer**.

## Sécurité

- La page n'est accessible que par la barre latérale de Home Assistant (ingress), pour un utilisateur connecté. Aucun port n'est ouvert sur le réseau.
- L'application ne contacte que les caméras configurées, sur le réseau local. La caméra peut rester sans accès à Internet ; la page **Réseau › Cloud XMEye** permet de couper le cloud du fabricant.
- La mise à jour du firmware n'est pas proposée.

## Dépannage

| Message | Que faire |
| --- | --- |
| Caméra injoignable | Vérifiez l'adresse IP, et que le port 34567 est ouvert (réglage **TCPPort** de la page Réseau de l'interface d'origine). |
| Nom d'utilisateur ou mot de passe incorrect | Vérifiez `username` et `password`. Après plusieurs essais, la caméra peut bloquer le compte quelques minutes. |
| Lecture impossible | Ce modèle ne propose pas ce réglage, ou sous un autre nom : essayez l'Éditeur JSON. |
| Réussi, la caméra doit redémarrer | Utilisez **Infos et actions › Redémarrer la caméra**. |
