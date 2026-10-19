import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientPath = path.join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(clientPath, 'utf8')

test('browser half registers the expected preview and slot contract', () => {
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
  assert.equal(plugin.name, '__PLUGIN_NAME__')

  const registrations = []
  let slotFactory = null

  const services = {
    documentPreviews: {
      register: (definition) => {
        registrations.push(definition)
        return () => {}
      }
    },
    locale: {
      register: () => {},
      bind: (namespace) => (key) => namespace + '.' + key
    },
    slots: {
      inject: (name, factory) => {
        slotFactory = factory
        return () => {}
      },
      register: (options, body) => ({ options, body })
    }
  }

  const ctx = {
    get: (name) => services[name],
    effect: (fn) => {
      fn()
    }
  }

  plugin.apply(ctx)

  assert.equal(registrations.length, 1)
  const definition = registrations[0]
  assert.equal(definition.id, '__PLUGIN_ID__')
  assert.deepEqual(definition.extensions, __PLUGIN_EXTENSIONS_JSON__)
  assert.equal(definition.priority, 'extension')
  assert.equal(definition.loading, 'text-pages')

  assert.ok(slotFactory)
  const slot = slotFactory()
  assert.equal(slot.options.name, 'sidebar.right.tab.document')
  assert.equal(slot.options.key, '__PLUGIN_ID__')
})
