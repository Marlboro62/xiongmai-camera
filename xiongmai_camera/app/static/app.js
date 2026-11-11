/* Caméra XiongMai : page de réglages (application Home Assistant, ingress).
 * Les formulaires sont construits à partir du JSON renvoyé par la caméra : tout réglage est modifiable,
 * avec un libellé en français quand il est connu. Avant chaque écriture, le serveur sauvegarde l'état actuel. */
(() => {
"use strict";

/* -------------------------------------------------------------- sections */
const SECTIONS = [
  ["Image", [
    ["Camera.Param", "Exposition, jour / nuit, infrarouge", "Mode jour / nuit, coupe-infrarouge, exposition, gain, miroir et retournement de l'image."],
    ["Camera.ParamEx", "Image (avancé)", "Contre-jour, mode couloir, réduction de surexposition, style d'image."],
    ["AVEnc.VideoColor", "Couleurs", "Luminosité, contraste, saturation, teinte, netteté (par plage horaire)."],
  ]],
  ["Vidéo", [
    ["Simplify.Encode", "Encodage", "Flux principal et secondaire : codec, résolution, images par seconde, débit."],
    ["AVEnc.VideoWidget", "Textes à l'écran (OSD)", "Nom de la caméra et horodatage incrustés dans l'image."],
  ]],
  ["Détection", [
    ["Detect.MotionDetect", "Détection de mouvement", "Activation, sensibilité, zones, actions (message, enregistrement, photo)."],
    ["Detect.BlindDetect", "Caméra masquée", "Alerte si l'objectif est caché."],
    ["Detect.LossDetect", "Perte vidéo", "Alerte si l'image est perdue."],
  ]],
  ["Alarmes", [
    ["Alarm.AlarmIn", "Entrées d'alarme", "Contacts branchés sur la caméra."],
    ["Alarm.AlarmOut", "Sortie d'alarme", "Relais de sortie de la caméra."],
  ]],
  ["Réseau", [
    ["NetWork.NetCommon", "Réseau", "Adresse IP, masque, passerelle, ports. Attention : une erreur peut rendre la caméra injoignable."],
    ["NetWork.NetDHCP", "DHCP", "Adresse automatique ou fixe."],
    ["NetWork.NetDNS", "DNS", "Serveurs de noms."],
    ["NetWork.NetNTP", "Heure par Internet (NTP)", "Serveur de temps, fuseau, fréquence de mise à l'heure."],
    ["NetWork.RTSP", "RTSP", "Flux vidéo RTSP (port 554 par défaut)."],
    ["NetWork.Nat", "Cloud XMEye", "Connexion au cloud du fabricant (XMEye). À désactiver si la caméra n'a pas accès à Internet."],
  ]],
  ["Système", [
    ["General.General", "Général", "Nom de l'appareil, déconnexion automatique, écrasement des enregistrements."],
    ["General.Location", "Langue, date et heure d'été", "Format de date et d'heure, heure d'été, standard vidéo."],
  ]],
];
const RISKY = /^NetWork\.(NetCommon|NetDHCP|NetDNS)$/;

/* ---------------------------------------------------------------- libellés */
const L = {
  // Camera.Param
  AeSensitivity: ["Sensibilité de l'exposition automatique", "1 à 10"], ApertureMode: ["Diaphragme automatique"], BLCMode: ["Compensation de contre-jour (BLC)"],
  DayNightColor: ["Mode jour / nuit"], Day_nfLevel: ["Réduction du bruit le jour", "0 à 5"],
  Night_nfLevel: ["Réduction du bruit la nuit", "0 à 5"], DncThr: ["Seuil de passage jour / nuit"], ElecLevel: ["Niveau électronique de référence", "0 à 100"],
  EsShutter: ["Obturateur lent", "Allonge l'exposition la nuit : image plus claire, mais mouvements flous"], ExposureParam: ["Exposition"], LeastTime: ["Temps d'exposition minimal (ms)"], MostTime: ["Temps d'exposition maximal (ms)", "Plus long : image plus claire la nuit, mais mouvements flous"],
  Level: ["Niveau"], GainParam: ["Gain"], AutoGain: ["Gain automatique"], Gain: ["Gain", "0 à 100"],
  IRCUTMode: ["Mode du filtre infrarouge (IR-CUT)"], IrcutSwap: ["Inverser le filtre infrarouge"], PictureFlip: ["Retourner l'image (haut / bas)"],
  PictureMirror: ["Image miroir (gauche / droite)"], RejectFlicker: ["Anti-scintillement (éclairage 50 Hz)"], WhiteBalance: ["Balance des blancs"],
  // Camera.ParamEx
  AutomaticAdjustment: ["Réglage automatique de l'image"], LDCValue: ["Force de la correction de déformation", "Utilisée quand la correction de la déformation est activée"],
  AlarmInfo: ["Texte de l'alerte", "Texte joint au message envoyé"], MsgtoNetEnable: ["Envoi au logiciel CMS (réseau)"], MultimediaMsgEnable: ["Message multimédia (MMS)"],
  DnsServer1: ["Serveur DNS du cloud 1"], DnsServer2: ["Serveur DNS du cloud 2"], IranCalendar: ["Calendrier iranien"], Language: ["Langue", "Menus intégrés de l'appareil (écran branché sur un enregistreur) : sans effet visible sur une caméra seule. La langue de NetSurveillance se choisit sur sa page de connexion"], ChannelName: ["Nom de la caméra"],
  SnapInterval: ["Intervalle entre deux photos (s)", "0 = réglage par défaut"],
  ChannelNum: ["Nombre de canaux", "Information de la caméra : ne pas modifier"], DeviceType: ["Type d'appareil", "Information de la caméra : ne pas modifier"],
  OtherFunction: ["Autres fonctions", "Réservé au fabricant : laisser vide"], SN: ["Numéro de série (réseau)", "Ne le publiez pas"],
  pAddr: ["Adresse IPv6"], pGateway: ["Passerelle IPv6"], pLocalLinkAddr: ["Adresse IPv6 locale (lien)"], IPv6: ["IPv6"], Ipv6: ["IPv6"],
  VoiceTipInterval: ["Intervalle entre deux messages vocaux (s)"], VoiceType: ["Type de message vocal"],
  AeMeansure: ["Mesure de la lumière"], Ldc: ["Correction de la déformation de l'objectif", "Redresse les bords courbés (effet grand angle)"], BroadTrends: ["Large dynamique (WDR)"], CorridorMode: ["Mode couloir (image verticale)"], Dis: ["Stabilisation"],
  ExposureTime: ["Temps d'exposition (ms)"], LightRestrainLevel: ["Atténuation des lumières fortes", "Phares, lampadaires : 0 = désactivée, plus haut = plus atténué"], LowLuxMode: ["Mode faible luminosité", "Image plus claire dans le noir, un peu plus de bruit"],
  PreventOverExpo: ["Éviter la surexposition", "Évite les visages « brûlés » par l'infrarouge de près"], SoftPhotosensitivecontrol: ["Détection du jour et de la nuit"], Style: ["Style d'image", "Rendu des couleurs et du contraste"],
  Covers: ["Zones masquées", "Rectangles noircis sur l'image (confidentialité)"], CoversNum: ["Nombre de zones masquées", "0 = aucune"],
  // couleurs
  Enable: ["Activé"], TimeSection: ["Plage horaire"], VideoColorParam: ["Réglages de couleur"], Acutance: ["Netteté"], Brightness: ["Luminosité", "0 à 100"],
  Contrast: ["Contraste", "0 à 100"], Hue: ["Teinte", "0 à 100"], Saturation: ["Saturation", "0 à 100"], Whitebalance: ["Balance des blancs"],
  // encodage
  MainFormat: ["Flux principal"], ExtraFormat: ["Flux secondaire"], AudioEnable: ["Audio"], VideoEnable: ["Vidéo activée"], Video: ["Vidéo"],
  BitRate: ["Débit (kbit/s)"], BitRateControl: ["Contrôle du débit", "CBR : constant · VBR : variable"], Compression: ["Codec"], FPS: ["Images par seconde"],
  GOP: ["Intervalle entre images clés (GOP, en secondes)"], Quality: ["Qualité", "1 (faible) à 6 (meilleure), en VBR"], Resolution: ["Résolution"],
  // OSD
  ChannelTitle: ["Nom de la caméra"], Name: ["Nom"], SerialNo: ["Numéro"], ChannelTitleAttribute: ["Affichage du nom"], TimeTitleAttribute: ["Affichage de l'heure"],
  EncodeBlend: ["Incrusté dans la vidéo enregistrée"], PreviewBlend: ["Affiché en direct"], FrontColor: ["Couleur du texte"], BackColor: ["Couleur du fond"], RelativePos: ["Position", "En % de l'image, depuis le coin en haut à gauche"],
  // détection et événements
  Region: ["Zones de détection"], EventHandler: ["Actions"], AlarmOutEnable: ["Déclencher la sortie d'alarme"], AlarmOutLatch: ["Durée de la sortie d'alarme (s)"],
  BeepEnable: ["Bip"], EventLatch: ["Délai entre deux alertes (s)"], FTPEnable: ["Envoi FTP"], MailEnable: ["Envoi d'un e-mail"], MessageEnable: ["Envoi au Centre d'alarme / application"],
  RecordEnable: ["Enregistrement"], RecordLatch: ["Durée d'enregistrement après l'alerte (s)"], ShowInfo: ["Afficher un message"], SnapEnable: ["Photo"],
  TipEnable: ["Message à l'écran"], VoiceEnable: ["Message vocal"], LogEnable: ["Journal"], PtzEnable: ["Action PTZ"], TourEnable: ["Ronde", "Caméra motorisée seulement"],
  MatrixEnable: ["Matrice vidéo", "Enregistreur seulement : sans effet sur une caméra seule"], CheckDiskInterval: ["Vérification du disque (s)", "Enregistreur seulement"],
  AlarmOutMask: ["Sorties d'alarme déclenchées"], RecordMask: ["Canaux à enregistrer"], SnapShotMask: ["Canaux à photographier"], ShowInfoMask: ["Canaux qui affichent le message"],
  TourMask: ["Canaux qui lancent la ronde", "Caméra motorisée seulement"], MatrixMask: ["Canaux de la matrice", "Enregistreur seulement"], PtzLink: ["Action PTZ par canal", "Caméra motorisée seulement"],
  TimeSection: ["Plage horaire", "Jours et heures où ce réglage s'applique"], MultiPicture: ["Écran multiple"], ShortMsgEnable: ["SMS"], SensorType: ["Type de contact", "NO : normalement ouvert · NC : normalement fermé"],
  AlarmOutStatus: ["État"], AlarmOutType: ["Mode"],
  // réseau
  HostIP: ["Adresse IP"], Submask: ["Masque de sous-réseau"], GateWay: ["Passerelle"], HostName: ["Nom d'hôte"], HttpPort: ["Port web (HTTP)"],
  TCPPort: ["Port média (DVRIP)", "34567 par défaut : utilisé par cette application"], UDPPort: ["Port UDP"], SSLPort: ["Port SSL"], MAC: ["Adresse MAC"],
  MaxBps: ["Débit maximal"], MonMode: ["Mode de transport"], TCPMaxConn: ["Connexions simultanées au plus"], TransferPlan: ["Priorité de transfert"],
  UseHSDownLoad: ["Téléchargement rapide"], Interface: ["Interface"], Address: ["Adresse"], SpareAddress: ["Adresse de secours"],
  Server: ["Serveur"], Port: ["Port"], UserName: ["Utilisateur"], Password: ["Mot de passe"], Anonymity: ["Anonyme"], TimeZone: ["Fuseau horaire (index de la caméra)"],
  UpdatePeriod: ["Mise à l'heure toutes les (minutes)"], Client: ["Client"], IsClient: ["Mode client"], IsServer: ["Serveur RTSP activé"],
  NatEnable: ["Cloud XMEye activé"], Addr: ["Serveur du cloud"], DnsServer1: ["DNS du cloud"], DnsServer2: ["DNS du cloud (secours)"], MTU: ["MTU"], XMeyeMTU: ["MTU XMEye"],
  // système
  AutoLogout: ["Déconnexion automatique (minutes, 0 : jamais)"], FontSize: ["Taille du texte"], IranCalendarEnable: ["Calendrier iranien"], LocalNo: ["Numéro de l'appareil"],
  MachineName: ["Nom de l'appareil"], OverWrite: ["Quand le disque est plein"], ScreenAutoShutdown: ["Extinction de l'écran"], ScreenSaveTime: ["Écran de veille"],
  VideoOutPut: ["Sortie vidéo", "Sortie écran des enregistreurs : laisser sur Auto"], DSTEnd: ["Fin de l'heure d'été", "France : le dernier dimanche d'octobre à 3 h"], DSTStart: ["Début de l'heure d'été", "France : le dernier dimanche de mars à 2 h"], DSTRule: ["Heure d'été", "Passage automatique à l'heure d'été et d'hiver"], DateFormat: ["Format de la date"],
  DateSeparator: ["Séparateur de date"], TimeFormat: ["Format de l'heure"], VideoFormat: ["Standard vidéo", "PAL en Europe"],
  WorkDay: ["Jours ouvrés", "Jours de travail pour les plannings de l'enregistreur"], Day: ["Jour"], Hour: ["Heure"], Minute: ["Minute"], Month: ["Mois"], Week: ["Semaine"], Year: ["Année"],
};
// valeurs proposées (liste avec saisie libre) pour quelques réglages connus
const SUGGEST = {};
/* Textes qui sont des choix : [valeur envoyée à la caméra, libellé] ; une valeur inconnue reste proposée telle quelle */
const STR_ENUM = {
  Style: [["typedefault", "Par défaut"], ["type1", "Style 1"], ["type2", "Style 2"], ["type3", "Style 3"]],
  BitRateControl: [["CBR", "Débit constant (CBR)"], ["VBR", "Débit variable (VBR)"]], Compression: [["H.264", "H.264"], ["H.265", "H.265 (plus léger, moins compatible)"]],
  Resolution: [["1080P", "1080P (1920 × 1080)"], ["960P", "960P (1280 × 960)"], ["720P", "720P (1280 × 720)"], ["D1", "D1 (704 × 576)"], ["CIF", "CIF (352 × 288)"], ["QVGA", "QVGA (320 × 240)"]],
  DateFormat: [["DDMMYY", "JJ MM AAAA"], ["MMDDYY", "MM JJ AAAA"], ["YYMMDD", "AAAA MM JJ"]], DateSeparator: [["/", "/"], ["-", "-"], [".", "."]],
  TimeFormat: [["24", "24 h"], ["12", "12 h (AM / PM)"]], VideoFormat: [["PAL", "PAL (Europe)"], ["NTSC", "NTSC (Amérique, Japon)"]],
  DSTRule: [["On", "Activée"], ["Off", "Désactivée"]], SensorType: [["NO", "Normalement ouvert (NO)"], ["NC", "Normalement fermé (NC)"]],
  OverWrite: [["OverWrite", "Écraser les plus anciens"], ["StopRecord", "Arrêter l'enregistrement"]], MonMode: [["TCP", "TCP"], ["UDP", "UDP"]],
  TransferPlan: [["Quality", "Priorité à la qualité"], ["Fluency", "Priorité à la fluidité"], ["AutoAdapt", "Automatique"]],
  VideoOutPut: [["Auto", "Automatique"]],
};
/* Langues du firmware (liste donnée par la caméra) */
const LANG_FR = { English: "Anglais", French: "Français", SimpChinese: "Chinois simplifié", TradChinese: "Chinois traditionnel", German: "Allemand", Spanish: "Espagnol",
  Italian: "Italien", Portugal: "Portugais", Portuguese: "Portugais", Russian: "Russe", Polish: "Polonais", Turkey: "Turc", Turkish: "Turc", Japanese: "Japonais", Korean: "Coréen",
  Thai: "Thaï", Vietnamese: "Vietnamien", Arabic: "Arabe", Hebrew: "Hébreu", Czech: "Tchèque", Hungarian: "Hongrois", Greek: "Grec", Romanian: "Roumain", Dutch: "Néerlandais",
  Swedish: "Suédois", Finnish: "Finnois", Persian: "Persan", Brazilian: "Portugais (Brésil)", Bulgarian: "Bulgare", Indonesian: "Indonésien", Ukrainian: "Ukrainien" };
// réglages « 0x00000000 / 0x00000001 » à présenter comme un interrupteur
const HEX_BOOL = new Set(["PictureFlip", "PictureMirror", "RejectFlicker", "BLCMode", "ApertureMode"]);
/* Valeurs hexadécimales qui sont en fait des choix (même codage que NetSurveillance et CMS) */
const HEX_ENUM = {
  DayNightColor: [[0, "Automatique (couleur le jour, noir et blanc la nuit)"], [1, "Toujours en couleur"], [2, "Toujours en noir et blanc"]],
  EsShutter: [[0, "Désactivé"], [2, "Faible"], [4, "Moyen"], [6, "Fort"]],
  WhiteBalance: [[0, "Automatique"], [1, "Intérieur"], [2, "Extérieur"]],
};
/* Nombres qui sont des choix */
const NUM_ENUM = {
  IRCUTMode: [[0, "Synchronisé avec les LED infrarouges"], [1, "Automatique (selon la lumière)"]],
  SoftPhotosensitivecontrol: [[0, "Par le capteur de lumière de la caméra"], [1, "Par l'analyse de l'image (logiciel)"]],
  AeMeansure: [[0, "Moyenne de toute l'image"], [1, "Priorité au centre de l'image"]],
};
/* Temps d'exposition : microsecondes en hexadécimal (0x10000 = 65 536 µs), affichés en millisecondes */
const US_KEYS = new Set(["LeastTime", "MostTime", "ExposureTime"]);
/* Nombres 0 / 1 qui sont des interrupteurs */
const NUM_BOOL = new Set(["IranCalendar", "IranCalendarEnable", "AutoGain", "IrcutSwap", "Ldc", "LowLuxMode", "PreventOverExpo", "CorridorMode", "Dis"]);

// adresses IPv4 codées en hexadécimal, octets à l'envers (0x0A01A8C0 = 192.168.1.10)
const IP_KEYS = new Set(["HostIP", "Submask", "GateWay", "Address", "SpareAddress", "DnsServer1", "DnsServer2"]);

/* ----------------------------------------------------------------- outils */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = (v) => JSON.parse(JSON.stringify(v));
const hexToIp = (h) => { const n = parseInt(h, 16); return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255].join("."); };
const ipToHex = (ip) => { const p = ip.split(".").map(Number); if (p.length !== 4 || p.some((x) => !(x >= 0 && x <= 255))) return null; return "0x" + ((p[3] << 24 >>> 0) + (p[2] << 16) + (p[1] << 8) + p[0]).toString(16).toUpperCase().padStart(8, "0"); };
/** Couleurs des textes à l'écran : 0xAARRGGBB (opacité, rouge, vert, bleu), vérifié sur une caméra V4.02. */
const COLOR_KEYS = new Set(["FrontColor", "BackColor"]);
const COLORS = [["Blanc", "FFFFFF"], ["Noir", "000000"], ["Gris", "808080"], ["Rouge", "FF0000"], ["Vert", "00FF00"], ["Bleu", "0000FF"],
  ["Jaune", "FFFF00"], ["Cyan", "00FFFF"], ["Magenta", "FF00FF"], ["Orange", "FF8000"]];
function colorField(key, value, path, id) {
  const n = parseInt(value, 16) >>> 0, alpha = n >>> 24, rgb = (n & 0xFFFFFF).toString(16).toUpperCase().padStart(6, "0");
  const keepAlpha = (alpha || 0xF0).toString(16).toUpperCase().padStart(2, "0");
  const opts = [];
  let known = false;
  const opt = (label, v) => { const sel = (parseInt(v, 16) >>> 0) === n; known ||= sel; opts.push(`<option value="${v}"${sel ? " selected" : ""}>${label}</option>`); };
  opt("Transparent (aucun)", "0x00000000");
  for (const [label, c] of COLORS) opt(label, `0x${keepAlpha}${c}`);
  const name = COLORS.find(([, c]) => c === rgb)?.[0];
  if (!known) opts.push(`<option value="${esc(value)}" selected>${esc(name ? `${name} (opacité ${Math.round(alpha / 2.55)} %)` : `Autre (${value})`)}</option>`);
  return `<div class="row">${labelFor(key, path)}<select id="${esc(id)}" data-path="${esc(path)}" data-type="str">${opts.join("")}</select></div>`;
}
/* Masques de canaux (« 0x000…01 ») : une case par canal de la caméra (bit 0 = canal 1). */
const isLongHex = (v) => typeof v === "string" && /^0x[0-9a-f]{9,}$/i.test(v);
function channels(key) {
  const i = S.sys?.[S.cam?.id] || {};
  const n = Number(key === "AlarmOutMask" ? i.AlarmOutChannel : i.VideoInChannel) || 1;
  return Math.min(Math.max(n, 1), 64);
}
function maskField(key, value, path) {
  const n = BigInt(value), count = channels(key);
  const boxes = Array.from({ length: count }, (_, b) => {
    const on = (n >> BigInt(b)) & 1n;
    const label = key === "AlarmOutMask" ? `Sortie ${b + 1}` : count === 1 ? "Cette caméra" : `Canal ${b + 1}`;
    return `<label class="chk"><span class="sw"><input type="checkbox" data-bit="${b}" ${on ? "checked" : ""}><span></span></span>${esc(label)}</label>`;
  }).join("");
  return `<div class="row">${labelFor(key, path)}<div class="chks" data-path="${esc(path)}" data-type="mask" data-orig="${esc(value)}">${boxes}</div></div>`;
}

/* Action PTZ liée à l'alerte, par canal : ["None", 0], ["Preset", 3]… (seuls les canaux réels sont affichés). */
const PTZ = [["None", "Aucune"], ["Preset", "Aller au préréglage n°"], ["Tour", "Lancer la ronde n°"], ["Pattern", "Lancer le parcours n°"]];
const isPtz = (v) => Array.isArray(v) && v.length && v.every((x) => Array.isArray(x) && x.length === 2 && typeof x[0] === "string");
function ptzField(key, value, path) {
  const count = Math.min(channels(key), value.length);
  const rows = value.slice(0, count).map(([type, num], i) => {
    const opts = PTZ.map(([v, l]) => `<option value="${v}"${v === type ? " selected" : ""}>${esc(l)}</option>`).join("") + (PTZ.some(([v]) => v === type) ? "" : `<option selected value="${esc(type)}">${esc(type)}</option>`);
    return `<div class="ptz" data-i="${i}">${count > 1 ? `<span class="muted">Canal ${i + 1}</span>` : ""}<select>${opts}</select><input type="number" min="0" max="255" value="${esc(num)}"></div>`;
  }).join("");
  return `<div class="row">${labelFor(key, path)}<div data-path="${esc(path)}" data-type="ptz">${rows}</div></div>`;
}

/* Plages horaires : 7 jours (0 = dimanche) × 6 plages « 1 08:00:00-18:00:00 » (1 = active). */
const DAYS = [[1, "Lundi"], [2, "Mardi"], [3, "Mercredi"], [4, "Jeudi"], [5, "Vendredi"], [6, "Samedi"], [0, "Dimanche"]];
const SLOT_RE = /^([01]) (\d\d:\d\d):\d\d-(\d\d:\d\d):\d\d$/;
const HHMM_RE = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;
const isSchedule = (v) => Array.isArray(v) && v.length === 7 && v.every((d) => Array.isArray(d) && d.length && d.every((x) => SLOT_RE.test(x)));
function scheduleField(key, value, path) {
  const rows = DAYS.map(([d, name]) => {
    const slots = value[d].map((txt, k) => {
      const [, en, from, to] = txt.match(SLOT_RE);
      const shown = en === "1" || k === 0;
      return `<div class="slot" data-d="${d}" data-k="${k}"${shown ? "" : " hidden"}><label class="sw"><input type="checkbox" ${en === "1" ? "checked" : ""} aria-label="Plage active"><span></span></label>
        de <input type="text" class="hhmm" value="${from}" inputmode="numeric" aria-label="Début"> à <input type="text" class="hhmm" value="${to}" inputmode="numeric" aria-label="Fin"></div>`;
    }).join("");
    const more = value[d].length > 1 ? `<button type="button" class="btn small" data-addslot="${d}">+ plage</button>` : "";
    return `<div class="day"><b>${name}</b><div>${slots}${more}</div></div>`;
  }).join("");
  return `<div class="row md-row">${labelFor(key, path)}<div class="sched" data-path="${esc(path)}" data-type="sched">${rows}
    <div class="bar"><button type="button" class="btn small" data-allday="1">Tous les jours, 24 h / 24</button><button type="button" class="btn small" data-copymon="1">Copier le lundi sur tous les jours</button></div></div></div>`;
}

/* Position des textes et des zones masquées : coordonnées sur 8192 (largeur et hauteur de l'image).
 * Texte : [x, y, …] (les deux derniers nombres sont conservés) ; zone masquée : [gauche, haut, droite, bas]. */
const POS_MAX = 8192;
function relPosField(key, value, path) {
  const rect = /Covers/.test(path);
  const names = rect ? ["Gauche", "Haut", "Droite", "Bas"] : ["Horizontal", "Vertical"];
  const inputs = names.map((n, i) => `<label class="pos"><small>${n}</small><input type="number" min="0" max="100" step="0.1" data-i="${i}" value="${Math.round(value[i] / POS_MAX * 1000) / 10}"> %</label>`).join("");
  return `<div class="row">${labelFor(key, path)}<div class="poss" data-path="${esc(path)}" data-type="relpos" data-orig="${esc(JSON.stringify(value))}">${inputs}</div></div>`;
}
/* Heure d'été (DSTStart / DSTEnd), même codage que NetSurveillance :
 * mode « jour de la semaine » : Week 1 à 4 = 1re à 4e semaine, 5 = dernière ; Day 0 = dimanche … 6 = samedi.
 * mode « date » : Week 0, Day = jour du mois, Year utilisé. */
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const WEEKS = [[1, "1er"], [2, "2e"], [3, "3e"], [4, "4e"], [5, "dernier"]];
const isDst = (v) => v && typeof v === "object" && !Array.isArray(v) && ["Day", "Hour", "Minute", "Month", "Week", "Year"].every((k) => Number.isInteger(v[k]));
function dstField(key, v, path) {
  const sel = (cls, list, cur) => `<select class="${cls}">${list.map(([val, l]) => `<option value="${val}"${val === cur ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const byWeek = v.Week !== 0;
  const months = MONTHS.map((m, i) => [i + 1, m]);
  const hours = Array.from({ length: 24 }, (_, h) => [h, `${h} h`]);
  const mins = [0, 15, 30, 45].includes(v.Minute) ? [0, 15, 30, 45].map((m) => [m, String(m).padStart(2, "0")]) : [[v.Minute, String(v.Minute).padStart(2, "0")], ...[0, 15, 30, 45].map((m) => [m, String(m).padStart(2, "0")])];
  return `<div class="row">${labelFor(key, path)}<div class="dst" data-path="${esc(path)}" data-type="dst" data-orig="${esc(JSON.stringify(v))}">
    ${sel("d-mode", [[1, "Un jour de la semaine"], [0, "Une date précise"]], byWeek ? 1 : 0)}
    <div class="d-week"${byWeek ? "" : " hidden"}>le ${sel("d-wk", WEEKS, byWeek ? v.Week : 5)} ${sel("d-wd", WEEKDAYS.map((d, i) => [i, d]), byWeek ? v.Day : 0)} de ${sel("d-m1", months, v.Month)}</div>
    <div class="d-date"${byWeek ? " hidden" : ""}>le ${sel("d-day", Array.from({ length: 31 }, (_, i) => [i + 1, String(i + 1)]), byWeek ? 1 : v.Day)} ${sel("d-m2", months, v.Month)} <input type="number" class="d-year" min="2000" max="2099" value="${v.Year}"></div>
    <div>à ${sel("d-h", hours, v.Hour)} ${sel("d-min", mins, v.Minute)}</div></div></div>`;
}
/* Jours ouvrés : un bit par jour, bit 0 = dimanche (62 = du lundi au vendredi) */
function workdayField(key, value, path) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const boxes = order.map((d) => `<label class="chk"><input type="checkbox" data-bit="${d}" ${value & (1 << d) ? "checked" : ""}> ${WEEKDAYS[d].slice(0, 3)}.</label>`).join("");
  return `<div class="row">${labelFor(key, path)}<div class="chks" data-path="${esc(path)}" data-type="workday" data-orig="${value}">${boxes}</div></div>`;
}
const isHex = (v) => typeof v === "string" && /^0x[0-9a-f]{1,8}$/i.test(v);
let toastT;
function toast(msg, bad = false) { const t = $("#toast"); t.textContent = msg; t.classList.toggle("bad", bad); t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), bad ? 7000 : 3500); }
async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  let data = null; try { data = await r.json(); } catch (e) { /* réponse non JSON */ }
  if (!r.ok) throw new Error(data?.error || `Erreur ${r.status}`);
  return data;
}

