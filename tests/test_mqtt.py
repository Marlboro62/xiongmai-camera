"""Tests : entités Home Assistant par MQTT, avec un broker et une caméra simulés."""
import asyncio
import json
import struct
import sys
import unittest
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "xiongmai_camera" / "app"
sys.path.insert(0, str(APP))

import fake_camera  # noqa: E402
from dvrip import DvripClient  # noqa: E402
from ha_mqtt import MqttBridge  # noqa: E402
from mqtt import _length, _str  # noqa: E402


class FakeBroker:
    """Broker MQTT réduit : accepte la connexion, garde les messages publiés, peut envoyer une commande."""

    def __init__(self):
        self.published = {}
        self.subs = []
        self.writer = None
        self.connected = asyncio.Event()

    async def handle(self, reader, writer):
        self.writer = writer
        try:
            while True:
                first = (await reader.readexactly(1))[0]
                mult, n = 1, 0
                while True:
                    b = (await reader.readexactly(1))[0]
                    n += (b & 0x7F) * mult
                    if not b & 0x80:
                        break
                    mult *= 128
                data = await reader.readexactly(n) if n else b""
                kind = first >> 4
                if kind == 1:  # CONNECT
                    writer.write(bytes([0x20, 2, 0, 0]))
                    self.connected.set()
                elif kind == 3:  # PUBLISH
                    ln = struct.unpack("!H", data[:2])[0]
                    self.published[data[2:2 + ln].decode()] = data[2 + ln:].decode()
                elif kind == 8:  # SUBSCRIBE
                    ln = struct.unpack("!H", data[2:4])[0]
                    self.subs.append(data[4:4 + ln].decode())
                    writer.write(bytes([0x90, 3]) + data[:2] + b"\x00")
                elif kind == 12:
                    writer.write(bytes([0xD0, 0]))
                await writer.drain()
        except (asyncio.IncompleteReadError, ConnectionError):
            pass

    async def send(self, topic, payload):
        body = _str(topic) + payload.encode()
        self.writer.write(bytes([0x30]) + _length(len(body)) + body)
        await self.writer.drain()


class MqttTests(unittest.IsolatedAsyncioTestCase):
    async def wait_for(self, cond, timeout=5):
        for _ in range(int(timeout / 0.05)):
            if cond():
                return
            await asyncio.sleep(0.05)
        self.fail("délai dépassé")

    async def test_discovery_state_and_command(self):
        cam_srv = await asyncio.start_server(fake_camera.handle, "127.0.0.1", 0)
        broker = FakeBroker()
        mq_srv = await asyncio.start_server(broker.handle, "127.0.0.1", 0)
        cam_port = cam_srv.sockets[0].getsockname()[1]
        mq_port = mq_srv.sockets[0].getsockname()[1]
        client = DvripClient("127.0.0.1", cam_port, "admin", "demo")
        cams = {"palier": {"id": "palier", "name": "Palier", "client": client}}

        async def ha_now():
            return "2026-11-11 08:00:00", True

        bridge = MqttBridge(cams, {"mqtt_host": "127.0.0.1", "mqtt_port": mq_port}, ha_now)
        task = asyncio.create_task(bridge.run())
        try:
            await self.wait_for(lambda: "xiongmai_camera/palier/mirror/state" in broker.published)
            cfg = json.loads(broker.published["homeassistant/switch/xiongmai_camera_palier/mirror/config"])
            self.assertEqual(cfg["command_topic"], "xiongmai_camera/palier/mirror/set")
            self.assertEqual(broker.published["xiongmai_camera/status"], "online")
            self.assertEqual(cfg["availability_topic"], "xiongmai_camera/palier/availability")
            self.assertEqual(broker.published["xiongmai_camera/palier/availability"], "online")
            self.assertIn("xiongmai_camera/+/+/set", broker.subs)
            self.assertEqual(broker.published["xiongmai_camera/palier/day_night/state"], "Automatique")
            # commande depuis Home Assistant : image miroir
            before = broker.published["xiongmai_camera/palier/mirror/state"]
            target = "OFF" if before == "ON" else "ON"
            await broker.send("xiongmai_camera/palier/mirror/set", target)
            await self.wait_for(lambda: broker.published.get("xiongmai_camera/palier/mirror/state") == target)
            await broker.send("xiongmai_camera/palier/day_night/set", "Toujours en couleur")
            await self.wait_for(lambda: broker.published.get("xiongmai_camera/palier/day_night/state") == "Toujours en couleur")
            self.assertEqual((await client.get_config("Camera.Param"))[0]["DayNightColor"], "0x00000001")
        finally:
            task.cancel()
            await client.close()
            if broker.writer:
                broker.writer.close()
            for s in (cam_srv, mq_srv):
                s.close()
                await asyncio.wait_for(s.wait_closed(), 5)


if __name__ == "__main__":
    unittest.main()
