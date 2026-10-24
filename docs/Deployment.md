# M3U Studio deployment and maintenance

[Home](../README.en.md) · [User guide](UserGuide.md) · [简体中文](部署与维护.md)

Fresh installations create accounts in the web UI and **do not need `.env`**. References to backing up `.env` apply only to legacy installations that already have one.

## Quick start with Docker (recommended)

Install Docker first. Images support **AMD64 and ARM64**; Docker selects the appropriate architecture.

### 1. Pull the image

```sh
docker pull cachemiao/m3u-studio:latest
```

You can also use GitHub Container Registry. Replace the image name in the run command or Compose configuration as well:

```sh
docker pull ghcr.io/cachemiao/m3u-studio:latest
```

### 2. Start the container

```sh
docker run -d \
  --name m3u-studio \
  -p 8324:8324 \
  -v m3u-studio-data:/data \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  cachemiao/m3u-studio:latest
```

- `-p 8324:8324`: web interface and subscriptions. Change to `-p 8325:8324` if the host port is occupied, then access port 8325.
- `-v m3u-studio-data:/data`: persist accounts, playlists, logos and backups in a Docker named volume. Reuse this volume when recreating the container.
- `-e TZ=Asia/Shanghai`: container timezone; change as needed.
- `--restart unless-stopped`: restart automatically with Docker unless manually stopped.

### 3. Open the web interface

Visit **`http://YOUR_SERVER_IP:8324`**. On first use, create an administrator account with a password of at least 8 characters. No `TOKEN`, administrator environment variables or `.env` file are needed for a new installation.

[Docker Hub](https://hub.docker.com/r/cachemiao/m3u-studio) · [Releases](https://github.com/cachemiao/m3u-studio/releases)

## Docker Compose (for long-term maintenance)

Use [docker-compose.image.yml](../docker-compose.image.yml) from the repository root as a standalone image deployment file, or paste it into your NAS Compose interface. It uses a named volume and needs no host-directory permission setup.

Docker Compose is required. Create `compose.yaml` in an empty directory:

```yaml
services:
  m3u-studio:
    image: cachemiao/m3u-studio:latest
    container_name: m3u-studio
    ports:
      - "8324:8324"
    environment:
      TZ: Asia/Shanghai
    volumes:
      - m3u-studio-data:/data
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  m3u-studio-data:
    name: m3u-studio-data
```

```sh
docker compose pull
docker compose up -d
```

Open **`http://YOUR_SERVER_IP:8324`**. This example uses the same named volume as the Docker Run command above. Choose either Docker Run or Compose. To switch from Docker Run to Compose, stop and remove the existing container first, keeping the data volume.

### Bind-mount a host directory

To store files directly on the host, use `./data:/data` instead. The container runs as non-root **UID 10001**. Prepare the directory before starting:

```sh
mkdir -p data/database data/logo data/backup
sudo chown -R 10001:10001 data
```

For Docker Run, use `-v "$PWD/data:/data"`; for Compose, use `- ./data:/data`. An empty host directory does not contain your existing named-volume data; copy it first when migrating.

## Upgrade and maintenance

`latest` follows the latest stable release. To pin a version, use a version tag, for example `cachemiao/m3u-studio:<VERSION>`. Back up before upgrading and retain the original data mount.

**Compose upgrade:**

```sh
docker compose pull
docker compose up -d
```

**Docker Run upgrade:**

```sh
docker pull cachemiao/m3u-studio:latest
docker stop m3u-studio
docker rm m3u-studio
```

Run the startup command again with the same `m3u-studio-data:/data` mount.

| Operation | Docker | Compose |
| --- | --- | --- |
| Logs | `docker logs --tail=100 m3u-studio` | `docker compose logs --tail=100` |
| Restart | `docker restart m3u-studio` | `docker compose restart` |
| Stop | `docker stop m3u-studio` | `docker compose stop` |
| Start | `docker start m3u-studio` | `docker compose start` |

Health check (adjust the port if changed):

```sh
curl -fsS http://127.0.0.1:8324/healthz
```

The expected response is `{"status":"ok"}`.

## Build from source

Download the source or release archive. In the directory containing `docker-compose.yml`, run:

```sh
sh setup.sh
# If requested by setup.sh: sudo chown -R 10001:10001 data
docker compose up -d --build
```

The repository's `docker-compose.yml` uses `build:` for source builds. Both the service and container are named `m3u-studio`; data remains mounted from `./data`. Manage each deployment with `docker compose` from its own project directory. The first build downloads the base image and dependencies.

When upgrading an older source deployment, run `docker compose down` with its original Compose configuration **before updating the source**. Then update the source and run `docker compose up -d --build` to avoid port conflicts with the previous container. Keep the existing `./data` directory.

## Data and backup

All container data is under `/data`. The recommended installation stores it in the `m3u-studio-data` named volume; bind-mount and source installations use `./data`. The table below shows host-directory paths; named volumes contain the same subdirectories.

| Directory | Contents |
| --- | --- |
| `data/database/` | SQLite configuration, account hashes and session key |
| `data/logo/` | Uploaded logo images |
| `data/backup/` | Recent pre-publish JSON snapshots |

**Settings → Export JSON** includes all playlists and the current draft, but excludes accounts and logo images. Before a full migration or upgrade, stop the container and back up the entire data directory. Retain any existing `.env` file as well.

### Full backup of a named-volume installation

Run on the host. Stop the service first to keep SQLite data consistent, then copy the entire data directory:

```sh
docker stop m3u-studio
backup_dir="./m3u-studio-backup-$(date +%Y%m%d-%H%M%S)"
umask 077
mkdir -p "$backup_dir"
docker cp m3u-studio:/data/. "$backup_dir/"
docker start m3u-studio
```

Backups include account and session keys; keep them private. Preserve the volume when upgrading or removing containers; `docker compose down -v` removes Compose-managed volumes.

### Full backup of a bind-mount or source installation

Run in the deployment directory:

```sh
docker compose stop
backup_file="../m3u-studio-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
umask 077
if [ -f .env ]; then
  tar -czf "$backup_file" data .env
else
  tar -czf "$backup_file" data
fi
docker compose start
```

For source upgrades, retain `data/` and any existing `.env`, update the source, then run `sh setup.sh` and `docker compose up -d --build`. See the [Upgrade guide](部署与维护.md#从旧版本升级).

## Scope and compatibility

- Deploy on a trusted LAN or VPN. Configure HTTPS and access restrictions if exposing it publicly; subscription URLs can reveal stream URLs.
- EPG uses existing XMLTV URLs; the project does not download or generate program guides.
- Catch-up and FCC depend on your player and stream service. FCC needs a service supporting the parameter, such as rtp2httpd.
- TXT has no logo or EPG metadata. Unknown M3U extension attributes and comments are not preserved.

For migration from old versions that bundled logo images or used `.env` accounts, see [the legacy migration notes (Chinese)](部署与维护.md#从旧版本升级).

## Server-side target policy

Remote imports and source checks connect only to public targets by default. For private subscriptions or IPTV relays, configure `IMPORT_ALLOWED_NETWORKS` and `SOURCE_ALLOWED_NETWORKS` independently, preferably as individual hosts. Their `*_ALLOWED_PORTS` settings optionally restrict destination ports. These two user-URL features use direct checked connections and do not inherit HTTP proxy variables. See [network access policy](engineering/network-access.md) for configuration and upgrade considerations.
