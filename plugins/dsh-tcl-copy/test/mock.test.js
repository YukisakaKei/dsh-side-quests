import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientPath = path.join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(clientPath, 'utf8')

const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (initial) => [initial, () => {}],
  useRef: (initial) => ({ current: initial }),
  useEffect: () => {}
}

const primitives = { CodeBlock: function CodeBlock() {} }

function mockRequire(id) {
  if (id === 'react') return React
  if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
  throw new Error('unexpected require: ' + id)
}

test('browser half registers the expected preview and slot contract', () => {
  let plugin = null
  const win = {
    __ModuleLoader__: {
      load: ({ factory }) => {
        plugin = factory(mockRequire)
      }
    }
  }
  new Function('window', source)(win)

  assert.ok(plugin, 'factory did not register a plugin export')
  assert.equal(plugin.name, 'dsh-tcl-copy')
  assert.ok(Array.isArray(plugin.inject))
  assert.ok(plugin.inject.includes('remote.workspaceFiles'))
  assert.ok(plugin.inject.includes('slots'))
  assert.ok(plugin.inject.includes('locale'))
  assert.ok(plugin.inject.includes('documentPreviews'))
  assert.equal(typeof plugin.apply, 'function')

  const registrations = []
  let slotFactory = null
  let localeRegistered = null

  const services = {
    documentPreviews: {
      register: (def) => {
        registrations.push(def)
        return () => {}
      }
    },
    remote: {
      workspaceFiles: {
        readBytes: () => Promise.resolve({ ok: true, value: { data: new Uint8Array() } })
      }
    },
    locale: {
      register: (ns, dict) => {
        localeRegistered = { ns, dict }
      },
      bind: (ns) => (key) => ns + '.' + key
    },
    slots: {
      inject: (name, factory) => {
        slotFactory = factory
        return () => {}
      },
      register: (opts, body) => ({ opts, body })
    }
  }

  const ctx = {
    get: (name) => services[name],
    effect: (fn) => {
      fn()
    }
  }

  plugin.apply(ctx)

  assert.equal(registrations.length, 1, 'exactly one preview registration')
  const def = registrations[0]
  assert.equal(def.id, 'dsh-tcl-copy/tcl')
  assert.deepEqual(def.extensions, ['tcl'])
  assert.equal(def.priority, 'extension')
  assert.equal(def.loading, 'text-pages')
  assert.equal(def.wrap, true)
  assert.equal(typeof def.title, 'function')
  assert.equal(def.title(), 'dshTclCopy.title')

  assert.ok(localeRegistered)
  assert.equal(localeRegistered.ns, 'dshTclCopy')
  assert.ok(slotFactory, 'slot inject factory captured')

  const slotResult = slotFactory()
  assert.equal(slotResult.opts.name, 'sidebar.right.tab.document')
  assert.equal(slotResult.opts.key, 'dsh-tcl-copy/tcl')
  assert.equal(slotResult.opts.locale, 'dshTclCopy')
})
