<h1 align="center">
  <img src="docs/images/logo-readme.png" width="128" height="128" alt="M3U Studio Logo"><br>
  M3U Studio
</h1>

<p align="center">轻松整理 IPTV 频道，生成自己的订阅。</p>

<p align="center">
  <a href="https://github.com/cachemiao/m3u-studio/releases"><img src="https://img.shields.io/github/v/release/cachemiao/m3u-studio?color=F9A8D4" alt="Latest Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--2.0-F9A8D4" alt="GNU GPL v2.0 License"></a>
  <a href="https://hub.docker.com/r/cachemiao/m3u-studio"><img src="https://img.shields.io/badge/arch-amd64%20%7C%20arm64-F9A8D4?logo=docker&amp;logoColor=white" alt="Docker Architectures"></a>
  <a href="https://hub.docker.com/r/cachemiao/m3u-studio"><img src="https://img.shields.io/docker/pulls/cachemiao/m3u-studio?color=F9A8D4" alt="Docker Pulls"></a>
  <a href="https://github.com/cachemiao/m3u-studio/stargazers"><img src="https://img.shields.io/github/stars/cachemiao/m3u-studio?style=flat&amp;color=F9A8D4" alt="GitHub Stars"></a>
</p>

<p align="center"><strong>简体中文</strong> · <a href="README.en.md">English</a></p>

<p align="center">M3U Studio 是一个可自行部署的 IPTV 频道管理工具。<br>通过网页管理频道、分组、台标与 EPG，整理后生成 <strong>M3U / TXT 订阅</strong>，在播放器中使用。</p>

<p align="center">
  <a href="https://cachemiao.github.io/m3u-studio/demo/?lang=zh">在线体验</a> · <a href="#界面预览">界面预览</a> · <a href="#核心功能">核心功能</a> · <a href="#快速启动">快速启动</a> · <a href="#开始使用">开始使用</a> · <a href="#文档">文档与开发</a> · <a href="#反馈与贡献">反馈与贡献</a>
</p>

## 界面预览

<table>
  <tr>
    <td width="50%" align="center"><a href="docs/images/channel-editor.png"><img src="docs/images/channel-editor.png" width="100%" alt="M3U Studio 深色模式频道管理"></a><br><sub><sup>深色模式</sup></sub></td>
    <td width="50%" align="center"><a href="docs/images/channel-editor-light.png"><img src="docs/images/channel-editor-light.png" width="100%" alt="M3U Studio 浅色模式频道管理"></a><br><sub><sup>浅色模式</sup></sub></td>
  </tr>
</table>

