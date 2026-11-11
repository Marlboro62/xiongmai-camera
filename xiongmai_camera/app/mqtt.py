"""Client MQTT 3.1.1 minimal (bibliothèque standard seulement) : connexion, publication, abonnement.

Suffisant pour la découverte Home Assistant : QoS 0, messages conservés (retain), message de dernière volonté.
"""
from __future__ import annotations

import asyncio
import logging
import ssl
import struct
from typing import Awaitable, Callable

_LOGGER = logging.getLogger("xiongmai.mqtt")

CONNECT, CONNACK, PUBLISH, SUBSCRIBE, SUBACK, PINGREQ, PINGRESP, DISCONNECT = 1, 2, 3, 8, 9, 12, 13, 14
CONNACK_ERRORS = {1: "version du protocole refusée", 2: "identifiant refusé", 3: "serveur indisponible",
                  4: "utilisateur ou mot de passe incorrect", 5: "connexion non autorisée"}


class MqttError(Exception):
    """Erreur de connexion ou de protocole MQTT."""


def _str(text: str) -> bytes:
    data = text.encode("utf-8")
    return struct.pack("!H", len(data)) + data


def _length(n: int) -> bytes:
    out = bytearray()
    while True:
        byte, n = n % 128, n // 128
        out.append(byte | (0x80 if n else 0))
        if not n:
            return bytes(out)


class MqttClient:
    def __init__(self, host: str, port: int = 1883, username: str = "", password: str = "", client_id: str = "xiongmai_camera",
                 tls: bool = False, tls_insecure: bool = False, keepalive: int = 30,
                 will: tuple[str, str] | None = None) -> None:
        self.host, self.port, self.username, self.password = host, port, username, password
        self.client_id, self.tls, self.tls_insecure, self.keepalive, self.will = client_id, tls, tls_insecure, keepalive, will
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._pid = 0
        self._lock = asyncio.Lock()
        self.on_message: Callable[[str, bytes], Awaitable[None]] | None = None

    @property
    def connected(self) -> bool:
        return self._writer is not None and not self._writer.is_closing()

    async def _write(self, kind: int, flags: int, body: bytes) -> None:
        if not self.connected:
            raise MqttError("non connecté")
        assert self._writer is not None
        async with self._lock:
            self._writer.write(bytes([(kind << 4) | flags]) + _length(len(body)) + body)
            await self._writer.drain()

    async def _read(self) -> tuple[int, int, bytes]:
        assert self._reader is not None
        first = (await self._reader.readexactly(1))[0]
        mult, n = 1, 0
        while True:
            b = (await self._reader.readexactly(1))[0]
            n += (b & 0x7F) * mult
            if not b & 0x80:
                break
            mult *= 128
            if mult > 128 ** 3:
                raise MqttError("longueur de paquet invalide")
        return first >> 4, first & 0x0F, await self._reader.readexactly(n) if n else b""

    async def connect(self) -> None:
        ctx = None
        if self.tls:
            ctx = ssl.create_default_context()
            if self.tls_insecure:
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
        try:
            self._reader, self._writer = await asyncio.wait_for(asyncio.open_connection(self.host, self.port, ssl=ctx), 10)
        except (OSError, TimeoutError, ssl.SSLError) as err:
            raise MqttError(f"broker injoignable sur {self.host}:{self.port} ({type(err).__name__})") from err
        flags = 0x02  # session propre
        payload = _str(self.client_id)
        if self.will:
            flags |= 0x04 | 0x20  # dernière volonté, conservée, QoS 0
            payload += _str(self.will[0]) + _str(self.will[1])
        if self.username:
            flags |= 0x80
            payload += _str(self.username)
            if self.password:
                flags |= 0x40
                payload += _str(self.password)
        body = _str("MQTT") + bytes([4, flags]) + struct.pack("!H", self.keepalive) + payload
        await self._write(CONNECT, 0, body)
        kind, _f, data = await asyncio.wait_for(self._read(), 10)
        if kind != CONNACK or len(data) < 2:
            await self.close()
            raise MqttError("réponse inattendue du broker")
        if data[1]:
            await self.close()
            raise MqttError(f"connexion refusée : {CONNACK_ERRORS.get(data[1], data[1])}")

    async def publish(self, topic: str, payload: str | bytes, retain: bool = False) -> None:
        data = payload.encode("utf-8") if isinstance(payload, str) else payload
        await self._write(PUBLISH, 0x01 if retain else 0, _str(topic) + data)

    async def subscribe(self, topic: str) -> None:
        self._pid = self._pid % 65535 + 1
        await self._write(SUBSCRIBE, 0x02, struct.pack("!H", self._pid) + _str(topic) + b"\x00")

    async def loop(self) -> None:
        """Lit les messages jusqu'à la déconnexion ; envoie les PINGREQ."""
        ping = asyncio.create_task(self._pinger())
        try:
            while True:
                kind, flags, data = await asyncio.wait_for(self._read(), self.keepalive * 3)
                if kind == PUBLISH:
                    n = struct.unpack("!H", data[:2])[0]
                    topic = data[2:2 + n].decode("utf-8", "replace")
                    rest = data[2 + n:]
                    if (flags >> 1) & 0x03:  # QoS > 0 : identifiant de paquet à sauter
                        rest = rest[2:]
                    if self.on_message:
                        try:
                            await self.on_message(topic, rest)
                        except Exception:  # noqa: BLE001 - une commande en erreur ne doit pas couper MQTT
                            _LOGGER.exception("Erreur sur la commande %s", topic)
        except (asyncio.IncompleteReadError, ConnectionError, OSError, TimeoutError) as err:
            raise MqttError(f"liaison perdue ({type(err).__name__})") from err
        finally:
            ping.cancel()
            await self.close()

    async def _pinger(self) -> None:
        while self.connected:
            await asyncio.sleep(self.keepalive / 2)
            try:
                await self._write(PINGREQ, 0, b"")
            except (MqttError, OSError):
                return

    async def close(self) -> None:
        if self._writer is not None:
            try:
                self._writer.close()
                await asyncio.wait_for(self._writer.wait_closed(), 2)
            except Exception:  # noqa: BLE001
                pass
        self._reader = self._writer = None
