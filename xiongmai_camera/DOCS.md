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

Plusieurs caméras : ajoutez une ligne par caméra. Redémarrez l'application après chaque changement de configuration.

## La page de réglages

Ouvrez **Caméra XiongMai** dans la barre latérale.

- **Infos et actions** : modèle, version et date du firmware, temps de fonctionnement ; heure de la caméra et de Home Assistant, avec le bouton **Mettre la caméra à l'heure de Home Assistant** ; **Exporter toute la configuration** ; **Redémarrer la caméra** (deux clics).
- **Une page par section** (Image, Vidéo, Détection, Alarmes, Réseau, Système) : les réglages lus sur la caméra, avec leur nom en français et leur nom d'origine en petit. Modifiez puis cliquez sur **Enregistrer sur la caméra**.
  - Les interrupteurs remplacent les valeurs `0x00000000` / `0x00000001`.
  - Les adresses IP s'affichent en clair (`192.168.1.50`), la caméra les stocke en hexadécimal.
  - **Zones de détection** : une grille de 22 × 18 cases, à cliquer ou glisser ; boutons **Tout** et **Rien**.
- **Charger les valeurs d'usine** remplit le formulaire avec les valeurs d'usine de la section, sans rien envoyer : il faut ensuite **Enregistrer**.
- **Éditeur JSON** (Avancé) : lisez et écrivez n'importe quelle section du firmware par son nom (`Record`, `NetWork.NetEmail`, `Uart.Comm`…).

Après certains réglages (réseau surtout), la caméra demande un redémarrage : un message l'indique.

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
