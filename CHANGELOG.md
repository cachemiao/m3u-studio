# v0.6.4 · 版本检测与移动端布局修复 / Update checks and mobile layout fixes · 2026-10-25

## 中文更新说明

- 修复 GitHub API 限流导致版本检测失败，自动改从项目官方发布链接读取版本。
- 细分限流、超时、网络和证书错误提示；升级后自动重试旧版失败缓存。
- 修复移动端全选框与搜索栏不对齐，并补充 WebKit 布局检查。

## English release notes

- Fixed update checks failing when the GitHub API is rate-limited by falling back to the project's official release link.
- Added specific messages for rate limits, timeouts, network and certificate errors. After upgrading, failed checks cached by older versions are retried automatically.
- Fixed mobile alignment between the select-all checkbox and search controls, and added WebKit layout checks.

---

# v0.6.3 · 配置与台标备份、版本检查 / Backup archives and version checks · 2026-10-24

## 中文更新说明

- 新增配置与台标 ZIP 备份，包含全部列表、当前已应用的草稿和整个本地台标库；保留 JSON 导出与旧版 JSON 恢复。
- ZIP 恢复先校验配置、图片与压缩包路径；配置载入草稿，检查后再发布。同名同内容台标复用，不同内容另存并更新恢复引用，不覆盖或删除现有台标。恢复过程中工作区变化时，不覆盖新草稿。
- 台标库入口移到侧栏“订阅与 EPG”和“设置”之间，新增“全部导出”，不受搜索条件影响。
- 改进新版本提示，点击版本号检查更新，通过对话气泡提示结果。发现新版后保留主题色圆点，点击圆点打开项目。
- 拆分前端状态、通信与功能控制器，保持现有布局、操作和浏览器草稿方式；演示版通过独立适配器复用代码。
- 完善远程导入与源检测的地址、DNS 和重定向校验。默认支持公网与家庭内网，敏感地址持续拦截；严格白名单为可选高级配置。
- 引入 SQLite 结构版本基线、迁移与恢复测试，新增日常 CI 与浏览器关键流程检查。

**备份范围：** ZIP 不含账号、登录密钥或发布历史，也不下载外部台标链接。台标恢复立即生效，不随草稿撤销；缺失的本地图片引用会报告数量。包含账号与历史的完整迁移请备份整个数据目录。ZIP 上限 64MB、展开 128MB、最多 5000 张台标。

**升级说明：** 浏览器草稿未迁到服务端。普通家庭内网无需新增白名单配置；回环、链路本地、已知云元数据等敏感目标将被拒绝。升级前保留数据目录备份；跨数据库结构版本回退应恢复兼容备份。

## English release notes

- Added ZIP backups containing all lists, the current applied draft and the entire local logo library. JSON export and legacy JSON restore remain supported.
- Archives are fully validated before import. Configuration is loaded as a draft for review before publishing. Identical logos are reused; differing name conflicts are renamed and restored references updated without overwriting or deleting existing images. A changed workspace is protected from late restore responses.
- Moved the logo library to the sidebar between Subscriptions & EPG and Settings. Export all downloads every library image regardless of search filters.
- Improved new-version notifications: click the version number to check for updates and see the result in a speech bubble. A persistent accent-colored dot indicates a newer release and links to the project.
- Separated frontend state, transport and feature controllers while retaining layout, behavior and browser drafts. The static demo shares application code through explicit adapters.
- Added outbound address, DNS and redirect checks for remote imports and source probes. Public and home networks remain supported by default; sensitive targets are blocked, with optional strict allowlists for advanced deployments.
- Established a SQLite schema-version baseline and migration/restore coverage, plus routine CI and browser behavior checks.

**Backup scope:** ZIP excludes accounts, session secrets and publication history, and does not download external logo URLs. Restored images take effect immediately and are not undone with the draft; missing local image references are reported. Back up the entire data directory for complete migration. ZIP limits: 64MB compressed, 128MB expanded and 5,000 logos.

**Upgrade:** Drafts remain in the browser. Home networks need no new allowlist configuration; loopback, link-local and known metadata targets are blocked. Keep a data-directory backup before upgrading, and restore a compatible backup when rolling back across schema versions.

---

# v0.6.2 · 点击复制播放地址 / Click to copy stream URLs · 2026-10-24

## 中文更新说明

