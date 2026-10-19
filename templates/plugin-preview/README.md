# __PLUGIN_NAME__

在 DSH 右侧栏预览 `__PLUGIN_EXTENSIONS_TEXT__` 文件。

本插件由 [dsh-plugin](../../README.md) 仓库的模板生成，以 MIT 许可证发布，
通过本地路径安装，不发布到 npm。

## 行为

- 认领 `__PLUGIN_EXTENSIONS_TEXT__` 后缀，作为首选渲染器。
- 复用内置 `text-pages` 分页加载与 `CodeBlock`（行号、软换行、明暗主题）。
- 使用 `CodeBlock` 自带的复制按钮，复制的是已加载文本。
  如需复制完整文件（含末尾换行），参考仓库中的 `plugins/dsh-tcl-copy` 插件的
  `readBytes` 方案。

## 安装

```sh
dsh plugin --profile web add /绝对路径/dsh-plugin/plugins/__PLUGIN_NAME__
```

host 半变化需重启 DSH Desktop；仅 client 半变化硬刷新浏览器（Ctrl+Shift+R）。

卸载：

```sh
dsh plugin --profile web remove __PLUGIN_NAME__
```

## 开发

```sh
npm test
npm run check
```

接口说明见 [docs/development.md](../../docs/development.md)。

## 已知限制

- 仅认领 `__PLUGIN_EXTENSIONS_TEXT__`。
- 复制按钮复制的是已加载部分，不是完整文件。
- 非 UTF-8 编码按 UTF-8 解码，可能乱码。

## 许可证

MIT。非官方个人插件，与 DeepSeek / DataElement 无关。
