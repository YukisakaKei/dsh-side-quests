import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientPath = path.join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(clientPath, 'utf8')

function createHarness() {
  let bodyComponent = null
  let capturedOnClick = null
  let setStateLog = []

  const React = {
    createElement(type, props, ...children) {
      if (type === 'button' && props && typeof props.onClick === 'function') {
        capturedOnClick = props.onClick
      }
      return { type, props, children }
    },
    useState(initial) {
      return [initial, (v) => setStateLog.push(v)]
    },
    useRef(initial) {
      return { current: initial }
    },
    useEffect() {}
  }

  const primitives = {
    CodeBlock: function CodeBlock() {},
    Tooltip: function Tooltip() {},
    IconCopyOutlineRegular: function IconCopy() {},
    IconCheckOutlineRegular: function IconCheck() {}
  }

  function mockRequire(id) {
    if (id === 'react') return React
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
    throw new Error('unexpected require: ' + id)
  }

  let plugin = null
  const win = {
    __ModuleLoader__: {
      load: ({ factory }) => {
        plugin = factory(mockRequire)
      }
    }
  }
  new Function('window', source)(win)

  let readArgs = null
  let readResult = { ok: true, value: { data: new Uint8Array() } }
  let slotFactory = null

  const services = {
    documentPreviews: { register: () => () => {} },
    remote: {
      workspaceFiles: {
        readBytes: (sessionId, p, opts, signal) => {
          readArgs = { sessionId, p, opts, signal }
          return Promise.resolve(readResult)
        }
      }
    },
    locale: {
      register: () => {},
      bind: (ns) => (key) => ns + '.' + key
    },
    slots: {
      inject: (name, factory) => {
        slotFactory = factory
        return () => {}
      },
      register: (opts, body) => {
        bodyComponent = body
        return { opts, body }
      }
    }
  }

  const ctx = {
    get: (name) => services[name],
    effect: (fn) => {
      fn()
    }
  }

  plugin.apply(ctx)
  slotFactory()

  return {
    get bodyComponent() {
      return bodyComponent
    },
    get onClick() {
      return capturedOnClick
    },
    get stateLog() {
      return setStateLog
    },
    get readArgs() {
      return readArgs
    },
    set readResult(value) {
      readResult = value
    },
    reset() {
      capturedOnClick = null
      setStateLog = []
      readArgs = null
    }
  }
}

test('copy flow copies exact full text, preserves CRLF and trailing newline', async () => {
  const harness = createHarness()
  assert.ok(harness.bodyComponent, 'body component not registered')

  let clipboardText = null
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: (text) => {
          clipboardText = text
          return Promise.resolve()
        }
      }
    }
  })

  const fileText = 'line1\r\nline2\r\n'
  harness.readResult = {
    ok: true,
    value: { data: new Uint8Array(Buffer.from(fileText, 'utf8')) }
  }

  const props = {
    resourceAddress: 'dsh-resource://file/session/sess-123/designs/test.tcl',
    content: { kind: 'text', text: 'line1\r\nline2', eof: true },
    wrap: false,
    scrollportRef: () => {},
    t: (key) => key
  }

  harness.bodyComponent(props)
  assert.equal(typeof harness.onClick, 'function', 'onClick not captured')

  harness.onClick()
  await new Promise((resolve) => setTimeout(resolve, 50))

  assert.equal(harness.readArgs.sessionId, 'sess-123')
  assert.equal(harness.readArgs.p, 'designs/test.tcl')
  assert.equal(clipboardText, fileText)
  assert.deepEqual(harness.stateLog.slice(0, 2), ['reading', 'copied'])
})

test('too-large read does not copy anything', async () => {
  const harness = createHarness()
  let clipboardText = null
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: (text) => {
          clipboardText = text
          return Promise.resolve()
        }
      }
    }
  })

  harness.readResult = {
    ok: false,
    error: { code: 'workspace-file/too-large', details: {} }
  }

  const props = {
    resourceAddress: 'dsh-resource://file/session/sess-123/designs/test.tcl',
    content: { kind: 'text', text: '', eof: true },
    wrap: false,
    scrollportRef: () => {},
    t: (key) => key
  }

  harness.bodyComponent(props)
  harness.onClick()
  await new Promise((resolve) => setTimeout(resolve, 30))

  assert.deepEqual(harness.stateLog.slice(0, 2), ['reading', 'tooLarge'])
  assert.equal(clipboardText, null)
})

test('binary content (NUL byte) is rejected', async () => {
  const harness = createHarness()
  let clipboardText = null
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: (text) => {
          clipboardText = text
          return Promise.resolve()
        }
      }
    }
  })

  harness.readResult = {
    ok: true,
    value: { data: new Uint8Array([0x61, 0x00, 0x62]) }
  }

  const props = {
    resourceAddress: 'dsh-resource://file/session/sess-123/designs/test.tcl',
    content: { kind: 'text', text: '', eof: true },
    wrap: false,
    scrollportRef: () => {},
    t: (key) => key
  }

  harness.bodyComponent(props)
  harness.onClick()
  await new Promise((resolve) => setTimeout(resolve, 30))

  assert.deepEqual(harness.stateLog.slice(0, 2), ['reading', 'binary'])
  assert.equal(clipboardText, null)
})

test('UTF-8 BOM is stripped and text is intact', async () => {
  const harness = createHarness()
  let clipboardText = null
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: (text) => {
          clipboardText = text
          return Promise.resolve()
        }
      }
    }
  })

  const bomText = 'set a 1\n'
  harness.readResult = {
    ok: true,
    value: {
      data: new Uint8Array(
        [0xef, 0xbb, 0xbf].concat(Array.from(Buffer.from(bomText, 'utf8')))
      )
    }
  }

  const props = {
    resourceAddress: 'dsh-resource://file/session/sess-123/designs/test.tcl',
    content: { kind: 'text', text: '', eof: true },
    wrap: false,
    scrollportRef: () => {},
    t: (key) => key
  }

  harness.bodyComponent(props)
  harness.onClick()
  await new Promise((resolve) => setTimeout(resolve, 30))

  assert.equal(clipboardText, bomText)
  assert.equal(harness.stateLog[1], 'copied')
})

test('body mirrors the built-in code toolbar instead of a custom toolbar', () => {
  const harness = createHarness()
  const tree = harness.bodyComponent({
    resourceAddress: 'dsh-resource://file/session/sess-123/designs/test.tcl',
    content: { kind: 'text', text: 'set a 1', eof: true },
    wrap: false,
    scrollportRef: () => {},
    t: (key) => key
  })

  assert.equal(tree.props.className, 'dsh-tcl-copy-root')
  assert.equal(tree.props['data-code-preview'], true)

  const header = tree.children[0]
  assert.equal(header.props.className, 'dsh-tcl-copy-header')
  const language = header.children[0].children[0]
  assert.equal(language.props.className, 'dsh-tcl-copy-language')
  assert.equal(language.children[0], 'codeBlock.title')

  const actions = header.children[1]
  const tooltip = actions.children[1]
  assert.equal(tooltip.type.name, 'Tooltip')
  assert.equal(tooltip.props.label, 'copy')

  const button = tooltip.children[0]
  assert.equal(button.type, 'button')
  assert.equal(button.props.className, 'dsh-tcl-copy-action')
  assert.equal(button.props['aria-label'], 'copy')
  assert.equal(button.children[0].type.name, 'IconCopy')
  assert.equal(button.children[0].props.size, 14)

  assert.equal(tree.children[1].type.name, 'CodeBlock')
  assert.equal(tree.children[1].props.showHeader, false)
})
