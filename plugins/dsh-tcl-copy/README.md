# dsh-tcl-copy

一键复制 `.tcl` 文件**全文**的 DSH Web 插件：在右侧栏预览 `.tcl` 时，工具栏出现
「复制全文」按钮，点击后把整个文件内容（含末尾换行）写入剪贴板。

本插件是 [dsh-plugin](../../README.md) 仓库的一部分，以 MIT 许可证发布，通过本地路径安装，
不发布到 npm。

## 为什么需要它

DSH 内置的「扩展名 → 语言」表不含 `tcl`，所以 `.tcl` 落到纯文本兜底预览，
没有复制按钮；且内置代码预览的复制走分页读取，只能复制「已加载部分」，还会裁剪末尾换行。
本插件：

- 显示：复用内置 `text-pages` 分页加载与 `CodeBlock`（行号、软换行、明暗主题）。
- 复制：点击后自行 `readBytes` 读**完整字节**再解码，复制到的是全文，且保留末尾换行与 CRLF。

## 行为

| 场景 | 结果 |
|---|---|
| 普通 UTF-8 / UTF-8 BOM / UTF-16 BOM 文本 | 复制全文 |
| 空文件 | 复制空串 |
| 超过宿主全文件读取上限 | 提示「文件过大，无法复制全文」，**不降级复制部分** |
| 含 NUL 字节（疑似二进制） | 提示「疑似二进制文件，无法复制」，不复制 |
| 读取失败 | 提示「读取失败」，可再次点击重试 |
| 非 UTF-8（GBK 等） | 按 UTF-8 解码可能出现乱码；这是宿主文本预览的同一限制 |

首版仅认领 `tcl` 后缀，不改动任何其它后缀的预览行为。渲染器下拉里本插件为首选，
「文本」兜底仍可选。

## 界面与状态

- 按钮状态：`复制全文` → `正在读取…`（禁用）→ `已复制`（约 1 秒后恢复）。
- 读取期间再次点击会被忽略。
- 加载文本超过 2 MiB 时关闭行号，避免逐行 DOM 过大；复制不受影响。
- 剪贴板优先使用 `navigator.clipboard.writeText`，不可用时退回 `execCommand('copy')`。
- 内置中英文案；宿主没有 `locale` 服务时退回中文。

## 已知限制

- 只认领 `.tcl`，不支持 `.sdc`、`.upf` 等其它后缀。
- 无 BOM 的 UTF-16 会按 UTF-8 解码，结果为乱码。
- 不支持 GBK/GB2312 等编码的自动识别。
- 没有键盘快捷键；复制入口只有工具栏按钮。
- 复制失败与读取失败共用「读取失败」提示，暂未细分剪贴板错误。

## 安装

在本仓库根目录之外执行（把路径替换为实际路径）：

```sh
dsh plugin --profile web add /绝对路径/dsh-plugin/plugins/dsh-tcl-copy
```

生效条件：host 半变化需重启 DSH Desktop；仅 client 半变化硬刷新浏览器（Ctrl+Shift+R）。

卸载 / 禁用：

```sh
dsh plugin --profile web remove dsh-tcl-copy
```

禁用后 `.tcl` 自动回到内置纯文本预览。

## 开发与测试

```sh
npm test
npm run check
npm run check:public
```

接口说明见 [docs/development.md](../../docs/development.md)，手工验收清单见
[docs/testing.md](../../docs/testing.md)。

## 已验证宿主

- DSH Desktop 0.1.7 代次，profile `web`。
- 依赖的内置契约（`documentPreviews.register`、`slots.register({ locale })`、
  `ctx.remote.workspaceFiles.readBytes`、`CodeBlock`）已在运行时验证。

## 排查

若更新后仍无按钮，按顺序检查：

1. 浏览器控制台有无 `[dsh-tcl-copy] required services unavailable` 警告；
2. 渲染器下拉里是否出现「TCL 文本」；
3. 是否有重复注册导致宿主启动失败（可用插件恢复界面 / 安全模式）。

## 许可证

MIT。本插件为非官方个人插件，与 DeepSeek / DataElement 无关。
