# dsh-tcl-copy 设计记录

## 问题

DSH 内置的「扩展名 → 语言」表不含 `tcl`，`.tcl` 因此落到纯文本兜底预览。
纯文本预览没有复制控件，用户只能手动拖选；Ctrl+A 又会选中整个页面 UI。

## 目标

在右侧栏预览 `.tcl` 时提供一个「复制全文」按钮，复制结果与文件全文一致，
包括末尾换行与 CRLF，并且不影响其它后缀的预览行为。

## 方案

纯浏览器半插件，host 半为空实现：

1. 向 `documentPreviews` 注册一个只认领 `tcl` 的渲染器，
   `priority: 'extension'`，`loading: 'text-pages'`。
2. 向 keyed slot `sidebar.right.tab.document` 注册正文组件，key 与渲染器 id 一致。
3. 显示复用内置分页加载与 `CodeBlock`（行号、软换行、主题）。
4. 头部按内置 `CodeToolbar` 复刻：左侧语言标签、右侧复制图标 + Tooltip，
   背景、字号、间距、图标尺寸与内置代码预览一致。
5. 复制不自用 `content.text`（它只含已加载页），而是点击时调用
   `remote.workspaceFiles.readBytes` 读取完整字节，解码后写入剪贴板。

## 为什么复制要单独读

内置分页 API 以行为单位，`content.text` 只拼接已加载页，无法精确表示文件末尾换行。
`readBytes` 能得到完整字节，配合 BOM 感知的 `TextDecoder` 可以保留 CRLF 与末尾换行。

## 为什么自己画头部

`CodeBlock` 自带的复制按钮写入的是它拿到的 `code`，也就是 `content.text`：
只含已加载页，并且会裁掉末尾换行。要保留全文复制，就必须自己持有按钮。
头部只是复刻内置 `CodeToolbar` 的 DOM 结构与 `CodeCard.module.css` 的样式值，
不引入新的视觉语言；`data-code-preview` 标记同时让预览面板采用内置代码预览的
flex 布局与内部滚动。

## 关键取舍

| 取舍 | 选择 | 原因 |
|---|---|---|
| 语法高亮 | 不做 | 宿主 shiki grammar 白名单不含 tcl；复制功能不依赖高亮 |
| 复制按钮 | 复刻内置 `CodeToolbar` | `CodeBlock` 自带按钮只能复制已加载文本，且裁掉末尾换行 |
| 预览布局 | 根节点加 `data-code-preview` | 让预览面板采用内置代码预览的 flex 布局与内部滚动 |
| 大文件行号 | 加载文本 ≥ 2 MiB 时关闭行号 | 避免逐行 `<span>` 撑爆 DOM；复制不受影响 |
| 复制失败提示 | 区分过大、二进制、读取失败 | 用户能判断下一步 |
| 二进制检测 | 解码后出现 NUL 即拒绝复制 | 避免把二进制内容写进剪贴板 |
| 非 UTF-8 | 按 UTF-8 解码，可能乱码 | 与宿主文本预览限制一致；不做 GBK 猜测 |
| 平台包 | 由宿主 `require` 提供 | 避免重复实例；取不到时跳过注册而不是抛错 |

## 行为

| 场景 | 结果 |
|---|---|
| 普通 UTF-8 / UTF-8 BOM / UTF-16 BOM | 复制全文 |
| 空文件 | 复制空串 |
| 超过宿主读取上限 | 提示「文件过大，无法复制全文」，不复制部分 |
| 含 NUL 字节 | 提示「疑似二进制文件，无法复制」 |
| 读取失败 | 提示「读取失败」，可重试 |
| 非 UTF-8（GBK 等） | 按 UTF-8 解码，可能乱码（已知限制） |

## 生命周期与容错

- 所有注册放在 `ctx.effect` 中；禁用或卸载后自动回收。
- 服务缺失时打印警告并跳过注册，不影响宿主启动。
- 读取使用 tab 的取消信号；组件卸载后忽略晚到结果。
- 复制成功状态约 1 秒后恢复。

## 兼容性

- 目标宿主：DSH Desktop 0.12.0 代次，内核 `@deepseek-ai/dsh` 0.2.0-rc.2，profile `web`。
- 依赖 `documentPreviews.register`、`slots.register`、
  `remote.workspaceFiles.readBytes`、`CodeBlock`、`Tooltip` 与复制/对勾图标。
- 升级 DSH 后按 [开发指南](../../development.md) 的兼容检查清单复核。

## 安全与隐私

- 不声明 `fs-write` / `shell` / `network` 能力。
- 文件读取只通过宿主已有的 `remote.workspaceFiles`，不自行访问磁盘。
- 不发送任何网络请求，无遥测。
- 测试与文档只使用合成数据，不包含真实设计文件或本机路径。

## 证据

原始实施计划、asar 提取物和官方文档副本保存在 `local/`，不进入公开仓库。
接口摘要见 [docs/development.md](../../development.md)。
