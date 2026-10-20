import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientPath = path.join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(clientPath, 'utf8')
const RealDate = Date

const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (initial) => [initial, () => {}],
  useEffect: () => {},
  useRef: (initial) => ({ current: initial }),
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()
}

const primitives = {
  Button: function Button() {},
  Input: function Input() {},
  Switch: function Switch() {},
  Checkbox: function Checkbox() {},
  IconChecklistOutlineRegular: function IconChecklistOutlineRegular() {},
  IconEditOutlineRegular: function IconEditOutlineRegular() {},
  IconTrashOutlineRegular: function IconTrashOutlineRegular() {},
  IconPlusOutlineRegular: function IconPlusOutlineRegular() {}
}

function mockRequire(id) {
  if (id === 'react') return React
  if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
  throw new Error('unexpected require: ' + id)
}

function createHarness(options = {}) {
  const clock = { now: options.now ?? new RealDate(2026, 5, 15, 8, 0, 0).getTime() }
  const storage = new Map()
  if (options.seed !== undefined) storage.set('dsh-memo.v1', JSON.stringify(options.seed))
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null },
    setItem(key, value) { storage.set(key, String(value)) },
    removeItem(key) { storage.delete(key) }
  }

  const notifications = []
  class FakeNotification {
    static permission = 'granted'
    static requestPermission() { return Promise.resolve('granted') }
    constructor(title, notificationOptions) {
      this.title = title
      this.options = notificationOptions
      this.closed = false
      notifications.push(this)
    }
    close() { this.closed = true }
  }

  const timers = []
  let nextTimerId = 1
  function fakeSetTimeout(fn, delay) {
    const timer = { id: nextTimerId++, fn, delay, at: clock.now + delay }
    timers.push(timer)
    return timer.id
  }
  function fakeClearTimeout(id) {
    const index = timers.findIndex((timer) => timer.id === id)
    if (index !== -1) timers.splice(index, 1)
  }
  function fire(timer) {
    const index = timers.indexOf(timer)
    if (index !== -1) timers.splice(index, 1)
    timer.fn()
  }

  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(clock.now)
      else super(...args)
    }
    static now() { return clock.now }
  }

  let plugin = null
  const window = {
    __ModuleLoader__: {
      load: ({ factory }) => { plugin = factory(mockRequire) }
    }
  }
  const run = new Function(
    'window', 'Date', 'setTimeout', 'clearTimeout', 'Notification', 'localStorage', 'console', 'document',
    source
  )
  run(window, FakeDate, fakeSetTimeout, fakeClearTimeout, FakeNotification, localStorage, console, undefined)

  return { plugin, clock, storage, notifications, timers, fire }
}

function createContext() {
  const registrations = []
  const effects = []
  const dictionaries = {}
  let selectedPanel = null

  const slots = {
    inject(_name, factory) {
      const result = factory()
      return () => {
        if (result && typeof result.dispose === 'function') result.dispose()
      }
    },
    register(options, component) {
      registrations.push({ name: options.name, options, component })
      return () => {}
    }
  }
  const locale = {
    register(ns, dictionary) {
      dictionaries[ns] = dictionary
      return () => {}
    },
    bind(ns) {
      return (key, params) => {
        const dictionary = dictionaries[ns]
        const text = dictionary && dictionary.zh[key] !== undefined ? dictionary.zh[key] : key
        if (params === undefined) return text
        return text.replace(/\{(\w+)\}/g, (match, name) => params[name] === undefined ? match : String(params[name]))
      }
    }
  }
  const layout = {
    selectPanel(id) { selectedPanel = id }
  }
  const services = { slots, locale, layout }
  const ctx = {
    get(name) { return services[name] },
    effect(fn) {
      const dispose = fn()
      effects.push(dispose)
      return dispose
    },
    slots,
    locale,
    layout
  }

  return {
    ctx,
    registrations,
    effects,
    dictionaries,
    getSelectedPanel: () => selectedPanel
  }
}

function applyAt(hour, minute, seed) {
  const now = new RealDate(2026, 5, 15, hour, minute, 0).getTime()
  const harness = createHarness({ now, seed })
  const context = createContext()
  harness.plugin.apply(context.ctx)
  return { harness, context }
}

function mainRegistration(context) {
  return context.registrations.find((registration) => registration.name === 'main')
}

test('registers the global panel and schedules the next slot', () => {
  const { harness, context } = applyAt(8, 0)

  assert.deepEqual(harness.plugin.inject, ['slots', 'locale', 'layout'])
  assert.ok(context.dictionaries.dshMemo)

  const main = mainRegistration(context)
  assert.ok(main)
  assert.equal(main.options.key, 'dsh-memo')

  const sidebar = context.registrations.find((registration) => registration.name === 'sidebar.panellist')
  assert.ok(sidebar)
  assert.equal(sidebar.options.id, 'dsh-memo')
  assert.equal(sidebar.options.label(), '备忘')

  assert.equal(harness.timers.length, 1)
  assert.equal(harness.timers[0].delay, 90 * 60 * 1000)
})

