"""Application Home Assistant « Caméra XiongMai » : page de réglages (ingress) et API locale.

Bibliothèque standard de Python seulement : rien à installer dans l'image.
Options lues dans /data/options.json :
    cameras: [{name, host, port, username, password, http_port?, snapshot_entity?}]
Sauvegardes avant chaque modification : /data/backups/<caméra>/<section>/<date>.json
"""
from __future__ import annotations

import asyncio
import json
import logging
import mimetypes
import os
import re
import time
import unicodedata
import urllib.request
from datetime import datetime
from http import HTTPStatus
from pathlib import Path
from typing import Any, Awaitable, Callable
from urllib.parse import parse_qs, quote, unquote, urlsplit

from dvrip import DvripClient, DvripError

VERSION = "0.1.0-beta.8"
DATA = Path(os.environ.get("XM_DATA", "/data"))
STATIC = Path(__file__).parent / "static"
INGRESS_IP = "172.30.32.2"
NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_.\[\]]{1,80}$")
STAMP_RE = re.compile(r"^[0-9_-]{19}$")
KEEP_BACKUPS = 30
MAX_BODY = 2 * 1024 * 1024
ENTITY_RE = re.compile(r"^camera\.[a-z0-9_]+$")
SUPERVISOR = "http://supervisor/core/api"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
_LOGGER = logging.getLogger("xiongmai")


