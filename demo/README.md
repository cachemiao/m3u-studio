# M3U Studio 静态演示

仅使用构建脚本生成的虚构频道和台标，不读取工作区数据、账号、配置或上传目录。线上入口：https://cachemiao.github.io/m3u-studio/demo/ 。

保留频道编辑、多选拖动、批量编辑、分组、内置台标匹配、语言、主题及撤销重做。导入只能选择内置示例；检测结果和发布过程均为模拟。频道与历史记录只存在本页内存，刷新恢复；只有语言和外观偏好使用浏览器存储。

文件上传、私人列表导入、账号修改、配置备份和外部台标链接不开放。网络接口由内存适配器替代，页面 CSP 禁止连接请求，并将图片限制到本地素材。任何输入的示例地址都不会被实际访问。

构建（在仓库根目录，需先安装 requirements.txt）：

```sh
python scripts/build-demo.py
python -m http.server 8330 --directory docs/demo
```

打开 `http://127.0.0.1:8330`。输出为 `docs/demo/` 的独立静态站点，支持未来部署到 GitHub Pages 的 `/m3u-studio/demo/` 子路径；此构建不会修改正式应用或自动发布。

构建 Windows 静态预览包：

```sh
python scripts/package-demo.py ./dist/m3u-studio-web-demo-win.zip
```

解压后双击 `Start-Demo.cmd`。启动器仅依赖 Python 3.9+ 标准库，无需安装 Flask、Docker 或其他依赖；已有 Python 3.12 可直接使用。
