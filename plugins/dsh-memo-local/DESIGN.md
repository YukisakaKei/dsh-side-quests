# dsh-memo-local 设计记录

## 问题

DSH 自带的 todo 属于单个 Session，切走会话就看不到；工作时段也缺少一个
“抬头看一眼未完成事项”的提醒入口。需要的不是会话任务管理，而是一个
依附于 DSH、独立于对话的轻量备忘库。

## 目标

- 全局面板维护单行待办，不依赖当前会话。
- 在固定的工作时段按整点/半点提醒；具体提醒点由用户行为定义。
- 提醒使用 Windows 原生通知，静音；点击通知回到 DSH 并打开备忘面板。
- 不引入 `fs-write` / `shell` / `network` 能力。

## 方案

纯浏览器半插件，host 半为空实现：

1. 向 `sidebar.panellist` 注册「备忘」入口，向 root 作用域的 `main`
   keyed slot 注册同 id 的全局面板。
2. `apply(ctx)` 中创建备忘 store 和提醒控制器；提醒控制器持有独立定时器，
   不依赖面板是否打开。
3. 备忘数据写入 `localStorage` 的 `dsh-memo.v1`。Desktop 的 preload 会把
   localStorage 代理到 profile 的 `desktop-storage.json`，因此数据跨重启保留，
   且不受普通浏览器站点数据清理影响。
4. 到点时以空标题调用 `new Notification('', { body, silent: true })`，正文逐行列出
   未完成事项。Desktop preload 把 `window.Notification` 替换成 IPC 通知桥，
   主进程用 Electron `Notification` 显示 Windows toast；点击时主进程恢复并聚焦窗口。
5. 通知的 `onclick` 再调用 `ctx.layout.selectPanel('dsh-memo-local')`，把面板带到前台。

## 提醒点

提醒点由固定规则生成：在 09:00–12:00、13:30–18:00 内取整点/半点，
排除 09:00、12:00、13:30、18:00 四个端点；每天所有日期一致。
代码中的 `SLOT_TIMES` 是这条规则的实现。

## 调度

- 用单次 `setTimeout` 指向下一个提醒点，触发后重新计算下一个；
  不用短间隔轮询，减少隐藏页节流的影响。
- 触发时如果当前时间比目标时间晚超过 2 分钟（睡眠、长时间节流），
  跳过该次提醒，避免在错误的时间弹旧消息。
- 提醒点用本地墙钟计算；系统时区变化后下一次调度自动跟随。
- 去重键 `dsh-memo.last-slot.v1` 记录最近一次已弹出的提醒点，
  同一窗口不会重复弹；多窗口的跨进程同步是尽力而为。

## 数据

```js
{
  version: 1,
  enabled: true,
  items: [
    { id, text, done, createdAt, updatedAt }
  ]
}
```

- 单行文本；空文本不保存。
- 读取时校验 `version`、`items` 数组和字段类型，损坏数据回退为空库。
- 写入失败只打印警告，不抛错。
- 提醒开关随数据一起保存。

## 关键取舍

| 取舍 | 选择 | 原因 |
|---|---|---|
| 提醒调度 | 客户端定时器 | 不引入 host 路由和额外服务；待办提醒允许秒级到分钟级延迟 |
| 后台准点 | 不做 host 定时 + SSE | 复杂度高，且本地回环路由需要额外复核仓库的 network 红线 |
| 弹窗形式 | 原生 Windows 通知 | 插件拿不到 `BrowserWindow`；通知在 DSH 隐藏到托盘时仍能出现 |
| 应用内弹窗 | 不做 | 只能在 DSH 可见时出现，且会打断当前操作 |
| 存储 | localStorage | 不触碰 fs-write；Desktop 已有落盘代理 |
| 数据模型 | 单行 checklist | 需求是提醒待办，不是富文本笔记 |
| 迟到提醒 | 超过 2 分钟跳过 | 避免睡眠唤醒后弹出过期提醒 |
| 多窗口 | localStorage 去重 | 单主窗口场景足够；跨窗口实时同步不保证 |

## 生命周期与容错

- store、提醒控制器和 slot 注册都由 `apply` 创建；定时器与订阅放在
  `ctx.effect` 中，插件禁用或卸载后自动停止。
- 服务和 primitives 缺失时打印一条警告并跳过注册，不影响宿主启动。
- localStorage、Notification、`selectPanel` 都是外部边界；失败只警告，
  不让异常冒泡到宿主的插件事务。
- 面板通过 `useSyncExternalStore` 订阅 store；编辑、勾选、删除后立即刷新。

## 安全与隐私

- 不声明 `fs-write` / `shell` / `network` 能力。
- 备忘只保存在本机 profile，不发送网络请求，无遥测。
- 数据是 profile 内的明文 JSON；不要在其中保存密钥。
- 测试与文档只使用合成数据，不包含真实路径或个人信息。

## 证据

宿主接口、preload 通知桥与 localStorage 持久化的原始核对材料保存在 `local/`，
不进入公开仓库。接口摘要见 [docs/development.md](../../docs/development.md)。
