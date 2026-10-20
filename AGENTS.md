# AGENTS.md

## 仓库

- 个人使用的 DSH 插件 monorepo，公开但**不在 npm 发布**。
- `plugins/<包名>/` 每个目录是一个独立插件包。
- `local/` 是本地取证目录，已 gitignore，禁止提交。

## 常用命令

测试与校验命令见 [docs/testing.md](docs/testing.md)；新建插件见
[docs/development.md](docs/development.md)。

## 个人习惯

### 提交

- 提交前查看最近的 `git log`，commit 的内容、语言、格式和详略沿用历史提交。
- 一个提交只做一件逻辑上的事；说明为什么，不逐文件罗列 diff。
- 不添加 `Co-Authored-By` 等归属尾注。

### 文档

- `README.md`、`docs/` 与插件文档只保留当前最新状态的正面描述：现在支持什么、怎么用、当前边界是什么。
- 不写历史版本、废弃方案、迁移过程或“以前……现在……”的对比；版本历史只放 `CHANGELOG.md`。
- `AGENTS.md` 的约束条目和 `CHANGELOG.md` 的版本记录不受“只保留正向描述”限制。

### 代码

- 代码简洁明了，直接表达当前需求，不为假设中的未来需求增加抽象。
- 对同一事务的防御型代码只出现一次；内部代码信任已经校验过的结果，不重复判空或回退。
- 文件开头可以有说明性注释；除此之外，所有注释不得超过一行。
- 确需多行注释时，写完后向用户说明为什么单行表达不了。

## 插件规则

- 每个插件自包含，不在 `plugins/` 之间共享运行时包。
- host 半 `lib/index.js` 永不抛错；所有注册放在 `ctx.effect` 中。
- client 半使用 `window.__ModuleLoader__.load`，`id` 与包名一致。
- `documentPreviews` definition id 与正文 slot key 必须一致。
- 不引入 `fs-write` / `shell` / `network` 能力；文件读取走宿主 `remote` 接口。
- 新增或修改插件后按 [docs/testing.md](docs/testing.md) 运行校验与测试。

## 公开仓库红线

- 不提交 `local/`、日志、`.env`、密钥、token。
- 不提交真实机器路径、用户名、邮箱、主机名、内部项目名。
- 不提交从 `app.asar` 提取的源码或官方 README 全文；资料索引写在
  `docs/reference.md`。
- 测试夹具使用合成数据，不使用真实 EDA 设计文件。
- 借用第三方代码必须在 `THIRD_PARTY_NOTICES.md` 登记。
- 首次推送前按 [docs/testing.md](docs/testing.md) 运行公开性扫描。

## 文档树与单一来源

- 同一事实只在一个文件描述；其它文件链接，不复制。
- 上级文档引用下级文档；同一目录下的文档不互相引用（`README.md` 与 `docs/README.md` 作为索引例外）。
- 跨层级链接只指向事实归属文件，不复述内容。

| 事实 | 归属 |
|---|---|
| 仓库规则、公开红线 | `AGENTS.md` |
| 仓库索引、插件列表、结构树 | `README.md` |
| 跨插件开发接口 | `docs/development.md` |
| 安装、卸载、生效条件 | `docs/local-install.md` |
| 测试命令、通用测试数据规则 | `docs/testing.md` |
| 上游资料、`local/` 布局、asar 工具 | `docs/reference.md` |
| 插件行为、限制、宿主兼容、排查 | `plugins/<name>/README.md` |
| 插件设计 | `plugins/<name>/DESIGN.md` |
| 插件手工验收 | `plugins/<name>/TESTING.md` |
| 插件版本历史 | `plugins/<name>/CHANGELOG.md` |
| 插件当前版本 | `plugins/<name>/package.json` |

- `package-lock.json` 由 npm 生成，版本以 `package.json` 为准，不手改。
- 每个插件在 README 的「宿主兼容」中记录自己适配的 DSH 版本，不写进仓库级文档。