/* ------------------------------------------------------------------ état */
const S = { sys: {}, cams: [], cam: null, page: "info", name: null, value: null, orig: null, backups: [] };

function nav() {
  const items = [`<div class="grp">Caméra</div><button data-page="info">Infos et actions</button>`];
  for (const [grp, list] of SECTIONS) {
    items.push(`<div class="grp">${esc(grp)}</div>`);
    for (const [name, title] of list) items.push(`<button data-page="section" data-name="${esc(name)}">${esc(title)}</button>`);
  }
  items.push(`<div class="grp">Avancé</div><button data-page="raw">Éditeur JSON</button>`);
  $("#nav").innerHTML = items.join("");
  mark();
}
function mark() { for (const b of $("#nav").querySelectorAll("button")) b.classList.toggle("on", b.dataset.page === S.page && (b.dataset.page !== "section" || b.dataset.name === S.name)); }
function sectionMeta(name) { for (const [, list] of SECTIONS) for (const s of list) if (s[0] === name) return s; return [name, name, ""]; }

/* ------------------------------------------------------- page « infos » */
const INFO_L = { HardWare: "Matériel", SoftWareVersion: "Version du firmware", BuildTime: "Date du firmware", SerialNo: "Numéro de série", VideoInChannel: "Entrées vidéo",
  AlarmInChannel: "Entrées d'alarme", AlarmOutChannel: "Sorties d'alarme", ExtraChannel: "Canaux supplémentaires", TalkInChannel: "Audio entrant", TalkOutChannel: "Audio sortant",
  DeviceRunTime: "Temps de fonctionnement", HardWareVersion: "Version du matériel", EncryptVersion: "Version de chiffrement",
  AudioInChannel: "Entrées audio", CombineSwitch: "Mode combiné (enregistreurs)", DigChannel: "Caméras IP (enregistreurs)", UpdataTime: "Dernière mise à jour du firmware",
  UpdataType: "Mise à jour en attente", VideoOutChannel: "Sorties vidéo" };
