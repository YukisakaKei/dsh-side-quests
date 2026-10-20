# dsh-plugin

个人使用的 DSH 插件集合。仓库公开、源码可下载；插件**不发布到 npm**，通过本地路径安装。

## 插件

| 插件 | 说明 | 状态 |
|---|---|---|
| [dsh-tcl-copy](plugins/dsh-tcl-copy/) | 右侧栏预览 `.tcl` 时一键复制全文 | 0.1.1，适配 DSH Desktop 0.12.0（内核 0.2.0-rc.2） |

## 安装

在仓库外执行：

```sh
dsh plugin --profile web add /绝对路径/dsh-plugin/plugins/dsh-tcl-copy
```

生效条件：

- host 半变化：重启 DSH Desktop；
- 仅 client 半变化：浏览器硬刷新（Ctrl+Shift+R）。

卸载：

```sh
dsh plugin --profile web remove dsh-tcl-copy
```

更多细节见 [docs/local-install.md](docs/local-install.md)。

## 仓库结构

```text
dsh-plugin/
├─ plugins/          # 每个子目录 = 一个独立插件包
├─ docs/             # 开发、安装、测试、参考资料
├─ scripts/          # 校验、模板生成、asar 只读工具
├─ templates/        # 新插件模板
├─ local/            # 本地取证资料，已 gitignore，不提交
└─ package.json      # private workspace 根
```

## 开发

```sh
npm test                 # 运行所有插件测试
npm run check            # 校验插件包契约
npm run check:public     # 扫描个人路径、邮箱、密钥
npm run new -- dsh-xxx   # 从模板生成新插件
```

开发约定与公开仓库红线见 [AGENTS.md](AGENTS.md)，接口说明见
[docs/development.md](docs/development.md)。

## 隐私与版权

- `local/` 用于存放官方文档副本、asar 提取物、未脱敏笔记和截图，已被 gitignore。
- 文档与测试中不得出现真实机器路径、用户名、内部项目名或真实 EDA 设计数据。
- 不提交从 DSH 安装包提取的源码，不整段复制官方 README。
- 本仓库不包含 DSH 源代码；运行时依赖由 DSH 宿主提供。
- 本项目为个人使用的非官方插件，与 DeepSeek / DataElement 无关。DSH、DeepSeek
  等名称归其各自所有者所有。

## 许可证

MIT，见 [LICENSE](LICENSE)。第三方代码归属见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
