# Docker Compose Containers + Raspberry Pi Setup

## Type
HITL

## Assigned Agents
- `@agency-engineering-sre` (Docker configuration, cron, systemd, Pi-specific BLE permissions)

## Reference Docs
- [PRD: Vertical Test Suite — Sections 6.1, 6.2 (Infrastructure Architecture, Cron Schedule)](../../docs/prd-vertical-test-suite.md)

## What to build

Containerize the test suite and deliver a one-command setup script for the Raspberry Pi 5. The `hvac-api` container runs persistently (auto-starts on boot). The `hvac-harness` container is ephemeral — spun up by cron, runs the suite, then exits.

> **Why HITL**: Docker Engine installation and BLE `privileged` container access require physical Pi validation. The `setup_pi.sh` script must be manually run once on the Pi and verified before the daily cron is trusted.

**Deliverables:**

`tests/harness/Dockerfile`:
```dockerfile
FROM python:3.12-slim
RUN useradd -u 1000 -m harness
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER harness
```

`tests/api/Dockerfile`:
```dockerfile
FROM python:3.12-slim
RUN useradd -u 1000 -m api
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER api
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

`tests/docker-compose.yml`:
```yaml
services:
  hvac-harness:
    build: ./harness
    volumes:
      - test-data:/data
      - /var/run/dbus:/var/run/dbus
    privileged: true
    env_file: .env
    profiles: [run]

  hvac-api:
    build: ./api
    ports:
      - "8080:8080"
    volumes:
      - test-data:/data:ro
    env_file: .env
    restart: unless-stopped

volumes:
  test-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/hvac-tests/data
```

`tests/scripts/setup_pi.sh` must:
1. Install Docker Engine (official `get.docker.com` script)
2. Add `pi` user to `docker` group
3. Create `/opt/hvac-tests/data/` and `/var/log/hvac-tests/`
4. Copy `tests/` to `/opt/hvac-tests/`
5. `docker compose build`
6. `docker compose up -d hvac-api` (persistent API container)
7. Initialize DB schema: `docker compose run --rm hvac-harness python db/init_db.py`
8. Install cron entries from PRD Section 6.2 (06:00 daily Phase 1A, 06:00 Saturday Phase 1B, 06:30 analysis)
9. Create `/opt/hvac-tests/.env` from `.env.example` with placeholder values

`tests/.env.example`:
```
API_BEARER_TOKEN=replace-with-secure-random-token
OPENROUTER_API_KEY=replace-with-openrouter-key
KIMI_MODEL=moonshotai/kimi-k2.5
DB_PATH=/data/test_telemetry.db
```

## Acceptance criteria

- [ ] Both Dockerfiles build successfully on Raspberry Pi OS (arm64) without errors
- [ ] `docker compose up -d hvac-api` starts the API container and it survives a Pi reboot (restart: unless-stopped)
- [ ] `docker compose run --rm hvac-harness python runner.py --phase 1a` executes Phase 1A successfully inside the container
- [ ] BLE simulator inside `hvac-harness` can advertise via the Pi's Bluetooth adapter (`privileged: true` + dbus volume confirmed working)
- [ ] `setup_pi.sh` is idempotent — running it twice does not duplicate cron entries or corrupt the DB
- [ ] `hvac-api` container on port 8080 is accessible from local network (test with `curl http://pi-ip:8080/schema`)
- [ ] Both containers run as non-root user (uid 1000)
- [ ] Cron log entries appear in `/var/log/hvac-tests/daily.log` after the first scheduled run

## Blocked by

- [0030 — Telemetry Schema & SQLite Database Init](./0030-telemetry-schema-db-init.md)
- [0031 — FastAPI Read-Only Query Middleware](./0031-fastapi-query-middleware.md)
- [0032 — Mock ESP32 BLE Simulator — Core](./0032-ble-simulator-core.md)
