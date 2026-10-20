# __PLUGIN_NAME__

在 DSH 右侧栏预览 `__PLUGIN_EXTENSIONS_TEXT__` 文件。

本插件由 [dsh-plugin](../../README.md) 仓库的模板生成，以 MIT 许可证发布。
文中的仓库内文档链接只在仓库中有效。

## 行为

- 认领 `__PLUGIN_EXTENSIONS_TEXT__` 后缀，作为首选渲染器。
- 复用内置 `text-pages` 分页加载与 `CodeBlock`（行号、软换行、明暗主题）。
- 使用 `CodeBlock` 自带的复制按钮，复制的是已加载文本。完整文件复制方案见
  [docs/development.md](../../docs/development.md) 的「读取模式」与「复制到剪贴板」。

## 宿主兼容

- 目标宿主：<填写 DSH Desktop 版本与内核版本>。
- 核对日期：<填写日期>。
- 依赖的内置契约：<填写实际使用的接口与原语>。

## 安装

安装、卸载与生效条件见 [docs/local-install.md](../../docs/local-install.md)。

## 开发与测试

- 自动测试与校验命令：[docs/testing.md](../../docs/testing.md)
- 本插件手工验收：[TESTING.md](TESTING.md)
- 设计与取舍：[DESIGN.md](DESIGN.md)
- 接口与包契约：[docs/development.md](../../docs/development.md)

## 已知限制

- 仅认领 `__PLUGIN_EXTENSIONS_TEXT__`。
- 复制按钮复制的是已加载部分，不是完整文件。
- 非 UTF-8 编码按 UTF-8 解码，可能乱码。

## 许可证

MIT。非官方个人插件，与 DeepSeek / DataElement 无关。
