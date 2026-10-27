# dsh-plugin

个人使用的 DSH 插件集合。仓库公开、源码可下载；插件不发布到 npm，通过本地路径安装。

## 插件

| 插件 | 说明 |
|---|---|
| [dsh-memo-local](plugins/dsh-memo-local/README.md) | 全局面板维护独立待办，固定时段弹 Windows 通知提醒 |
| [dsh-tcl-copy](plugins/dsh-tcl-copy/README.md) | 右侧栏预览 `.tcl` 时一键复制全文 |

每个插件的文档都在自己的目录下：README 记录行为、限制、宿主兼容与排查；
DESIGN 记录设计与取舍；TESTING 记录手工验收；CHANGELOG 记录版本历史。

## 使用

- 安装、卸载与生效条件：[docs/local-install.md](docs/local-install.md)
- 测试与校验命令：[docs/testing.md](docs/testing.md)
- 接口、包契约与新建插件：[docs/development.md](docs/development.md)
- 共享文档索引：[docs/README.md](docs/README.md)

## 仓库结构

```text
dsh-plugin/
├─ plugins/              # 每个子目录 = 一个自包含插件包及其文档
├─ docs/                 # 跨插件共享的开发、安装、测试与参考资料
├─ scripts/              # 校验、模板生成、asar 只读工具
├─ templates/            # 新插件模板
├─ local/                # 本地取证资料，已 gitignore，不提交
└─ package.json          # private workspace 根
```

## 规则与版权

- 仓库规则、提交约定与公开红线见 [AGENTS.md](AGENTS.md)。
- 许可证见 [LICENSE](LICENSE)；第三方代码归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 本仓库不包含 DSH 源代码；运行时依赖由 DSH 宿主提供。
- 本项目为个人使用的非官方插件，与 DeepSeek / DataElement 无关。DSH、DeepSeek
  等名称归其各自所有者所有。
