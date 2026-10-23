<p align="center">
  <img src="docs/images/logo.svg" width="96" height="96" alt="M3U Studio Logo">
</p>

<h1 align="center">M3U Studio</h1>

<p align="center">Organize IPTV channels. Publish your own subscriptions.</p>

<p align="center">
  <a href="https://github.com/cachemiao/m3u-studio/releases"><img src="https://img.shields.io/github/v/release/cachemiao/m3u-studio?color=F9A8D4" alt="Latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--2.0-F9A8D4" alt="GNU GPL v2.0 License"></a>
  <a href="https://hub.docker.com/r/cachemiao/m3u-studio"><img src="https://img.shields.io/docker/pulls/cachemiao/m3u-studio?color=F9A8D4" alt="Docker pulls"></a>
  <a href="https://github.com/cachemiao/m3u-studio/stargazers"><img src="https://img.shields.io/github/stars/cachemiao/m3u-studio?style=flat&amp;color=F9A8D4" alt="GitHub Stars"></a>
  <a href="https://x.com/cachemiao"><img src="https://img.shields.io/badge/X-@cachemiao-000000?logo=x&amp;logoColor=white" alt="Follow on X"></a>
  <a href="https://hub.docker.com/r/cachemiao/m3u-studio"><img src="https://img.shields.io/badge/arch-amd64%20%7C%20arm64-F9A8D4?logo=docker&amp;logoColor=white" alt="Docker Architectures"></a>
  <a href="https://t.me/m3ustudio_news"><img src="https://img.shields.io/badge/Telegram-Channel-26A5E4?logo=telegram&amp;logoColor=white" alt="Telegram channel"></a>
  <a href="https://t.me/m3ustudio_chat"><img src="https://img.shields.io/badge/Telegram-Group-26A5E4?logo=telegram&amp;logoColor=white" alt="Telegram group"></a>
</p>

<p align="center">
  <a href="https://cachemiao.github.io/m3u-studio/support.html?lang=en"><img src="docs/images/support-button.svg" width="260" alt="Buy me a coffee"></a>
</p>

<p align="center"><a href="README.md">简体中文</a> · <strong>English</strong></p>

M3U Studio is a self-hosted IPTV channel manager. Organize channels, groups, logos and EPG in your browser, then publish **M3U / TXT subscriptions** for your player.

## Screenshots

![M3U Studio channel management in dark mode](docs/images/channel-editor-en.png)

<details>
<summary>View light mode</summary>

![M3U Studio channel management in light mode](docs/images/channel-editor-en-light.png)

</details>

Screenshots preview the upcoming interface; the current public version may differ. Channels and logos are user-provided.

## Features

- **Playlists and subscriptions:** separate and combined subscriptions, custom short URLs, and M3U / TXT imports.
- **Easy organization:** search, drag selected channels together, automatic edge scrolling, and playlist and group ordering.
- **Bulk editing and checks:** edit fields, replace URLs, move or copy between playlists, and check source response times.
- **Logos and program guides:** a searchable logo library, automatic matching, EPG, catch-up and FCC parameters.
- **Recoverable changes:** undo/redo, browser drafts, the last 30 pre-publish snapshots, and JSON backup/restore.
- **Appearance and local deployment:** six accent colors, light/dark modes, Chinese/English and touch controls; local data storage with no frontend CDN dependency.

## Quick start

Install Docker, then choose either option below. The image supports **AMD64 / ARM64**.

### Option A: Docker command

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

Open **`http://SERVER_IP:8324`** and create your admin account on the first visit. Passwords require at least 8 characters.

Data stays in the `m3u-studio-data` volume. If the port is occupied, change `-p 8324:8324` to `-p 8325:8324` and visit port 8325.

### Option B: Docker Compose (recommended for NAS)

One Compose file pulls the official image directly. **No repository clone, local build or `.env` file is needed.**

**Command line:** run in a new directory:

```sh
mkdir m3u-studio && cd m3u-studio
curl -fsSL https://raw.githubusercontent.com/cachemiao/m3u-studio/main/docker-compose.image.yml -o docker-compose.yml
docker compose up -d
```

> If `raw.githubusercontent.com` is unavailable, open [docker-compose.image.yml](docker-compose.image.yml) on GitHub, copy its contents into `docker-compose.yml` in an empty directory, then run `docker compose up -d`.

**fnOS, Synology and other NAS systems:** create a project in the Docker Compose/project interface, paste the contents of [docker-compose.image.yml](docker-compose.image.yml), and deploy. No command line is required; menu names vary by NAS platform.

The default image comes from Docker Hub and supports AMD64 / ARM64. Data is initialized automatically in the `m3u-studio-data` named volume, with no host-directory permission setup. Open **`http://SERVER_IP:8324`** to create your admin account. There is no default password.

See [Deployment and maintenance](docs/Deployment.md) for Docker Compose, the GHCR mirror, source builds, upgrades and full backups.

## Get started

1. Create a playlist and import M3U / TXT from a file, pasted text or a file URL. You can also add channels manually.
2. Organize groups and ordering, then configure logos, EPG, catch-up and FCC.
3. Review your changes and click **Save & publish**.
4. Open **Subscriptions & EPG** and copy a subscription URL to your player.

Channel changes update subscriptions only after publishing. Logo uploads, replacements and deletions take effect immediately. Back up the entire data directory for a full backup; JSON exports exclude images and accounts.

## Documentation

- [User guide](docs/UserGuide.md): imports, dragging, bulk editing, logos, EPG and subscription URLs.
- [Deployment and maintenance](docs/Deployment.md): installation, upgrades and backups.
- [Changelog](CHANGELOG.md)

## Feedback and community

Report bugs or suggest features through [Issues](https://github.com/cachemiao/m3u-studio/issues). Include your version, deployment method and reproduction steps. Remove private URLs and credentials from examples.

[Telegram channel](https://t.me/m3ustudio_news) · [Telegram group](https://t.me/m3ustudio_chat) · [X](https://x.com/cachemiao) · [Support the project ☕](https://cachemiao.github.io/m3u-studio/support.html?lang=en)

## License and scope

Released under [GNU GPL v2.0](LICENSE) (`GPL-2.0-only`). Copyright © 2026 cachemiao.

The project includes no live stream sources or TV channel logos. Use resources you have permission to use. It manages channels and distributes subscriptions; playback, UDP-to-HTTP conversion, catch-up and FCC depend on external services and players. Deployment on a trusted LAN or VPN is recommended.

## Star History

<a href="https://star-history.com/#cachemiao/m3u-studio&amp;Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=cachemiao/m3u-studio&amp;type=Date&amp;theme=dark">
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=cachemiao/m3u-studio&amp;type=Date">
    <img alt="Star History · cachemiao/m3u-studio" src="https://api.star-history.com/svg?repos=cachemiao/m3u-studio&amp;type=Date" width="100%">
  </picture>
</a>
