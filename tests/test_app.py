"""Tests : protocole DVRIP et API de l'application, contre la caméra simulée (bibliothèque standard seulement).

    python3 -m unittest discover -s tests -v
"""
import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "xiongmai_camera" / "app"
sys.path.insert(0, str(APP))

import fake_camera  # noqa: E402
from dvrip import DvripClient, DvripError, sofia_hash  # noqa: E402


async def http(port, method, path, body=None):
    reader, writer = await asyncio.open_connection("127.0.0.1", port)
    data = json.dumps(body).encode() if body is not None else b""
    writer.write(f"{method} {path} HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: {len(data)}\r\n\r\n".encode() + data)
    await writer.drain()
    raw = await reader.read()
    writer.close()
    head, _, payload = raw.partition(b"\r\n\r\n")
    status = int(head.split()[1])
    return status, (json.loads(payload) if payload[:1] in (b"{", b"[") else payload)


class DvripTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.server = await asyncio.start_server(fake_camera.handle, "127.0.0.1", 0)
        self.port = self.server.sockets[0].getsockname()[1]

    async def asyncTearDown(self):
        self.server.close()
        await asyncio.wait_for(self.server.wait_closed(), 5)

    def test_hash(self):
        # empreinte connue du mot de passe vide
        self.assertEqual(sofia_hash(""), "tlJwpbo6")

    async def test_read_write(self):
        c = DvripClient("127.0.0.1", self.port, "admin", "demo")
        info = await c.system_info()
        self.assertIn("SoftWareVersion", info)
        p = await c.get_config("Camera.Param")
        p[0]["PictureMirror"] = "0x00000001"
        self.assertEqual(await c.set_config("Camera.Param", p), 100)
        self.assertEqual((await c.get_config("Camera.Param"))[0]["PictureMirror"], "0x00000001")
        self.assertEqual(await c.set_config("NetWork.NetDNS", await c.get_config("NetWork.NetDNS")), 603)  # redémarrage nécessaire
        self.assertEqual((await c.snapshot())[:2], b"\xff\xd8")
        await c.set_time("2026-11-11 08:00:00")
        self.assertEqual(await c.get_time(), "2026-11-11 08:00:00")
        await c.close()

    async def test_errors(self):
        with self.assertRaises(DvripError) as ctx:
            await DvripClient("127.0.0.1", self.port, "admin", "faux").system_info()
        self.assertEqual(ctx.exception.ret, 106)
        c = DvripClient("127.0.0.1", self.port, "admin", "")
        with self.assertRaises(DvripError):
            await c.get_config("Inexistant")
        await c.close()


class ApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["XM_DATA"] = self.tmp.name
        os.environ["XM_ALLOW_ALL"] = "1"
        import importlib
        import server
        importlib.reload(server)

        async def fake_ha_now():  # pas de Home Assistant pendant les tests
            return "2026-11-11 08:00:00", True
        server.ha_now = fake_ha_now
        self.cam = await asyncio.start_server(fake_camera.handle, "127.0.0.1", 0)
        cam_port = self.cam.sockets[0].getsockname()[1]
        self.app = server.App({"cameras": [{"name": "Palier", "host": "127.0.0.1", "port": cam_port, "username": "admin", "password": "demo"}]})
        self.web = await asyncio.start_server(self.app.handle, "127.0.0.1", 0)
        self.port = self.web.sockets[0].getsockname()[1]

    async def asyncTearDown(self):
        for cam in self.app.cams.items.values():
            await cam["client"].close()
        for s in (self.web, self.cam):
            s.close()
            await asyncio.wait_for(s.wait_closed(), 5)
        os.environ.pop("XM_ALLOW_ALL", None)
        self.tmp.cleanup()

    async def test_flow(self):
        st, d = await http(self.port, "GET", "/api/cameras")
        self.assertEqual(st, 200)
        self.assertEqual(d["cameras"][0]["id"], "palier")
        st, d = await http(self.port, "GET", "/api/palier/config/General.General")
        self.assertEqual(st, 200)
        value = d["value"]
        value["MachineName"] = "Entrée"
        st, d = await http(self.port, "POST", "/api/palier/config/General.General", {"value": value})
        self.assertEqual(st, 200, d)
        stamp = d["backup"]
        st, d = await http(self.port, "GET", "/api/palier/config/General.General")
        self.assertEqual(d["value"]["MachineName"], "Entrée")
        self.assertIn(stamp, d["backups"])
        st, d = await http(self.port, "GET", f"/api/palier/backup/General.General/{stamp}")
        self.assertEqual(d["value"]["MachineName"], "Caméra-Exemple")  # état d'avant la modification
        st, d = await http(self.port, "POST", "/api/palier/time")
        self.assertTrue(d["ok"])
        st, d = await http(self.port, "GET", "/api/palier/export?names=General.General,Inexistant")
        self.assertIn("General.General", d["sections"])
        self.assertIn("Inexistant", d["errors"])

    async def test_detection_grid_and_snapshot(self):
        st, d = await http(self.port, "GET", "/api/palier/config/Detect.MotionDetect")
        self.assertEqual(st, 200)
        self.assertEqual(d["grid"], {"cols": 22, "rows": 18})
        self.assertEqual(len(d["value"][0]["Region"]), 32)  # comme certains firmwares V4
        st, img = await http(self.port, "GET", "/api/palier/snapshot")
        self.assertEqual(st, 200)
        self.assertEqual(img[:2], b"\xff\xd8")

    async def test_guards(self):
        st, _ = await http(self.port, "GET", "/api/inconnue/info")
        self.assertEqual(st, 404)
        st, _ = await http(self.port, "GET", "/api/palier/config/..%2F..%2Fetc")
        self.assertEqual(st, 400)
        st, _ = await http(self.port, "GET", "/api/palier/backup/General.General/..%2F..%2Fx")
        self.assertIn(st, (400, 404))
        st, _ = await http(self.port, "GET", "/static/..%2Fserver.py")
        self.assertEqual(st, 404)
        self.app.allow_all = False
        st, _ = await http(self.port, "GET", "/api/cameras")
        self.assertEqual(st, 403)  # hors ingress


if __name__ == "__main__":
    unittest.main()
