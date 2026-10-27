# dsh-memo-local

依附于 DSH 的个人备忘库：在全局侧栏维护单行待办，每天在固定时段通过
Windows 通知提醒。它与对话和 Session 的 todo 无关，数据只保存在本机。

本插件是 [dsh-plugin](../../README.md) 仓库的一部分，以 MIT 许可证发布，通过本地路径安装。
文中的仓库内文档链接只在仓库中有效。

## 为什么需要它

DSH 自带的 todo 属于某个会话，换会话就看不到。本插件提供一个始终可用的全局清单，
并在工作时段把未完成事项推到 Windows 通知里。设计与取舍见 [DESIGN.md](DESIGN.md)。

## 行为

### 备忘清单

- 侧栏底部区域出现「备忘」入口，点开是全局面板，不依赖任何会话。
- 顶部输入框添加单行待办；按 Enter 或「添加」提交，空内容不会保存。
- 每行可以勾选完成、编辑、删除；未完成项排在前面，已完成项沉底并加删除线。
- 数据写入 `localStorage` 的 `dsh-memo.v1` 键。Desktop 的 localStorage 由 preload
  代理到 profile 的 `desktop-storage.json`，跨重启保留；切换 profile 会换成另一份库。

### 提醒

每天固定 13 个提醒点：

| 时段 | 提醒点 |
|---|---|
| 上午 | 09:30、10:00、10:30、11:00、11:30 |
| 下午 | 14:00、14:30、15:00、15:30、16:00、16:30、17:00、17:30 |

09:00、12:00、13:30、18:00 不是提醒点；周末与工作日一样提醒。

- 到点后弹出**静音**的 Windows 原生通知，只有正文，不带标题。
- 正文逐行列出所有未完成事项，不加额外说明文字。
- 没有任何未完成项时，正文显示「暂无待办」。
- 点击通知会恢复并聚焦 DSH，同时打开备忘面板。
- 面板里的「启用提醒」开关可以随时暂停；「测试通知」不受开关影响，
  用来立即验证通知链路。
- 同一提醒点用 `dsh-memo.last-slot.v1` 去重，避免同一窗口重复弹出。

## 已知限制

- 只在 DSH 运行时提醒；完全退出 DSH 后不会提醒。
- 隐藏到托盘时 Chromium 会节流后台定时器，通知可能晚于目标时间；
  超过 2 分钟的迟到提醒会跳过。
- 系统睡眠期间不会提醒；唤醒后跨过的提醒点不补报。
- Windows 专注助手或系统通知设置可能拦截通知，插件无法绕过。
- 备忘是单行文本，不支持分类、到期日、富文本或跨设备同步。
- 浏览器版 DSH 使用浏览器通知权限；原生通知桥只在 Desktop 中可用。
- 多窗口可能重复通知：Desktop 的 localStorage 在各渲染进程内有独立内存副本，
  去重键的跨窗口同步并不即时。

## 宿主兼容

- 目标宿主：DSH Desktop 0.12.0 代次，内核 `@deepseek-ai/dsh` 0.2.0-rc.2，profile `web`。
- 核对日期：2026-10-20；已在 Windows 的 DSH Desktop 0.12.0 安装并手工验证通过。
- 依赖的内置契约：
  - `sidebar.panellist` 与 `main` keyed slot；
  - `slots.register({ locale, inject })` 与 `ctx.effect`；
  - `ctx.layout.selectPanel`；
  - Desktop preload 注入的 `window.Notification` 原生通知桥；
  - Desktop localStorage 持久化（`desktop-storage.json`）。
- 其它版本未逐一验证；升级 DSH 后按
  [docs/development.md](../../docs/development.md) 的兼容检查清单复核。

## 安装

安装、卸载与生效条件见 [docs/local-install.md](../../docs/local-install.md)。

## 开发与测试

- 自动测试与校验命令：[docs/testing.md](../../docs/testing.md)
- 本插件手工验收与边界用例：[TESTING.md](TESTING.md)
- 接口与包契约：[docs/development.md](../../docs/development.md)

## 排查

1. 侧栏没有「备忘」：检查浏览器控制台是否有
   `[dsh-memo-local] required services unavailable`，确认插件已启用并重启过 DSH。
2. 到点没有通知：先点面板里的「测试通知」。如果测试也没有，检查 Windows
   通知设置与专注助手；控制台若出现 `[dsh-memo-local] notification failed`，
   说明通知桥不可用。
3. 备忘数据不见了：确认没有切换 profile，也没有删除 profile 下的
   `desktop-storage.json`。
4. 同一条提醒弹了两次：通常是有多个 DSH 窗口；关闭多余窗口后重试。

## 许可证

MIT。本插件为非官方个人插件，与 DeepSeek / DataElement 无关。
