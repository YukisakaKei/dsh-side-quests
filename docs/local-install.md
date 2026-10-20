# 本地安装与调试

本仓库的插件不发布到 npm，使用本地路径安装到 DSH profile。本文只示范本地路径形式；
未发布的插件不使用包名形式。

## 安装

在仓库外执行，把占位符替换为实际包名与仓库绝对路径：

```sh
dsh plugin --profile web add /绝对路径/dsh-plugin/plugins/<plugin-name>
```

Windows 路径示例：

```sh
dsh plugin --profile web add "D:/path/to/dsh-plugin/plugins/<plugin-name>"
```

安装后：

- host 半（`lib/index.js`、`cordis.patch.yml`、`package.json`）变化：退出并重启 DSH Desktop；
- 仅浏览器半（`lib/client.js`）变化：浏览器硬刷新（Ctrl+Shift+R）。

## 验证

1. 打开一个目标后缀的文件。
2. 右侧栏的渲染器下拉里出现插件标题。
3. 浏览器控制台无服务缺失警告。
4. 插件专属的验收项见对应插件的 `TESTING.md`。

## 卸载

```sh
dsh plugin --profile web remove <plugin-name>
```

卸载或禁用后，目标后缀应自动回到内置预览。

## 临时禁用

在 profile 的 `cordis.patch.yml` 中给对应行加 `disabled`：

```yaml
- id: <plugin-name>
  disabled: true
```

具体 profile 路径由 DSH 管理，不要把本机路径写进仓库文档。

## 排查

| 现象 | 检查方向 |
|---|---|
| 没有插件控件 | 渲染器下拉是否有插件标题；控制台是否有服务缺失警告 |
| 仍是内置预览 | 注册是否成功、后缀是否写对、`priority` 是否写成 `builtin` |
| DSH 起不来 | 是否有重复 `definition.id`；`apply` 是否抛错；用插件恢复界面/安全模式 |
| 更新不生效 | host 半是否重启；client 半是否硬刷新 |

插件专属现象（预览渲染、复制结果、样式等）见对应插件的 README 排查段。