/** Valeurs de la page Infos en clair */
function infoValue(k, v) {
  if (v === "Unknown" || v === "") return k === "UpdataTime" ? "Jamais" : "Non renseigné";
  if (k === "DeviceRunTime" && isHex(v)) { const min = parseInt(v, 16); return `${Math.floor(min / 1440)} j ${Math.floor(min % 1440 / 60)} h ${min % 60} min`; }
  if (k === "UpdataType" && isHex(v)) return parseInt(v, 16) ? `Oui (${v})` : "Aucune";
  if (k === "CombineSwitch") return v ? "Activé" : "Désactivé";
  return v;
}
async function pageInfo() {
  const m = $("#main");
  m.innerHTML = `<h2>Infos et actions</h2><p class="muted">${esc(S.cam?.name || "")} · ${esc(S.cam?.host || "")}:${esc(S.cam?.port || "")}</p><p class="muted">Lecture…</p>`;
  try {
    const d = await api(`api/${S.cam.id}/info`);
    const rows = Object.entries(d.info).map(([k, v]) => {
      const val = infoValue(k, v);
      // numéro de série masqué par défaut (à ne pas publier sur une capture)
      const cell = k === "SerialNo" ? `<button type="button" class="btn small" data-reveal="${esc(val)}">Afficher (à ne pas publier)</button>` : esc(val);
      return `<tr><td>${esc(INFO_L[k] || k)}</td><td>${cell}</td></tr>`;
    }).join("");
    m.innerHTML = `<h2>Infos et actions</h2><p class="muted">${esc(S.cam.name)} · ${esc(S.cam.host)}:${esc(S.cam.port)}</p>
      <h3>Heure</h3>
      <table class="kv"><tr><td>Heure de la caméra</td><td>${esc(d.time || "—")}</td></tr><tr><td>Heure de Home Assistant</td><td>${d.ha_time_ok === false ? `<span class="muted">indisponible (heure UTC du conteneur : ${esc(d.ha_time)})</span>` : esc(d.ha_time)}</td></tr></table>
      <div class="bar"><button class="btn primary" id="sync"${d.ha_time_ok === false ? " disabled" : ""}>Mettre la caméra à l'heure de Home Assistant</button></div>
      <h3>Actions</h3>
      <div class="bar"><button class="btn" id="export">Exporter toute la configuration (JSON)</button><button class="btn danger" id="reboot">Redémarrer la caméra</button></div>
      <div class="bar"><button class="btn" id="untranslated">Lister les réglages sans nom français</button></div>
      <div id="untr"></div>
      <p class="muted">L'export garde une copie complète des réglages, à conserver avant de gros changements.</p>
      <h3>Système</h3><table class="kv">${rows}</table>`;
    $("#sync").onclick = async () => { try { const r = await api(`api/${S.cam.id}/time`, { method: "POST" }); toast(`Caméra mise à l'heure : ${r.time}`); pageInfo(); } catch (e) { toast(e.message, true); } };
    $("#untranslated").onclick = listUntranslated;
    for (const b of m.querySelectorAll("[data-reveal]")) b.onclick = () => { b.replaceWith(document.createTextNode(b.dataset.reveal)); };
    $("#export").onclick = () => { const names = SECTIONS.flatMap(([, l]) => l.map((s) => s[0])).join(","); window.location.href = `api/${S.cam.id}/export?names=${encodeURIComponent(names)}`; };
    let armed = null;
    $("#reboot").onclick = async (ev) => {
      const b = ev.currentTarget;
      if (!armed) { b.classList.add("armed"); b.textContent = "Confirmer le redémarrage ?"; armed = setTimeout(() => { armed = null; b.classList.remove("armed"); b.textContent = "Redémarrer la caméra"; }, 4000); return; }
      clearTimeout(armed); armed = null;
      try { await api(`api/${S.cam.id}/reboot`, { method: "POST" }); toast("Redémarrage demandé : la caméra revient dans une minute environ."); } catch (e) { toast(e.message, true); }
    };
  } catch (e) {
    m.innerHTML = `<h2>Infos et actions</h2><div class="note bad"><b>Caméra injoignable</b><br>${esc(e.message)}</div>
      <p class="muted">Vérifiez l'adresse, le port (34567), l'utilisateur et le mot de passe dans l'onglet Configuration de l'application.</p>`;
  }
}

