<p align="center">
  <img src="app/static/favicon.svg" width="96" height="96" alt="M3U Studio Logo">
</p>

<h1 align="center">M3U Studio</h1>

<p align="center">IPTV 频道管理与订阅服务器</p>

<p align="center">
  <a href="https://github.com/cachemiao/m3u-studio/releases"><img src="https://img.shields.io/github/v/release/cachemiao/m3u-studio?color=0f766e" alt="最新版本"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--2.0-blue" alt="GNU GPL v2.0 许可证"></a>
  <a href="https://hub.docker.com/r/cachemiao/m3u-studio"><img src="https://img.shields.io/docker/pulls/cachemiao/m3u-studio?color=0f766e" alt="Docker 拉取量"></a>
  <a href="https://github.com/cachemiao/m3u-studio/stargazers"><img src="https://img.shields.io/github/stars/cachemiao/m3u-studio?style=flat&amp;color=0f766e" alt="GitHub Stars"></a>
  <a href="https://t.me/m3ustudio_news"><img src="https://img.shields.io/badge/Telegram-%E9%A2%91%E9%81%93-26A5E4?logo=telegram&amp;logoColor=white" alt="Telegram 频道"></a>
  <a href="https://t.me/m3ustudio_chat"><img src="https://img.shields.io/badge/Telegram-%E7%BE%A4%E7%BB%84-26A5E4?logo=telegram&amp;logoColor=white" alt="Telegram 群组"></a>
</p>

<p align="center">
  <a href="https://ko-fi.com/cachemiao"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-79A6ED?style=flat" width="200" alt="Buy me a coffee"></a>
</p>

<p align="center"><strong>简体中文</strong> · <a href="README.en.md">English</a></p>

一个易于部署的、基于 **Python / Flask** 的 IPTV 频道管理与订阅服务器，支持 **M3U 和 TXT** 格式。通过网页管理多套频道列表、分组、台标和 EPG，生成可自定义短地址的订阅链接，支持 **Docker 一键部署**。

