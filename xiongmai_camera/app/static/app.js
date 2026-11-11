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
  AeMeansure: ["Mesure de l'exposition"], BroadTrends: ["Large dynamique (WDR)"], CorridorMode: ["Mode couloir (image verticale)"], Dis: ["Stabilisation"],
  ExposureTime: ["Temps d'exposition"], LightRestrainLevel: ["Atténuation des lumières fortes"], LowLuxMode: ["Mode faible luminosité"],
  PreventOverExpo: ["Éviter la surexposition"], SoftPhotosensitivecontrol: ["Capteur jour / nuit logiciel"], Style: ["Style d'image"],
  // couleurs
  Enable: ["Activé"], TimeSection: ["Plage horaire"], VideoColorParam: ["Réglages de couleur"], Acutance: ["Netteté"], Brightness: ["Luminosité", "0 à 100"],
  Contrast: ["Contraste", "0 à 100"], Hue: ["Teinte", "0 à 100"], Saturation: ["Saturation", "0 à 100"], Whitebalance: ["Balance des blancs"],
  // encodage
  MainFormat: ["Flux principal"], ExtraFormat: ["Flux secondaire"], AudioEnable: ["Audio"], VideoEnable: ["Vidéo activée"], Video: ["Vidéo"],
  BitRate: ["Débit (kbit/s)"], BitRateControl: ["Contrôle du débit", "CBR : constant · VBR : variable"], Compression: ["Codec"], FPS: ["Images par seconde"],
  GOP: ["Intervalle entre images clés (GOP, en secondes)"], Quality: ["Qualité", "1 (faible) à 6 (meilleure), en VBR"], Resolution: ["Résolution"],
  // OSD
  ChannelTitle: ["Nom de la caméra"], Name: ["Nom"], SerialNo: ["Numéro"], ChannelTitleAttribute: ["Affichage du nom"], TimeTitleAttribute: ["Affichage de l'heure"],
  EncodeBlend: ["Incrusté dans la vidéo enregistrée"], PreviewBlend: ["Affiché en direct"], FrontColor: ["Couleur du texte"], BackColor: ["Couleur du fond"], RelativePos: ["Position"],
  // détection et événements
  Region: ["Zones de détection"], EventHandler: ["Actions"], AlarmOutEnable: ["Déclencher la sortie d'alarme"], AlarmOutLatch: ["Durée de la sortie d'alarme (s)"],
  BeepEnable: ["Bip"], EventLatch: ["Délai entre deux alertes (s)"], FTPEnable: ["Envoi FTP"], MailEnable: ["Envoi d'un e-mail"], MessageEnable: ["Envoi au Centre d'alarme / application"],
  RecordEnable: ["Enregistrement"], RecordLatch: ["Durée d'enregistrement après l'alerte (s)"], ShowInfo: ["Afficher un message"], SnapEnable: ["Photo"],
  TipEnable: ["Message à l'écran"], VoiceEnable: ["Message vocal"], LogEnable: ["Journal"], PtzEnable: ["Action PTZ"], TourEnable: ["Ronde", "Caméra motorisée seulement"],
  MatrixEnable: ["Matrice vidéo", "Enregistreur seulement : sans effet sur une caméra seule"], CheckDiskInterval: ["Vérification du disque (s)", "Enregistreur seulement"],
  AlarmOutMask: ["Sorties d'alarme déclenchées"], RecordMask: ["Canaux à enregistrer"], SnapShotMask: ["Canaux à photographier"], ShowInfoMask: ["Canaux qui affichent le message"],
  TourMask: ["Canaux qui lancent la ronde", "Caméra motorisée seulement"], MatrixMask: ["Canaux de la matrice", "Enregistreur seulement"], PtzLink: ["Action PTZ par canal", "Caméra motorisée seulement"],
  TimeSection: ["Plage horaire", "Jours et heures où cette détection est active"], MultiPicture: ["Écran multiple"], ShortMsgEnable: ["SMS"], SensorType: ["Type de contact", "NO : normalement ouvert · NC : normalement fermé"],
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
  VideoOutPut: ["Sortie vidéo"], DSTEnd: ["Fin de l'heure d'été"], DSTStart: ["Début de l'heure d'été"], DSTRule: ["Heure d'été"], DateFormat: ["Format de la date"],
  DateSeparator: ["Séparateur de date"], Language: ["Langue"], TimeFormat: ["Format de l'heure (12 ou 24)"], VideoFormat: ["Standard vidéo", "PAL en Europe"],
  WorkDay: ["Jours ouvrés"], Day: ["Jour"], Hour: ["Heure"], Minute: ["Minute"], Month: ["Mois"], Week: ["Semaine"], Year: ["Année"],
};
// valeurs proposées (liste avec saisie libre) pour quelques réglages connus
const SUGGEST = {
  BitRateControl: ["CBR", "VBR"], Compression: ["H.264", "H.265"], Resolution: ["1080P", "960P", "720P", "D1", "CIF", "QVGA"],
  DateFormat: ["DDMMYY", "MMDDYY", "YYMMDD"], DateSeparator: ["/", "-", "."], TimeFormat: ["24", "12"], VideoFormat: ["PAL", "NTSC"],
  DSTRule: ["On", "Off"], SensorType: ["NO", "NC"], OverWrite: ["OverWrite", "StopRecord"], MonMode: ["TCP", "UDP"], TransferPlan: ["Quality", "Fluency", "AutoAdapt"],
};
// réglages « 0x00000000 / 0x00000001 » à présenter comme un interrupteur
const HEX_BOOL = new Set(["PictureFlip", "PictureMirror", "RejectFlicker", "BLCMode", "ApertureMode"]);
/* Valeurs hexadécimales qui sont en fait des choix (même codage que NetSurveillance et CMS) */
const HEX_ENUM = {
  DayNightColor: [[0, "Automatique (couleur le jour, noir et blanc la nuit)"], [1, "Toujours en couleur"], [2, "Toujours en noir et blanc"]],
  EsShutter: [[0, "Désactivé"], [2, "Faible"], [4, "Moyen"], [6, "Fort"]],
};
/* Temps d'exposition : microsecondes en hexadécimal (0x10000 = 65 536 µs), affichés en millisecondes */
const US_KEYS = new Set(["LeastTime", "MostTime"]);
/* Nombres 0 / 1 qui sont des interrupteurs */
const NUM_BOOL = new Set(["AutoGain", "IrcutSwap"]);
// adresses IPv4 codées en hexadécimal, octets à l'envers (0x0A01A8C0 = 192.168.1.10)
const IP_KEYS = new Set(["HostIP", "Submask", "GateWay", "Address", "SpareAddress", "DnsServer1", "DnsServer2"]);