test('uses the confirmed reminder slots', () => {
  function delayAt(hour, minute) {
    return applyAt(hour, minute).harness.timers[0].delay
  }

  assert.equal(delayAt(9, 0), 30 * 60 * 1000)
  assert.equal(delayAt(9, 30), 30 * 60 * 1000)
  assert.equal(delayAt(11, 30), 2.5 * 60 * 60 * 1000)
  assert.equal(delayAt(12, 0), 2 * 60 * 60 * 1000)
  assert.equal(delayAt(13, 30), 30 * 60 * 1000)
  assert.equal(delayAt(17, 30), 16 * 60 * 60 * 1000)
  assert.equal(delayAt(18, 0), 15.5 * 60 * 60 * 1000)
})

test('fires a silent notification with pending items and opens the panel', () => {
  const seed = {
    version: 1,
    enabled: true,
    items: [
      { id: 'a', text: 'Alpha', done: false, createdAt: 1, updatedAt: 1 },
      { id: 'b', text: 'Beta', done: true, createdAt: 2, updatedAt: 2 },
      { id: 'c', text: 'Gamma', done: false, createdAt: 3, updatedAt: 3 }
    ]
  }
  const { harness, context } = applyAt(9, 29, seed)
  const timer = harness.timers[0]
  assert.equal(timer.at, new RealDate(2026, 5, 15, 9, 30, 0).getTime())

  harness.clock.now = timer.at
  harness.fire(timer)

  assert.equal(harness.notifications.length, 1)
  const notification = harness.notifications[0]
  assert.equal(notification.title, '')
  assert.equal(notification.options.body, '• Alpha\n• Gamma')
  assert.equal(notification.options.silent, true)

  notification.onclick()
  assert.equal(context.getSelectedPanel(), 'dsh-memo')
})

test('shows the empty message when nothing is pending', () => {
  for (const seed of [
    { version: 1, enabled: true, items: [] },
    { version: 1, enabled: true, items: [{ id: 'a', text: 'Done', done: true, createdAt: 1, updatedAt: 1 }] }
  ]) {
    const { harness } = applyAt(9, 29, seed)
    const timer = harness.timers[0]
    harness.clock.now = timer.at
    harness.fire(timer)
    assert.equal(harness.notifications[0].options.body, '暂无待办')
  }
})

test('lists every pending item without extra text', () => {
  const items = Array.from({ length: 7 }, (_, index) => ({
    id: String(index),
    text: 'Item ' + (index + 1),
    done: false,
    createdAt: index,
    updatedAt: index
  }))
  const { harness } = applyAt(9, 29, { version: 1, enabled: true, items })
  const timer = harness.timers[0]
  harness.clock.now = timer.at
  harness.fire(timer)

  const body = harness.notifications[0].options.body
  assert.equal(body.split('\n').length, 7)
  assert.ok(body.includes('Item 7'))
  assert.ok(!body.includes('还有'))
})

test('skips a slot that is more than two minutes late', () => {
  const { harness } = applyAt(9, 29)
  const timer = harness.timers[0]
  harness.clock.now = timer.at + 3 * 60 * 1000
  harness.fire(timer)
  assert.equal(harness.notifications.length, 0)
})

test('does not fire the same slot twice', () => {
  const { harness } = applyAt(9, 29)
  const timer = harness.timers[0]
  harness.clock.now = timer.at
  harness.fire(timer)
  assert.equal(harness.notifications.length, 1)

  harness.fire(timer)
  assert.equal(harness.notifications.length, 1)
})

test('persists add, update, toggle, remove, and enabled', () => {
  const { harness, context } = applyAt(8, 0)
  const { store } = mainRegistration(context).options.inject()

  assert.equal(store.add('  First  '), true)
  let saved = JSON.parse(harness.storage.get('dsh-memo.v1'))
  assert.equal(saved.items.length, 1)
  assert.equal(saved.items[0].text, 'First')
  const id = saved.items[0].id

  assert.equal(store.update(id, 'Second'), true)
  saved = JSON.parse(harness.storage.get('dsh-memo.v1'))
  assert.equal(saved.items[0].text, 'Second')

  store.toggle(id)
  saved = JSON.parse(harness.storage.get('dsh-memo.v1'))
  assert.equal(saved.items[0].done, true)

  store.setEnabled(false)
  saved = JSON.parse(harness.storage.get('dsh-memo.v1'))
  assert.equal(saved.enabled, false)

  store.remove(id)
  saved = JSON.parse(harness.storage.get('dsh-memo.v1'))
  assert.equal(saved.items.length, 0)
})

test('does not schedule while reminders are disabled', () => {
  const seed = { version: 1, enabled: false, items: [] }
  const { harness, context } = applyAt(8, 0, seed)
  assert.equal(harness.timers.length, 0)

  const { store } = mainRegistration(context).options.inject()
  store.setEnabled(true)
  assert.equal(harness.timers.length, 1)

  store.setEnabled(false)
  assert.equal(harness.timers.length, 0)
})

test('test notifications work while reminders are disabled', () => {
  const seed = { version: 1, enabled: false, items: [] }
  const { harness, context } = applyAt(8, 0, seed)
  const { reminder } = mainRegistration(context).options.inject()

  assert.equal(reminder.notifyTest(), true)
  assert.equal(harness.notifications.length, 1)
  assert.equal(harness.notifications[0].title, '')
  assert.equal(harness.notifications[0].options.body, '暂无待办')
})