/* ------------------------------------------------------- formulaires */
/* Info-bulles : à quoi sert le réglage, et un exemple concret */
const TIPS = {
  // Image
  AeSensitivity: "Vitesse à laquelle la caméra corrige la luminosité quand la lumière change. Exemple : 8 si un lampadaire s'allume et que l'image reste trop sombre plusieurs secondes ; 3 pour éviter que l'image « pompe » au passage des phares.",
  ApertureMode: "Laisse la caméra ouvrir ou fermer son diaphragme selon la lumière (objectifs à diaphragme réglable). Exemple : laisser activé ; sans effet sur la plupart des petites caméras à objectif fixe.",
  BLCMode: "Compensation de contre-jour : éclaircit le sujet quand le fond est très lumineux. Exemple : une personne devant une porte vitrée ensoleillée apparaît en silhouette noire ; activer la rend visible, mais le fond devient blanc.",
  DayNightColor: "Choix couleur / noir et blanc. Exemple : « Automatique » pour une caméra avec infrarouge ; « Toujours en couleur » sous un éclairage permanent la nuit (le filtre infrarouge reste en place).",
  Day_nfLevel: "Réduction du bruit (grain) le jour. Exemple : 3 par défaut ; plus haut l'image est plus lisse mais les détails fins (plaques, visages lointains) deviennent flous.",
  Night_nfLevel: "Réduction du bruit (grain) la nuit, quand l'image est sombre. Exemple : 4 ou 5 pour une image de nuit moins « neigeuse », au prix de mouvements un peu flous.",
  DncThr: "Seuil de luminosité pour passer en mode nuit. Exemple : plus haut, la caméra passe en noir et blanc plus tôt le soir ; plus bas, elle reste en couleur plus longtemps.",
  ElecLevel: "Luminosité visée par l'exposition automatique. Exemple : 50 par défaut ; 60 pour une image globalement plus claire, 40 si le mur blanc est « brûlé ».",
  EsShutter: "Obturateur lent : la caméra garde l'image plus longtemps exposée quand il fait sombre. Exemple : « Faible » pour une image de nuit plus claire ; « Désactivé » si les personnes qui passent laissent une traînée floue.",
  LeastTime: "Temps de pose le plus court autorisé. Exemple : laisser la valeur d'usine ; le baisser n'aide que face à une lumière très forte.",
  MostTime: "Temps de pose le plus long autorisé. Exemple : 40 ms (≈ 1/25 s) garde des mouvements nets la nuit ; 65 ms ou plus éclaircit mais rend flou une personne qui marche.",
  AutoGain: "Amplification automatique du signal dans le noir. Exemple : laisser activé ; désactivé, l'image de nuit sera beaucoup plus sombre.",
  Gain: "Niveau d'amplification maximal. Exemple : 50 par défaut ; plus haut l'image de nuit est plus claire mais plus granuleuse.",
  IRCUTMode: "Moment où le filtre infrarouge bascule. Exemple : « Synchronisé avec les LED infrarouges » évite une image rose au crépuscule.",
  IrcutSwap: "Inverse le sens du filtre infrarouge. Exemple : à activer seulement si l'image est rose le jour et grise la nuit (filtre monté à l'envers).",
  PictureFlip: "Retourne l'image haut / bas. Exemple : caméra fixée au plafond, tête en bas.",
  PictureMirror: "Inverse gauche et droite. Exemple : pour qu'une porte à gauche dans la réalité apparaisse à gauche à l'écran.",
  RejectFlicker: "Supprime les bandes qui défilent sous les néons et LED en 50 Hz (France). Exemple : à activer si des barres horizontales traversent l'image en intérieur.",
  WhiteBalance: "Correction de la teinte selon la lumière. Exemple : « Automatique » convient presque toujours ; « Intérieur » si l'image est trop orange sous des ampoules chaudes.",
  AeMeansure: "Zone de l'image utilisée pour régler la luminosité. Exemple : « Priorité au centre » si une porte au centre est trop sombre à cause d'un ciel clair en haut.",
  CorridorMode: "Image tournée d'un quart de tour (format vertical). Exemple : un couloir ou un escalier, plus haut que large.",
  Dis: "Stabilisation numérique de l'image. Exemple : caméra sur un mât qui bouge avec le vent (recadre légèrement l'image).",
  ExposureTime: "Temps de pose en mode manuel. Exemple : laisser la valeur d'usine tant que le mode d'exposition est automatique (0).",
  LightRestrainLevel: "Atténue les fortes sources de lumière. Exemple : 16 à 32 pour que les phares d'une voiture n'éblouissent pas tout l'écran la nuit ; 0 pour désactiver.",
  LowLuxMode: "Image plus claire quand il fait très sombre. Exemple : allée sans éclairage, en complément de l'infrarouge ; un peu plus de grain.",
  PreventOverExpo: "Évite que l'infrarouge « brûle » ce qui est tout près. Exemple : un visage à 50 cm qui apparaît tout blanc la nuit.",
  SoftPhotosensitivecontrol: "Comment la caméra décide qu'il fait nuit. Exemple : « Par l'analyse de l'image » si la caméra bascule mal (capteur de lumière caché ou éclairé par un lampadaire).",
  Style: "Préréglage de rendu des couleurs et du contraste. Exemple : essayer « Style 1 » puis « Style 2 » et garder celui qui vous plaît.",
  Ldc: "Corrige l'effet « fish-eye » des objectifs grand angle (lignes droites courbées au bord). Exemple : un encadrement de porte qui paraît bombé.",
  LDCValue: "Force de la correction de déformation. Exemple : augmenter jusqu'à ce que les bords de l'image paraissent droits.",
  AutomaticAdjustment: "Réglages automatiques de l'image par la caméra. Exemple : laisser la valeur d'usine.",
  BroadTrends: "Plage dynamique étendue (WDR) : équilibre zones très sombres et très claires. Exemple : une entrée sombre avec une rue ensoleillée derrière.",
  // Couleurs
  Brightness: "Luminosité générale. Exemple : 50 par défaut ; 55 à 60 si l'image paraît terne.",
  Contrast: "Écart entre zones claires et sombres. Exemple : 50 par défaut ; plus haut l'image « claque » plus mais perd des détails dans les ombres.",
  Saturation: "Intensité des couleurs. Exemple : 50 par défaut ; 40 si la végétation paraît fluo.",
  Hue: "Teinte générale. Exemple : laisser à 50 ; changer seulement si toute l'image tire vers le vert ou le violet.",
  Acutance: "Netteté (accentuation des contours). Exemple : 15 par défaut ; trop haut, des halos apparaissent autour des objets.",
  Whitebalance: "Réglage fin de la balance des blancs pour ce créneau horaire. Exemple : laisser la valeur d'usine.",
  // Vidéo
  Compression: "Format de compression vidéo. Exemple : H.264, compris partout (Home Assistant, navigateurs) ; H.265 divise le poids par deux environ mais tous les lecteurs ne le lisent pas.",
  Resolution: "Taille de l'image. Exemple : 1080P pour le flux principal (enregistrement), D1 ou CIF pour le flux secondaire (affichage sur téléphone).",
  FPS: "Images par seconde. Exemple : 15 suffit pour la surveillance et allège le réseau ; 25 pour des mouvements plus fluides.",
  BitRate: "Débit en kbit/s. Exemple : 2048 pour du 1080P à 15 images/s ; plus haut, meilleure image mais fichiers plus lourds.",
  BitRateControl: "Débit constant ou variable. Exemple : « Variable (VBR) » économise de la place quand rien ne bouge.",
  GOP: "Intervalle entre deux images complètes, en secondes. Exemple : 2 par défaut ; plus court, la lecture démarre plus vite mais le débit augmente.",
  Quality: "Qualité visée en débit variable (1 à 6). Exemple : 4 par défaut ; 6 pour la meilleure image.",
  AudioEnable: "Ajoute le son du micro au flux vidéo. Exemple : seulement si la caméra a un micro et que c'est permis (enregistrer des conversations peut être interdit).",
  VideoEnable: "Active ce flux vidéo. Exemple : garder le flux secondaire activé pour l'affichage dans Home Assistant.",
  // Textes à l'écran
  EncodeBlend: "Incruste le texte dans la vidéo enregistrée. Exemple : utile pour garder la date et l'heure sur un extrait exporté.",
  PreviewBlend: "Affiche le texte dans l'image en direct.",
  FrontColor: "Couleur du texte. Exemple : blanc avec un fond noir pour rester lisible sur un mur clair.",
  BackColor: "Couleur du fond derrière le texte. Exemple : « Transparent » pour ne pas masquer l'image.",
  RelativePos: "Position du texte, en % depuis le coin en haut à gauche. Exemple : horizontal 0 et vertical 0 pour le coin en haut à gauche ; horizontal 80 pour le placer à droite.",
  Covers: "Zones masquées en noir sur l'image et les enregistrements. Exemple : cacher la fenêtre ou le jardin d'un voisin (protection de la vie privée).",
  CoversNum: "Nombre de zones masquées actives. Exemple : 1 pour utiliser seulement la première zone de la liste.",
  // Détection et actions
  Region: "Cases de l'image où un mouvement déclenche l'alerte. Exemple : colorier le palier et l'escalier, laisser vides la rue et les arbres qui bougent avec le vent.",
  EventLatch: "Délai minimal entre deux alertes. Exemple : 10 s pour ne pas recevoir dix notifications pour la même personne.",
  RecordEnable: "Enregistre sur la carte SD de la caméra lors d'une alerte. Exemple : inutile si un autre système enregistre déjà en continu.",
  RecordLatch: "Durée d'enregistrement après la fin du mouvement. Exemple : 30 s pour voir où la personne est partie.",
  SnapEnable: "Prend une photo lors d'une alerte (carte SD, FTP ou e-mail).",
  SnapInterval: "Intervalle entre deux photos d'une même alerte. Exemple : 2 s.",
  MessageEnable: "Envoie l'alerte au « Centre d'alarme » ou à l'application XMEye. Exemple : nécessaire pour qu'un service local reçoive les alertes de mouvement.",
  MsgtoNetEnable: "Envoie l'alerte aux logiciels connectés en réseau (CMS).",
  MailEnable: "Envoie un e-mail à chaque alerte (serveur e-mail à régler dans la caméra).",
  FTPEnable: "Dépose photos ou vidéos sur un serveur FTP à chaque alerte. Exemple : un NAS du réseau local.",
  BeepEnable: "Fait biper l'appareil (surtout les enregistreurs).",
  ShowInfo: "Affiche un message à l'écran de l'enregistreur.",
  AlarmOutEnable: "Active la sortie d'alarme (relais) lors d'une alerte. Exemple : déclencher une sirène ou un éclairage branché sur la caméra.",
  AlarmOutLatch: "Durée d'activation de la sortie d'alarme. Exemple : 10 s pour une sirène.",
  PtzEnable: "Déplace une caméra motorisée lors d'une alerte. Sans effet sur une caméra fixe.",
  TimeSection: "Jours et heures où ce réglage s'applique. Exemple : détection active seulement de 22:00 à 07:00 en semaine.",
  Level: "Sensibilité de la détection. Exemple : 4 ; trop haut, la nuit, les insectes devant l'infrarouge déclenchent des alertes.",
  SensorType: "Type du contact branché sur l'entrée d'alarme. Exemple : « Normalement ouvert » pour un contact de porte qui se ferme à l'ouverture.",
  AlarmOutType: "Mode de la sortie d'alarme : automatique (suit les alertes), ou forcée.",
  AlarmOutStatus: "État de la sortie d'alarme en mode forcé.",
  // Réseau
  HostIP: "Adresse IP de la caméra. Attention : une adresse fausse rend la caméra injoignable. Exemple : une adresse fixe hors de la plage DHCP de la box.",
  Submask: "Masque du réseau. Exemple : 255.255.255.0 sur la plupart des réseaux domestiques.",
  GateWay: "Passerelle : l'adresse de la box ou du routeur.",
  TCPPort: "Port du protocole de la caméra (34567 par défaut), utilisé par cette application, CMS et XMEye. Ne pas changer sans raison.",
  HttpPort: "Port de la page web de la caméra (80 par défaut).",
  UDPPort: "Port UDP de la caméra (34568 par défaut).",
  TCPMaxConn: "Nombre maximal de connexions simultanées. Exemple : 10 ; à augmenter si plusieurs logiciels lisent la caméra en même temps.",
  TransferPlan: "Ce que la caméra privilégie quand le réseau est lent : qualité ou fluidité.",
  MonMode: "Transport des flux vers les logiciels de visualisation. Exemple : TCP, plus fiable.",
  NatEnable: "Connexion au cloud du fabricant (XMEye). Exemple : désactiver si vous n'utilisez pas l'application XMEye, la caméra n'envoie plus rien vers Internet.",
  MTU: "Taille maximale des paquets réseau. Ne pas changer sans raison.",
  UpdatePeriod: "Fréquence de mise à l'heure par NTP, en minutes. Exemple : 60.",
  TimeZone: "Fuseau horaire de la caméra. Exemple : GMT+1 pour la France (l'heure d'été se règle dans « Langue, date et heure d'été »).",
  // Système
  DSTRule: "Passage automatique à l'heure d'été et d'hiver. Exemple : activé en France.",
  DSTStart: "Début de l'heure d'été. Exemple en France : le dernier dimanche de mars à 2 h.",
  DSTEnd: "Fin de l'heure d'été. Exemple en France : le dernier dimanche d'octobre à 3 h.",
  VideoFormat: "Standard vidéo. Exemple : PAL en Europe (25 images/s), NTSC en Amérique.",
  MachineName: "Nom de l'appareil, affiché dans CMS et XMEye. Exemple : « Entrée ».",
  AutoLogout: "Déconnexion automatique de l'interface web après inactivité, en minutes. Exemple : 0 pour ne jamais déconnecter.",
  OverWrite: "Ce qui se passe quand la carte SD est pleine. Exemple : « Écraser les plus anciens » pour enregistrer en continu.",
  WorkDay: "Jours de travail utilisés par les plannings de l'enregistreur. Sans effet sur la caméra elle-même.",
};