- 新增点击播放地址复制完整链接，界面截断显示不影响复制内容。
- 悬停播放地址时显示主题色和复制提示，复制成功后在地址旁短暂显示“已复制 ✓”。
- 支持 Enter / 空格键复制；拖选地址文字时不触发复制。
- 兼容内网 HTTP 页面，复制失败时显示手动复制提示。
- 完善剪贴板兼容处理，同时保留订阅地址的复制功能。

> 源码部署升级提示：Compose 服务名和容器名现已统一为 `m3u-studio`。旧版源码部署请先使用原配置执行 `docker compose down`，再更新代码并重建，保留原有 `./data`。详见 [部署与维护](https://github.com/cachemiao/m3u-studio/blob/v0.6.2/docs/部署与维护.md#从源码构建)。官方镜像部署无需此项改名迁移。

## English release notes

- Click a stream URL to copy the full address, even when it is truncated on screen.
- Stream URLs use the accent color on hover and show a copy hint. A brief “Copied ✓” message appears beside the address after copying.
- Supports copying with Enter or Space; selecting URL text does not trigger copying.
- Includes clipboard fallback support for HTTP pages on local networks, with a manual-copy hint if copying fails.
- Improved clipboard compatibility while preserving subscription URL copying.

> Source deployment upgrade: Compose service and container names are now both `m3u-studio`. For older source deployments, run `docker compose down` using the original configuration before updating and rebuilding. Keep the existing `./data`. See [Deployment and maintenance](https://github.com/cachemiao/m3u-studio/blob/v0.6.2/docs/Deployment.md#build-from-source). Official image deployments do not require this name migration.


# v0.6.1 · 版本提示与橙色主题 / Version indicator and orange theme · 2026-10-23

## 中文更新说明

- 页头 Logo、M3U Studio 和版本号组成统一的项目链接；版本号与名称基线对齐，有新版本时显示主题色圆点。
- 使用期间自动检查 GitHub 最新稳定版本，服务器缓存检查结果，每 24 小时最多请求一次；重启后保留缓存，网络失败不打断编辑。
- 不增加自动安装或 Docker 控制权限，升级仍通过 Docker / NAS 的镜像更新流程完成。
- 原黄色主题替换为橙色（#CC7D5E），提供深浅模式配色，并将已保存的黄色偏好自动迁移到橙色；默认粉色不变。
- 简化账号菜单，去除“当前账号”标题；不在设置中增加版本检测模块或侧栏项目说明。
- 修复重命名分组误显示“保存账号”，改为“保存”；统一输入框、下拉框和文本框的聚焦描边，消除双框及校验错误时的双色边框。
- README 并排展示深浅两张截图，将拖动 GIF 移到中英文使用指南，技术栈说明移至文档区。

## English release notes

- Combined the header logo, product name and baseline-aligned version into one project link. A theme-colored dot indicates an available update.
- Automatically check GitHub's latest stable release while the editor is in use. Server-side caching limits outbound checks to once every 24 hours, survives restarts and keeps network failures from interrupting editing.
- No automatic installation or Docker control permissions are introduced. Continue upgrading through your Docker or NAS image-update workflow.
- Replaced yellow with orange (#CC7D5E), including light/dark palettes and migration of saved yellow preferences. Pink remains the default.
- Simplified the account menu and omitted the settings update module and sidebar project metadata.
- Fixed the group rename action's incorrect "Save account" label. Unified focused input, select and textarea outlines, including validation errors.
- Display dark/light screenshots side by side in both READMEs; moved drag demos into the guides and the technical stack description into the documentation section.

## 验证 / Validation

- 84 项 Python 测试、62 项 JavaScript 测试通过。 / 84 Python tests and 62 JavaScript tests passed.
- 浏览器验证覆盖六种主题 × 深浅模式、窄屏布局、橙色偏好迁移、版本提示、中英文文案和输入框校验。 / Browser checks cover all six accents in light/dark modes, narrow layouts, orange preference migration, update indicators, bilingual labels and input validation.


# v0.6.0 · 频道整理与粉色主题 / Channel organization and pink themes · 2026-10-23

## 中文更新说明

- 多选频道可合并拖动，按原显示顺序一次插入新位置；支持跨分组、边缘自动滚动及一次撤销／重做。
- 新增粉、紫、蓝、黄、绿、青六套主题色，深浅模式使用独立的按钮、文字、选中态和 Logo 颜色变量；默认粉色，保留已有浏览器偏好。
- 调整工作区工具栏、紧凑搜索、批量操作、账号菜单、语言与主题菜单，改善窄屏和触屏操作。
- 浏览器 prompt / confirm / alert 改为应用内弹窗；新建分组支持输入校验、自动聚焦、Enter 确认和 Esc 取消。
- 添加／编辑等表单采用独立滚动区域与底部操作栏，修复底部漏字、下拉箭头与图标对齐问题。
- 导入支持文件、粘贴内容和 HTTP/HTTPS 文件直链；远程导入保留既有解析、校验、追加和取消保护，并限制文件大小及请求超时。
- 台标容器统一深色底，完善台标预览、圆角选择按钮、订阅复制反馈及回放／FCC 悬停提示。
- README 与本版本源码一起发布：直接展示拖动演示，提供可复制的 Compose 全文、FCC 说明、本地开发和贡献指南。

## English release notes

- Drag selected channels together in display order, including cross-group moves, automatic edge scrolling and single-step undo/redo.
- Added six accent palettes with separate button, text, selection and logo variables for light/dark modes. Pink is the default; existing browser preferences are retained.
- Refined the workspace toolbar, compact search, bulk actions, account menu, language/theme menus and narrow-screen interactions.
- Replaced browser prompts, confirmations and alerts with application dialogs; group creation includes inline validation, autofocus, Enter and Escape support.
- Form dialogs use independent scrolling and fixed action bars, with fixes for footer clipping, chevrons and icon alignment.
- Import from files, pasted text or HTTP/HTTPS file URLs. Remote import reuses validation, append-only behavior and stale-result safeguards, with size and timeout limits.
- Unified logo backdrops and improved previews, rounded source tabs, subscription copy feedback and replay/FCC tooltips.
- Published documentation with its matching source: visible drag demos, embedded Compose configuration, FCC context and development/contribution guides.

## 验证 / Validation

- 67 项 Python 后端测试通过。 / 67 Python backend tests passed.
- 62 项 JavaScript 测试通过，包含新增的 8 项多选拖动回归测试。 / 62 JavaScript tests passed, including 8 new batch-drag regression tests.
- Chromium 浏览器检查覆盖实际鼠标拖动、上下边缘滚动、跨分组、撤销／重做、六套配色的深浅模式、弹窗滚动及中英文响应布局。 / Chromium checks covered native mouse dragging, edge scrolling, group transfer, undo/redo, six light/dark palettes, dialog scrolling and bilingual responsive layouts.
- Docker Hub / GHCR 的 AMD64、ARM64 构建与 GitHub Release 由标签发布工作流执行，最终结果以 Actions 为准。 / The tag workflow builds AMD64/ARM64 images and creates the GitHub Release; consult Actions for the final outcome.


# v0.5.4 · 频道导入流程与保护 / Channel import workflow and safeguards · 2026-10-21

## 中文更新说明

- 导入入口统一为“导入频道”，弹窗明确显示目标列表。
- 左侧“频道列表”的 ＋ 改为菜单，提供“新建空列表”和“导入并新建列表”。
- 移除替换导入；导入只追加频道，保留原有频道和分组。
- 仅在解析出有效频道且通过校验后创建新列表；全部无效或校验失败时保持草稿不变。
- 自动处理与已有频道、同批导入频道之间的 ID 冲突。
- 解析、校验期间表单或列表发生变化时阻止应用旧结果；关闭或重新打开弹窗后，旧请求不会错误应用或干扰新请求。
- 完善中英文提示、导入说明及回归测试；同步 README 徽标与自定义支持按钮。

## English release notes

- Renamed the import action to **Import channels**. The dialog clearly identifies the destination playlist.
- The **＋** beside Playlists now offers **Create empty playlist** and **Import as new playlist**.
- Removed replace-import. Imports only append channels and preserve existing channels and groups.
- A new playlist is created only after valid channels pass validation. All-invalid imports and validation failures leave the draft unchanged.
- Resolve channel ID collisions against existing channels and within the same import.
- Block stale results if the form or playlists change during parsing or validation. Closing or reopening the dialog prevents older requests from applying results or interfering with a newer request.
- Updated Chinese and English UI text, import documentation and regression coverage; aligned README badges and the custom support button.

## 验证 / Validation

- 43 项 Python 后端测试通过。 / 43 Python backend tests passed.
- 49 项 JavaScript 测试通过，包含导入目标、追加、新建列表、重复 ID、异步变化与取消保护。 / 49 JavaScript tests passed, including import targeting, append-only behavior, playlist creation, duplicate IDs, stale changes and cancellation.


# v0.5.3 · 跨列表频道管理与批量编辑优化 · 2026-10-18

- 批量编辑支持将所选频道移动或复制到其他列表，保留频道配置并处理 ID 冲突。
- 可保留原分组、选择目标已有分组或新建分组，自动补齐缺少的分组。
- 跨列表操作默认复制；移动使用红色边框和移除提示，应用按钮明确区分复制与移动。
- 批量编辑按替换地址、分组、EPG、FCC、跨列表操作分区排列，加大标题并优化间距。
- 未勾选分区显示灰框，启用后显示青框，移动时显示红框；支持预览与撤销。
- 中英文 README 补充电视端长期订阅建议及固定 ID 地址与短地址的区别。

# v0.5.2 · 订阅性能与导入兼容性 · 2026-10-16

- 优化频道分组与 TXT 订阅生成，避免大列表重复遍历。
- 按配置 revision 缓存订阅结果，限制缓存条目与总大小；发布新配置后自动刷新。
- M3U / TXT 导入支持字段修正、跳过无效频道，并提供行号、名称及原因报告。
- 保留 TXT 地址中的普通逗号；未知回放类型和无效回放天数使用默认值。
- 全部频道无效时，替换导入不会清空原列表；保留严格的发布校验。
- 改善回放天数校验提示，避免显示底层 Python 异常。

# v0.5.1 · 耗时标签样式修复 · 2026-10-15

- 仅调整频道耗时标签的字号、内边距、圆角和高度，与现有分组、回放标签保持一致。
- 保留分组和回放标签原有样式，耗时标签仍支持点击重新检测。

# v0.5.0 · 源检测与编辑体验优化 · 2026-10-13

- 新增服务器响应耗时检测，支持已选频道或当前列表，最多并发 4 路、超时 5 秒、有限读取 HTTP/HLS。
- 批量检测先打开窗口，点击开始检测才发起请求；支持进度、取消、再次检测和失败项重试。
- 点击频道耗时标签可直接单独重测；≤300ms 绿色，>300ms 黄色，超时红色。结果仅供参考，不自动删除频道。
- 浏览器自动保存未发布草稿并支持恢复；完善批量编辑变更摘要。
- 台标新增高相似度模糊匹配；EPG ID 留空时导出频道名称作为 ID。
- 新列表名称示例改为联通，保留台标别名兼容。
- GitHub Release 同步发布 Docker Hub 和 GHCR 的 AMD64 / ARM64 镜像。
- 此版本采用 GPL-2.0-only，历史 MIT 版本保留原授权。

# v0.4.2 · 登录页优化 · 2026-10-12

- 登录页品牌与语言、主题按钮放在同一行，收紧表单留白，标题简化为“登录”。
- 登录页支持浅色、深色、跟随系统，记住偏好并与编辑器保持一致。
- 适配简体中文、English 和 320px 窄屏布局。

# v0.4.1 · 默认端口 8324 · 2026-10-11

- 网页、订阅与台标服务统一使用 8324 端口，同步更新镜像、安装示例和健康检查。
- 移除设置中重复的外观切换，主题统一从顶部图标菜单选择。
- 替换 README 的频道管理与订阅截图。

# v0.4.0 · 国际化 · 2026-10-11

- 新增中文 / English 界面，登录页与顶部可切换；首次按浏览器语言选择并记住偏好。
- 顶部语言与主题改为相邻图标菜单：简体中文 / English，以及浅色 / 深色 / 跟随系统；支持键盘选择。
- 覆盖按钮、表单、弹窗、动态提示、操作确认和服务器错误信息。
- 切换语言保留草稿和表单输入，不翻译用户数据。
- 新增英文 README 与中英文文档切换入口。

# 首次公开发布补充

- 项目命名为 M3U Studio，页面与浏览器图标使用透明 SVG。
- 首次打开默认暗色，保留用户已保存的主题偏好。

# v0.3.4 · 2026-10-11

- 公开版本不再分发电视台台标，新安装台标库初始为空。
- 保留上传、批量上传、搜索、匹配及旧台标路径别名。
- 新增自定义订阅短名称，可使用 /lt.m3u、/yd.txt，保留旧固定 ID 地址；校验重名和系统保留名称。
- 更新 GitHub 首页说明与使用指南。

# v0.3.3 · 2026-10-11

- 新增黑灰暗色主题，统一登录页、频道列表、台标库、编辑弹窗及表单配色。
- 暗色台标预览改用深灰底，适配透明 PNG。
- 顶部一键切换浅色 / 暗色，设置新增跟随系统选项。
- 浏览器记住主题偏好，同源标签页同步；页面加载前应用主题，减少亮色闪烁。
- 保留桌面与手机布局，主题选择不改变频道配置或发布版本。

# v0.3.2 · 2026-10-11

- 取消外置 GitHub 图库管理与同步，保留频道已使用的图片直链。
- 台标选择改为台标库、上传、链接，统一搜索和匹配原有与上传图片。
- 按原文件名保存上传台标；同名时明确选择替换或停止，JPEG/WebP 转 PNG。
- 设置新增台标库管理，支持批量上传、替换、删除与使用频道提示。
- 替换保留图片地址并立即生效；旧别名访问同一张覆盖后的图片。
- 原有台标删除状态保存在 SQLite，升级不会重新出现在库中；重新上传可恢复。
- 台标库变更不改变频道发布版本，配置备份仍需连同 data 中的图片和数据库一起保存。

# v0.3.1 · 2026-10-10

- 点击台标统一打开内置、链接、本地上传三个选项，编辑窗口也使用同一入口。
- 用户可添加自己的公开 GitHub 台标目录，支持名称、手动同步、移除、搜索和自动匹配。
- 可指定匹配图库；跨库同名保持手选，匹配别名适用于外置库。
- 图库索引独立保存，同步失败保留旧索引；移除图库不清除频道已使用的图片链接。
- 图片链接固定到同步时的 GitHub commit；PNG/JPEG/WebP/GIF/SVG 文件名参与匹配。
- 图库初始为空，无预置测试仓库。

# v0.3.0 · 2026-10-10

- 新增频道多选、批量修改分组/EPG/FCC，以及直播/回放地址文字替换，支持校验和预览。
- 新增台标搜索、数字自然排序、唯一名称/EPG/别名匹配、批量匹配预览。
- 新增草稿撤销/重做与快捷键；保存后撤销形成待发布草稿。
- 新增设置中的发布历史，保留最近 30 份发布前配置，兼容旧版 JSON 历史；恢复不立即发布。
- 为合并与独立订阅增加复制按钮及频道数量。
- 改善搜索首尾空格、无结果提示、台标预览背景和编辑弹窗按钮布局。
- 保留 142 个内置台标、旧路径别名和原有账号/频道数据；固定端口仍为 8324。

# v0.2.2

- 侧栏统一“设置”入口，内部提供账号修改、配置备份与 JSON 恢复。
- 搜索框移至顶部工具栏，与列表设置等按钮对齐。
- 频道列表与分组支持桌面和手机拖拽排序；保存发布后持久化，不改变列表订阅 ID 或分组成员。
- 142 个内置台标与此前账号、FCC 等功能保持不变。

# v0.2.1

- 将内置 Logo 替换为用户提供的 142 个 300×180 PNG，保留原图字节。
- 支持中文和加号文件名，M3U 导出编码本地 Logo URL。
- 旧英文 Logo 路径通过别名映射继续访问，不在选择面板重复显示。
- 保留用户已上传图片及频道配置；其余功能与 v0.2 一致。

# v0.2

- 首次通过网页创建管理账号，后续网页登录、退出和修改账号；密码以哈希存储。
- 自动从访问地址生成订阅和本地 Logo URL，固定 Docker 端口 8324。
- 自动迁移 v0.1 账号与既有含 FCC 参数的频道，不重置数据。
- 移除频道上下移动箭头，保留桌面与手机拖拽排序、跨组移动。
- 频道按已配置地址显示“回放”和“FCC”标签。
- 增加 FCC 编辑字段；M3U/TXT 导出拼接 FCC 参数，导入可识别。
- 固定顶部、侧栏及频道工具栏，仅频道区域滚动。
- 用户新 Logo 包待接收，目前沿用原内置台标。
