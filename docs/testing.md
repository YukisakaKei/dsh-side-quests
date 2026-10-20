# 测试

## 自动测试

在仓库根目录执行：

```sh
npm test
npm run check
npm run check:public
```

- `npm test`：运行 `plugins/*/test/` 下的测试。
- `npm run check`：校验插件包契约（`package.json`、`cordis.patch.yml`、
  host/client 入口、id 一致性）。
- `npm run check:public`：扫描工作树中可能泄露的个人路径、邮箱和密钥。

## 测试数据规则

- 只使用合成内容，不使用真实 EDA 工程文件。
- 测试文件名与内容不要包含公司名、项目名、真实路径或人名。
- 需要大文件时在测试内生成，不要提交大文件。

## 插件验收

各插件的手工验收清单、边界用例与剪贴板核对由插件自己拥有：

- [dsh-tcl-copy](../plugins/dsh-tcl-copy/TESTING.md)