无需安装，即可在线体验频道整理、拖动排序和批量编辑等功能。[在线体验 →](https://cachemiao.github.io/m3u-studio/demo/?lang=zh)

## 核心功能

- **先改后发，随时回退**：草稿自动保存在浏览器，支持撤销 / 重做；确认无误再发布，并保留最近 30 份配置。
- **多选拖动整理**：选中多个频道一起拖动，边缘自动滚动，列表与分组也能自由排序。
- **台标自动匹配**：统一台标库，按名称和别名自动匹配，支持搜索与批量上传。
- **批量编辑与源检测**：批量替换地址、修改字段，跨列表移动或复制；检测各频道响应耗时，快速找出失效源。
- **多列表订阅**：导入 M3U / TXT（文件、文本或链接），生成独立或合并订阅，支持自定义短地址。
- **EPG、回放与 FCC**：按频道配置节目表、回放和 FCC 参数，随订阅导出。
- **本地部署**：轻量化设计，提供 AMD64 / ARM64 镜像，支持 NAS、服务器及斐讯 N1 等 ARM 盒子；数据保存在自己的设备上，前端不依赖外部 CDN。

## 快速启动

> **访问说明：** 推荐在可信内网或 VPN 中部署。订阅与台标地址无需登录，能访问订阅的人可查看其中的播放源；公网部署请配置 HTTPS 反向代理和访问限制。

安装 Docker 和 Compose 后执行。仅需一个配置文件，直接拉取 **AMD64 / ARM64** 镜像，无需 clone、构建或配置 `.env`：

```sh
mkdir m3u-studio && cd m3u-studio
curl -fsSL https://raw.githubusercontent.com/cachemiao/m3u-studio/main/docker-compose.image.yml -o docker-compose.yml
docker compose up -d
```

打开 **`http://设备IP:8324`**，首次创建管理账号，密码至少 8 个字符；数据保存在 `m3u-studio-data` 命名卷中。

**NAS 部署：** 将下面的配置粘贴到飞牛 OS、群晖等 NAS 的 Compose／项目编辑器即可启动。也可在空目录保存为 `docker-compose.yml`，执行 `docker compose up -d`，无需访问下载地址。

<details>
<summary>直接复制 Compose 配置</summary>

```yaml
# Standalone image deployment: no source checkout or .env required.
# Save as docker-compose.yml, then run: docker compose up -d
services:
  m3u-studio:
    image: cachemiao/m3u-studio:latest
    container_name: m3u-studio
    ports:
      - "8324:8324"
    environment:
      TZ: Asia/Shanghai
      IMPORT_ALLOWED_NETWORKS: ${IMPORT_ALLOWED_NETWORKS:-}
      IMPORT_ALLOWED_PORTS: ${IMPORT_ALLOWED_PORTS:-}
      SOURCE_ALLOWED_NETWORKS: ${SOURCE_ALLOWED_NETWORKS:-}
      SOURCE_ALLOWED_PORTS: ${SOURCE_ALLOWED_PORTS:-}
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

配置文件：[docker-compose.image.yml](docker-compose.image.yml)。

</details>

[其他部署方式、端口修改与升级备份 →](docs/部署与维护.md)

## 开始使用

1. 创建列表，导入 M3U / TXT 文件、粘贴内容或提供文件链接；也可以手动添加频道。
2. 整理分组与顺序，设置台标、EPG、回放和 FCC。
3. 检查修改，点击 **保存并发布**。
4. 打开 **订阅与 EPG**，复制订阅地址到播放器。

频道修改发布后才更新订阅；台标文件的上传、替换和删除立即生效。完整备份请保留数据目录，JSON 备份不包含图片和账号。

**FCC（快速换台）** 面向组播 IPTV 场景，需配合 [rtp2httpd](https://github.com/stackia/rtp2httpd) 等支持服务和播放器使用。

## 文档

基于 **Python / Flask + SQLite**，前端使用原生 HTML / CSS / JavaScript，无需 Node 构建。

- [使用指南](docs/使用指南.md)：导入、拖动、批量编辑、台标、EPG 和订阅地址。
- [部署与维护](docs/部署与维护.md)：安装、升级、数据备份及旧版本迁移。
- [开发与贡献](docs/开发指南.md)：不使用 Docker 的本地运行、测试和 PR 流程。
- [更新记录](CHANGELOG.md)

## 反馈与贡献

欢迎提交 [Issue](https://github.com/cachemiao/m3u-studio/issues) 或 [Pull Request](https://github.com/cachemiao/m3u-studio/pulls)。问题反馈请附版本、部署方式和复现步骤；贡献代码前请阅读 [开发指南](docs/开发指南.md)，示例中去除私人地址与凭据。

[Telegram 频道](https://t.me/m3ustudio_news) · [Telegram 群组](https://t.me/m3ustudio_chat)

## 许可与使用范围

代码采用 [GNU GPL v2.0](LICENSE)（`GPL-2.0-only`）许可证。Copyright © 2026 cachemiao。

项目不提供直播源或电视台台标，请使用有权使用的资源。它负责频道管理与订阅分发，播放、UDP 转 HTTP 和回放能力取决于外部服务及播放器。

<p align="center">
  <a href="https://cachemiao.github.io/m3u-studio/support.html?lang=zh"><img src="docs/images/support-button.svg" width="260" alt="Buy me a coffee"></a>
</p>