def load_options() -> dict[str, Any]:
    try:
        return json.loads((DATA / "options.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def slug(text: str) -> str:
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()  # « Entrée » → « entree »
    return re.sub(r"[^a-z0-9]+", "_", plain.lower()).strip("_") or "camera"


class HttpError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


class Request:
    def __init__(self, method: str, path: str, query: dict[str, str], headers: dict[str, str], body: bytes, remote: str) -> None:
        self.method, self.path, self.query, self.headers, self.body, self.remote = method, path, query, headers, body, remote
        self.params: dict[str, str] = {}

    def json(self) -> Any:
        try:
            return json.loads(self.body.decode("utf-8") or "null")
        except (UnicodeDecodeError, json.JSONDecodeError) as err:
            raise HttpError(400, "JSON invalide") from err


class Response:
    def __init__(self, body: bytes | str = b"", status: int = 200, content_type: str = "application/json; charset=utf-8", headers: dict[str, str] | None = None) -> None:
        self.body = body.encode("utf-8") if isinstance(body, str) else body
        self.status, self.content_type, self.headers = status, content_type, headers or {}


def json_response(data: Any, status: int = 200, headers: dict[str, str] | None = None, indent: int | None = None) -> Response:
    return Response(json.dumps(data, ensure_ascii=False, indent=indent), status, headers=headers)


def http_get(url: str, headers: dict[str, str] | None = None, timeout: float = 6) -> bytes:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - adresses fixées par la configuration
        return resp.read(8 * 1024 * 1024)


def core_api(path: str, payload: dict[str, Any] | None = None) -> bytes:
    """Appel à l'API de Home Assistant par le Supervisor (homeassistant_api)."""
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        raise OSError("API de Home Assistant indisponible")
    headers = {"Authorization": f"Bearer {token}"}
    if payload is None:
        return http_get(f"{SUPERVISOR}{path}", headers)
    headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{SUPERVISOR}{path}", json.dumps(payload).encode(), headers, method="POST")
    with urllib.request.urlopen(req, timeout=6) as resp:  # noqa: S310
        return resp.read(65536)


TIME_RE = re.compile(r"^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$")


async def ha_now() -> str:
    """Heure locale de Home Assistant, demandée à Home Assistant lui-même (fuseau et heure d'été compris).
    Repli : l'heure locale du conteneur."""
    try:
        raw = await asyncio.to_thread(core_api, "/template", {"template": "{{ now().strftime('%Y-%m-%d %H:%M:%S') }}"})
        value = raw.decode().strip()
        if TIME_RE.match(value):
            return value
    except (OSError, ValueError) as err:
        _LOGGER.debug("Heure de Home Assistant illisible : %s", err)
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def use_ha_timezone() -> None:
    """Le conteneur démarre en UTC : on prend le fuseau de Home Assistant (heure des journaux et mise à l'heure)."""
    try:
        tz = json.loads(core_api("/config")).get("time_zone")
    except (OSError, ValueError) as err:
        _LOGGER.warning("Fuseau horaire de Home Assistant illisible (%s) : heure UTC", err)
        return
    if tz and Path("/usr/share/zoneinfo", tz).exists():
        os.environ["TZ"] = tz
        time.tzset()
        _LOGGER.info("Fuseau horaire : %s", tz)


# ---------------------------------------------------------------- caméras

class Cameras:
    def __init__(self, options: dict[str, Any]) -> None:
        self.items: dict[str, dict[str, Any]] = {}
        for cam in options.get("cameras") or []:
            if not cam.get("host"):
                continue
            key = slug(cam.get("name") or cam["host"])
            while key in self.items:
                key += "_2"
            port = int(cam.get("port") or 34567)
            entity = (cam.get("snapshot_entity") or "").strip()
            self.items[key] = {
                "id": key, "name": cam.get("name") or cam["host"], "host": cam["host"], "port": port,
                "http_port": int(cam.get("http_port") or 80), "username": cam.get("username") or "admin",
                "password": cam.get("password") or "", "snapshot_entity": entity if ENTITY_RE.match(entity) else "",
                "client": DvripClient(cam["host"], port, cam.get("username") or "admin", cam.get("password") or ""),
            }

    def get(self, key: str) -> dict[str, Any]:
        cam = self.items.get(key)
        if not cam:
            raise HttpError(404, "Caméra inconnue")
        return cam


# ---------------------------------------------------------------- sauvegardes

def backup_dir(cam: str, name: str) -> Path:
    return DATA / "backups" / slug(cam) / name.replace("/", "_")


def save_backup(cam: str, name: str, value: Any) -> str:
    folder = backup_dir(cam, name)
    folder.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    (folder / f"{stamp}.json").write_text(json.dumps(value, ensure_ascii=False, indent=1), encoding="utf-8")
    for old in sorted(folder.glob("*.json"))[:-KEEP_BACKUPS]:
        old.unlink(missing_ok=True)
    return stamp


def list_backups(cam: str, name: str) -> list[str]:
    folder = backup_dir(cam, name)
    return sorted((f.stem for f in folder.glob("*.json")), reverse=True) if folder.exists() else []


# ---------------------------------------------------------------- application

class App:
    def __init__(self, options: dict[str, Any] | None = None) -> None:
        self.cams = Cameras(options if options is not None else load_options())
        self.routes: list[tuple[str, re.Pattern[str], Callable[[Request], Awaitable[Response]]]] = []
        self.allow_all = os.environ.get("XM_ALLOW_ALL") == "1"
        r = self.route
        r("GET", r"/", self.index)
        r("GET", r"/api/cameras", self.api_cameras)
        r("GET", r"/api/(?P<cam>[a-z0-9_]+)/info", self.api_info)
        r("GET", r"/api/(?P<cam>[a-z0-9_]+)/config/(?P<name>[^/]+)", self.api_get)
        r("POST", r"/api/(?P<cam>[a-z0-9_]+)/config/(?P<name>[^/]+)", self.api_set)
        r("GET", r"/api/(?P<cam>[a-z0-9_]+)/backup/(?P<name>[^/]+)/(?P<stamp>[^/]+)", self.api_backup)
        r("POST", r"/api/(?P<cam>[a-z0-9_]+)/time", self.api_time)
        r("POST", r"/api/(?P<cam>[a-z0-9_]+)/reboot", self.api_reboot)
        r("GET", r"/api/(?P<cam>[a-z0-9_]+)/export", self.api_export)
        r("GET", r"/api/(?P<cam>[a-z0-9_]+)/snapshot", self.api_snapshot)
        r("GET", r"/static/(?P<file>[A-Za-z0-9_.-]+)", self.static)

    def route(self, method: str, pattern: str, handler: Callable[[Request], Awaitable[Response]]) -> None:
        self.routes.append((method, re.compile(f"^{pattern}$"), handler))

    # ------------------------------------------------------------ pages

    async def index(self, req: Request) -> Response:
        html = (STATIC / "index.html").read_text(encoding="utf-8").replace("{{VERSION}}", VERSION)
        return Response(html, content_type="text/html; charset=utf-8", headers={"Cache-Control": "no-store"})

    async def static(self, req: Request) -> Response:
        path = STATIC / req.params["file"]
        if not path.is_file():
            raise HttpError(404, "Fichier introuvable")
        # types fixés : certaines images minimales n'ont pas de table mimetypes (et nosniff bloquerait le script)
        ctype = {".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png"}.get(
            path.suffix, mimetypes.guess_type(path.name)[0] or "application/octet-stream")
        if ctype.startswith("text/") or ctype.endswith("javascript"):
            ctype += "; charset=utf-8"
        return Response(path.read_bytes(), content_type=ctype, headers={"Cache-Control": "max-age=3600"})

    # ------------------------------------------------------------ API

    @staticmethod
    def _name(req: Request) -> str:
        name = unquote(req.params["name"])
        if not NAME_RE.match(name):
            raise HttpError(400, "Nom de section invalide")
        return name

    @staticmethod
    def _error(err: DvripError) -> Response:
        return json_response({"error": str(err), "ret": err.ret}, 502)

    async def api_cameras(self, req: Request) -> Response:
        return json_response({"version": VERSION, "cameras": [{"id": c["id"], "name": c["name"], "host": c["host"], "port": c["port"]} for c in self.cams.items.values()]})

    async def api_info(self, req: Request) -> Response:
        cam = self.cams.get(req.params["cam"])
        try:
            info = await cam["client"].system_info()
            try:
                now = await cam["client"].get_time()
            except DvripError:
                now = None
            return json_response({"info": info, "time": now, "ha_time": await ha_now()})
        except DvripError as err:
            return self._error(err)

    async def api_get(self, req: Request) -> Response:
        cam, name = self.cams.get(req.params["cam"]), self._name(req)
        try:
            client: DvripClient = cam["client"]
            value = await (client.get_default(name) if req.query.get("default") == "1" else client.get_config(name))
            data = {"name": name, "value": value, "backups": list_backups(cam["id"], name)}
            if name.startswith("Detect."):
                data["grid"] = await self._grid(client)
            return json_response(data)
        except DvripError as err:
            return self._error(err)

    async def api_set(self, req: Request) -> Response:
        cam, name = self.cams.get(req.params["cam"]), self._name(req)
        body = req.json()
        if not isinstance(body, dict) or "value" not in body:
            raise HttpError(400, "Valeur manquante")
        client: DvripClient = cam["client"]
        try:
            # sauvegarde de l'état actuel, relu sur la caméra juste avant d'écrire
            stamp = save_backup(cam["id"], name, await client.get_config(name))
            ret = await client.set_config(name, body["value"])
            _LOGGER.info("%s : %s modifié (sauvegarde %s, code %s)", cam["name"], name, stamp, ret)
            return json_response({"ok": True, "ret": ret, "restart": ret in (150, 603), "backup": stamp})
        except DvripError as err:
            return self._error(err)

    async def api_backup(self, req: Request) -> Response:
        cam, name, stamp = self.cams.get(req.params["cam"]), self._name(req), req.params["stamp"]
        if not STAMP_RE.match(stamp):
            raise HttpError(400, "Sauvegarde invalide")
        path = backup_dir(cam["id"], name) / f"{stamp}.json"
        if not path.is_file():
            raise HttpError(404, "Sauvegarde introuvable")
        return json_response({"name": name, "stamp": stamp, "value": json.loads(path.read_text(encoding="utf-8"))})

    @staticmethod
    async def _grid(client: DvripClient) -> dict[str, int]:
        """Taille de la grille de détection annoncée par la caméra (22 × 18 par défaut)."""
        try:
            area = await client.ability("MotionArea") or {}
            cols, rows = int(area.get("GridColumn") or 22), int(area.get("GridRow") or 18)
            if 1 <= cols <= 32 and 1 <= rows <= 64:
                return {"cols": cols, "rows": rows}
        except (DvripError, TypeError, ValueError, AttributeError):
            pass
        return {"cols": 22, "rows": 18}

    async def api_snapshot(self, req: Request) -> Response:
        """Image actuelle de la caméra : entité caméra de HA si configurée, sinon la caméra elle-même (DVRIP puis HTTP)."""
        cam = self.cams.get(req.params["cam"])
        errors = []
        sources: list[tuple[str, Callable[[], Awaitable[bytes]]]] = []
        if cam["snapshot_entity"]:
            sources.append(("Home Assistant", lambda: asyncio.to_thread(core_api, f"/camera_proxy/{cam['snapshot_entity']}")))
        sources.append(("DVRIP", cam["client"].snapshot))
        url = (f"http://{cam['host']}:{cam['http_port']}/webcapture.jpg?command=snap&channel=1"
               f"&user={quote(cam['username'])}&password={quote(cam['password'])}")
        sources.append(("HTTP", lambda: asyncio.to_thread(http_get, url)))
        for label, fetch in sources:
            try:
                data = await asyncio.wait_for(fetch(), 12)
                if data[:2] == b"\xff\xd8":
                    return Response(data, 200, "image/jpeg", {"Cache-Control": "no-store"})
                errors.append(f"{label} : pas une image")
            except (DvripError, OSError, TimeoutError, ValueError) as err:
                errors.append(f"{label} : {err}")
        _LOGGER.info("%s : image indisponible (%s)", cam["name"], " ; ".join(errors))
        return json_response({"error": "Image indisponible", "details": errors}, 502)

    async def api_time(self, req: Request) -> Response:
        """Met la caméra à l'heure de Home Assistant (heure demandée à Home Assistant, heure d'été comprise)."""
        cam = self.cams.get(req.params["cam"])
        try:
            value = await ha_now()
            ret = await cam["client"].set_time(value)
            _LOGGER.info("%s : mise à l'heure %s", cam["name"], value)
            return json_response({"ok": True, "ret": ret, "time": value})
        except DvripError as err:
            return self._error(err)

    async def api_reboot(self, req: Request) -> Response:
        cam = self.cams.get(req.params["cam"])
        try:
            await cam["client"].reboot()
            _LOGGER.info("%s : redémarrage demandé", cam["name"])
            return json_response({"ok": True})
        except DvripError as err:
            return self._error(err)

    async def api_export(self, req: Request) -> Response:
        """Les sections demandées, en un fichier (copie complète à garder de côté)."""
        cam = self.cams.get(req.params["cam"])
        names = [n for n in req.query.get("names", "").split(",") if NAME_RE.match(n)]
        out: dict[str, Any] = {"camera": cam["name"], "date": datetime.now().isoformat(timespec="seconds"), "sections": {}, "errors": {}}
        for n in names:
            try:
                out["sections"][n] = await cam["client"].get_config(n)
            except DvripError as err:
                out["errors"][n] = str(err)
        fname = f"xiongmai_{cam['id']}_{datetime.now():%Y-%m-%d_%H-%M}.json"
        return json_response(out, headers={"Content-Disposition": f'attachment; filename="{fname}"'}, indent=1)

    # ------------------------------------------------------------ HTTP

    async def dispatch(self, req: Request) -> Response:
        # seul le proxy ingress de Home Assistant (utilisateur connecté) peut parler à l'application
        if not self.allow_all and req.remote != INGRESS_IP:
            return Response("Accès réservé à Home Assistant (ingress)", 403, "text/plain; charset=utf-8")
        allowed = False
        for method, pattern, handler in self.routes:
            m = pattern.match(req.path)
            if not m:
                continue
            allowed = True
            if method != req.method:
                continue
            req.params = m.groupdict()
            try:
                return await handler(req)
            except HttpError as err:
                return json_response({"error": str(err)}, err.status)
            except Exception:  # noqa: BLE001 - une erreur ne doit pas arrêter le serveur
                _LOGGER.exception("Erreur sur %s %s", req.method, req.path)
                return json_response({"error": "Erreur interne de l'application (voir le journal)"}, 500)
        return json_response({"error": "Méthode non autorisée" if allowed else "Page introuvable"}, 405 if allowed else 404)

    async def handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        remote = (writer.get_extra_info("peername") or ("", 0))[0]
        try:
            line = await asyncio.wait_for(reader.readline(), 30)
            parts = line.decode("latin-1").split()
            if len(parts) < 2:
                return
            method, target = parts[0].upper(), parts[1]
            headers: dict[str, str] = {}
            while True:
                h = await asyncio.wait_for(reader.readline(), 30)
                if h in (b"\r\n", b"\n", b""):
                    break
                k, _, v = h.decode("latin-1").partition(":")
                headers[k.strip().lower()] = v.strip()
            length = int(headers.get("content-length") or 0)
            if length > MAX_BODY:
                resp = json_response({"error": "Requête trop volumineuse"}, 413)
            else:
                body = await asyncio.wait_for(reader.readexactly(length), 30) if length else b""
                url = urlsplit(target)
                query = {k: v[-1] for k, v in parse_qs(url.query).items()}
                resp = await self.dispatch(Request(method, url.path or "/", query, headers, body, remote))
            head = [f"HTTP/1.1 {resp.status} {HTTPStatus(resp.status).phrase}", f"Content-Type: {resp.content_type}",
                    f"Content-Length: {len(resp.body)}", "Connection: close", "X-Content-Type-Options: nosniff"]
            head += [f"{k}: {v}" for k, v in resp.headers.items()]
            writer.write(("\r\n".join(head) + "\r\n\r\n").encode("latin-1") + (b"" if method == "HEAD" else resp.body))
            await writer.drain()
        except (asyncio.IncompleteReadError, TimeoutError, ConnectionError, ValueError):
            pass
        finally:
            writer.close()

    async def keepalive(self) -> None:
        """Garde les sessions ouvertes : la caméra ferme une session inactive après quelques dizaines de secondes."""
        while True:
            await asyncio.sleep(15)
            for cam in self.cams.items.values():
                client: DvripClient = cam["client"]
                if client.connected:
                    try:
                        await client.keepalive()
                    except DvripError:
                        await client.close()

    async def serve(self, host: str = "0.0.0.0", port: int = 8099) -> None:
        server = await asyncio.start_server(self.handle, host, port)
        task = asyncio.create_task(self.keepalive())
        _LOGGER.info("Caméra XiongMai %s : %d caméra(s), page de réglages sur le port %d", VERSION, len(self.cams.items), port)
        try:
            async with server:
                await server.serve_forever()
        finally:
            task.cancel()
            for cam in self.cams.items.values():
                await cam["client"].close()


if __name__ == "__main__":
    use_ha_timezone()
    asyncio.run(App().serve(port=int(os.environ.get("XM_PORT", "8099"))))
