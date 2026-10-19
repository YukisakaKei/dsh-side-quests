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
