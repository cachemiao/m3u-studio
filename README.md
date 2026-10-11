# M3U Studio

一个可以用 Docker 自托管的 IPTV 频道编辑器。在浏览器里整理频道、分组和台标，生成 M3U / TXT 订阅，方便在不同播放器中使用。

适合同时维护多套频道列表，例如不同运营商、地区或设备的播放源。当前版本：**v0.3.4**。

## 界面预览

首次打开默认暗色，支持浅色、黑灰暗色和跟随系统主题，电脑与手机均可使用。

截图展示个人部署中的联通与移动列表（部分截图保留更名前的界面），以及自行添加的台标。公开版台标库初始为空，不附带电视台台标图片。

### 频道管理

![频道管理 · 联通与移动](docs/images/channel-editor.png)

### 台标库管理

![个人部署的台标库](docs/images/logo-library.png)

### 订阅与 EPG

![多列表订阅与 EPG 设置](docs/images/subscriptions.png)

## 主要功能

- **多列表管理**：每套列表拥有独立订阅地址，可自定义短名称，也可以加入合并订阅；支持分组与频道拖拽排序。
- **导入与导出**：导入 UTF-8 M3U / TXT，整理后生成对应格式的订阅。
- **统一台标库**：初始为空，支持搜索、本地上传、批量上传和名称匹配；同名上传可选择替换或停止，图片直链也可单独填写。
- **批量编辑**：批量调整分组、EPG、FCC，或替换直播与回放地址中的文字，预览后应用。
- **EPG、回放与 FCC**：编辑频道 EPG ID、节目表地址、回放参数与 FCC 参数，按格式导出。
- **撤销与历史**：草稿支持撤销 / 重做，保留最近 30 份发布前配置；支持 JSON 配置备份与恢复。
- **主题与移动端**：浅色 / 暗色快捷切换，记住浏览器偏好；手机支持频道编辑和拖拽。
- **本地部署**：账号、配置和上传图片保存在本地数据目录，前端不依赖外部 CDN。

本项目提供频道编辑与订阅分发。播放地址和节目表由使用者自行提供，UDP 转 HTTP 等播放服务需单独部署。

## Docker 一键启动【推荐】

需要安装 Docker。镜像支持 **AMD64 / ARM64**，Docker 会自动选择适合设备的架构，无需下载源码或本地构建。

### 1. 拉取镜像

```sh
docker pull cachemiao/m3u-studio:latest
```

### 2. 启动容器

```sh
docker run -d \
  --name m3u-studio \
  -p 18080:18080 \
  -v m3u-studio-data:/data \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  cachemiao/m3u-studio:latest
```

- `-p 18080:18080`：网页和订阅使用 18080 端口。如有冲突，可改为 `-p 18081:18080`，然后通过 18081 访问。
- `-v m3u-studio-data:/data`：将账号、频道配置、台标和历史备份保存在 Docker 数据卷中，重建容器后继续使用。
- `-e TZ=Asia/Shanghai`：设置容器时区。
- `--restart unless-stopped`：Docker 启动后自动启动服务，手动停止的容器保持停止。

### 3. 打开网页

访问 **`http://设备IP:18080`**，首次打开时创建管理用户名和密码，密码至少 8 个字符。全新安装无需设置 `TOKEN`、管理员环境变量或 `.env` 文件。

