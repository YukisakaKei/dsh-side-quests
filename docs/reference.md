# 参考资料

本仓库不提交第三方文档或源码。需要离线查阅时，将资料放在 `local/reference/`
（已 gitignore），不要把全文复制进 `docs/`。

## 上游包

| 包 | 用途 |
|---|---|
| `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` | 右侧栏文档预览、渲染器注册、正文 slot、分页读取 |
| `@deepseek-ai/dsh-client-ui-primitives` | `CodeBlock` 等共享 UI 原语 |
| `@deepseek-ai/dsh-client-ui-slots` | slot 注册与注入 |
| `@deepseek-ai/dsh-client-locale` | 中英文案注册与绑定 |
| `@deepseek-ai/dsh-client-runtime` | 浏览器半运行时 |
| `@deepseek-ai/dsh-plugin-manager` | 插件安装、启用、卸载与版本兼容豁免 |
| `@deepseek-ai/dsh-client-ui-plugin-manager` | Web 侧栏插件管理页 |
| `@deepseek-ai/dsh-cmdline` | 应用自有命令行参数 |

以宿主实际安装的版本为准。升级 DSH 后重新核对接口，不要假定旧字段仍然存在。

## 本地资料目录

```text
local/
├─ reference/
│  ├─ official/       # 官方包 README 副本（不提交）
│  └─ readmes/        # 上架插件 README 范例（不提交）
├─ notes/             # 原始实施计划、未脱敏笔记（不提交）
└─ screenshots/       # 未脱敏截图（不提交）
```

## 读取 asar

仓库提供只读工具，需要 Node 22：

```sh
node scripts/asar/asar-tool.cjs list <app.asar> <filter>
node scripts/asar/asar-tool.cjs get  <app.asar> <innerPath> <outFile>
```

只把提取结果放到 `local/reference/`，不要提交到仓库。
