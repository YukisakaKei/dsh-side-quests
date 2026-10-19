# 本地安装与调试

本仓库的插件不发布到 npm，使用本地路径安装到 DSH profile。

## 安装

在仓库外执行：

```sh
dsh plugin --profile web add /绝对路径/dsh-plugin/plugins/dsh-tcl-copy
```

Windows 路径示例（请替换为实际路径）：

```sh
dsh plugin --profile web add "D:/AI_Agent/dsh-plugin/plugins/dsh-tcl-copy"
```

安装后：

- host 半（`lib/index.js`、`cordis.patch.yml`、`package.json`）变化：退出并重启 DSH Desktop；
- 仅浏览器半（`lib/client.js`）变化：浏览器硬刷新（Ctrl+Shift+R）。

## 验证

1. 打开一个目标后缀的文件（例如 `.tcl`）。
2. 右侧栏的渲染器下拉里出现插件标题（例如「TCL 文本」）。
3. 点击预览工具栏里的按钮，确认剪贴板内容。
4. 浏览器控制台无 `[dsh-tcl-copy] required services unavailable` 之类的警告。

## 卸载

```sh
dsh plugin --profile web remove dsh-tcl-copy
```

卸载或禁用后，目标后缀应自动回到内置纯文本预览。

## 临时禁用

在 profile 的 `cordis.patch.yml` 中给对应行加 `disabled`：

```yaml
- id: dsh-tcl-copy
  disabled: true
```

具体 profile 路径由 DSH 管理，不要把本机路径写进仓库文档。

## 排查

| 现象 | 检查方向 |
|---|---|
| 没有按钮 | 控制台是否有服务缺失警告；渲染器下拉是否有插件标题 |
| 仍是内置纯文本 | 注册是否成功、后缀是否写对、`priority` 是否写成 `builtin` |
| DSH 起不来 | 是否有重复 `definition.id`；`apply` 是否抛错；用插件恢复界面/安全模式 |
| 复制内容不全 | 是否误用了 `content.text`（只含已加载页）；改用 `readBytes` |
| 样式错乱 | `CodeBlock` 的父容器样式上下文是否缺失 |
| 更新不生效 | host 半是否重启；client 半是否硬刷新 |