[Docker Hub 镜像与标签](https://hub.docker.com/r/cachemiao/m3u-studio) · [GitHub Releases](https://github.com/cachemiao/m3u-studio/releases)

## Docker Compose 部署【便于长期维护】

需要 Docker Compose。在任意空目录创建 `compose.yaml`，复制以下内容：

```yaml
services:
  m3u-studio:
    image: cachemiao/m3u-studio:latest
    container_name: m3u-studio
    ports:
      - "18080:18080"
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

访问 **`http://设备IP:18080`**。此示例与上面的 `docker run` 使用同名数据卷；两种方式选择一种即可。若要从 `docker run` 改用 Compose，先停止并移除原容器，再在新目录执行上述命令，保留数据卷。

### 使用宿主机目录保存数据

如果希望直接在宿主机查看和备份文件，可将挂载改为 `./data:/data`。镜像以 **UID 10001** 的非 root 用户运行，启动前在部署目录准备写入权限：

```sh
mkdir -p data/database data/logo data/backup
sudo chown -R 10001:10001 data
```

`docker run` 对应替换为 `-v "$PWD/data:/data"`；Compose 对应替换为 `- ./data:/data`。新数据目录与已有数据卷互不相通，已有用户迁移时需先复制数据。

## 升级与常用命令

`latest` 指向最新正式版；如需固定版本，将镜像改为 `cachemiao/m3u-studio:0.3.4`。升级前先备份数据，重建时使用原数据卷或原目录挂载。

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
curl -fsS http://127.0.0.1:18080/healthz
```

返回 `{"status":"ok"}` 表示服务正常；如果修改了映射端口，请同步修改检查地址。

GitHub 发布正式 Release 后会自动构建并推送版本镜像和 `latest`，详见[镜像自动发布](docs/镜像自动发布.md)。已运行的容器需执行上述升级命令才会更新。

## 从源码构建

下载源码或解压发布包，进入含有 `docker-compose.yml` 的项目目录：

```sh
sh setup.sh
# 非 root 用户按 setup.sh 提示执行 sudo chown -R 10001:10001 data
docker compose up -d --build
```

仓库附带的 `docker-compose.yml` 用于源码构建，容器名称为 `iptv-manager`，数据挂载在 `./data`。首次构建需要联网下载基础镜像和依赖。

## 基本使用

1. 创建频道列表和分组，导入 M3U / TXT，或手动添加频道。
2. 编辑播放地址、回放、EPG 和 FCC；选择台标，或上传自己的图片。
3. 使用拖拽、搜索、批量编辑和台标匹配整理频道。
4. 检查草稿，点击 **保存并发布**。
5. 打开 **订阅与 EPG**，复制合并或单列表订阅地址到播放器。

频道修改在保存并发布后更新订阅。未保存草稿只保留在当前页面内存中，刷新前请保存或导出 JSON。

台标上传、替换和删除立即生效；频道与台标的绑定仍需保存并发布。台标文件不随草稿撤销或发布历史恢复。

## 订阅地址

| 内容 | 路径 |
| --- | --- |
| 合并 M3U 订阅 | `/tv.m3u` |
| 合并 TXT 订阅 | `/tv.txt` |
| 单列表 M3U 订阅 | `/lists/列表ID/tv.m3u` |
| 单列表 TXT 订阅 | `/lists/列表ID/tv.txt` |
| 台标文件 | `/logo/CCTV1.png` |

在“列表设置”填写订阅短名称，例如 `lt`、`yd`，保存并发布后可使用 `/lt.m3u`、`/yd.txt`。短名称支持 1–24 位英文字母、数字、下划线或短横线，以字母或数字开头；自动转小写且不能重复。留空使用原地址，修改短名称后原短地址失效，固定 ID 地址继续有效。

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

### 从内置台标版本迁移

升级 v0.3.3 及更早版本前，先备份数据，并把旧版台标复制到本地图库。在旧项目目录执行：

```sh
mkdir -p data/logo
find app/builtin -type f -name '*.png' -exec cp -n {} data/logo/ \;
```

复制不会覆盖已上传的同名台标，数据库中已删除的台标仍保持隐藏。完成后再替换源码和重建容器。公开版发布包不含台标图片，旧台标应由使用者自行保留。

## 使用范围与兼容性

- 推荐部署在可信内网或 VPN 内；管理后台使用网页账号登录。对外提供服务时，应配置 HTTPS 反向代理和访问限制，订阅地址也可能暴露播放源。
- EPG 使用已有 XMLTV 地址，本项目不下载或生成本地节目表。
- 回放和 FCC 的实际效果取决于播放服务与播放器；FCC 快速换台需配合 rtp2httpd 等支持该参数的服务。
- TXT 不包含台标和 EPG 元信息；未知 M3U 扩展属性及注释不保留。

## 开发与验证

后端使用 Flask、Gunicorn 和 SQLite；前端使用原生 HTML / CSS / JavaScript，无需 Node 构建。

```sh
python -m pip install -r requirements.txt pytest
python -m pytest tests -q
node --test tests/test_editor_core.cjs tests/test_logo_upload.cjs
```

Node 仅用于运行前端逻辑测试。运行状态可通过以下命令检查：

```sh
docker compose logs --tail=80
curl -fsS http://127.0.0.1:18080/healthz
```

- [详细使用指南](docs/使用指南.md)
- [更新记录](CHANGELOG.md)
- [验证记录](VALIDATION.md)

## 反馈与贡献

欢迎通过 Issues 提交问题或建议。报告问题时，请附版本、部署方式、浏览器 / 播放器和复现步骤；提供示例配置前请去除账号、令牌及私人地址。

## 许可证与台标素材

本项目代码采用 [MIT 许可证](LICENSE)，Copyright (c) 2026 cachemiao。

台标图片、频道名称与第三方商标不属于本项目原创代码，代码许可证不授予这些素材的额外使用权。本项目不随软件分发电视台台标。用户可在“台标库管理”中上传自己有权使用的图片，建议以频道名称命名，便于自动匹配。