function labelFor(key, path) {
  // même clé, sens différent selon la section
  const l = key === "Level" && /^Detect\./.test(S.name || "") ? ["Sensibilité", "1 (faible) à 6 (forte)"]
    : key === "Level" && /ExposureParam/.test(path) ? ["Mode d'exposition", "0 = automatique, sinon niveau manuel"] : L[key];
  const title = l ? l[0] : key;
  const hint = l?.[1] ? `<small>${esc(l[1])}</small>` : "";
  const tip = key === "Level" && /ExposureParam/.test(path) ? "" : TIPS[key];
  const info = tip ? `<button type="button" class="info" aria-expanded="false" aria-label="Explication : ${esc(title)}" title="Explication">i</button>` : "";
  return `<label for="f-${esc(path)}"><b>${esc(title)}${info}</b>${hint}${tip ? `<span class="tip" hidden>${esc(tip)}</span>` : ""}<code>${esc(key)}</code></label>`;
}

/** Grille des zones de détection, posée sur l'image de la caméra : une ligne par entier, un bit par case (bit 0 à gauche).
 *  Certains firmwares renvoient plus de lignes (32) que la grille n'en a (18) : seules les lignes de la grille sont affichées,
 *  les autres sont renvoyées telles quelles. */
function motionGrid(path, rows) {
  const cols = S.grid?.cols || 22, nrows = Math.min(rows.length, S.grid?.rows || 18);
  const cells = [];
  rows.slice(0, nrows).forEach((r, y) => { const n = parseInt(r, 16) >>> 0; for (let x = 0; x < cols; x++) cells.push(`<i data-y="${y}" data-x="${x}" class="${n & (1 << x) ? "on" : ""}"></i>`); });
  return `<div class="row md-row"><label><b>Zones de détection</b><small>Cliquez ou glissez sur l'image pour activer ou retirer des cases (orange : surveillé). Grille de ${cols} × ${nrows} cases.</small><code>Region</code></label>
    <div><div class="md-wrap"><img class="md-snap" alt="" src="${snapUrl()}"><div class="grid-md" data-path="${esc(path)}" data-cols="${cols}" data-rows="${nrows}" style="--c:${cols};--r:${nrows}">${cells.join("")}</div></div>
    <p class="muted md-msg" hidden></p>
    <div class="bar"><button type="button" class="btn" data-grid="all" data-path="${esc(path)}">Tout</button><button type="button" class="btn" data-grid="none" data-path="${esc(path)}">Rien</button>
      <button type="button" class="btn" data-snap="1">Actualiser l'image</button></div></div></div>`;
}
function snapUrl() { return `api/${S.cam.id}/snapshot?t=${Date.now()}`; }
function wireSnap(form) {
  for (const img of form.querySelectorAll(".md-snap")) {
    const wrap = img.parentElement, msg = wrap.parentElement.querySelector(".md-msg");
    img.onload = () => { wrap.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`; wrap.classList.add("has-img"); msg.hidden = true; };
    img.onerror = () => { wrap.classList.remove("has-img"); msg.hidden = false; msg.textContent = "Image de la caméra indisponible : la grille reste utilisable. Voir la documentation (option snapshot_entity)."; };
  }
}

function field(key, value, path) {
  const id = `f-${path}`;
  if (typeof value === "boolean") return `<div class="row">${labelFor(key, path)}<label class="sw"><input type="checkbox" id="${esc(id)}" data-path="${esc(path)}" data-type="bool" ${value ? "checked" : ""}><span></span></label></div>`;
  if (HEX_BOOL.has(key) && isHex(value) && parseInt(value, 16) <= 1) return `<div class="row">${labelFor(key, path)}<label class="sw"><input type="checkbox" id="${esc(id)}" data-path="${esc(path)}" data-type="hexbool" ${parseInt(value, 16) ? "checked" : ""}><span></span></label></div>`;
  if (COLOR_KEYS.has(key) && isHex(value)) return colorField(key, value, path, id);
  if (HEX_ENUM[key] && isHex(value)) {
    const n = parseInt(value, 16), known = HEX_ENUM[key].some(([v]) => v === n), width = value.length - 2;
    const opts = HEX_ENUM[key].map(([v, l]) => `<option value="${v}"${v === n ? " selected" : ""}>${esc(l)}</option>`).join("") + (known ? "" : `<option value="${n}" selected>Autre (${esc(value)})</option>`);
    return `<div class="row">${labelFor(key, path)}<select id="${esc(id)}" data-path="${esc(path)}" data-type="hexenum" data-width="${width}">${opts}</select></div>`;
  }
  if (US_KEYS.has(key) && isHex(value)) {
    const ms = parseInt(value, 16) / 1000, frac = ms > 0 ? ` ≈ 1/${Math.round(1000 / ms)} s` : "";
    return `<div class="row">${labelFor(key, path)}<span><input type="number" id="${esc(id)}" data-path="${esc(path)}" data-type="us" data-width="${value.length - 2}" value="${ms}" min="0" step="0.001"> <small class="muted">${esc(frac)}</small></span></div>`;
  }
  if (NUM_ENUM[key] && typeof value === "number") {
    const known = NUM_ENUM[key].some(([v]) => v === value);
    const opts = NUM_ENUM[key].map(([v, l]) => `<option value="${v}"${v === value ? " selected" : ""}>${esc(l)}</option>`).join("") + (known ? "" : `<option value="${value}" selected>Autre (${value})</option>`);
    return `<div class="row">${labelFor(key, path)}<select id="${esc(id)}" data-path="${esc(path)}" data-type="num">${opts}</select></div>`;
  }
  if ((key === "DSTStart" || key === "DSTEnd") && isDst(value)) return dstField(key, value, path);
  if (key === "WorkDay" && Number.isInteger(value) && value >= 0 && value < 128) return workdayField(key, value, path);
  if (key === "Language" && typeof value === "string") {
    const langs = (S.langs?.length ? S.langs : Object.keys(LANG_FR)).map((v) => [v, LANG_FR[v] || v]);
    const known = langs.some(([v]) => v === value);
    const opts = langs.map(([v, l]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(l)}</option>`).join("") + (known ? "" : `<option value="${esc(value)}" selected>${esc(LANG_FR[value] || value)}</option>`);
    return `<div class="row">${labelFor(key, path)}<select id="${esc(id)}" data-path="${esc(path)}" data-type="str">${opts}</select></div>`;
  }
  if (STR_ENUM[key] && typeof value === "string") {
    const known = STR_ENUM[key].some(([v]) => v === value);
    const opts = STR_ENUM[key].map(([v, l]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(l)}</option>`).join("") + (known ? "" : `<option value="${esc(value)}" selected>${esc(value)}</option>`);
    return `<div class="row">${labelFor(key, path)}<select id="${esc(id)}" data-path="${esc(path)}" data-type="str">${opts}</select></div>`;
  }
  if (key === "RelativePos" && Array.isArray(value) && value.length === 4 && value.every(Number.isInteger)) return relPosField(key, value, path);
  if (NUM_BOOL.has(key) && (value === 0 || value === 1)) return `<div class="row">${labelFor(key, path)}<label class="sw"><input type="checkbox" id="${esc(id)}" data-path="${esc(path)}" data-type="numbool" ${value ? "checked" : ""}><span></span></label></div>`;
  if (/Mask$/.test(key) && isLongHex(value)) return maskField(key, value, path);
  if (key === "PtzLink" && isPtz(value)) return ptzField(key, value, path);
  if (key === "TimeSection" && isSchedule(value)) return scheduleField(key, value, path);
  if (key === "TimeSection" && typeof value === "string" && SLOT_RE.test(value)) {
    const [, en, from, to] = value.match(SLOT_RE);
    return `<div class="row">${labelFor(key, path)}<div class="slot" data-path="${esc(path)}" data-type="slot1"><label class="sw"><input type="checkbox" ${en === "1" ? "checked" : ""} aria-label="Plage active"><span></span></label>
      de <input type="text" class="hhmm" value="${from}" inputmode="numeric" aria-label="Début"> à <input type="text" class="hhmm" value="${to}" inputmode="numeric" aria-label="Fin"></div></div>`;
  }
  if (IP_KEYS.has(key) && isHex(value)) return `<div class="row">${labelFor(key, path)}<input type="text" id="${esc(id)}" data-path="${esc(path)}" data-type="ip" value="${esc(hexToIp(value))}" inputmode="decimal"></div>`;
  if (typeof value === "number") return `<div class="row">${labelFor(key, path)}<input type="number" id="${esc(id)}" data-path="${esc(path)}" data-type="num" value="${esc(value)}" step="any"></div>`;
  if (typeof value === "string") {
    const list = SUGGEST[key] ? `<datalist id="dl-${esc(path)}">${SUGGEST[key].map((o) => `<option value="${esc(o)}">`).join("")}</datalist>` : "";
    const pw = key === "Password" ? ` type="password" autocomplete="new-password"` : ` type="text"`;
    return `<div class="row">${labelFor(key, path)}<span><input${pw} id="${esc(id)}" data-path="${esc(path)}" data-type="str" value="${esc(value)}"${list ? ` list="dl-${esc(path)}"` : ""}>${list}</span></div>`;
  }
  if (key === "Region" && Array.isArray(value) && value.length && value.every(isHex)) return motionGrid(path, value);
  if (value === null || (Array.isArray(value) && value.every((x) => x === null || typeof x !== "object" || Array.isArray(x)))) {
    return `<div class="row">${labelFor(key, path)}<textarea id="${esc(id)}" data-path="${esc(path)}" data-type="json">${esc(JSON.stringify(value))}</textarea></div>`;
  }
  return group(key, value, path);
}

/* Titre des éléments d'une liste quand le nom de la section ne convient pas */
const ITEM_TITLE = { "AVEnc.VideoColor": "Réglage selon l'heure" };

function sectionChannels(name) {
  const i = S.sys?.[S.cam?.id] || {};
  const n = Number(name === "Alarm.AlarmIn" ? i.AlarmInChannel : name === "Alarm.AlarmOut" ? i.AlarmOutChannel : i.VideoInChannel);
  return n >= 1 ? n : 64;  // inconnu : tout afficher
}

function group(key, value, path, open = false) {
  const title = L[key]?.[0] || key;
  if (Array.isArray(value)) {
    // le firmware renvoie souvent une copie par canal possible (jusqu'à 16) : on n'affiche que les canaux réels
    let list = value, hidden = 0;
    if (path === "v" && value.length > 1 && value.every((x) => x && typeof x === "object")) {
      const n = sectionChannels(S.name);
      if (value.length > n) { list = value.slice(0, n); hidden = value.length - n; }
    }
    const note = hidden ? `<p class="muted">${hidden} copie(s) pour des canaux que cette caméra n'a pas : non affichées, conservées telles quelles.</p>` : "";
    // un seul élément (une seule caméra) : pas de niveau de titre en plus
    if (list.length === 1 && list[0] && typeof list[0] === "object") return group(key, list[0], `${path}.0`, true) + note;
    const item = ITEM_TITLE[S.name] && path !== "v" ? ITEM_TITLE[S.name] : title;
    const inner = list.map((v, i) => (v && typeof v === "object" ? group(`${item} ${i + 1}`, v, `${path}.${i}`) : field(String(i), v, `${path}.${i}`))).join("");
    return `<details ${open || list.length <= 2 ? "open" : ""}><summary>${esc(title)}</summary>${inner}${note}</details>`;
  }
  const rows = Object.entries(value).map(([k, v]) => field(k, v, `${path}.${k}`)).join("");
  return `<fieldset><legend>${esc(title)}</legend>${rows}</fieldset>`;
}

function setAt(obj, path, val) {
  const keys = path.split(".").slice(1);
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) o = o[Array.isArray(o) ? Number(keys[i]) : keys[i]];
  const last = keys[keys.length - 1];
  o[Array.isArray(o) ? Number(last) : last] = val;
}
function getAt(obj, path) { return path.split(".").slice(1).reduce((o, k) => o?.[Array.isArray(o) ? Number(k) : k], obj); }