/* ----------------------------------------------------------------- outils */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = (v) => JSON.parse(JSON.stringify(v));
const hexToIp = (h) => { const n = parseInt(h, 16); return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255].join("."); };
const ipToHex = (ip) => { const p = ip.split(".").map(Number); if (p.length !== 4 || p.some((x) => !(x >= 0 && x <= 255))) return null; return "0x" + ((p[3] << 24 >>> 0) + (p[2] << 16) + (p[1] << 8) + p[0]).toString(16).toUpperCase().padStart(8, "0"); };
/** Couleurs des textes à l'écran : 0xAABBGGRR (opacité, puis bleu, vert, rouge, comme les couleurs Windows de l'ActiveX).
 *  Ordre déduit, à confirmer sur une caméra : si « Rouge » s'affiche en bleu, inverser R et B ici. */
const COLOR_KEYS = new Set(["FrontColor", "BackColor"]);
const COLORS = [["Blanc", "FFFFFF"], ["Noir", "000000"], ["Gris", "808080"], ["Rouge", "0000FF"], ["Vert", "00FF00"], ["Bleu", "FF0000"],
  ["Jaune", "00FFFF"], ["Cyan", "FFFF00"], ["Magenta", "FF00FF"], ["Orange", "0080FF"]];
function colorField(key, value, path, id) {
  const n = parseInt(value, 16) >>> 0, alpha = n >>> 24, bgr = (n & 0xFFFFFF).toString(16).toUpperCase().padStart(6, "0");
  const keepAlpha = (alpha || 0xF0).toString(16).toUpperCase().padStart(2, "0");
  const opts = [];
  let known = false;
  const opt = (label, v) => { const sel = (parseInt(v, 16) >>> 0) === n; known ||= sel; opts.push(`<option value="${v}"${sel ? " selected" : ""}>${label}</option>`); };
  opt("Transparent (aucun)", "0x00000000");
  for (const [label, c] of COLORS) opt(label, `0x${keepAlpha}${c}`);
  const name = COLORS.find(([, c]) => c === bgr)?.[0];
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
      return `<div class="slot" data-d="${d}" data-k="${k}"${shown ? "" : " hidden"}><span class="sw"><input type="checkbox" ${en === "1" ? "checked" : ""} aria-label="Plage active"><span></span></span>
        de <input type="text" class="hhmm" value="${from}" inputmode="numeric" aria-label="Début"> à <input type="text" class="hhmm" value="${to}" inputmode="numeric" aria-label="Fin"></div>`;
    }).join("");
    const more = value[d].length > 1 ? `<button type="button" class="btn small" data-addslot="${d}">+ plage</button>` : "";
    return `<div class="day"><b>${name}</b><div>${slots}${more}</div></div>`;
  }).join("");
  return `<div class="row md-row">${labelFor(key, path)}<div class="sched" data-path="${esc(path)}" data-type="sched">${rows}
    <div class="bar"><button type="button" class="btn small" data-allday="1">Tous les jours, 24 h / 24</button><button type="button" class="btn small" data-copymon="1">Copier le lundi sur tous les jours</button></div></div></div>`;
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
  DeviceRunTime: "Temps de fonctionnement", HardWareVersion: "Version du matériel", EncryptVersion: "Version de chiffrement" };
