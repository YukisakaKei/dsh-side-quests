# DSH 插件开发指南

本文记录本仓库实际使用的 DSH 插件接口与约定。内容以已验证的宿主版本为准；
接口是宿主提供的公开扩展点，具体实现可能随 DSH 版本变化。

## 宿主版本

- 当前核对：DSH Desktop 0.12.0 代次，内核 `@deepseek-ai/dsh` 0.2.0-rc.2，profile `web`。
- 浏览器半依赖的模块加载器、`documentPreviews`、正文 slot、
  `remote.workspaceFiles.readBytes`、`CodeBlock` 与 `Tooltip` 已按该版本的客户端包核对。
- 其它版本未逐一验证；升级 DSH 后应重新检查本指南与插件。

## 插件包契约

一个插件是一个独立 npm 包，至少包含：

```text
plugins/<package-name>/
├─ package.json
├─ cordis.patch.yml
├─ README.md
├─ CHANGELOG.md
├─ lib/
│  ├─ index.js          # host 半
│  └─ client.js         # 浏览器半
└─ test/
```

`package.json` 的关键字段：

```jsonc
{
  "name": "dsh-example",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./client": "./lib/client.js",
    "./package.json": "./package.json"
  },
  "files": [
    "lib",
    "cordis.patch.yml",
    "README.md",
    "CHANGELOG.md"
  ],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-slots",
        "@deepseek-ai/dsh-client-ui-primitives"
      ]
    }
  },
  "engines": { "node": ">=22" }
}
```

- `private: true`：本仓库不发布 npm，防止误执行 `npm publish`；本地路径安装不受影响。
- `dsh.bundle.patch`：安装时把 `cordis.patch.yml` 的 `insert` 行挂进 profile。
- `dsh.client.platform: "web"` + `exports["./client"]`：宿主发现并下发浏览器半。
- `dsh.client.inject` 是**包级**加载顺序声明，不是服务级依赖。
- 平台包必须由宿主提供，不能打包进插件，否则会出现重复实例。

`cordis.patch.yml`：

```yaml
- insert:
    - id: dsh-example
      name: dsh-example
```

不要在 profile 的 patch 里再手动 mount 同一插件，否则会双挂载。

## Host 半

host 半只需要一个永不抛错的空实现：

```js
export const name = 'dsh-example'
export const inject = []
export function apply(ctx) {}
```

DSH 启动是全有全无的：任一插件抛错都可能让整个宿主起不来。即使不需要宿主逻辑，
也保留这个空半，避免加载器解析 `main` 时失败。所有实际逻辑放在浏览器半。

## 浏览器半

浏览器半不是普通 ESM，而是注册到宿主的模块加载器：

```js
window.__ModuleLoader__.load({
  id: 'dsh-example',
  factory: (require) => {
    const React = require('react')

    let primitives = null
    try {
      primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    } catch {
      primitives = null
    }

    function apply(ctx) {
      // 注册逻辑
    }

    return {
      name: 'dsh-example',
      inject: ['slots', 'locale', 'remote', 'remote.workspaceFiles', 'documentPreviews'],
      apply
    }
  }
})
```

约定：

- `id` 与包名一致。
- `require` 由宿主提供，只能解析 `react` 和宿主已加载的平台包，不是 Node 的 `require`。
- 平台包取不到时不要抛错；打印 warn 并跳过注册。
- 所有注册都放进 `ctx.effect(() => ...)`，卸载时自动回收。

## 服务注入

`apply(ctx)` 需要的服务：

| 服务 | 用途 | 必要性 |
|---|---|---|
| `slots` | 注册预览正文组件 | 必需 |
| `documentPreviews` | 注册文件预览渲染器 | 预览类插件必需 |
| `remote.workspaceFiles` | 读取文件字节或文本页 | 复制/自读时需要 |
| `locale` | 中英文案 | 建议 |

读取服务时优先 `ctx.get(name)`，失败再退回 `ctx[name]`，并在缺失时打印一条
`[plugin-name] required services unavailable` 警告后直接返回。不要因为服务缺失而抛错。

## 注册文档预览渲染器