function readForm() {
  const v = clone(S.value);
  for (const el of $("#form").querySelectorAll("[data-path][data-type]")) {
    const p = el.dataset.path, t = el.dataset.type;
    if (t === "bool") setAt(v, p, el.checked);
    else if (t === "hexbool") setAt(v, p, el.checked ? "0x00000001" : "0x00000000");
    else if (t === "num") { if (el.value === "" || isNaN(Number(el.value))) throw new Error(`Nombre invalide : ${p.split(".").pop()}`); setAt(v, p, Number(el.value)); }
    else if (t === "ip") { const h = ipToHex(el.value.trim()); if (!h) throw new Error(`Adresse IP invalide : ${el.value}`); setAt(v, p, h); }
    else if (t === "hexenum") setAt(v, p, "0x" + Number(el.value).toString(16).toUpperCase().padStart(Number(el.dataset.width), "0"));
    else if (t === "us") { const us = Math.round(Number(el.value) * 1000); if (!(us >= 0) || el.value === "") throw new Error(`Temps invalide : ${p.split(".").pop()}`); setAt(v, p, "0x" + us.toString(16).toUpperCase().padStart(Number(el.dataset.width), "0")); }
    else if (t === "numbool") setAt(v, p, el.checked ? 1 : 0);
    else if (t === "slot1") {
      const [from, to] = [...el.querySelectorAll(".hhmm")].map((i) => i.value.trim());
      if (!HHMM_RE.test(from) || !HHMM_RE.test(to)) throw new Error(`Heure invalide (format HH:MM, ex. 08:30) : ${from} – ${to}`);
      const orig = getAt(S.value, p), m = orig.match(SLOT_RE);
      // inchangé : renvoyer la valeur d'origine telle quelle (secondes comprises)
      const en = el.querySelector("input[type=checkbox]").checked ? "1" : "0";
      setAt(v, p, m && m[1] === en && m[2] === from && m[3] === to ? orig : `${en} ${from}:00-${to}:00`);
    }
    else if (t === "dst") {
      const o = JSON.parse(el.dataset.orig), q = (c) => Number(el.querySelector(c).value);
      if (q(".d-mode") === 1) Object.assign(o, { Week: q(".d-wk"), Day: q(".d-wd"), Month: q(".d-m1") });
      else { const y = q(".d-year"); if (!(y >= 2000 && y <= 2099)) throw new Error("Année invalide"); Object.assign(o, { Week: 0, Day: q(".d-day"), Month: q(".d-m2"), Year: y }); }
      Object.assign(o, { Hour: q(".d-h"), Minute: q(".d-min") });
      setAt(v, p, o);
    }
    else if (t === "workday") { let n = Number(el.dataset.orig) & ~127; for (const c of el.querySelectorAll("input[data-bit]")) if (c.checked) n |= 1 << Number(c.dataset.bit); setAt(v, p, n); }
    else if (t === "relpos") {
      const arr = JSON.parse(el.dataset.orig);
      for (const i of el.querySelectorAll("input[data-i]")) { const pc = Number(i.value); if (i.value === "" || !(pc >= 0 && pc <= 100)) throw new Error("Position invalide (0 à 100 %)"); if (pc !== Number(i.defaultValue)) arr[i.dataset.i] = Math.round(pc / 100 * POS_MAX); }
      setAt(v, p, arr);
    }
    else if (t === "mask") {
      let n = BigInt(el.dataset.orig);
      for (const c of el.querySelectorAll("input[data-bit]")) { const bit = 1n << BigInt(c.dataset.bit); n = c.checked ? n | bit : n & ~bit; }
      setAt(v, p, "0x" + n.toString(16).toUpperCase().padStart(el.dataset.orig.length - 2, "0"));
    }
    else if (t === "ptz") {
      const arr = clone(getAt(v, p));
      for (const r of el.querySelectorAll(".ptz")) { const num = Number(r.querySelector("input").value); if (!Number.isInteger(num) || num < 0) throw new Error("Numéro PTZ invalide"); arr[r.dataset.i] = [r.querySelector("select").value, num]; }
      setAt(v, p, arr);
    }
    else if (t === "sched") {
      const arr = clone(getAt(v, p));
      for (const sl of el.querySelectorAll(".slot")) {
        const [from, to] = [...sl.querySelectorAll(".hhmm")].map((i) => i.value.trim());
        if (!HHMM_RE.test(from) || !HHMM_RE.test(to)) throw new Error(`Heure invalide (format HH:MM, ex. 08:30) : ${from} – ${to}`);
        arr[sl.dataset.d][sl.dataset.k] = `${sl.querySelector("input[type=checkbox]").checked ? 1 : 0} ${from}:00-${to}:00`;
      }
      setAt(v, p, arr);
    }
    else if (t === "json") { try { setAt(v, p, JSON.parse(el.value)); } catch (e) { throw new Error(`JSON invalide : ${p.split(".").pop()}`); } }
    else setAt(v, p, el.value);
  }
  for (const g of $("#form").querySelectorAll(".grid-md")) {
    // on n'efface que les cases affichées : les autres bits et les lignes en plus restent comme la caméra les a donnés
    const cols = Number(g.dataset.cols), nrows = Number(g.dataset.rows), mask = cols >= 32 ? 0xFFFFFFFF : (2 ** cols) - 1;
    const rows = getAt(v, g.dataset.path).map((r, y) => (y < nrows ? (parseInt(r, 16) & ~mask) >>> 0 : null));
    for (const c of g.querySelectorAll("i.on")) rows[c.dataset.y] = (rows[c.dataset.y] | (1 << c.dataset.x)) >>> 0;
    const orig = getAt(v, g.dataset.path);
    setAt(v, g.dataset.path, rows.map((n, y) => (n === null ? orig[y] : "0x" + n.toString(16).toUpperCase().padStart(8, "0"))));
  }
  return v;
}

