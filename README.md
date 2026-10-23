<p align="center">
  <img src="docs/images/logo.svg" width="96" height="96" alt="M3U Studio Logo">
</p>

<h1 align="center">M3U Studio</h1>

<p align="center">轻松整理 IPTV 频道，生成自己的订阅。</p>

<p align="center">
  <a href="https://github.com/cachemiao/m3u-studio/releases"><img src="https://img.shields.io/github/v/release/cachemiao/m3u-studio?color=F9A8D4" alt="Latest Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--2.0-F9A8D4" alt="GNU GPL v2.0 License"></a>
  <a href="https://hub.docker.com/r/cachemiao/m3u-studio"><img src="https://img.shields.io/badge/arch-amd64%20%7C%20arm64-F9A8D4?logo=docker&amp;logoColor=white" alt="Docker Architectures"></a>
  <a href="https://hub.docker.com/r/cachemiao/m3u-studio"><img src="https://img.shields.io/docker/pulls/cachemiao/m3u-studio?color=F9A8D4" alt="Docker Pulls"></a>
  <a href="https://github.com/cachemiao/m3u-studio/stargazers"><img src="https://img.shields.io/github/stars/cachemiao/m3u-studio?style=flat&amp;color=F9A8D4" alt="GitHub Stars"></a>
</p>

<p align="center"><strong>简体中文</strong> · <a href="README.en.md">English</a></p>

<p align="center">M3U Studio 是一个可自行部署的 IPTV 频道管理工具。通过网页管理频道、分组、台标与 EPG，整理后生成 <strong>M3U / TXT 订阅</strong>，在播放器中使用。</p>

<p align="center">基于 <strong>Python / Flask + SQLite</strong>，前端使用原生 HTML / CSS / JavaScript，无需 Node 构建。</p>

<p align="center">
  <a href="#界面预览">界面预览</a> · <a href="#核心功能">核心功能</a> · <a href="#快速启动">快速启动</a> · <a href="#开始使用">开始使用</a> · <a href="#文档">文档与开发</a> · <a href="#反馈与贡献">反馈与贡献</a>
</p>

## 界面预览

![M3U Studio 深色模式频道管理](docs/images/channel-editor.png)

<details>
<summary>查看浅色模式</summary>

![M3U Studio 浅色模式频道管理](docs/images/channel-editor-light.png)

</details>

截图为即将发布的新版界面，当前公开版本可能有所不同。频道与台标由用户自行添加。

<details>
<summary>查看多选拖动演示（新版预览）</summary>

![多选频道合并拖动与撤销演示](docs/images/multi-drag-zh.gif)

</details>

## 核心功能

- **多列表与订阅**：独立订阅、合并订阅、自定义短地址，支持 M3U / TXT 导入。
- **便捷整理**：搜索筛选、多选频道合并拖动、边缘自动滚动，支持列表与分组排序。
- **批量操作与检测**：编辑字段、替换地址、跨列表移动或复制，检测频道响应耗时。
- **台标与节目表**：台标库与自动匹配，配置 EPG、回放及 FCC 参数。
- **修改可恢复**：撤销 / 重做、浏览器草稿、最近 30 份发布前配置，以及 JSON 备份恢复。
- **外观与本地部署**：六种主题色、深浅模式、中英文界面与触屏操作；数据保存在本地，前端不依赖外部 CDN。

## 快速启动

> **访问说明：** 推荐在可信内网或 VPN 中部署。订阅与台标地址无需登录，能访问订阅的人可查看其中的播放源；公网部署请配置 HTTPS 反向代理和访问限制。

安装 Docker 和 Compose 后执行。仅需一个配置文件，直接拉取 **AMD64 / ARM64** 镜像，无需 clone、构建或配置 `.env`：

```sh
mkdir m3u-studio && cd m3u-studio
curl -fsSL https://raw.githubusercontent.com/cachemiao/m3u-studio/main/docker-compose.image.yml -o docker-compose.yml
docker compose up -d
```

打开 **`http://设备IP:8324`**，首次创建管理账号，密码至少 8 个字符；数据保存在 `m3u-studio-data` 命名卷中。

**NAS 部署／下载失败：** 在 GitHub 打开 [docker-compose.image.yml](docker-compose.image.yml)，将内容粘贴到飞牛 OS、群晖等 NAS 的 Compose／项目编辑器；也可在空目录保存为 `docker-compose.yml` 后执行 `docker compose up -d`。

[其他部署方式、端口修改与升级备份 →](docs/部署与维护.md)

## 开始使用

1. 创建列表，导入 M3U / TXT 文件、粘贴内容或提供文件链接；也可以手动添加频道。
2. 整理分组与顺序，设置台标、EPG、回放和 FCC。
3. 检查修改，点击 **保存并发布**。
4. 打开 **订阅与 EPG**，复制订阅地址到播放器。

频道修改发布后才更新订阅；台标文件的上传、替换和删除立即生效。完整备份请保留数据目录，JSON 备份不包含图片和账号。

## 文档

- [使用指南](docs/使用指南.md)：导入、拖动、批量编辑、台标、EPG 和订阅地址。
- [部署与维护](docs/部署与维护.md)：安装、升级、数据备份及旧版本迁移。
- [开发与贡献](docs/开发指南.md)：不使用 Docker 的本地运行、测试和 PR 流程。
- [更新记录](CHANGELOG.md)

## 反馈与贡献

欢迎提交 [Issue](https://github.com/cachemiao/m3u-studio/issues) 或 [Pull Request](https://github.com/cachemiao/m3u-studio/pulls)。问题反馈请附版本、部署方式和复现步骤；贡献代码前请阅读 [开发指南](docs/开发指南.md)，示例中去除私人地址与凭据。

[Telegram 频道](https://t.me/m3ustudio_news) · [Telegram 群组](https://t.me/m3ustudio_chat)

## 许可与使用范围

代码采用 [GNU GPL v2.0](LICENSE)（`GPL-2.0-only`）许可证。Copyright © 2026 cachemiao。

项目不提供直播源或电视台台标，请使用有权使用的资源。它负责频道管理与订阅分发，播放、UDP 转 HTTP、回放和 FCC 能力取决于外部服务及播放器。

## Star History

<a href="https://star-history.com/#cachemiao/m3u-studio&amp;Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=cachemiao/m3u-studio&amp;type=Date&amp;theme=dark">
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=cachemiao/m3u-studio&amp;type=Date">
    <img alt="Star History · cachemiao/m3u-studio" src="https://api.star-history.com/svg?repos=cachemiao/m3u-studio&amp;type=Date" width="100%">
  </picture>
</a>

<p align="center">
  <a href="https://cachemiao.github.io/m3u-studio/support.html?lang=zh"><img src="docs/images/support-button.svg" width="260" alt="Buy me a coffee"></a>
</p>