```js
ctx.effect(() =>
  ctx.documentPreviews.register({
    id: 'dsh-example/preview',   // 全局唯一
    extensions: ['tcl'],         // 只认领自己的后缀
    priority: 'extension',       // 第三方实现优先于内置兜底
    title: () => t('title'),     // 渲染器下拉名称
    loading: 'text-pages',       // 分页读取
    wrap: true                   // 参与换行开关
  })
)
```

排序规则：`priority: 'builtin'` 为 rank 0，其它为 rank 1；同 rank 下按后缀匹配长度、
再按注册顺序排序。第三方使用 `extension` 即可排在纯文本兜底之前。不要认领宽泛后缀，
避免抢走其它文件的预览。

## 注册正文 slot

```js
ctx.effect(() =>
  ctx.slots.inject('sidebar.right.tab.document', () =>
    ctx.slots.register(
      {
        name: 'sidebar.right.tab.document',
        key: 'dsh-example/preview',  // 必须等于 definition.id
        locale: 'dshExample'         // 决定 props.t 的字典
      },
      Body
    )
  )
)
```

正文组件常用 props：

| prop | 说明 |
|---|---|
| `resourceAddress` | `dsh-resource://file/session/<sessionId>/<编码路径>` |
| `content` | 已加载内容；`text-pages` 模式下为 `{ kind: 'text', text, pages, eof }` |
| `wrap` | 当前换行开关状态 |
| `scrollportRef` | 必须挂到真正滚动的元素上 |
| `t` | 绑定到注册时 `locale` 的翻译函数 |
| `useTabInfo` | 可选 hook，用于拿 tab 生命周期与取消信号 |

## 读取模式

| 模式 | 谁读取 | 正文收到的 `content` |
|---|---|---|
| `text-pages` | 内置共享分页读取器，随滚动加载 | `{ kind: 'text', text, pages, eof }` |
| `bytes-complete` | 内置，读完整字节 | `{ kind: 'bytes', data }` |
| `renderer` | 插件自己 | `{ kind: 'renderer', revision, loaded, failed, reload }` |

`text-pages` 的 `content.text` 只是**已加载部分**，不一定等于全文。需要精确全文时，
在点击时调用：

```js
ctx.remote.workspaceFiles.readBytes(sessionId, path, {}, signal)
```

然后解码 `result.value.data`。注意：

- `readBytes` 返回 `{ ok, value: { data }, error }`；
- 文件超过宿主上限时 `error.code` 为 `workspace-file/too-large`；
- 解码需处理 UTF-8 BOM、UTF-16 BOM；
- 检测到 NUL 字节时按二进制处理，不复制；
- 使用 tab 的取消信号，组件卸载后不要更新状态。

## 复制到剪贴板

优先 `navigator.clipboard.writeText`，失败时退回 `document.execCommand('copy')`。
复制失败与读取失败要区分提示；按钮可以在读取期间禁用，成功后短暂显示「已复制」。

## 生命周期与容错

- `apply`、模块顶层、组件渲染都不要抛错。
- 所有注册通过 `ctx.effect` 持有。
- 服务缺失时打印 warn 并跳过注册，宿主其它功能不受影响。
- 读取失败只更新组件状态，不抛出。
- 重复注册同一个 `definition.id` 会让宿主启动失败，务必保证 id 唯一。

## 共存

- 只认领自己的后缀，不改变其它后缀的预览行为。
- 插件禁用或卸载后，目标后缀应自动回到内置预览。
- 渲染器下拉中，本插件为首选，纯文本兜底仍可选。

## 版本兼容检查

升级 DSH 后按顺序检查：

1. 浏览器控制台是否有 `[plugin-name] required services unavailable`。
2. 渲染器下拉里是否仍出现插件标题。
3. `documentPreviews.register` 的字段、正文 props、slot 名是否变化。
4. `CodeBlock` 的 props 与样式上下文是否变化。
5. 大文件、分页加载、复制全文是否仍正常。

上游包的本地副本与 asar 提取物放在 `local/reference/`，只供本机查阅，不提交。
索引见 [reference.md](reference.md)。

## 版权与公开仓库注意事项

- 本文只记录接口事实与本仓库自己的实现，不复制宿主源码。
- 不要把 `app.asar` 提取物、官方 README 全文提交到公开仓库。
- 借用第三方代码时在 `THIRD_PARTY_NOTICES.md` 登记。
- 文档与测试中不要出现真实机器路径、用户名、内部项目名或真实设计数据。
