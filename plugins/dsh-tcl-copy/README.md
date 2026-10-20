# dsh-tcl-copy

一键复制 `.tcl` 文件**全文**的 DSH Web 插件：在右侧栏预览 `.tcl` 时，预览头部出现
与内置代码预览一致的复制图标，点击后把整个文件内容（含末尾换行）写入剪贴板。

本插件是 [dsh-plugin](../../README.md) 仓库的一部分，以 MIT 许可证发布，通过本地路径安装。
文中的仓库内文档链接只在仓库中有效。

## 为什么需要它

DSH 内置的「扩展名 → 语言」表不含 `tcl`，`.tcl` 因此落到纯文本兜底预览，没有复制入口。
内置代码预览的复制只覆盖已加载分页，并会裁剪末尾换行；本插件在点击时读取完整字节后复制全文。

设计与取舍见 [DESIGN.md](DESIGN.md)。

## 行为

| 场景 | 结果 |
|---|---|
| 普通 UTF-8 / UTF-8 BOM / UTF-16 BOM 文本 | 复制全文 |
| 空文件 | 复制空串 |
| 超过宿主全文件读取上限 | 提示「文件过大，无法复制全文」，**不降级复制部分** |
| 含 NUL 字节（疑似二进制） | 提示「疑似二进制文件，无法复制」，不复制 |
| 读取失败 | 提示「读取失败」，可再次点击重试 |
| 非 UTF-8（GBK 等） | 按 UTF-8 解码可能出现乱码；这是宿主文本预览的同一限制 |

当前仅认领 `tcl` 后缀，不改动任何其它后缀的预览行为。渲染器下拉里本插件为首选，
「文本」兜底仍可选。

## 界面与状态

- 预览头部与内置代码预览一致：左侧「代码块」语言标签，右侧复制图标（悬停提示「复制全文」）。
- 点击后图标旁显示「正在读取…」，完成后图标换为对勾并提示「已复制」，约 1 秒后恢复。
- 读取期间再次点击会被忽略。
- 失败提示显示在同一头部的状态区：`文件过大，无法复制全文`、`疑似二进制文件，无法复制`、
  `读取失败`；可再次点击重试。
- 加载文本超过 2 MiB 时关闭行号，避免逐行 DOM 过大；复制不受影响。
- 剪贴板优先使用 `navigator.clipboard.writeText`，不可用时退回 `execCommand('copy')`。
- 内置中英文案；宿主没有 `locale` 服务时退回中文。

## 已知限制

- 只认领 `.tcl`，不支持 `.sdc`、`.upf` 等其它后缀。
- 无 BOM 的 UTF-16 会按 UTF-8 解码，结果为乱码。
- 不支持 GBK/GB2312 等编码的自动识别。
- 没有键盘快捷键；复制入口只有预览头部的复制图标。
- 复制失败与读取失败共用「读取失败」提示，暂未细分剪贴板错误。

## 宿主兼容

- 目标宿主：DSH Desktop 0.12.0 代次，内核 `@deepseek-ai/dsh` 0.2.0-rc.2，profile `web`。
- 核对日期：2026-10-20。
- 依赖的内置契约：`documentPreviews.register`、`slots.register({ locale })`、
  `ctx.remote.workspaceFiles.readBytes`、`CodeBlock` / `Tooltip` / 图标原语。
- 其它版本未逐一验证；升级 DSH 后按
  [docs/development.md](../../docs/development.md) 的兼容检查清单复核。

## 安装

安装、卸载与生效条件见 [docs/local-install.md](../../docs/local-install.md)。

## 开发与测试

- 自动测试与校验命令：[docs/testing.md](../../docs/testing.md)
- 本插件手工验收与边界用例：[TESTING.md](TESTING.md)
- 接口与包契约：[docs/development.md](../../docs/development.md)

## 排查

若更新后仍无按钮，按顺序检查：

1. 浏览器控制台有无 `[dsh-tcl-copy] required services unavailable` 警告；
2. 渲染器下拉里是否出现「TCL 文本」；
3. 是否有重复注册导致宿主启动失败（可用插件恢复界面 / 安全模式）。

## 许可证

MIT。本插件为非官方个人插件，与 DeepSeek / DataElement 无关。
