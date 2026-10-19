# AGENTS.md

## 仓库

- 个人使用的 DSH 插件 monorepo，公开但**不在 npm 发布**。
- `plugins/<包名>/` 每个目录是一个独立插件包。
- `local/` 是本地取证目录，已 gitignore，禁止提交。

## 常用命令

```sh
npm test
npm run check
npm run check:public
npm run new -- <name>
```

## 个人习惯

### 提交

- 提交前查看最近的 `git log`，commit 的内容、语言、格式和详略沿用历史提交。
- 一个提交只做一件逻辑上的事；说明为什么，不逐文件罗列 diff。
- 不添加 `Co-Authored-By` 等归属尾注。

### 文档

- `README.md` 与 `docs/` 只保留当前最新状态的正面描述：现在支持什么、怎么用、当前边界是什么。
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
- 新增或修改插件后运行 `npm run check` 和 `npm test`。

## 公开仓库红线

- 不提交 `local/`、日志、`.env`、密钥、token。
- 不提交真实机器路径、用户名、邮箱、主机名、内部项目名。
- 不提交从 `app.asar` 提取的源码或官方 README 全文；资料索引写在
  `docs/reference.md`。
- 测试夹具使用合成数据，不使用真实 EDA 设计文件。
- 借用第三方代码必须在 `THIRD_PARTY_NOTICES.md` 登记。
- 首次推送前运行 `npm run check:public`。

## 文档分工

- 用户文档：插件自己的 `README.md`
- 开发文档：`docs/development.md`
- 本地安装：`docs/local-install.md`
- 测试：`docs/testing.md`
- 设计记录：`docs/plugins/<name>/design.md`
