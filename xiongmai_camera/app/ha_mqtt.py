"""Entités Home Assistant par MQTT (découverte automatique) pour chaque caméra.

Broker : celui de l'application Mosquitto de Home Assistant (trouvé par le Supervisor), ou celui des options
mqtt_host / mqtt_port / mqtt_username / mqtt_password (mqtt_tls, mqtt_tls_insecure).
Sujets : xiongmai_camera/<caméra>/<entité>/state et …/set ; disponibilité xiongmai_camera/status.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.request
from typing import Any, Awaitable, Callable

from dvrip import DvripClient, DvripError
from mqtt import MqttClient, MqttError

_LOGGER = logging.getLogger("xiongmai.mqtt")
BASE = "xiongmai_camera"
STATUS = f"{BASE}/status"
POLL = 60

DAY_NIGHT = {0: "Automatique", 1: "Toujours en couleur", 2: "Toujours en noir et blanc"}


def _hex(n: int, like: str) -> str:
    return "0x" + format(n, "X").zfill(max(len(like) - 2, 1))


# entité : (composant, nom, icône, section, chemin, type, options de découverte)
ENTITIES: dict[str, tuple[str, str, str, str | None, list[Any], str, dict[str, Any]]] = {
    "motion_detect": ("switch", "Détection de mouvement", "mdi:motion-sensor", "Detect.MotionDetect", [0, "Enable"], "bool", {}),
    "motion_level": ("number", "Sensibilité de la détection", "mdi:tune-vertical", "Detect.MotionDetect", [0, "Level"], "int",
                     {"min": 1, "max": 6, "step": 1, "mode": "slider", "entity_category": "config"}),
    "day_night": ("select", "Mode jour / nuit", "mdi:theme-light-dark", "Camera.Param", [0, "DayNightColor"], "daynight",
                  {"options": list(DAY_NIGHT.values()), "entity_category": "config"}),
    "mirror": ("switch", "Image miroir", "mdi:flip-horizontal", "Camera.Param", [0, "PictureMirror"], "hexbool", {"entity_category": "config"}),
    "flip": ("switch", "Image retournée", "mdi:flip-vertical", "Camera.Param", [0, "PictureFlip"], "hexbool", {"entity_category": "config"}),
    "cloud": ("switch", "Cloud XMEye", "mdi:cloud-outline", "NetWork.Nat", ["NatEnable"], "bool", {"entity_category": "config"}),
    "reboot": ("button", "Redémarrer", "mdi:restart", None, [], "action", {"device_class": "restart", "entity_category": "config"}),
    "sync_time": ("button", "Mettre à l'heure de Home Assistant", "mdi:clock-check-outline", None, [], "action", {"entity_category": "config"}),
    "online": ("binary_sensor", "Connexion", "mdi:lan-connect", None, [], "online", {"device_class": "connectivity", "entity_category": "diagnostic"}),
    "uptime": ("sensor", "Temps de fonctionnement", "mdi:timer-outline", None, [], "uptime",
               {"device_class": "duration", "unit_of_measurement": "min", "state_class": "total_increasing", "entity_category": "diagnostic"}),
}


def _get(value: Any, path: list[Any]) -> Any:
    for k in path:
        value = value[k]
    return value


def _set(value: Any, path: list[Any], new: Any) -> None:
    for k in path[:-1]:
        value = value[k]
    value[path[-1]] = new


def supervisor_broker() -> dict[str, Any] | None:
    """Broker de l'application Mosquitto, donné par le Supervisor (services: mqtt:want)."""
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        return None
    req = urllib.request.Request("http://supervisor/services/mqtt", headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:  # noqa: S310
            data = json.loads(resp.read()).get("data") or {}
    except (OSError, ValueError):
        return None
    return data if data.get("host") else None


class MqttBridge:
    def __init__(self, cams: dict[str, dict[str, Any]], options: dict[str, Any], set_time: Callable[[], Awaitable[tuple[str, bool]]]) -> None:
        self.cams, self.options, self.ha_now = cams, options, set_time
        self.client: MqttClient | None = None
        self.info: dict[str, dict[str, Any]] = {}
        self.discovered: set[str] = set()
        self.wake = asyncio.Event()
        # état affiché dans la page MQTT de l'application
        self.state: dict[str, Any] = {"status": "starting", "message": "Démarrage…", "broker": None, "source": None}

    def _status(self, status: str, message: str, broker: dict[str, Any] | None = None) -> None:
        self.state.update({"status": status, "message": message})
        if broker:
            self.state.update({"broker": f"{broker['host']}:{broker['port']}", "source": broker.get("source")})

    def broker(self) -> dict[str, Any] | None:
        o = self.options
        if o.get("mqtt_host"):
            return {"host": o["mqtt_host"], "port": int(o.get("mqtt_port") or (8883 if o.get("mqtt_tls") else 1883)),
                    "username": o.get("mqtt_username") or "", "password": o.get("mqtt_password") or "",
                    "ssl": bool(o.get("mqtt_tls")), "insecure": bool(o.get("mqtt_tls_insecure")), "source": "manuel"}
        found = supervisor_broker()
        if found:
            return {"host": found["host"], "port": int(found.get("port") or 1883), "username": found.get("username") or "",
                    "password": found.get("password") or "", "ssl": bool(found.get("ssl")), "insecure": True, "source": "Mosquitto"}
        return None

    async def stop(self) -> None:
        if self.client is not None and self.client.connected:
            try:
                for cam_id in self.cams:
                    await self.client.publish(f"{BASE}/{cam_id}/availability", "offline", retain=True)
                await self.client.publish(STATUS, "offline", retain=True)
                await self.client.disconnect()
            except MqttError:
                pass
            await self.client.close()

    async def run(self) -> None:
        if self.options.get("mqtt") is False:
            _LOGGER.info("MQTT désactivé dans les options")
            self._status("disabled", "Entités Home Assistant désactivées.")
            return
        delay = 5
        while True:
            broker = await asyncio.to_thread(self.broker)
            if not broker:
                _LOGGER.info("MQTT : aucun broker (ni application Mosquitto, ni option mqtt_host) : entités Home Assistant désactivées")
                self._status("no_broker", "Aucun broker : installez l'application Mosquitto, ou indiquez l'adresse de votre broker ci-dessous.")
                return
            self._status("connecting", "Connexion en cours…", broker)
            self.client = MqttClient(broker["host"], broker["port"], broker["username"], broker["password"],
                                     client_id="xiongmai_camera", tls=broker["ssl"], tls_insecure=broker["insecure"],
                                     # dernière volonté : rend les entités indisponibles si l'application s'arrête brutalement
                                     will=(f"{BASE}/{next(iter(self.cams))}/availability" if len(self.cams) == 1 else STATUS, "offline"))
            self.client.on_message = self.on_message
            try:
                await self.client.connect()
                _LOGGER.info("MQTT : connecté à %s:%s", broker["host"], broker["port"])
                self._status("connected", "Connecté : les entités sont dans Home Assistant (Paramètres › Appareils et services › MQTT).", broker)
                delay = 5
                await self.client.publish(STATUS, "online", retain=True)
                await self.client.subscribe(f"{BASE}/+/+/set")
                await self.client.subscribe("homeassistant/status")
                poller = asyncio.create_task(self.poll_forever())
                try:
                    await self.client.loop()
                finally:
                    poller.cancel()
            except MqttError as err:
                _LOGGER.warning("MQTT : %s (nouvel essai dans %d s)", err, delay)
                self._status("error", f"{str(err)[:1].upper()}{str(err)[1:]} (nouvel essai dans {delay} s).", broker)
            await asyncio.sleep(delay)
            delay = min(delay * 2, 300)

    # ------------------------------------------------------------ découverte et états

    async def discover(self, cam_id: str) -> None:
        cam, info = self.cams[cam_id], self.info.get(cam_id) or {}
        device = {"identifiers": [f"{BASE}_{cam_id}"], "name": cam["name"], "manufacturer": "XiongMai",
                  "model": info.get("HardWare") or "Caméra IP", "sw_version": info.get("SoftWareVersion")}
        for obj, (comp, name, icon, _sec, _path, kind, extra) in ENTITIES.items():
            topic = f"{BASE}/{cam_id}/{obj}"
            cfg: dict[str, Any] = {"name": name, "unique_id": f"{BASE}_{cam_id}_{obj}", "object_id": f"{cam_id}_{obj}",
                                   "icon": icon, "device": device, **extra,
                                   # une seule source de disponibilité, par caméra (plus robuste qu'un sujet global)
                                   **({} if kind == "online" else {"availability_topic": f"{BASE}/{cam_id}/availability"})}
            if comp != "button":
                cfg["state_topic"] = f"{topic}/state"
            if comp in ("switch", "number", "select", "button"):
                cfg["command_topic"] = f"{topic}/set"
            if comp in ("switch", "binary_sensor"):
                cfg.update({"payload_on": "ON", "payload_off": "OFF"})
            if comp == "button":
                cfg["payload_press"] = "PRESS"
            assert self.client is not None
            await self.client.publish(f"homeassistant/{comp}/{BASE}_{cam_id}/{obj}/config", json.dumps(cfg, ensure_ascii=False), retain=True)

    async def refresh(self, cam_id: str) -> None:
        cam = self.cams[cam_id]
        client: DvripClient = cam["client"]
        assert self.client is not None
        avail = f"{BASE}/{cam_id}/availability"
        try:
            info = await client.system_info()
        except DvripError as err:
            _LOGGER.info("MQTT : %s injoignable (%s)", cam["name"], err)
            if cam_id not in self.discovered:
                await self.discover(cam_id)
                self.discovered.add(cam_id)
            await self.client.publish(f"{BASE}/{cam_id}/online/state", "OFF", retain=True)
            await self.client.publish(avail, "offline", retain=True)
            return
        changed = self.info.get(cam_id) != info and (cam_id not in self.info or self.info[cam_id].get("SoftWareVersion") != info.get("SoftWareVersion"))
        self.info[cam_id] = info
        if cam_id not in self.discovered or changed:
            await self.discover(cam_id)
            self.discovered.add(cam_id)
        await self.client.publish(avail, "online", retain=True)
        await self.client.publish(f"{BASE}/{cam_id}/online/state", "ON", retain=True)
        run = info.get("DeviceRunTime")
        if isinstance(run, str) and run.startswith("0x"):
            await self.client.publish(f"{BASE}/{cam_id}/uptime/state", str(int(run, 16)), retain=True)
        sections: dict[str, Any] = {}
        for obj, (_comp, _name, _icon, sec, path, kind, _extra) in ENTITIES.items():
            if not sec:
                continue
            if sec not in sections:
                try:
                    sections[sec] = await client.get_config(sec)
                except DvripError:
                    sections[sec] = None
            if sections[sec] is None:
                continue
            try:
                value = _get(sections[sec], path)
            except (KeyError, IndexError, TypeError):
                continue
            await self.client.publish(f"{BASE}/{cam_id}/{obj}/state", self.encode(kind, value), retain=True)

    @staticmethod
    def encode(kind: str, value: Any) -> str:
        if kind == "bool":
            return "ON" if value else "OFF"
        if kind == "hexbool":
            return "ON" if int(str(value), 16) else "OFF"
        if kind == "daynight":
            return DAY_NIGHT.get(int(str(value), 16), str(value))
        return str(value)

    async def poll_forever(self) -> None:
        while True:
            for cam_id in list(self.cams):
                try:
                    await self.refresh(cam_id)
                except MqttError:
                    return
            self.wake.clear()
            try:
                await asyncio.wait_for(self.wake.wait(), POLL)
            except TimeoutError:
                pass

    # ------------------------------------------------------------ commandes

    async def on_message(self, topic: str, payload: bytes) -> None:
        text = payload.decode("utf-8", "replace").strip()
        if topic == "homeassistant/status":
            if text == "online":  # Home Assistant redémarré : republier la découverte
                for cam_id in list(self.discovered):
                    await self.discover(cam_id)
                self.wake.set()
            return
        parts = topic.split("/")
        if len(parts) != 4 or parts[0] != BASE or parts[3] != "set" or parts[1] not in self.cams or parts[2] not in ENTITIES:
            return
        cam_id, obj = parts[1], parts[2]
        cam = self.cams[cam_id]
        client: DvripClient = cam["client"]
        _comp, name, _icon, sec, path, kind, _extra = ENTITIES[obj]
        try:
            if obj == "reboot":
                await client.reboot()
                _LOGGER.info("MQTT : %s redémarrée", cam["name"])
                return
            if obj == "sync_time":
                value, ok = await self.ha_now()
                if ok:
                    await client.set_time(value)
                    _LOGGER.info("MQTT : %s mise à l'heure %s", cam["name"], value)
                return
            if not sec:
                return
            conf = await client.get_config(sec)
            old = _get(conf, path)
            if kind == "bool":
                new: Any = text == "ON"
            elif kind == "hexbool":
                new = _hex(1 if text == "ON" else 0, str(old))
            elif kind == "int":
                new = max(1, min(6, int(float(text))))
            elif kind == "daynight":
                code = next((k for k, v in DAY_NIGHT.items() if v == text), None)
                if code is None:
                    return
                new = _hex(code, str(old))
            else:
                return
            _set(conf, path, new)
            ret = await client.set_config(sec, conf)
            _LOGGER.info("MQTT : %s, %s = %s (code %s)", cam["name"], name, text, ret)
        except (DvripError, ValueError, KeyError, IndexError, TypeError) as err:
            _LOGGER.warning("MQTT : %s, %s : %s", cam["name"], name, err)
        self.wake.set()