async function pageSection(name, preset = null, note = "") {
  const [, title, desc] = sectionMeta(name);
  const m = $("#main");
  m.innerHTML = `<h2>${esc(title)}</h2><p class="muted">${esc(desc)}</p><p class="muted">Lecture…</p>`;
  try {
    const d = await api(`api/${S.cam.id}/config/${encodeURIComponent(name)}`);
    if (!S.sys[S.cam.id]) { try { S.sys[S.cam.id] = (await api(`api/${S.cam.id}/info`)).info; } catch (e) { S.sys[S.cam.id] = {}; } }
    S.name = name; S.orig = d.value; S.value = preset ?? d.value; S.backups = d.backups || []; S.grid = d.grid || null; S.langs = d.languages || null;
    const opts = S.backups.map((b) => `<option value="${esc(b)}">${esc(b.replace("_", " à ").replace(/-(\d\d)-(\d\d)$/, " h $1 min $2"))}</option>`).join("");
    m.innerHTML = `<h2>${esc(title)}</h2><p class="muted">${esc(desc)} · <code>${esc(name)}</code></p>
      ${RISKY.test(name) ? `<div class="note warn"><b>Réglage sensible</b> : une erreur d'adresse ou de port peut rendre la caméra injoignable. Notez les valeurs actuelles, ou exportez la configuration avant de modifier.</div>` : ""}
      ${note ? `<div class="note">${note}</div>` : ""}
      <div class="bar"><button class="btn primary" id="save">Enregistrer sur la caméra</button><button class="btn" id="reload">Annuler les modifications</button>
        <button class="btn" id="defaults">Charger les valeurs d'usine</button>
        ${opts ? `<select id="bk"><option value="">Revenir à une sauvegarde…</option>${opts}</select>` : ""}</div>
      <form id="form" onsubmit="return false">${S.value && typeof S.value === "object" ? group(title, S.value, "v", true) : field(name, S.value, "v")}</form>`;
    wireForm();
  } catch (e) {
    m.innerHTML = `<h2>${esc(title)}</h2><div class="note bad"><b>Lecture impossible</b><br>${esc(e.message)}</div><p class="muted">Cette caméra ne propose peut-être pas ce réglage.</p>`;
  }
}

function wireForm() {
  const form = $("#form");
  form.addEventListener("input", (ev) => ev.target.closest(".row")?.classList.add("changed"));
  // grille de détection : clic et glisser
  let painting = null;
  form.addEventListener("pointerdown", (ev) => { const c = ev.target.closest(".grid-md i"); if (!c) return; painting = !c.classList.contains("on"); c.classList.toggle("on", painting); ev.preventDefault(); });
  form.addEventListener("pointerover", (ev) => { const c = ev.target.closest(".grid-md i"); if (c && painting !== null) c.classList.toggle("on", painting); });
  window.addEventListener("pointerup", () => { painting = null; });
  wireSnap(form);
  // info-bulles : un clic ouvre ou ferme l'explication (fonctionne aussi au doigt)
  form.addEventListener("click", (ev) => {
    const b = ev.target.closest("button.info"); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    const tip = b.closest("label").querySelector(".tip"), open = tip.hidden;
    tip.hidden = !open; b.setAttribute("aria-expanded", String(open)); b.classList.toggle("on", open);
  }, true);
  form.addEventListener("change", (ev) => {
    const m = ev.target.closest(".d-mode"); if (!m) return;
    const box = m.closest(".dst"); box.querySelector(".d-week").hidden = m.value !== "1"; box.querySelector(".d-date").hidden = m.value === "1";
  });
  form.addEventListener("click", (ev) => {
    const add = ev.target.closest("[data-addslot]");
    if (add) { const next = [...add.parentElement.querySelectorAll(".slot[hidden]")][0]; if (next) { next.hidden = false; next.querySelector("input[type=checkbox]").checked = true; } if (!add.parentElement.querySelector(".slot[hidden]")) add.hidden = true; return; }
    const sched = ev.target.closest(".sched");
    if (!sched) return;
    if (ev.target.closest("[data-allday]")) for (const sl of sched.querySelectorAll(".slot")) { const k = sl.dataset.k === "0"; sl.querySelector("input[type=checkbox]").checked = k; const [a, b] = sl.querySelectorAll(".hhmm"); if (k) { a.value = "00:00"; b.value = "24:00"; } }
    if (ev.target.closest("[data-copymon]")) {
      const mon = [...sched.querySelectorAll('.slot[data-d="1"]')];
      for (const sl of sched.querySelectorAll(".slot")) {
        const src = mon[sl.dataset.k]; if (!src || sl.dataset.d === "1") continue;
        sl.querySelector("input[type=checkbox]").checked = src.querySelector("input[type=checkbox]").checked;
        const [a, b] = sl.querySelectorAll(".hhmm"), [c, d] = src.querySelectorAll(".hhmm"); a.value = c.value; b.value = d.value; sl.hidden = src.hidden;
      }
    }
    sched.closest(".row").classList.add("changed");
  });
  form.addEventListener("click", (ev) => { const r = ev.target.closest("[data-snap]"); if (r) { const img = r.closest(".row").querySelector(".md-snap"); img.src = snapUrl(); } });
  form.addEventListener("click", (ev) => { const b = ev.target.closest("[data-grid]"); if (!b) return; for (const c of form.querySelectorAll(`.grid-md[data-path="${b.dataset.path}"] i`)) c.classList.toggle("on", b.dataset.grid === "all"); });
  $("#reload").onclick = () => pageSection(S.name);
  $("#defaults").onclick = async () => {
    try { const d = await api(`api/${S.cam.id}/config/${encodeURIComponent(S.name)}?default=1`); pageSection(S.name, d.value, "Valeurs d'usine chargées dans le formulaire : rien n'est encore envoyé. Cliquez sur <b>Enregistrer</b> pour les appliquer."); }
    catch (e) { toast(e.message, true); }
  };
  const bk = $("#bk");
  if (bk) bk.onchange = async () => {
    if (!bk.value) return;
    try { const d = await api(`api/${S.cam.id}/backup/${encodeURIComponent(S.name)}/${bk.value}`); pageSection(S.name, d.value, `Sauvegarde du ${esc(bk.value)} chargée dans le formulaire : cliquez sur <b>Enregistrer</b> pour la remettre sur la caméra.`); }
    catch (e) { toast(e.message, true); }
  };
  $("#save").onclick = () => save();
}

async function save(value = null, name = S.name) {
  let v = value;
  try { if (v === null) v = readForm(); } catch (e) { toast(e.message, true); return; }
  if (JSON.stringify(v) === JSON.stringify(S.orig) && value === null) { toast("Aucune modification."); return; }
  if (RISKY.test(name) && !window.confirm("Ce réglage peut rendre la caméra injoignable. Enregistrer quand même ?")) return;
  try {
    const r = await api(`api/${S.cam.id}/config/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify({ value: v }) });
    if (r.ignored?.length) {
      const names = r.ignored.map((p) => { const k = p.split(".").pop().replace(/\[\d+\]/g, ""); return L[k]?.[0] || k; });
      toast(`La caméra a refusé ou ignoré : ${[...new Set(names)].join(", ")}. Ce réglage n'est peut-être pas pris en charge par ce modèle, ou demande un redémarrage.`, true);
    } else toast(r.restart ? "Enregistré. La caméra doit redémarrer pour appliquer ce réglage (Infos et actions › Redémarrer)." : "Enregistré sur la caméra (l'ancienne valeur est sauvegardée).");
    if (value === null) pageSection(name);
  } catch (e) { toast(e.message, true); }
}

