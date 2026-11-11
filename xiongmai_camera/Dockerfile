ARG BUILD_FROM=alpine:3.20
FROM ${BUILD_FROM}

# Python seul (bibliothèque standard) et les fuseaux horaires pour l'heure de Home Assistant
RUN apk add --no-cache python3 tzdata

WORKDIR /app
COPY app/ /app/

LABEL io.hass.type="addon" io.hass.name="Caméra XiongMai" org.opencontainers.image.source="https://github.com/Marlboro62/xiongmai-camera"

CMD ["python3", "-u", "/app/server.py"]