本项目出于个人学习与兴趣开发，代码采用 **GNU GPL v2.0 许可证**开源，不提供直播源或第三方台标素材。如有涉及侵权的内容，请通过 [Issue](https://github.com/cachemiao/m3u-studio/issues) 联系作者处理。

使用中遇到问题或有功能建议，欢迎提交 [Issue](https://github.com/cachemiao/m3u-studio/issues)。

---

## 主要功能

- **多列表管理**：每套列表拥有独立订阅地址，可自定义短名称，也可以加入合并订阅；支持列表、分组与频道拖拽排序。
- **导入与导出**：导入 UTF-8 M3U / TXT，自动修正可处理的字段，跳过无效频道并汇总原因；整理后生成对应格式的订阅。
- **统一台标库**：初始为空，支持搜索、本地上传、批量上传、名称与别名匹配，以及高相似度模糊匹配；同名上传可选择替换或停止，图片直链也可单独填写。
- **批量编辑**：批量调整分组、EPG、FCC，或替换直播与回放地址中的文字，复制移动频道至其他列表，预览后应用。
- **源检测**：检测已选频道或当前列表的响应耗时，支持单频道重测、进度、取消和失败项重试。
- **EPG、回放与 FCC**：编辑频道 EPG ID、节目表地址、回放参数与 FCC 参数，按格式导出；EPG ID 留空时，M3U 使用频道名称作为 ID，由播放器与节目表匹配。
- **撤销与历史**：草稿支持撤销 / 重做，保留最近 30 份发布前配置；支持 JSON 配置备份与恢复。
- **语言、主题与移动端**：简体中文 / English，浅色 / 深色 / 跟随系统图标菜单，记住浏览器偏好；手机支持频道编辑和拖拽。
- **本地部署**：账号、配置和上传图片保存在本地数据目录，前端不依赖外部 CDN。

本项目提供频道编辑与订阅分发。播放地址和节目表由使用者自行提供，UDP 转 HTTP 等播放服务需单独部署。

台标资源可参考 [m3u-logos](https://github.com/cachemiao/m3u-logos)，使用前请确认相关素材的授权。

FCC 需配合 [rtp2httpd](https://github.com/stackia/rtp2httpd) 等服务，并配置对应的 [FCC 地址](https://rtp2httpd.com/reference/cn-fcc-collection)。

## 界面预览

首次打开默认暗色主题，支持浅色、暗色和跟随系统主题，电脑与手机均可使用。界面支持中文 / English，可在登录页或顶部切换；首次按浏览器语言选择，之后记住本浏览器偏好。切换语言不改变频道、分组、列表名称或播放地址。

界面示例中的频道与台标由用户自行添加。项目不提供直播源或台标素材。

### 频道管理

![频道管理](docs/images/channel-editor.png)

### 台标库管理

![台标库管理](docs/images/logo-library.png)

### 订阅与 EPG

![多列表订阅与 EPG 设置](docs/images/subscriptions.png)

## Docker 一键启动【推荐】

需要安装 Docker。镜像支持 **AMD64 / ARM64**，Docker 会自动选择适合设备的架构，无需下载源码或本地构建。

### 1. 拉取镜像

```sh
docker pull cachemiao/m3u-studio:latest
```

也可使用 GitHub 镜像源，后续启动命令或 Compose 中的镜像名称一并替换：

```sh
docker pull ghcr.io/cachemiao/m3u-studio:latest
```

### 2. 启动容器

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

- `-p 8324:8324`：网页和订阅使用 8324 端口。如有冲突，可改为 `-p 8325:8324`，然后通过 8325 访问。
- `-v m3u-studio-data:/data`：将账号、频道配置、台标和历史备份保存在 Docker 数据卷中，重建容器后继续使用。
- `-e TZ=Asia/Shanghai`：设置容器时区。
- `--restart unless-stopped`：Docker 启动后自动启动服务，手动停止的容器保持停止。

### 3. 打开网页

访问 **`http://设备IP:8324`**，首次打开时创建管理用户名和密码，密码至少 8 个字符。全新安装无需配置 `TOKEN`、管理员环境变量或 `.env` 文件。

[Docker Hub 镜像与标签](https://hub.docker.com/r/cachemiao/m3u-studio) · [GitHub Releases](https://github.com/cachemiao/m3u-studio/releases)

## Docker Compose 部署【便于长期维护】

需要 Docker Compose。在任意空目录创建 `compose.yaml`，复制以下内容：

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

启动：

```sh
docker compose pull
docker compose up -d
```

访问 **`http://设备IP:8324`**。此示例与上面的 `docker run` 使用同名数据卷；两种方式选择一种即可。若要从 `docker run` 改用 Compose，先停止并移除原容器，再在新目录执行上述命令，保留数据卷。

### 使用宿主机目录保存数据

如果希望直接在宿主机查看和备份文件，可将挂载改为 `./data:/data`。镜像以 **UID 10001** 的非 root 用户运行，启动前在部署目录准备写入权限：

```sh
mkdir -p data/database data/logo data/backup
sudo chown -R 10001:10001 data
```

`docker run` 对应替换为 `-v "$PWD/data:/data"`；Compose 对应替换为 `- ./data:/data`。新数据目录与已有数据卷互不相通，已有用户迁移时需先复制数据。

## 升级与常用命令

`latest` 指向最新正式版；如需固定版本，将镜像改为 `cachemiao/m3u-studio:0.5.0`。升级前先备份数据，重建时使用原数据卷或原目录挂载。

**Compose 升级**（在部署目录执行）：

```sh
docker compose pull
docker compose up -d
```

**docker run 升级**：

```sh
docker pull cachemiao/m3u-studio:latest
docker stop m3u-studio
docker rm m3u-studio
```

然后再次执行上面的启动命令，继续挂载 `m3u-studio-data:/data`。

| 操作 | Docker 命令 | Compose 命令 |
| --- | --- | --- |
| 查看日志 | `docker logs --tail=100 m3u-studio` | `docker compose logs --tail=100` |
| 重启 | `docker restart m3u-studio` | `docker compose restart` |
| 停止 | `docker stop m3u-studio` | `docker compose stop` |
| 启动 | `docker start m3u-studio` | `docker compose start` |

健康检查：

```sh
curl -fsS http://127.0.0.1:8324/healthz
```

返回 `{"status":"ok"}` 表示服务正常；如果修改了映射端口，请同步修改检查地址。

## 从源码构建

下载源码或解压发布包，进入含有 `docker-compose.yml` 的项目目录：

```sh
sh setup.sh
# 非 root 用户按 setup.sh 提示执行 sudo chown -R 10001:10001 data
docker compose up -d --build
```

仓库附带的 `docker-compose.yml` 用于源码构建，容器名称为 `iptv-manager`，数据挂载在 `./data`。首次构建需要联网下载基础镜像和依赖。

## 基本使用

1. 点击左侧“频道列表”的 **＋**，选择 **新建空列表** 或 **导入并新建列表**；已有列表可点击 **导入频道** 追加 M3U / TXT，弹窗会显示目标列表。也可创建分组并手动添加频道。
2. 编辑播放地址、回放、EPG 和 FCC；选择台标，或上传自己的图片。
3. 使用拖拽、搜索、批量编辑和台标匹配整理频道。
4. 检查草稿，点击 **保存并发布**。
5. 打开 **订阅与 EPG**，复制合并或单列表订阅地址到播放器。

频道修改在保存并发布后更新订阅。已应用到编辑列表的未发布草稿会自动保存在当前浏览器，刷新或重新登录后可选择恢复；服务器配置变化时会提醒核对。尚未提交的弹窗表单不属于该草稿。浏览器存储不可用时请及时发布或导出 JSON 备份。

台标上传、替换和删除立即生效；频道与台标的绑定仍需保存并发布。台标文件不随草稿撤销或发布历史恢复。

### 导入结果

导入时会将频道和分组名称中的逗号规范为空格，清空无效台标地址，将未知回放类型设为 `default`、无效回放天数设为 7 天。不支持的播放协议或无法修正的频道会跳过，报告显示对应行号、名称和原因；修正后的频道仍需通过发布校验。

TXT 地址中的普通逗号会保留；紧接另一个 `协议://` 地址的逗号按回放地址分隔符解析。导入结果会列出导入、修正和跳过数量，详情最多显示 1000 条。导入只追加频道，保留已有频道；全部频道无效时，不创建新列表，也不改变原列表。重复频道 ID 会自动调整以避免冲突。导入期间表单或列表内容发生变化时，会阻止应用结果，请核对后重新导入。

## 源响应耗时检测

1. 选择需要检测的频道；未选择时检测当前列表全部频道。
2. 点击 **批量检测** 打开窗口，再点击 **开始检测**。
3. 查看检测进度与结果，可取消检测、筛选失败项、重试失败项或再次检测本次全部频道。

点击频道旁的耗时或状态标签，可直接重新检测该频道，无需打开检测窗口。

- **≤300ms**：绿色；**>300ms**：黄色；**超时**：红色。
- 最多并发 4 路，单路超时 5 秒；HTTP/HLS 仅有限读取，不持续下载直播流。UDP/RTP/RTSP 等协议暂不支持。
- 检测从部署服务器发起，响应耗时不代表播放器的出画面时间或实际播放效果。
- 结果仅供参考，不会自动删除或修改频道。结果保留在当前页面，刷新后清空；关闭检测窗口会取消后续检测。

### 跨列表移动与复制

选中频道后打开“批量编辑”，勾选“移动或复制到其他列表”，选择操作、目标列表和目标分组。可以保留原分组、选择目标列表已有分组，或输入新分组名称；缺少的分组会自动创建，频道追加到目标列表末尾。

默认选择“复制”，保留原列表频道；选择“移动”会从原列表移除所选频道，并显示红色提示。先预览再应用，支持撤销；确认后点击“保存并发布”更新订阅。

## 订阅地址

| 内容 | 路径 |
| --- | --- |
| 合并 M3U 订阅 | `/tv.m3u` |
| 合并 TXT 订阅 | `/tv.txt` |
| 单列表 M3U 订阅 | `/lists/列表ID/tv.m3u` |
| 单列表 TXT 订阅 | `/lists/列表ID/tv.txt` |
| 台标文件 | `/logo/CCTV1.png` |

**电视端长期订阅建议使用固定 ID 地址**，例如 `/lists/列表ID/tv.m3u`。修改列表名称或订阅短名称都不会改变该地址。日常整理频道后，点击“保存并发布”，播放器刷新原订阅即可，无需重新输入地址。

在“列表设置”填写订阅短名称，例如 `lt`、`yd`，保存并发布后可使用 `/lt.m3u`、`/yd.txt`。短名称支持 1–24 位英文字母、数字、下划线或短横线，以字母或数字开头；自动转小写且不能重复，也不能使用系统保留路由名称。留空使用原地址，修改短名称后原短地址失效，使用该短地址的播放器需要重新填写；固定 ID 地址继续有效。

网页会显示完整地址。列表改名不会改变订阅 ID；订阅和台标地址无需登录，播放器须能访问部署设备。

## 数据与备份

容器内所有数据位于 `/data`，推荐安装方式保存到命名卷 `m3u-studio-data`；使用宿主机目录或源码安装时则保存到 `./data`。下面目录表对应宿主机目录安装，命名卷中也包含相同的子目录。

| 目录 | 内容 |
| --- | --- |
| `data/database/` | SQLite 配置、账号哈希与登录密钥 |
| `data/logo/` | 上传的台标图片 |
| `data/backup/` | 最近发布前的配置 JSON 备份 |

**设置 → 导出配置备份** 可导出全部列表及当前草稿，但不包含账号和图片。完整迁移或升级前，应停止容器并备份整个 `data/`；已有 `.env` 也需保留。

### 命名卷安装的完整备份

在宿主机执行，先停止服务保证 SQLite 数据一致，再复制整个数据目录：

```sh
docker stop m3u-studio
backup_dir="./m3u-studio-backup-$(date +%Y%m%d-%H%M%S)"
umask 077
mkdir -p "$backup_dir"
docker cp m3u-studio:/data/. "$backup_dir/"
docker start m3u-studio
```

备份包含账号和登录密钥，请妥善保存。升级和移除容器时保留数据卷；`docker compose down -v` 会删除 Compose 管理的数据卷。

### 宿主机目录或源码安装的完整备份

在部署目录执行：

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

源码安装升级时保留 `data/` 和现有 `.env`，更新源码后执行 `sh setup.sh` 和 `docker compose up -d --build`。详见 [使用指南](docs/使用指南.md#从旧版本升级)。

## 使用范围与兼容性

- 推荐部署在可信内网或 VPN 内；管理后台使用网页账号登录。对外提供服务时，应配置 HTTPS 反向代理和访问限制，订阅地址也可能暴露播放源。
- EPG 使用已有 XMLTV 地址，本项目不下载或生成本地节目表。
- 回放和 FCC 的实际效果取决于播放服务与播放器；FCC 快速换台需配合 rtp2httpd 等支持该参数的服务。
- TXT 不包含台标和 EPG 元信息；未知 M3U 扩展属性及注释不保留。

## 更多资料

- [详细使用指南](docs/使用指南.md)
- [更新记录](CHANGELOG.md)

## 反馈与贡献

欢迎通过 Issues 提交问题或建议。报告问题时，请附版本、部署方式、浏览器 / 播放器和复现步骤；提供示例配置前请去除账号、令牌及私人地址。

## ☕ 支持项目

如果 M3U Studio 对你有帮助，欢迎[请我喝杯咖啡](https://ko-fi.com/cachemiao)，支持项目持续维护与改进。感谢你的支持！

## 许可证与台标素材

本项目代码采用 [GNU GPL v2.0 许可证](LICENSE)（仅第 2 版，`GPL-2.0-only`），Copyright (c) 2026 cachemiao。

- ✅ 允许个人使用、商业部署和销售软件副本。
- ✅ 修改后仅自己或企业内部使用，无需公开源代码。
- ⚠️ 对外分发受 GPL 覆盖的修改版时，须继续采用 GPL v2.0，并按许可证要求向接收者提供对应源代码。
- ⚠️ 分发二进制文件时，须遵守 GPL v2.0 的源码提供要求，例如附带对应源码或提供有效的书面源码获取承诺。
- ⚠️ 须保留版权声明和许可证；软件不提供任何保证。

台标图片、频道名称与第三方商标不属于本项目原创代码，代码许可证不授予这些素材的额外使用权。本项目不随软件分发电视台台标。用户可在“台标库管理”中上传自己有权使用的图片，建议以频道名称命名，便于自动匹配。
