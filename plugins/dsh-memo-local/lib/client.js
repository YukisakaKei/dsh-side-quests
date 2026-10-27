/**
 * dsh-memo-local — 全局备忘库与定时提醒（浏览器半）
 *
 * Registers a global panel (`sidebar.panellist` + `main`) and a wall-clock
 * reminder timer. Reminders use the Desktop preload's `window.Notification`
 * bridge, which shows a silent native Windows toast; clicking it focuses DSH
 * and opens the memo panel.
 */
window.__ModuleLoader__.load({
  id: 'dsh-memo-local',
  factory: (require) => {
    const React = require('react')

    let primitives = null
    try {
      primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    } catch (e) {
      primitives = null
    }

    const PANEL_ID = 'dsh-memo-local'
    const NS = 'dshMemo'
    const STORAGE_KEY = 'dsh-memo.v1'
    const LAST_SLOT_KEY = 'dsh-memo.last-slot.v1'
    const LATE_GRACE_MS = 2 * 60 * 1000
    // 09:00–12:00 and 13:30–18:00, excluding 09:00, 12:00, 13:30, 18:00.
    const SLOT_TIMES = [
      [9, 30], [10, 0], [10, 30], [11, 0], [11, 30],
      [14, 0], [14, 30], [15, 0], [15, 30], [16, 0], [16, 30], [17, 0], [17, 30]
    ]

    const zh = {
      panel: '备忘',
      title: '备忘',
      subtitle: '每天 09:30–11:30、14:00–17:30 的整点/半点提醒',
      placeholder: '添加一条待办…',
      add: '添加',
      empty: '还没有待办，添加一条试试',
      pending: '{count} 项未完成',
      completed: '{count} 项已完成',
      enable: '启用提醒',
      test: '测试通知',
      testSent: '已发送测试通知',
      testUnavailable: '当前环境不支持系统通知',
      edit: '编辑',
      delete: '删除',
      notifyEmpty: '暂无待办'
    }
    const en = {
      panel: 'Memo',
      title: 'Memo',
      subtitle: 'Reminders every hour and half hour from 09:30–11:30 and 14:00–17:30',
      placeholder: 'Add a memo…',
      add: 'Add',
      empty: 'No memos yet. Add one to get started.',
      pending: '{count} pending',
      completed: '{count} done',
      enable: 'Enable reminders',
      test: 'Test notification',
      testSent: 'Test notification sent',
      testUnavailable: 'System notifications are unavailable',
      edit: 'Edit',
      delete: 'Delete',
      notifyEmpty: 'No pending memos'
    }

    // Header values mirror the host's `--dsw-*` tokens; the panel owns its
    // padding because it is a root-scoped entry page.
    const STYLES = `
.dsh-memo-local-root{height:100%;overflow:auto;box-sizing:border-box;padding:calc(var(--dsh-frame-top-clearance,16px) + 24px) clamp(24px,6vw,72px) 48px;color:var(--dsw-alias-label-primary)}
.dsh-memo-local-inner{display:flex;flex-direction:column;gap:16px;max-width:760px;margin:0 auto}
.dsh-memo-local-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
.dsh-memo-local-title{margin:0;font-size:22px;line-height:1.3;font-weight:600}
.dsh-memo-local-subtitle{margin:6px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}
.dsh-memo-local-header-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dsh-memo-local-switch-label{display:inline-flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:13px}
.dsh-memo-local-add{display:flex;align-items:center;gap:8px}
.dsh-memo-local-input{flex:1;min-width:0}
.dsh-memo-local-notice{color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-memo-local-empty{padding:40px 16px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:13px;border:1px dashed var(--dsw-alias-border-l2);border-radius:12px}
.dsh-memo-local-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.dsh-memo-local-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-base)}
.dsh-memo-local-row[data-done='true'] .dsh-memo-local-check>span{text-decoration:line-through;color:var(--dsw-alias-label-tertiary)}
.dsh-memo-local-check{flex:1;min-width:0}
.dsh-memo-local-check>span{overflow-wrap:anywhere;line-height:1.5}
.dsh-memo-local-edit{flex:1;min-width:0}
.dsh-memo-local-row-actions{display:flex;align-items:center;gap:2px;flex:none}
.dsh-memo-local-count{color:var(--dsw-alias-label-tertiary);font-size:12px;text-align:right}
`.trim()

    function formatText(text, params) {
      if (params === undefined) return text
      return text.replace(/\{(\w+)\}/g, (match, key) => params[key] === undefined ? match : String(params[key]))
    }

    function getService(ctx, name) {
      let value
      try {
        value = ctx.get(name)
      } catch (e) {
        value = undefined
      }
      if (value === undefined) value = ctx[name]
      return value
    }

    function newId() {
      try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
      } catch (e) {}
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
    }

    function defaultState() {
      return { version: 1, enabled: true, items: [] }
    }

    function normalizeState(raw) {
      if (raw === null || typeof raw !== 'object' || raw.version !== 1 || !Array.isArray(raw.items)) {
        return defaultState()
      }
      const items = []
      for (const item of raw.items) {
        if (item === null || typeof item !== 'object') continue
        if (typeof item.id !== 'string' || typeof item.text !== 'string' || item.text.trim() === '') continue
        items.push({
          id: item.id,
          text: item.text,
          done: item.done === true,
          createdAt: Number.isFinite(item.createdAt) ? item.createdAt : 0,
          updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : 0
        })
      }
      return { version: 1, enabled: raw.enabled !== false, items }
    }

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw === null ? defaultState() : normalizeState(JSON.parse(raw))
      } catch (e) {
        console.warn('[dsh-memo-local] failed to read storage', e)
        return defaultState()
      }
    }

    function saveState(state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (e) {
        console.warn('[dsh-memo-local] failed to write storage', e)
      }
    }

    function createStore() {
      let state = loadState()
      const listeners = new Set()

      function emit() {
        for (const listener of [...listeners]) {
          try {
            listener()
          } catch (e) {
            console.error('[dsh-memo-local] store listener failed', e)
          }
        }
      }

      function set(next) {
        state = next
        saveState(state)
        emit()
      }

      return {
        getSnapshot: () => state,
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        add(text) {
          const value = text.trim()
          if (value === '') return false
          const now = Date.now()
          set({
            ...state,
            items: [...state.items, {
              id: newId(),
              text: value,
              done: false,
              createdAt: now,
              updatedAt: now
            }]
          })
          return true
        },
        update(id, text) {
          const value = text.trim()
          if (value === '') return false
          const current = state.items.find((item) => item.id === id)
          if (current === undefined || current.text === value) return false
          set({
            ...state,
            items: state.items.map((item) => item.id === id ? { ...item, text: value, updatedAt: Date.now() } : item)
          })
          return true
        },
        toggle(id) {
          set({
            ...state,
            items: state.items.map((item) => item.id === id ? { ...item, done: !item.done, updatedAt: Date.now() } : item)
          })
        },
        remove(id) {
          set({ ...state, items: state.items.filter((item) => item.id !== id) })
        },
        setEnabled(enabled) {
          set({ ...state, enabled })
        }
      }
    }

    function nextSlotAt(nowMs) {
      const now = new Date(nowMs)
      const year = now.getFullYear()
      const month = now.getMonth()
      const day = now.getDate()
      for (const [hour, minute] of SLOT_TIMES) {
        const slot = new Date(year, month, day, hour, minute, 0, 0).getTime()
        if (slot > nowMs) return slot
      }
      const [hour, minute] = SLOT_TIMES[0]
      return new Date(year, month, day + 1, hour, minute, 0, 0).getTime()
    }

    function slotKey(value) {
      const slot = new Date(value)
      return [
        slot.getFullYear(),
        slot.getMonth() + 1,
        slot.getDate(),
        slot.getHours(),
        slot.getMinutes()
      ].join('-')
    }

    let lastNotification = null

    function notificationAvailable() {
      if (typeof Notification !== 'function') return false
      if (Notification.permission === 'denied') return false
      if (Notification.permission === 'default') {
        if (typeof Notification.requestPermission === 'function') {
          try {
            Notification.requestPermission().catch(() => {})
          } catch (e) {}
        }
        return false
      }
      return true
    }

    function buildBody(items, t) {
      const pending = items.filter((item) => !item.done)
      if (pending.length === 0) return t('notifyEmpty')
      return pending.map((item) => '• ' + item.text).join('\n')
    }

    function showReminder({ items, t, onOpen }) {
      if (!notificationAvailable()) return false
      try {
        if (lastNotification !== null && typeof lastNotification.close === 'function') {
          try {
            lastNotification.close()
          } catch (e) {}
        }
        const notification = new Notification('', { body: buildBody(items, t), silent: true })
        notification.onclick = () => {
          try {
            onOpen()
          } catch (e) {
            console.warn('[dsh-memo-local] failed to open panel', e)
          }
        }
        lastNotification = notification
        return true
      } catch (e) {
        console.warn('[dsh-memo-local] notification failed', e)
        return false
      }
    }

    function createReminder({ store, t, onOpen }) {
      let timer = null
      let stopped = true
      let unsubscribe = null

      function notify() {
        return showReminder({
          items: store.getSnapshot().items,
          t,
          onOpen
        })
      }

      function fire(slot) {
        if (Date.now() - slot > LATE_GRACE_MS) return
        const key = slotKey(slot)
        let last = null
        try {
          last = localStorage.getItem(LAST_SLOT_KEY)
        } catch (e) {}
        if (last === key) return
        if (notify()) {
          try {
            localStorage.setItem(LAST_SLOT_KEY, key)
          } catch (e) {}
        }
      }

      function schedule() {
        if (timer !== null) {
          clearTimeout(timer)
          timer = null
        }
        if (stopped || !store.getSnapshot().enabled) return
        const now = Date.now()
        const slot = nextSlotAt(now)
        timer = setTimeout(() => {
          timer = null
          fire(slot)
          schedule()
        }, Math.max(0, slot - now))
      }

      return {
        start() {
          if (!stopped) return
          stopped = false
          unsubscribe = store.subscribe(schedule)
          schedule()
        },
        stop() {
          stopped = true
          if (unsubscribe !== null) {
            unsubscribe()
            unsubscribe = null
          }
          if (timer !== null) {
            clearTimeout(timer)
            timer = null
          }
        },
        notifyTest() {
          return notify()
        }
      }
    }

    function injectStyles() {
      if (typeof document === 'undefined') return
      if (document.getElementById('dsh-memo-local-styles') !== null) return
      const style = document.createElement('style')
      style.id = 'dsh-memo-local-styles'
      style.textContent = STYLES
      document.head.appendChild(style)
    }

    function MemoIcon(props) {
      const size = props !== undefined && props.size !== undefined ? props.size : 18
      return React.createElement(primitives.IconChecklistOutlineRegular, { size })
    }

    function MemoRow({ item, store, t }) {
      const [editing, setEditing] = React.useState(false)
      const [text, setText] = React.useState(item.text)
      const cancelled = React.useRef(false)
      const composing = React.useRef(false)

      React.useEffect(() => {
        if (!editing) setText(item.text)
      }, [item.text, editing])

      function startEdit() {
        cancelled.current = false
        setText(item.text)
        setEditing(true)
      }

      function commit() {
        if (cancelled.current) {
          cancelled.current = false
          return
        }
        setEditing(false)
        store.update(item.id, text)
      }

      function onKeyDown(event) {
        if (composing.current || (event.nativeEvent && event.nativeEvent.isComposing)) return
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          cancelled.current = true
          setText(item.text)
          setEditing(false)
        }
      }

      const editButton = !editing && React.createElement(primitives.Button, {
        variant: 'ghost',
        size: 'sm',
        icon: React.createElement(primitives.IconEditOutlineRegular, { size: 14 }),
        'aria-label': t('edit'),
        title: t('edit'),
        onClick: startEdit
      })

      return React.createElement(
        'li',
        { className: 'dsh-memo-local-row', 'data-done': item.done ? 'true' : 'false' },
        React.createElement(primitives.Checkbox, {
          checked: item.done,
          onChange: () => store.toggle(item.id),
          label: editing ? '' : item.text,
          title: item.text,
          className: 'dsh-memo-local-check'
        }),
        editing && React.createElement(primitives.Input, {
          className: 'dsh-memo-local-edit',
          value: text,
          autoFocus: true,
          onChange: (event) => setText(event.target.value),
          onKeyDown,
          onBlur: commit,
          onCompositionStart: () => { composing.current = true },
          onCompositionEnd: () => { composing.current = false }
        }),
        React.createElement(
          'div',
          { className: 'dsh-memo-local-row-actions' },
          editButton,
          React.createElement(primitives.Button, {
            variant: 'ghost',
            size: 'sm',
            icon: React.createElement(primitives.IconTrashOutlineRegular, { size: 14 }),
            'aria-label': t('delete'),
            title: t('delete'),
            onClick: () => store.remove(item.id)
          })
        )
      )
    }

    function MemoPage(props) {
      const store = props.store
      const reminder = props.reminder
      const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
      const t = typeof props.t === 'function'
        ? props.t
        : (key, params) => formatText(zh[key] !== undefined ? zh[key] : key, params)
      const [draft, setDraft] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const noticeTimer = React.useRef(null)
      const composing = React.useRef(false)

      React.useEffect(() => {
        if (notice === '') return undefined
        if (noticeTimer.current !== null) clearTimeout(noticeTimer.current)
        noticeTimer.current = setTimeout(() => {
          noticeTimer.current = null
          setNotice('')
        }, 2500)
        return () => {
          if (noticeTimer.current !== null) {
            clearTimeout(noticeTimer.current)
            noticeTimer.current = null
          }
        }
      }, [notice])

      const pending = state.items.filter((item) => !item.done)
      const done = state.items.filter((item) => item.done)
      const ordered = [...pending, ...done]

      function add() {
        if (store.add(draft)) setDraft('')
      }

      function onDraftKeyDown(event) {
        if (event.key !== 'Enter') return
        if (composing.current || (event.nativeEvent && event.nativeEvent.isComposing)) return
        event.preventDefault()
        add()
      }

      function test() {
        setNotice(reminder.notifyTest() ? t('testSent') : t('testUnavailable'))
      }

      const count = [
        pending.length > 0 ? t('pending', { count: pending.length }) : null,
        done.length > 0 ? t('completed', { count: done.length }) : null
      ].filter((value) => value !== null).join(' · ')

      return React.createElement(
        'div',
        { className: 'dsh-memo-local-root' },
        React.createElement(
          'div',
          { className: 'dsh-memo-local-inner' },
          React.createElement(
            'header',
            { className: 'dsh-memo-local-header' },
            React.createElement(
              'div',
              null,
              React.createElement('h1', { className: 'dsh-memo-local-title' }, t('title')),
              React.createElement('p', { className: 'dsh-memo-local-subtitle' }, t('subtitle'))
            ),
            React.createElement(
              'div',
              { className: 'dsh-memo-local-header-actions' },
              React.createElement(
                'span',
                { className: 'dsh-memo-local-switch-label' },
                React.createElement(primitives.Switch, {
                  checked: state.enabled,
                  onChange: (checked) => store.setEnabled(checked),
                  label: t('enable')
                }),
                React.createElement('span', null, t('enable'))
              ),
              React.createElement(primitives.Button, {
                variant: 'outline',
                size: 'sm',
                onClick: test
              }, t('test'))
            )
          ),
          React.createElement(
            'div',
            { className: 'dsh-memo-local-add' },
            React.createElement(primitives.Input, {
              className: 'dsh-memo-local-input',
              value: draft,
              placeholder: t('placeholder'),
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: onDraftKeyDown,
              onCompositionStart: () => { composing.current = true },
              onCompositionEnd: () => { composing.current = false }
            }),
            React.createElement(
              primitives.Button,
              {
                variant: 'primary',
                size: 'sm',
                icon: React.createElement(primitives.IconPlusOutlineRegular, { size: 14 }),
                disabled: draft.trim() === '',
                onClick: add
              },
              t('add')
            )
          ),
          notice !== '' && React.createElement('div', { className: 'dsh-memo-local-notice' }, notice),
          ordered.length === 0
            ? React.createElement('div', { className: 'dsh-memo-local-empty' }, t('empty'))
            : React.createElement(
                'ul',
                { className: 'dsh-memo-local-list' },
                ordered.map((item) => React.createElement(MemoRow, {
                  key: item.id,
                  item,
                  store,
                  t
                }))
              ),
          ordered.length > 0 && React.createElement('div', { className: 'dsh-memo-local-count' }, count)
        )
      )
    }

    function apply(ctx) {
      const slots = getService(ctx, 'slots')
      const locale = getService(ctx, 'locale')
      const layout = getService(ctx, 'layout')
      const required = [
        'Button',
        'Input',
        'Switch',
        'Checkbox',
        'IconChecklistOutlineRegular',
        'IconEditOutlineRegular',
        'IconTrashOutlineRegular',
        'IconPlusOutlineRegular'
      ]
      const missing = required.filter((name) => primitives === null || primitives[name] === undefined)

      if (slots === undefined || missing.length > 0) {
        console.warn('[dsh-memo-local] required services unavailable; skipping registration', {
          slots: slots !== undefined,
          primitives: missing
        })
        return
      }

      injectStyles()

      if (locale !== undefined) {
        ctx.effect(() => locale.register(NS, { zh, en }))
      }
      const t = locale !== undefined
        ? locale.bind(NS)
        : (key, params) => formatText(zh[key] !== undefined ? zh[key] : key, params)

      const store = createStore()
      const onOpen = () => {
        if (layout === undefined) return
        layout.selectPanel(PANEL_ID)
      }
      const reminder = createReminder({ store, t, onOpen })

      ctx.effect(() => {
        reminder.start()
        return () => reminder.stop()
      }, 'dsh-memo-local: reminder timer')

      ctx.effect(() => slots.inject('main', () => slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({ store, reminder })
      }, MemoPage)))

      ctx.effect(() => slots.inject('sidebar.panellist', () => slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        locale: NS,
        label: () => t('panel')
      }, MemoIcon)))
    }

    return {
      name: 'dsh-memo-local',
      inject: ['slots', 'locale', 'layout'],
      apply
    }
  }
})