/** Recense les noms de réglages que l'application ne sait pas encore traduire (noms seulement, aucune valeur). */
async function listUntranslated() {
  const out = $("#untr");
  out.innerHTML = `<p class="muted">Lecture de toutes les sections…</p>`;
  const lines = [];
  for (const [, list] of SECTIONS) for (const [name] of list) {
    let value;
    try { value = (await api(`api/${S.cam.id}/config/${encodeURIComponent(name)}`)).value; } catch (e) { continue; }
    const missing = new Set();
    const walk = (v) => {
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (!L[k]) missing.add(k); walk(x); }
    };
    walk(value);
    if (missing.size) lines.push(`${name} : ${[...missing].sort().join(", ")}`);
  }
  out.innerHTML = lines.length
    ? `<p class="muted">Noms des réglages seulement, aucune valeur : vous pouvez copier cette liste dans une issue GitHub pour qu'ils soient traduits.</p><textarea class="raw" style="min-height:160px" readonly>${esc(lines.join("\n"))}</textarea>`
    : `<p class="muted">Tous les réglages ont un nom en français.</p>`;
}

/* ------------------------------------------------------- éditeur JSON */
function pageRaw() {
  const m = $("#main");
  m.innerHTML = `<h2>Éditeur JSON</h2><p class="muted">Pour les réglages qui n'ont pas de page : saisissez le nom d'une section du firmware (par exemple <code>Record</code>, <code>Uart.Comm</code>, <code>NetWork.NetEmail</code>), lisez-la, modifiez le JSON, puis enregistrez. L'ancienne valeur est sauvegardée avant chaque écriture.</p>
    <div class="bar"><input type="text" id="rname" placeholder="Nom de la section" style="min-width:260px"><button class="btn" id="rload">Lire</button><button class="btn primary" id="rsave">Enregistrer sur la caméra</button></div>
    <textarea class="raw" id="rval" spellcheck="false"></textarea>`;
  $("#rload").onclick = async () => {
    const n = $("#rname").value.trim();
    try { const d = await api(`api/${S.cam.id}/config/${encodeURIComponent(n)}`); S.orig = d.value; $("#rval").value = JSON.stringify(d.value, null, 2); } catch (e) { toast(e.message, true); }
  };
  $("#rsave").onclick = async () => {
    const n = $("#rname").value.trim();
    let v; try { v = JSON.parse($("#rval").value); } catch (e) { toast("JSON invalide", true); return; }
    S.orig = null; await save(v, n);
  };
}

/* ------------------------------------------------------------- routage */
function go(page, name = null) {
  S.page = page; S.name = name; mark();
  if (!S.cam) { $("#main").innerHTML = `<h2>Aucune caméra configurée</h2><div class="note">Ajoutez votre caméra dans l'onglet <b>Configuration</b> de l'application : adresse IP, port (34567), utilisateur et mot de passe. Puis redémarrez l'application.</div>`; return; }
  if (page === "info") pageInfo(); else if (page === "raw") pageRaw(); else pageSection(name);
}
$("#nav").addEventListener("click", (ev) => { const b = ev.target.closest("button[data-page]"); if (b) go(b.dataset.page, b.dataset.name || null); });
$("#cam").addEventListener("change", (ev) => { S.cam = S.cams.find((c) => c.id === ev.target.value) || null; go(S.page, S.name); });

(async () => {
  nav();
  try {
    const d = await api("api/cameras");
    S.cams = d.cameras; S.cam = S.cams[0] || null;
    $("#cam").innerHTML = S.cams.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("") || `<option>—</option>`;
  } catch (e) { toast(e.message, true); }
  go("info");
})();
})();
