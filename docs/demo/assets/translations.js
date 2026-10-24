/* Shared UI messages; keep placeholders identical in both languages. */
window.M3UTranslations = {
"updateCheck":{"zh": "检查更新", "en": "Check for updates"},
"updateLatestMeow":{"zh": "已经是最新版本了喵~", "en": "You're already on the latest version, meow~"},
"updateAvailableMeow":{"zh": "有新版本可以更新了喵~", "en": "A new version is available, meow~"},
"updateCheckFailed":{"zh": "检测失败了喵~ 请稍后再试", "en": "Could not check for updates, meow~ Please try again later"},

"archiveWorkspaceChanged":{"zh": "工作区已变化，未替换草稿；已导入的台标会保留，请重新操作。", "en": "The workspace changed; the draft was not replaced. Any imported logos remain in the library. Please try again."},
"archiveCount":{"zh": "台标数量过多或存在不支持的文件", "en": "Too many logos or unsupported files in the library"},
"archiveLogosSize":{"zh": "台标库超过备份大小限制", "en": "Logo library exceeds the backup size limit"},
"archiveSize":{"zh": "压缩包超过 64MB 限制", "en": "Archive exceeds 64MB"},
"archiveLimit":{"zh": "备份 ZIP 超过 64MB", "en": "Backup ZIP exceeds 64MB"},
"archiveRestoreFailed":{"zh": "恢复未完成，新增台标已撤回，请重试", "en": "Restore incomplete; newly added logos were removed. Please try again"},
"archiveExportFailed":{"zh": "读取台标失败，导出未完成，请重试", "en": "Could not read logos; export incomplete. Please try again"},
"archiveReadFailed":{"zh": "读取台标失败，备份未完成，请重试", "en": "Could not read logos; backup incomplete. Please try again"},
"archiveBusy":{"zh": "正在处理备份，请稍后重试", "en": "A backup operation is in progress; please try again shortly"},
"archiveInvalid":{"zh": "备份格式、配置或图片无效，未恢复任何内容", "en": "Invalid backup format, configuration or images; nothing was restored"},
"archiveFailed":{"zh": "打包备份失败", "en": "Archive operation failed"},
"archiveTooLarge":{"zh": "ZIP 最大 64MB，JSON 最大 8MB", "en": "ZIP limit: 64MB; JSON limit: 8MB"},
"archiveRestored":{"zh": "已载入草稿；新增 {p0} 个台标，重命名 {p1} 个，缺失引用 {p2} 处。请检查后发布。", "en": "Draft loaded; {p0} logos added, {p1} renamed, {p2} missing references. Review before publishing."},
"archiveRestoreConfirm":{"zh": "恢复配置将替换当前工作区内容，确认后仍需保存并发布。台标会立即加入图库；同名不同内容将另存，不覆盖现有图片。是否继续？", "en": "Replace the current workspace with this backup? You must still save and publish. Logos are added immediately; conflicting images are renamed without overwriting existing files."},
"archiveExport":{"zh": "导出 ZIP", "en": "Export ZIP"},
"archiveDesc":{"zh": "打包全部列表、当前草稿和整个台标库，不含账号与发布历史", "en": "Package all lists, current drafts and the entire logo library; excludes accounts and publication history"},
"archiveTitle":{"zh": "配置与台标备份", "en": "Configuration & logo backup"},
"logoExportAll":{"zh": "全部导出", "en": "Export all"},
"logoLibraryTitle":{"zh": "台标库", "en": "Logo library"},
"uiSourceBlocked":{"zh":"策略限制","en":"Blocked by policy"},
"uiSourceBlockedHint":{"zh": "目标被访问策略限制，请检查地址或高级访问限制。", "en": "Target blocked by network policy. Check the address or advanced access restrictions."},
"uiCopyStreamHint":{"zh":"点击复制完整地址","en":"Click to copy the full URL"},
"uiCopyStreamFailed":{"zh":"复制失败，请手动复制","en":"Copy failed; please copy manually"},
"uiSave":{"zh":"保存","en":"Save"},
"updateNew":{"zh": "有新版本", "en": "Update available"},

"uiDraggingChannels":{"zh":"移动 {p0} 个频道","en":"Moving {p0} channels"},
"uiMoreDraggedChannels":{"zh":"另有 {p0} 个频道","en":"{p0} more channels"},
"uiGroupColumn":{"zh": "\u5206\u7ec4", "en": "Group"},

"uiLogoColumn":{"zh": "\u53f0\u6807", "en": "Logo"},
"uiInlineGroupCount":{"zh": "\uff08{p0}\u4e2a\u9891\u9053\uff09", "en": " ({p0} channels)"},

"uiImportIntoList":{"zh": "\u5bfc\u5165\u5230\u6b64\u5217\u8868", "en": "Import into this list"},

"uiReplayColumn":{"zh": "\u56de\u653e", "en": "Replay"},
"uiClose":{"zh": "\u5173\u95ed", "en": "Close"},
"uiLogoInLibrary":{"zh": "\u4f4d\u4e8e\u53f0\u6807\u5e93", "en": "Stored in logo library"},
"uiLogoFromLink":{"zh": "\u53f0\u6807\u4f4d\u7f6e", "en": "Logo location"},
"uiLogoLocal":{"zh": "\u4f7f\u7528\u672c\u5730\u56fe\u7247", "en": "Using local image"},

"uiCurrentLogo":{"zh": "\u5f53\u524d\u53f0\u6807", "en": "Current logo"},
"uiLogoPreview":{"zh": "\u53f0\u6807\u9884\u89c8", "en": "Logo preview"},
"uiLogoPreviewHint":{"zh": "\u60ac\u505c\u6216\u805a\u7126\u5e93\u4e2d\u53f0\u6807\u67e5\u770b\u7ec6\u8282\uff0c\u70b9\u51fb\u540e\u5e94\u7528\u3002", "en": "Hover or focus a logo to inspect it. Click to apply."},
"uiLogoPreviewEmpty":{"zh": "\u6682\u65e0\u53f0\u6807", "en": "No logo yet"},
"uiLogoPreviewError":{"zh": "\u56fe\u7247\u65e0\u6cd5\u663e\u793a", "en": "Image unavailable"},

"uiImportMethods":{"zh": "\u5bfc\u5165\u65b9\u5f0f", "en": "Import method"},
"uiUrl":{"zh": "\u94fe\u63a5", "en": "URL"},
"uiFile":{"zh": "\u6587\u4ef6", "en": "File"},
"uiPaste":{"zh": "\u7c98\u8d34", "en": "Paste"},
"uiDrop":{"zh": "\u62d6\u62fd M3U / TXT \u6587\u4ef6\u5230\u8fd9\u91cc", "en": "Drop an M3U / TXT file here"},
"uiBrowse":{"zh": "\u6216\u70b9\u51fb\u9009\u62e9\u6587\u4ef6", "en": "or click to browse"},
"uiChannel":{"zh": "\u9891\u9053", "en": "Channel"},
"uiStream":{"zh": "\u64ad\u653e\u5730\u5740", "en": "Stream URL"},
"uiStatus":{"zh": "\u68c0\u6d4b\u72b6\u6001", "en": "Status"},
"uiCopied":{"zh": "\u5df2\u590d\u5236 \u2713", "en": "Copied \u2713"},

  "studioDeleteSelected":{"zh":"批量删除","en":"Delete selected"},
  "studioDeleteConfirm":{"zh":"删除选中的 {p0} 个频道？可通过撤销恢复。","en":"Delete {p0} selected channels? You can undo this change."},
  "studioDeleted":{"zh":"已删除 {p0} 个频道，可撤销恢复","en":"Deleted {p0} channels. You can undo this change."},
  "studioImportUrl": {"zh": "列表链接（可选）", "en": "Playlist URL (optional)"},
  "studioImportUrlHint": {"zh": "填写链接时优先读取链接；留空则使用下方文件或粘贴内容。仅读取本次内容，不会定时同步。", "en": "A URL takes priority. Leave blank to use a file or pasted text. Imports once; does not sync automatically."},
  "studioUrlOnly": {"zh": "列表链接仅支持 HTTP/HTTPS", "en": "Playlist URLs must use HTTP or HTTPS"},
  "studioUrlInvalid": {"zh": "请输入有效的列表链接", "en": "Enter a valid playlist URL"},
  "studioUrlHtml": {"zh": "链接返回了网页，请使用 M3U/TXT 文件直链", "en": "The URL returned a web page. Use a direct M3U/TXT file URL."},
  "studioUrlLarge": {"zh": "列表文件超过 8MB", "en": "The playlist exceeds 8MB"},
  "studioUrlUnavailable": {"zh": "无法读取列表链接，请检查地址或稍后重试", "en": "Unable to read the playlist URL. Check the address or try again later."},
  "studioUrlEncoding": {"zh": "列表文件需使用 UTF-8 编码", "en": "The playlist must use UTF-8 encoding"},

  "studioSourceStatus": {"zh":"检测状态", "en":"Source status"},
  "studioFcc": {"zh":"FCC 快速换台", "en":"FCC fast channel switching"},
  "studioClearSearch": {"zh":"清除搜索", "en":"Clear search"},
  "studioWorkspace": {"zh":"频道工作区", "en":"Channel workspace"},
  "studioChannel": {"zh":"频道 / 播放地址", "en":"Channel / Stream address"},
  "studioEpg": {"zh":"节目表 ID", "en":"EPG ID"},
  "studioActions": {"zh":"操作", "en":"Actions"},
  "studioAuth": {"zh":"你的频道、台标与配置保存在此设备。创建账号后，即可导入第一套频道列表。", "en":"Your channels, logos and configuration stay on this device. Create an account to import your first playlist."},
  "studioGroupCount": {"zh":"{p0} 个频道", "en":"{p0} channels"},
  "m1": {
    "zh": "请求失败",
    "en": "Request failed"
  },
  "m2": {
    "zh": "有未保存更改",
    "en": "Unsaved changes"
  },
  "m3": {
    "zh": "已保存",
    "en": "Saved"
  },
  "m4": {
    "zh": "全部频道",
    "en": "All channels"
  },
  "m5": {
    "zh": "重命名分组",
    "en": "Rename group"
  },
  "m6": {
    "zh": "分组已存在",
    "en": "Group already exists"
  },
  "m7": {
    "zh": "请先移动或删除此分组的频道",
    "en": "Move or delete this group's channels first"
  },
  "m8": {
    "zh": "删除空分组 ",
    "en": "Delete empty group "
  },
  "m9": {
    "zh": "创建你的频道列表",
    "en": "Create your playlist"
  },
  "m10": {
    "zh": "{p0} 个频道 · {p1} 个分组",
    "en": "{p0} channels · {p1} groups"
  },
  "m11": {
    "zh": "没有匹配的频道，请调整或清空搜索。",
    "en": "No matching channels. Change or clear your search."
  },
  "m12": {
    "zh": "此分组还没有频道。",
    "en": "This group has no channels yet."
  },
  "m13": {
    "zh": "从创建列表、导入频道开始。",
    "en": "Create a playlist or import channels to get started."
  },
  "m14": {
    "zh": "选择频道 ",
    "en": "Select channel "
  },
  "m15": {
    "zh": "清空搜索后可拖拽排序",
    "en": "Clear search to reorder channels"
  },
  "m16": {
    "zh": "拖拽排序或拖到分组",
    "en": "Drag to reorder or move to a group"
  },
  "m17": {
    "zh": "选择台标：台标库、上传或链接",
    "en": "Choose logo: library, upload or link"
  },
  "m18": {
    "zh": "选择台标 ",
    "en": "Choose logo "
  },
  "m19": {
    "zh": "选择台标",
    "en": "Choose logo"
  },
  "m20": {
    "zh": "回放",
    "en": "Catch-up"
  },
  "m21": {
    "zh": "编辑",
    "en": "Edit"
  },
  "m22": {
    "zh": "删除",
    "en": "Delete"
  },
  "m23": {
    "zh": "删除频道 ",
    "en": "Delete channel "
  },
  "m24": {
    "zh": "拖拽调整列表顺序",
    "en": "Drag to reorder playlists"
  },
  "m25": {
    "zh": "拖拽调整分组顺序",
    "en": "Drag to reorder groups"
  },
  "m26": {
    "zh": "请先新建分组",
    "en": "Create a group first"
  },
  "m27": {
    "zh": "编辑频道",
    "en": "Edit channel"
  },
  "m28": {
    "zh": "添加频道",
    "en": "Add channel"
  },
  "m29": {
    "zh": "新列表名称，例如：IPTV",
    "en": "New playlist name, e.g. Home TV"
  },
  "m30": {
    "zh": "央视",
    "en": "CCTV"
  },
  "m31": {
    "zh": "卫视",
    "en": "Satellite TV"
  },
  "m32": {
    "zh": "新分组名称",
    "en": "New group name"
  },
  "m33": {
    "zh": "已发布提交的版本；新的编辑仍待保存",
    "en": "Submitted version published; newer edits are still unsaved"
  },
  "m34": {
    "zh": "订阅已更新，发布前版本已加入历史",
    "en": "Subscriptions updated; previous configuration added to history"
  },
  "m36": {
    "zh": "已导入 {p0} 个频道，请保存发布",
    "en": "Imported {p0} channels. Save and publish to update subscriptions."
  },
  "m37": {
    "zh": "已加入台标库并应用到草稿，保存发布后更新频道绑定",
    "en": "Added to the logo library and draft. Save and publish the channel assignment."
  },
  "m38": {
    "zh": "复制",
    "en": "Copy"
  },
  "m39": {
    "zh": "复制 ",
    "en": "Copy "
  },
  "m40": {
    "zh": " 订阅地址",
    "en": " subscription URL"
  },
  "m41": {
    "zh": "合并 M3U",
    "en": "Combined M3U"
  },
  "m42": {
    "zh": "合并 TXT",
    "en": "Combined TXT"
  },
  "m43": {
    "zh": " · {p0} 个频道 · M3U",
    "en": " · {p0} channels · M3U"
  },
  "m44": {
    "zh": " · {p0} 个频道 · TXT",
    "en": " · {p0} channels · TXT"
  },
  "m45": {
    "zh": "固定订阅 ID：",
    "en": "Permanent subscription ID: "
  },
  "m46": {
    "zh": "（重命名不会改变地址）",
    "en": " (renaming does not change this URL)"
  },
  "m47": {
    "zh": "请使用 1–24 位字母、数字、下划线或短横线，避开系统保留名称",
    "en": "Use 1–24 letters, digits, underscores or hyphens; avoid reserved names"
  },
  "m48": {
    "zh": "订阅短名称已被另一套列表使用",
    "en": "Another playlist already uses this short name"
  },
  "m49": {
    "zh": "删除整套列表及其全部频道？保存发布后生效。",
    "en": "Delete this playlist and all its channels? Takes effect after publishing."
  },
  "m50": {
    "zh": "备份含当前草稿；台标图片和台标库设置请一并备份 data 目录",
    "en": "Backup includes your draft. Back up the data directory for logo images and library settings."
  },
  "m51": {
    "zh": "备份格式错误",
    "en": "Invalid backup format"
  },
  "m52": {
    "zh": "用备份替换全部列表？应用后仍需保存发布。",
    "en": "Replace all playlists with this backup? Save and publish to apply."
  },
  "m53": {
    "zh": "首次使用，创建管理账号",
    "en": "First use: create an administrator account"
  },
  "m54": {
    "zh": "登录",
    "en": "Sign in"
  },
  "m55": {
    "zh": "设置一次即可，服务器地址会自动识别。",
    "en": "Set up once. The server address is detected automatically."
  },
  "m56": {
    "zh": "请输入你的管理账号。",
    "en": "Enter your administrator credentials."
  },
  "m57": {
    "zh": "创建账号并进入",
    "en": "Create account and continue"
  },
  "m58": {
    "zh": "登录",
    "en": "Sign in"
  },
  "m59": {
    "zh": "已加载",
    "en": "Loaded"
  },
  "m60": {
    "zh": "两次密码不一致",
    "en": "Passwords do not match"
  },
  "m61": {
    "zh": "有未保存更改，确认退出？已应用的草稿会保留在本浏览器。",
    "en": "You have unsaved changes. Sign out? Applied draft changes will stay in this browser."
  },
  "m62": {
    "zh": "两次新密码不一致",
    "en": "New passwords do not match"
  },
  "m63": {
    "zh": "账号已更新",
    "en": "Account updated"
  },
  "m64": {
    "zh": "已选 {p0} 个",
    "en": "{p0} selected"
  },
  "m65": {
    "zh": "已撤销；发布配置不会立即改变",
    "en": "Undone; published subscriptions are unchanged until you publish"
  },
  "m66": {
    "zh": "先预览，确认修改范围和内容后应用。",
    "en": "Preview the scope and changes before applying."
  },
  "m67": {
    "zh": "{p0} · 仅修改已选的 {p1} 个频道（包含筛选后隐藏的已选频道）",
    "en": "{p0} · Edit only the {p1} selected channels (including hidden selections)"
  },
  "m68":{"zh": "\u8bf7\u9009\u62e9\u4e00\u79cd\u8981\u66ff\u6362\u7684\u5730\u5740\u7c7b\u578b", "en": "Select one URL type to replace"},
  "m69": {
    "zh": "请选择至少一项修改",
    "en": "Select at least one change"
  },
  "m70": {
    "zh": "编辑内容已变化，请重新打开批量编辑",
    "en": "The draft changed. Reopen bulk editing."
  },
  "m71": {
    "zh": "没有频道需要修改。",
    "en": "No channels need changes."
  },
  "m72": {
    "zh": "预览期间选项已变化，请重新预览",
    "en": "Options changed while previewing. Preview again."
  },
  "m73": {
    "zh": "分组",
    "en": "Group"
  },
  "m74": {
    "zh": "直播",
    "en": "Live"
  },
  "m75": {
    "zh": "空",
    "en": "Empty"
  },
  "m76": {
    "zh": "，下方展示前 100 个",
    "en": "; showing the first 100 below"
  },
  "m77": {
    "zh": "将修改 {p0} 个频道{p1}；尚未应用或发布。",
    "en": "{p0} channels will change{p1}. Not applied or published yet."
  },
  "m78": {
    "zh": "草稿已变化，请重新预览",
    "en": "The draft changed. Preview again."
  },
  "m79": {
    "zh": "批量修改已应用，可撤销；保存发布后生效",
    "en": "Bulk changes applied to draft. You can undo; publish to update subscriptions."
  },
  "m80": {
    "zh": "新频道",
    "en": "New channel"
  },
  "m81": {
    "zh": "选择台标 · {p0}",
    "en": "Choose logo · {p0}"
  },
  "m82": {
    "zh": "正在加载图库…",
    "en": "Loading logo library…"
  },
  "m83": {
    "zh": "频道已不存在",
    "en": "Channel no longer exists"
  },
  "m84": {
    "zh": "台标已应用到草稿，保存并发布后生效",
    "en": "Logo applied to draft. Save and publish to update subscriptions."
  },
  "m85": {
    "zh": " · 推荐项优先显示",
    "en": " · Recommended first"
  },
  "m86": {
    "zh": " · 显示前 300 个，请搜索缩小范围",
    "en": " · Showing the first 300; refine your search"
  },
  "m87": {
    "zh": "{p0} 个台标{p1}{p2}",
    "en": "{p0} logos{p1}{p2}"
  },
  "m88": {
    "zh": "没有匹配的台标",
    "en": "No matching logos"
  },
  "m89": {
    "zh": "推荐",
    "en": "Recommended"
  },
  "m90": {
    "zh": "请填写有效的 HTTP 或 HTTPS 图片直链",
    "en": "Enter a valid HTTP or HTTPS image URL"
  },
  "m91": {
    "zh": "已发布频道中有 {p0} 个正在使用。",
    "en": "Used by {p0} published channels. "
  },
  "m92": {
    "zh": "台标库中已有“{p0}”。{p1}是否替换？",
    "en": "The library already contains “{p0}”. {p1}Replace it?"
  },
  "m93": {
    "zh": "正在加载…",
    "en": "Loading…"
  },
  "m94": {
    "zh": " 等 {p0} 个频道",
    "en": " and others ({p0} channels total)"
  },
  "m95": {
    "zh": "以下频道使用此台标：{p0}。删除后无法显示该图片。",
    "en": "These channels use this logo: {p0}. Deleting it will make the image unavailable."
  },
  "m96": {
    "zh": "删除后可重新上传恢复。",
    "en": "You can upload it again to restore it."
  },
  "m97": {
    "zh": "删除“{p0}”？{p1}",
    "en": "Delete “{p0}”? {p1}"
  },
  "m98": {
    "zh": "已发布频道正在使用：{p0}。确定删除并使这些图片无法显示？",
    "en": "Published channels use this logo: {p0}. Delete it and make these images unavailable?"
  },
  "m99": {
    "zh": "台标已删除",
    "en": "Logo deleted"
  },
  "m100": {
    "zh": "，显示前 300 个，请搜索缩小范围",
    "en": "; showing the first 300; refine your search"
  },
  "m101": {
    "zh": "台标库共 {p0} 个 · 找到 {p1} 个{p2}",
    "en": "{p0} logos in library · {p1} found{p2}"
  },
  "m102": {
    "zh": "已上传",
    "en": "Uploaded"
  },
  "m103": {
    "zh": "原有台标",
    "en": "Existing logo"
  },
  "m104": {
    "zh": "{p0} · {p1} 个已发布频道使用",
    "en": "{p0} · Used by {p1} published channels"
  },
  "m105": {
    "zh": "替换",
    "en": "Replace"
  },
  "m106": {
    "zh": "正在上传 {p0}…",
    "en": "Uploading {p0}…"
  },
  "m107": {
    "zh": "，已停止后续上传",
    "en": "; remaining uploads stopped"
  },
  "m108": {
    "zh": " · 已上传 {p0} 个{p1}",
    "en": " · {p0} uploaded{p1}"
  },
  "m109": {
    "zh": "草稿已变化，请重新匹配",
    "en": "The draft changed. Match logos again."
  },
  "m110": {
    "zh": "已选频道",
    "en": "Selected channels"
  },
  "m111": {
    "zh": "当前筛选结果",
    "en": "Filtered channels"
  },
  "m112": {
    "zh": "{p0} · {p1} {p2} 个",
    "en": "{p0} · {p1}: {p2}"
  },
  "m113": {
    "zh": "替换已有台标",
    "en": "Replace existing logo"
  },
  "m114": {
    "zh": "新增台标",
    "en": "Add logo"
  },
  "m115": {
    "zh": "（展示前 100 个）",
    "en": " (showing the first 100)"
  },
  "m116": {
    "zh": "可应用 {p0} 个，保留已有 {p1} 个，已一致 {p2} 个，无唯一匹配 {p3} 个{p4}",
    "en": "{p0} to apply, {p1} existing kept, {p2} already matched, {p3} without a unique match{p4}"
  },
  "m117": {
    "zh": "已应用 {p0} 个台标，可撤销；保存发布后生效",
    "en": "Applied {p0} logos to draft. You can undo; publish to update subscriptions."
  },
  "m118": {
    "zh": "订阅地址已复制",
    "en": "Subscription URL copied"
  },
  "m119": {
    "zh": "复制失败，请长按或选中地址手动复制",
    "en": "Copy failed. Select the URL and copy it manually."
  },
  "m120": {
    "zh": "正在读取历史…",
    "en": "Loading history…"
  },
  "m121": {
    "zh": "当前发布版本 v{p0} · {p1} 份发布前快照",
    "en": "Published revision v{p0} · {p1} previous snapshots"
  },
  "m122": {
    "zh": "暂无历史，第一次发布后会自动生成。",
    "en": "No history yet. Your first publish will create a snapshot."
  },
  "m123": {
    "zh": " · 上一版",
    "en": " · Previous revision"
  },
  "m124": {
    "zh": "备份时间 {p0} · {p1} 套列表 · {p2} 个频道",
    "en": "Backed up {p0} · {p1} playlists · {p2} channels"
  },
  "m125": {
    "zh": "恢复到草稿",
    "en": "Restore to draft"
  },
  "m126": {
    "zh": "会替换当前未保存内容，可用撤销找回。",
    "en": "This replaces unsaved changes; Undo can recover them. "
  },
  "m127": {
    "zh": "将 v{p0} 恢复到当前草稿？{p1}订阅在保存发布后才会改变。",
    "en": "Restore v{p0} to the current draft? {p1}Subscriptions change only after publishing."
  },
  "m128": {
    "zh": "已恢复 v{p0} 到草稿，请检查后保存发布",
    "en": "Restored v{p0} to draft. Review, then save and publish."
  },
  "m129": {
    "zh": "切换主题",
    "en": "Switch theme"
  },
  "m130": {
    "zh": "搜索频道名称、播放地址或 EPG ID",
    "en": "Search channel name, stream URL or EPG ID"
  },
  "m131": {
    "zh": "搜索频道",
    "en": "Search channels"
  },
  "m132": {
    "zh": "主题",
    "en": "Theme"
  },
  "m133": {
    "zh": "不修改密码则留空",
    "en": "Leave blank to keep the password"
  },
  "m134": {
    "zh": "上传后自动生成本地地址，或输入 https://…",
    "en": "Upload to generate a local URL, or enter https://…"
  },
  "m135":{"zh": "\u4f8b\u5982 203.0.113.10:9000", "en": "e.g. 203.0.113.10:9000"},
  "m136": {
    "zh": "rtsp://… 或带时间占位符的 URL",
    "en": "rtsp://… or a URL with time placeholders"
  },
  "m137": {
    "zh": "可选 XMLTV http(s) 地址",
    "en": "Optional XMLTV HTTP(S) URL"
  },
  "m138": {
    "zh": "粘贴 M3U 或 DIYP TXT",
    "en": "Paste M3U or DIYP TXT"
  },
  "m139": {
    "zh": "可选，例如 lt、yd",
    "en": "Optional, e.g. home or tv2"
  },
  "m140": {
    "zh": "可选 XMLTV 地址",
    "en": "Optional XMLTV URL"
  },
  "m141": {
    "zh": "批量所属分组",
    "en": "Bulk group assignment"
  },
  "m142": {
    "zh": "留空会清除所选频道的 EPG 地址",
    "en": "Leave blank to clear EPG URLs on selected channels"
  },
  "m143": {
    "zh": "批量 EPG 地址",
    "en": "Bulk EPG URL"
  },
  "m144": {
    "zh": "IP:端口；留空会清除 FCC",
    "en": "IP:port; leave blank to clear FCC"
  },
  "m145": {
    "zh": "批量 FCC 地址",
    "en": "Bulk FCC URL"
  },
  "m146":{"zh": "\u4f8b\u5982 192.0.2.10:8080", "en": "e.g. 192.0.2.10:8080"},
  "m147":{"zh": "\u4f8b\u5982 198.51.100.20:8080", "en": "e.g. 198.51.100.20:8080"},
  "m148": {
    "zh": "台标方式",
    "en": "Logo source"
  },
  "m149": {
    "zh": "搜索台标，例如 CCTV5+、湖南卫视",
    "en": "Search logos, e.g. CCTV5+ or Hunan TV"
  },
  "m150": {
    "zh": "搜索台标",
    "en": "Search logos"
  },
  "m151": {
    "zh": "搜索台标库",
    "en": "Search logo library"
  },
  "m152": {
    "zh": "欢迎使用",
    "en": "Welcome"
  },
  "m153": {
    "zh": "用户名",
    "en": "Username"
  },
  "m154": {
    "zh": "密码",
    "en": "Password"
  },
  "m155": {
    "zh": "确认密码",
    "en": "Confirm password"
  },
  "m156": {
    "zh": "正在加载",
    "en": "Loading"
  },
  "m157": {
    "zh": "撤销",
    "en": "Undo"
  },
  "m158": {
    "zh": "重做",
    "en": "Redo"
  },
  "m159": {
    "zh": "退出",
    "en": "Sign out"
  },
  "m160": {
    "zh": "保存并发布",
    "en": "Save & publish"
  },
  "m161": {
    "zh": "频道列表 ",
    "en": "Playlists "
  },
  "m162": {
    "zh": "频道分组 ",
    "en": "Channel groups "
  },
  "m163": {
    "zh": "拖拽频道到分组可切换分组。手机可在频道编辑中选择分组。",
    "en": "Drag channels to a group to move them. On mobile, choose the group in the channel editor."
  },
  "m164": {
    "zh": "订阅与 EPG",
    "en": "Subscriptions & EPG"
  },
  "m165": {
    "zh": "设置",
    "en": "Settings"
  },
  "m166": {
    "zh": "频道管理",
    "en": "Channel management"
  },
  "m167": {
    "zh": "列表设置",
    "en": "Playlist settings"
  },
  "m168": {
    "zh": "导入频道",
    "en": "Import channels"
  },
  "m169": {
    "zh": "选择筛选结果",
    "en": "Select filtered channels"
  },
  "m170": {
    "zh": "已选 0 个",
    "en": "0 selected"
  },
  "m171": {
    "zh": "清空选择",
    "en": "Clear selection"
  },
  "m172": {
    "zh": "批量编辑",
    "en": "Bulk edit"
  },
  "m173": {
    "zh": "匹配台标",
    "en": "Match logos"
  },
  "m174": {
    "zh": "外观",
    "en": "Appearance"
  },
  "m175": {
    "zh": "在此浏览器记住主题偏好",
    "en": "Remember theme preference in this browser"
  },
  "m176": {
    "zh": "跟随系统",
    "en": "Follow system"
  },
  "m177": {
    "zh": "浅色",
    "en": "Light"
  },
  "m178": {
    "zh": "深色",
    "en": "Dark"
  },
  "m179": {
    "zh": "账号设置",
    "en": "Account settings"
  },
  "m180": {
    "zh": "修改管理用户名和密码",
    "en": "Change administrator username and password"
  },
  "m181": {
    "zh": "修改账号",
    "en": "Edit account"
  },
  "m182": {
    "zh": "台标库管理",
    "en": "Logo library management"
  },
  "m183": {
    "zh": "查看、上传、替换和删除台标",
    "en": "View, upload, replace and delete logos"
  },
  "m184": {
    "zh": "管理台标库",
    "en": "Manage logo library"
  },
  "m185": {
    "zh": "发布历史",
    "en": "Publish history"
  },
  "m186": {
    "zh": "保留最近 30 份发布前配置，恢复后再发布",
    "en": "Keep the last 30 pre-publish snapshots; publish again after restoring"
  },
  "m187": {
    "zh": "查看历史",
    "en": "View history"
  },
  "m188":{"zh": "配置 JSON 备份", "en": "Configuration JSON backup"},
  "m189":{"zh": "导出全部列表和当前草稿，不含台标图片", "en": "Export all lists and current drafts without logo images"},
  "m190": {
    "zh": "导出 JSON",
    "en": "Export JSON"
  },
  "m191":{"zh": "恢复备份", "en": "Restore backup"},
  "m192":{"zh": "支持配置与台标 ZIP 或旧版 JSON，检查后再发布", "en": "Accepts configuration/logo ZIP or legacy JSON; review before publishing"},
  "m193": {
    "zh": "选择备份",
    "en": "Choose backup"
  },
  "m194":{"zh": "ZIP 包含配置与台标图片；账号和发布历史的完整迁移仍需备份 data 目录。", "en": "ZIP includes configuration and logo images. Back up the data directory to also migrate accounts and publication history."},
  "m195": {
    "zh": "当前密码",
    "en": "Current password"
  },
  "m196": {
    "zh": "新密码",
    "en": "New password"
  },
  "m197": {
    "zh": "确认新密码",
    "en": "Confirm new password"
  },
  "m198": {
    "zh": "取消",
    "en": "Cancel"
  },
  "m199": {
    "zh": "保存账号",
    "en": "Save account"
  },
  "m200": {
    "zh": "频道名称",
    "en": "Channel name"
  },
  "m201": {
    "zh": "所属分组",
    "en": "Group"
  },
  "m202": {
    "zh": "Logo 地址",
    "en": "Logo URL"
  },
  "m203": {
    "zh": "直播播放链接",
    "en": "Live stream URL"
  },
  "m204":{"zh": "FCC\uff08\u5feb\u901f\u6362\u53f0\u9700\u914d\u5408\u76f8\u5e94\u7684\u63d2\u4ef6\u4f7f\u7528\uff09", "en": "FCC (fast switching requires a compatible plugin)"},
  "m205": {
    "zh": "也可粘贴带 fcc 参数的链接。保存后自动加入直播地址。",
    "en": "You can also paste a URL with an fcc parameter. It is added to the stream URL on publishing."
  },
  "m206": {
    "zh": "回放链接",
    "en": "Catch-up URL"
  },
  "m207": {
    "zh": "回放类型",
    "en": "Catch-up type"
  },
  "m208": {
    "zh": "回放天数",
    "en": "Catch-up days"
  },
  "m209": {
    "zh": "频道 EPG 地址",
    "en": "Channel EPG URL"
  },
  "m210": {
    "zh": "Logo 等比例缩至 300×180 范围。回放时间占位符须符合播放器及服务端要求。",
    "en": "Logos fit within 300×180. Catch-up time placeholders must match your player and server requirements."
  },
  "m211": {
    "zh": "应用到编辑列表",
    "en": "Apply to draft"
  },
  "m212": {
    "zh": "导入当前列表",
    "en": "Import into current playlist"
  },
  "m214": {
    "zh": "解析并导入",
    "en": "Parse & import"
  },
  "m215": {
    "zh": "全局 EPG 地址",
    "en": "Global EPG URL"
  },
  "m216": {
    "zh": "所有启用列表合并到 tv.m3u / tv.txt；每套列表另有独立订阅。保存发布后生效。",
    "en": "Enabled playlists are combined into tv.m3u / tv.txt; each also has its own subscription. Changes take effect after publishing."
  },
  "m217": {
    "zh": "应用",
    "en": "Apply"
  },
  "m218": {
    "zh": "列表名称",
    "en": "Playlist name"
  },
  "m219": {
    "zh": "订阅短名称",
    "en": "Subscription short name"
  },
  "m220": {
    "zh": "保存发布后可用 /lt.m3u 或 /lt.txt；旧地址继续可用。留空关闭短地址，改名后原短地址失效。",
    "en": "After publishing, use /home.m3u or /home.txt. Permanent ID URLs remain valid. Leave blank to disable; changing the short name invalidates its previous URL."
  },
  "m221": {
    "zh": "列表 EPG 地址",
    "en": "Playlist EPG URL"
  },
  "m222": {
    "zh": "加入合并订阅",
    "en": "Include in combined subscriptions"
  },
  "m223": {
    "zh": "删除列表",
    "en": "Delete playlist"
  },
  "m224": {
    "zh": "修改所属分组",
    "en": "Change group"
  },
  "m225": {
    "zh": "修改频道 EPG 地址",
    "en": "Change channel EPG URL"
  },
  "m226": {
    "zh": "修改 FCC 地址",
    "en": "Change FCC URL"
  },
  "m227": {
    "zh": "替换地址中的文字（区分大小写）",
    "en": "Replace text in URLs (case-sensitive)"
  },
  "m228": {
    "zh": "查找内容",
    "en": "Find"
  },
  "m229": {
    "zh": "替换为",
    "en": "Replace with"
  },
  "m230": {
    "zh": "直播地址",
    "en": "Live URLs"
  },
  "m231": {
    "zh": "回放地址",
    "en": "Catch-up URLs"
  },
  "m232":{"zh": "\u9884\u89c8", "en": "Preview"},
  "m233":{"zh": "\u5e94\u7528", "en": "Apply"},
  "m234": {
    "zh": "自动匹配台标",
    "en": "Auto-match logos"
  },
  "m235": {
    "zh": "同时替换已有台标",
    "en": "Also replace existing logos"
  },
  "m236": {
    "zh": "仅自动选择名称或 EPG ID 能唯一匹配的台标；无匹配或有歧义的保持原样。",
    "en": "Only logos with a unique name or EPG ID match are selected. Unmatched or ambiguous channels remain unchanged."
  },
  "m237": {
    "zh": "应用匹配",
    "en": "Apply matches"
  },
  "m238": {
    "zh": "每次发布自动保存发布前配置，保留最近 30 份。恢复只修改当前草稿，确认后再保存并发布。台标图片和账号不随历史回退。",
    "en": "Each publish saves the previous configuration; the last 30 snapshots are kept. Restoring changes the draft only. Review and publish to update subscriptions. Logo images and accounts are not restored."
  },
  "m239": {
    "zh": "台标库",
    "en": "Logo library"
  },
  "m240": {
    "zh": "上传",
    "en": "Upload"
  },
  "m241": {
    "zh": "链接",
    "en": "Link"
  },
  "m242": {
    "zh": "上传的台标统一存入此库，可搜索、选择和自动匹配。新安装请先上传台标。",
    "en": "Uploaded logos are stored together here for search, selection and automatic matching. Upload logos first on a new installation."
  },
  "m243": {
    "zh": "台标图片链接",
    "en": "Logo image URL"
  },
  "m244": {
    "zh": "填写图片直链，仅用于当前频道，不加入台标库。",
    "en": "Use a direct image URL for this channel only; it is not added to the library."
  },
  "m245": {
    "zh": "使用链接",
    "en": "Use link"
  },
  "m246": {
    "zh": "支持 PNG、JPEG、WebP；以文件名加入台标库，并用于当前频道。等比例缩至 300×180，保留透明背景；同名时可选择替换或停止。",
    "en": "PNG, JPEG and WebP supported. Logos use the filename, fit within 300×180 and preserve transparency. For duplicate names, choose Replace or Stop."
  },
  "m247": {
    "zh": "选择本地图片",
    "en": "Choose local image"
  },
  "m248": {
    "zh": "选择后应用到草稿，保存并发布后更新订阅。",
    "en": "Selections apply to the draft; publish to update subscriptions."
  },
  "m249": {
    "zh": "台标库由你上传的图片组成。使用频道名称命名图片，方便自动匹配。上传、替换和删除立即生效；替换会更新所有使用此台标的频道。",
    "en": "The library contains your uploaded images. Name files after channels for matching. Uploads, replacements and deletions take effect immediately; replacement updates every channel using the logo."
  },
  "m250": {
    "zh": "批量上传",
    "en": "Upload multiple"
  },
  "m251": {
    "zh": "同名台标",
    "en": "Duplicate logo name"
  },
  "m252": {
    "zh": "替换立即生效，使用此台标的频道将显示新图片。",
    "en": "Replacement takes effect immediately for all channels using this logo."
  },
  "m253": {
    "zh": "停止",
    "en": "Stop"
  },
  "m254": {
    "zh": "☀ 浅色",
    "en": "☀ Light"
  },
  "m255": {
    "zh": "☾ 暗色",
    "en": "☾ Dark"
  },
  "m256": {
    "zh": "切换为浅色主题",
    "en": "Switch to light theme"
  },
  "m257": {
    "zh": "切换为暗色主题",
    "en": "Switch to dark theme"
  },
  "m258": {
    "zh": "切换主题；可在设置中选择跟随系统",
    "en": "Switch theme; choose Follow system in Settings"
  },
  "m259": {
    "zh": "请输入用户名",
    "en": "Enter a username"
  },
  "m260": {
    "zh": "密码需为 8–200 个字符",
    "en": "Password must be 8–200 characters"
  },
  "m261": {
    "zh": "账号已初始化，请登录",
    "en": "Account already initialized. Sign in."
  },
  "m262": {
    "zh": "尝试次数过多，请一分钟后重试",
    "en": "Too many attempts. Try again in one minute."
  },
  "m263": {
    "zh": "请求格式错误",
    "en": "Invalid request format"
  },
  "m264": {
    "zh": "请先初始化账号",
    "en": "Initialize the account first"
  },
  "m265": {
    "zh": "用户名或密码错误",
    "en": "Incorrect username or password"
  },
  "m266": {
    "zh": "当前密码错误",
    "en": "Incorrect current password"
  },
  "m267": {
    "zh": "账号已修改，请重新登录",
    "en": "Account changed. Sign in again."
  },
  "m268": {
    "zh": "字段过长、类型错误或含控制字符",
    "en": "Field is too long, has an invalid type or contains control characters"
  },
  "m269": {
    "zh": "链接格式无效：",
    "en": "Invalid URL: "
  },
  "m270": {
    "zh": "FCC 请填写 IP:端口，或带 fcc 参数的 rtp2httpd 链接",
    "en": "Enter FCC as IP:port or an rtp2httpd URL with an fcc parameter"
  },
  "m271": {
    "zh": "FCC 端口无效",
    "en": "Invalid FCC port"
  },
  "m272": {
    "zh": "FCC 地址格式应为 IP:端口，例如 203.0.113.10:9000",
    "en": "FCC must be IP:port, e.g. 203.0.113.10:9000"
  },
  "m273": {
    "zh": "配置必须包含 lists 数组，最多 100 套列表",
    "en": "Configuration must contain a lists array (up to 100 playlists)"
  },
  "m274": {
    "zh": "列表 ID 必须唯一且只包含字母、数字、下划线、短横线",
    "en": "Playlist IDs must be unique and contain only letters, digits, underscores or hyphens"
  },
  "m275": {
    "zh": "订阅短名称需为 1–24 位字母、数字、下划线或短横线，以字母或数字开头",
    "en": "Short name must be 1–24 letters, digits, underscores or hyphens, starting with a letter or digit"
  },
  "m276": {
    "zh": "此订阅短名称为系统保留名称，请换一个",
    "en": "This short name is reserved. Choose another."
  },
  "m277": {
    "zh": "订阅短名称不能重复",
    "en": "Subscription short names must be unique"
  },
  "m278": {
    "zh": "列表名称不能为空",
    "en": "Playlist name cannot be empty"
  },
  "m279": {
    "zh": "分组或频道格式错误",
    "en": "Invalid group or channel format"
  },
  "m280": {
    "zh": "分组不能为空、重复或包含逗号/双引号",
    "en": "Groups cannot be empty, duplicated or contain commas or double quotes"
  },
  "m281": {
    "zh": "频道 ID 缺失或重复",
    "en": "Channel ID is missing or duplicated"
  },
  "m282": {
    "zh": "频道名称不能为空或包含逗号（TXT 格式限制）",
    "en": "Channel names cannot be empty or contain commas (TXT format restriction)"
  },
  "m283": {
    "zh": "频道分组不存在",
    "en": "Channel group does not exist"
  },
  "m284": {
    "zh": "本地 Logo 路径无效",
    "en": "Invalid local logo path"
  },
  "m285": {
    "zh": "频道播放链接不能为空",
    "en": "Channel stream URL cannot be empty"
  },
  "m286": {
    "zh": "回放类型无效",
    "en": "Invalid catch-up type"
  },
  "m287": {
    "zh": "回放天数需为 1–30",
    "en": "Catch-up days must be 1–30"
  },
  "m288": {
    "zh": "最多 20000 个频道",
    "en": "Maximum 20,000 channels"
  },
  "m289": {
    "zh": "请求校验失败，请刷新页面",
    "en": "Request validation failed. Refresh the page."
  },
  "m290": {
    "zh": "请登录后操作",
    "en": "Sign in to continue"
  },
  "m291": {
    "zh": "请求格式错误或文件超过 8MB",
    "en": "Invalid request or file exceeds 8 MB"
  },
  "m292": {
    "zh": "其他页面已修改配置，请刷新后重新操作",
    "en": "Another page changed the configuration. Refresh and try again."
  },
  "m293": {
    "zh": "JSON 备份写入失败，发布历史已保存在数据库中",
    "en": "JSON backup failed; publish history is saved in the database"
  },
  "m294": {
    "zh": "读取升级前的 30 份备份，不覆盖已有事务历史。",
    "en": "Read the last 30 legacy backups without overwriting transactional history."
  },
  "m295": {
    "zh": "跳过无效历史备份：%s",
    "en": "Skipped invalid history backup: %s"
  },
  "m296": {
    "zh": "历史版本不存在或已超过保留范围",
    "en": "History revision not found or no longer retained"
  },
  "m297": {
    "zh": "请提供文本",
    "en": "Provide playlist text"
  },
  "m298": {
    "zh": "未分组",
    "en": "Ungrouped"
  },
  "m299": {
    "zh": "EXTINF 缺少频道名称",
    "en": "EXTINF is missing the channel name"
  },
  "m300": {
    "zh": "无法解析此行：",
    "en": "Cannot parse this line: "
  },
  "m301": {
    "zh": "最后一个频道缺少播放链接",
    "en": "Last channel is missing its stream URL"
  },
  "m302": {
    "zh": "未找到频道",
    "en": "No channels found"
  },
  "m303": {
    "zh": "导入",
    "en": "Import"
  },
  "m304": {
    "zh": "请选择图片",
    "en": "Choose an image"
  },
  "m305": {
    "zh": "仅支持 PNG/JPEG/WebP 文件",
    "en": "Only PNG/JPEG/WebP files are supported"
  },
  "m306": {
    "zh": "文件名请使用频道名称、数字、空格、加号、括号或短横线，最多 180 个字符",
    "en": "Use channel names, letters, digits, spaces, plus signs, parentheses or hyphens in filenames (up to 180 characters)"
  },
  "m307": {
    "zh": "台标库中已有同名台标",
    "en": "A logo with this name already exists"
  },
  "m308": {
    "zh": "仅支持有效 PNG/JPEG/WebP，图片不超过 1600 万像素",
    "en": "Use a valid PNG/JPEG/WebP image with at most 16 million pixels"
  },
  "m309": {
    "zh": "台标名称无效",
    "en": "Invalid logo name"
  },
  "m310": {
    "zh": "台标已不存在",
    "en": "Logo no longer exists"
  },
  "m311": {
    "zh": "已有频道使用此台标，删除后图片将无法显示",
    "en": "Channels use this logo; deleting it makes the image unavailable"
  },
  "m312": {
    "zh": "列表已不存在",
    "en": "Playlist no longer exists"
  },
  "m313": {
    "zh": "请先选择频道",
    "en": "Select channels first"
  },
  "m314": {
    "zh": "目标分组不存在",
    "en": "Target group does not exist"
  },
  "m315": {
    "zh": "查找内容不能为空",
    "en": "Find text cannot be empty"
  },
  "m316": {
    "zh": "不支持替换此字段",
    "en": "This field cannot be replaced"
  },
  "m317": {"zh":"语言", "en":"Language"},
  "m318": {
    "zh": "发现本浏览器在 {p0} 保存的未发布草稿。{p1}恢复到编辑器？确定恢复，取消丢弃。",
    "en": "An unpublished draft was saved in this browser at {p0}. {p1}Restore it? OK restores; Cancel discards."
  },
  "m319": {
    "zh": "服务器配置已变化，恢复后请核对差异再发布。",
    "en": "The server configuration has changed. Review differences before publishing. "
  },
  "m320": {
    "zh": "无法保存或恢复本地草稿，请及时发布或导出 JSON 备份。",
    "en": "Local draft storage or recovery is unavailable. Publish or export a JSON backup."
  },
  "m321": {
    "zh": "本地草稿已恢复，可撤销；核对后保存并发布。",
    "en": "Local draft restored. You can undo; review before publishing."
  },
  "m322": {
    "zh": "共选中 {p0} 个，将修改 {p1} 个，跳过 {p2} 个（未变化或已不存在）{p3}；尚未应用或发布。",
    "en": "Selected {p0}; will change {p1}; skip {p2} (unchanged or no longer present){p3}. Not applied or published."
  },
  "m323": {
    "zh": "已修改 {p0} 个，跳过 {p1} 个。可撤销；保存发布后生效。",
    "en": "Changed {p0}; skipped {p1}. Undo is available; publish to update subscriptions."
  },
  "m324": {
    "zh": "撤销",
    "en": "Undo"
  },
  "m325":{"zh": "\u7559\u7a7a\u7528\u9891\u9053\u540d\u5339\u914d\u8282\u76ee\u8868", "en": "Blank uses channel name."},
  "m326": {
    "zh": "批量检测",
    "en": "Batch check"
  },
  "m327": {
    "zh": "服务器响应耗时，仅供参考。并发 4 路，超时 5 秒；HTTP/HLS 仅有限读取，不代表实际播放效果。",
    "en": "Server response time, for reference only. Concurrency 4, timeout 5s; bounded HTTP/HLS reads do not verify playback."
  },
  "m328": {
    "zh": "检测进度",
    "en": "Check progress"
  },
  "m329": {
    "zh": "只看失败项",
    "en": "Failures only"
  },
  "m330": {
    "zh": "重试失败项",
    "en": "Retry failures"
  },
  "m331": {
    "zh": "取消检测",
    "en": "Cancel check"
  },
  "m332": {
    "zh": "超时",
    "en": "Timeout"
  },
  "m333": {
    "zh": "不可访问",
    "en": "Unavailable"
  },
  "m334": {
    "zh": "暂不支持",
    "en": "Unsupported"
  },
  "m335": {
    "zh": "未检测",
    "en": "Not checked"
  },
  "m336": {
    "zh": "等待检测",
    "en": "Pending"
  },
  "m337": {
    "zh": "检测中：{p0}/{p1}，失败 {p2} 项",
    "en": "Checking: {p0}/{p1}, {p2} failures"
  },
  "m338": {
    "zh": "已取消：{p0}/{p1}，失败 {p2} 项",
    "en": "Cancelled: {p0}/{p1}, {p2} failures"
  },
  "m339": {
    "zh": "检测完成：{p0}/{p1}，失败 {p2} 项",
    "en": "Finished: {p0}/{p1}, {p2} failures"
  },
  "m340": {
    "zh": "{p0} · 本次检测 {p1} 个频道",
    "en": "{p0} · Checking {p1} channels"
  },
  "m341": {
    "zh": "检测中…",
    "en": "Checking…"
  },
  "m342": {
    "zh": "再次检测",
    "en": "Check again"
  },
  "m343": {
    "zh": "重新检测 {p0} 的响应耗时",
    "en": "Recheck response time for {p0}"
  },
  "m345": {
    "zh": "开始检测",
    "en": "Start check"
  },
  "m346": {
    "zh": "尚未开始，点击“开始检测”检测本次频道。",
    "en": "Not started. Click Start check to check these channels."
  },
  "m344": {
    "zh": "最多同时检测 4 个频道，请稍候。",
    "en": "Up to 4 channels can be checked at once. Please wait."
  },
  "m347": {"zh": "导入结果", "en": "Import results"},
  "m348": {"zh": "有效频道已加入草稿，请核对后保存并发布。未导入任何频道时，原列表保持不变。", "en": "Valid channels were added to the draft. Review, then save and publish. If no channels were imported, the original playlist is unchanged."},
  "m349": {"zh": "关闭", "en": "Close"},
  "m350": {"zh": "导入 {p0} 个频道，其中修正 {p1} 个；跳过 {p2} 项。", "en": "Imported {p0} channels ({p1} repaired); skipped {p2} entries."},
  "m351": {"zh": "第 {p0} 行 · {p1} · {p2}：{p3}", "en": "Line {p0} · {p1} · {p2}: {p3}"},
  "m352": {"zh": "已跳过", "en": "Skipped"},
  "m353": {"zh": "已修正", "en": "Repaired"},
  "m354": {"zh": "另有 {p0} 条详情未显示，仅展示前 1000 条。", "en": "{p0} additional details omitted; showing the first 1,000."},
  "m355": {"zh": "移动或复制到其他列表", "en": "Move or copy to another playlist"},
  "m356": {"zh": "操作", "en": "Action"},
  "m357": {"zh": "移动", "en": "Move"},
  "m358": {"zh": "复制", "en": "Copy"},
  "m359": {"zh": "目标列表", "en": "Target playlist"},
  "m360": {"zh": "追加到目标列表末尾，自动补齐缺少的分组；移动会从原列表移除，复制会保留原频道。", "en": "Append to the target playlist and add missing groups. Moving removes the originals; copying keeps them."},
  "m361": {"zh": "请先创建或选择其他目标列表。", "en": "Create or select another target playlist first."},
  "m362": {"zh": "{p0}：{p1} → {p2} · 分组：{p3}", "en": "{p0}: {p1} → {p2} · Group: {p3}"},
  "m363": {"zh": "目标分组", "en": "Target group"},
  "m364": {"zh": "保留原分组（自动补齐）", "en": "Keep original groups (add missing groups)"},
  "m365": {"zh": "新建分组", "en": "New group"},
  "m366": {"zh": "输入新分组名称", "en": "Enter a new group name"},
  "m367": {"zh": "分组名称须为 1–200 个字符，不能包含逗号、双引号或换行。", "en": "Group names must contain 1–200 characters, without commas, double quotes or line breaks."},
  "m368": {"zh": "复制（保留原频道）", "en": "Copy (keep originals)"},
  "m369": {"zh": "移动（从原列表移除）", "en": "Move (remove originals)"},
  "m370": {"zh": "复制：原列表频道保留不变，所选频道将复制到目标列表。", "en": "Copy: keep the originals and add copies to the target playlist."},
  "m371": {"zh": "移动：所选频道将从原列表移除，转入目标列表。若要保留原频道，请选择“复制”。", "en": "Move: remove selected channels from the source and transfer them to the target. Choose Copy to keep the originals."},
  "m372": {"zh": "应用复制", "en": "Apply copy"},
  "m373": {"zh": "应用移动", "en": "Apply move"},
  "m374": {"zh": "添加频道列表", "en": "Add playlist"},
  "m375": {"zh": "新建空列表", "en": "Create empty playlist"},
  "m376": {"zh": "导入并新建列表", "en": "Import as new playlist"},
  "m377": {"zh": "支持 M3U / TXT，可填写链接、上传文件或粘贴内容。", "en": "Supports M3U / TXT. Enter a URL, upload a file or paste its contents."},
  "m378": {"zh": "新列表名称", "en": "New playlist name"},
  "m379": {"zh": "导入频道到「{p0}」", "en": "Import channels into “{p0}”"},
  "m380": {"zh": "解析出有效频道后才创建新列表，不影响现有列表。", "en": "A new playlist is created only when valid channels are found. Existing playlists are unchanged."},
  "m382": {"zh": "追加到当前列表，保留原有频道；不受勾选或搜索筛选影响。", "en": "Appends to this playlist and keeps existing channels, regardless of selection or search filters."},
  "m383": {"zh": "导入期间表单或列表发生变化，请重新导入。", "en": "The form or playlists changed during import. Please try again."},
  "appearanceTitle": {"zh": "外观设置", "en": "Appearance"},
  "appearanceDesc": {"zh": "调整显示模式和主题色", "en": "Choose your display mode and accent color"},
  "appearanceOpen": {"zh": "调整外观", "en": "Customize"},
  "appearanceMode": {"zh": "显示模式", "en": "Display mode"},
  "appearanceAccent": {"zh": "主题色", "en": "Accent color"},
  "appearanceHint": {"zh": "即时生效，仅保存在当前浏览器，无需保存并发布。", "en": "Applies immediately in this browser. No publishing needed."},
  "appearanceReset": {"zh": "恢复默认粉色", "en": "Reset to Pink"},
  "accentPurple": {"zh": "紫色", "en": "Purple"},
  "accentPink": {"zh": "粉色", "en": "Pink"},
  "accentBlue": {"zh": "蓝色", "en": "Blue"},
  "accentOrange": {"zh": "橙色", "en": "Orange"},
  "accentGreen": {"zh": "绿色", "en": "Green"},
  "accentCyan": {"zh": "青色", "en": "Cyan"},
  "uiSearchCompact": {"zh":"搜索","en":"Search"},
  "uiImportCompact":{"zh":"导入","en":"Import"},
  "uiAddCompact":{"zh":"添加","en":"Add"},
  "uiSearchHint":{"zh":"名称 / 地址 / EPG","en":"Name / URL / EPG"},
  "uiAccountMenu":{"zh": "账号菜单", "en": "Account menu"},
  "uiCurrentAccount":{"zh": "当前账号", "en": "Signed in as"},
  "uiNewGroup":{"zh": "新建分组", "en": "New group"},
  "uiNewList":{"zh": "新建列表", "en": "New playlist"},
  "uiGroupName":{"zh": "分组名称", "en": "Group name"},
  "uiNameRequired":{"zh": "名称不能为空。", "en": "Enter a name."},
  "uiCreate":{"zh": "创建", "en": "Create"},
  "uiConfirmDelete":{"zh": "确认删除", "en": "Confirm deletion"},
  "uiConfirmAction":{"zh": "确认操作", "en": "Confirm action"},
  "uiConfirm":{"zh": "确认", "en": "Confirm"}
};