async function pageInfo() {
  const m = $("#main");
  m.innerHTML = `<h2>Infos et actions</h2><p class="muted">${esc(S.cam?.name || "")} · ${esc(S.cam?.host || "")}:${esc(S.cam?.port || "")}</p><p class="muted">Lecture…</p>`;
  try {
    const d = await api(`api/${S.cam.id}/info`);
    const rows = Object.entries(d.info).map(([k, v]) => {
      let val = v;
      if (k === "DeviceRunTime" && isHex(v)) { const min = parseInt(v, 16); val = `${Math.floor(min / 1440)} j ${Math.floor(min % 1440 / 60)} h ${min % 60} min`; }
      return `<tr><td>${esc(INFO_L[k] || k)}</td><td>${k === "SerialNo" ? `<span title="Ne le publiez pas">${esc(val)}</span>` : esc(val)}</td></tr>`;
    }).join("");
    m.innerHTML = `<h2>Infos et actions</h2><p class="muted">${esc(S.cam.name)} · ${esc(S.cam.host)}:${esc(S.cam.port)}</p>
      <h3>Heure</h3>
      <table class="kv"><tr><td>Heure de la caméra</td><td>${esc(d.time || "—")}</td></tr><tr><td>Heure de Home Assistant</td><td>${esc(d.ha_time)}</td></tr></table>
      <div class="bar"><button class="btn primary" id="sync">Mettre la caméra à l'heure de Home Assistant</button></div>
      <h3>Actions</h3>
      <div class="bar"><button class="btn" id="export">Exporter toute la configuration (JSON)</button><button class="btn danger" id="reboot">Redémarrer la caméra</button></div>
      <p class="muted">L'export garde une copie complète des réglages, à conserver avant de gros changements.</p>
      <h3>Système</h3><table class="kv">${rows}</table>`;
    $("#sync").onclick = async () => { try { const r = await api(`api/${S.cam.id}/time`, { method: "POST" }); toast(`Caméra mise à l'heure : ${r.time}`); pageInfo(); } catch (e) { toast(e.message, true); } };
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
function labelFor(key, path) {
  // même clé, sens différent selon la section
  const l = key === "Level" && /^Detect\./.test(S.name || "") ? ["Sensibilité", "1 (faible) à 6 (forte)"]
    : key === "Level" && /ExposureParam/.test(path) ? ["Mode d'exposition", "0 = automatique, sinon niveau manuel"] : L[key];
  const title = l ? l[0] : key;
  const hint = l?.[1] ? `<small>${esc(l[1])}</small>` : "";
  return `<label for="f-${esc(path)}"><b>${esc(title)}</b>${hint}<code>${esc(key)}</code></label>`;
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
  if (typeof value === "boolean") return `<div class="row">${labelFor(key, path)}<span class="sw"><input type="checkbox" id="${esc(id)}" data-path="${esc(path)}" data-type="bool" ${value ? "checked" : ""}><span></span></span></div>`;
  if (HEX_BOOL.has(key) && isHex(value) && parseInt(value, 16) <= 1) return `<div class="row">${labelFor(key, path)}<span class="sw"><input type="checkbox" id="${esc(id)}" data-path="${esc(path)}" data-type="hexbool" ${parseInt(value, 16) ? "checked" : ""}><span></span></span></div>`;
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
  if (NUM_BOOL.has(key) && (value === 0 || value === 1)) return `<div class="row">${labelFor(key, path)}<span class="sw"><input type="checkbox" id="${esc(id)}" data-path="${esc(path)}" data-type="numbool" ${value ? "checked" : ""}><span></span></span></div>`;
  if (/Mask$/.test(key) && isLongHex(value)) return maskField(key, value, path);
  if (key === "PtzLink" && isPtz(value)) return ptzField(key, value, path);
  if (key === "TimeSection" && isSchedule(value)) return scheduleField(key, value, path);
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

function group(key, value, path, open = false) {
  const title = L[key]?.[0] || key;
  if (Array.isArray(value)) {
    const inner = value.map((v, i) => (v && typeof v === "object" ? group(`${title} ${value.length > 1 ? i + 1 : ""}`.trim(), v, `${path}.${i}`, value.length === 1) : field(String(i), v, `${path}.${i}`))).join("");
    return `<details ${open || value.length <= 2 ? "open" : ""}><summary>${esc(title)}</summary>${inner}</details>`;
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
    S.name = name; S.orig = d.value; S.value = preset ?? d.value; S.backups = d.backups || []; S.grid = d.grid || null;
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
    toast(r.restart ? "Enregistré. La caméra doit redémarrer pour appliquer ce réglage (Infos et actions › Redémarrer)." : "Enregistré sur la caméra (l'ancienne valeur est sauvegardée).");
    if (value === null) pageSection(name);
  } catch (e) { toast(e.message, true); }
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
