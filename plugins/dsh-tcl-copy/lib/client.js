/**
 * dsh-tcl-copy — 一键复制 `.tcl` 全文（浏览器半）
 *
 * Registered through `window.__ModuleLoader__` and served by the host at
 * `/plugins/dsh-tcl-copy/client.js`.
 *
 * Split responsibilities:
 *   - DISPLAY reuses the host's built-in `text-pages` paged loading (lazy,
 *     scroll-driven) and the shared `CodeBlock` primitive for line numbers,
 *     wrap, and theming. We register a `documentPreviews` renderer that claims
 *     the `tcl` extension at `priority: "extension"`, which outranks the
 *     built-in fallback.
 *   - COPY does its own complete-byte read via `ctx.remote.workspaceFiles.readBytes`
 *     on click, decodes it (UTF-8 / UTF-16 BOM aware), and writes the full text
 *     to the clipboard. This is the only way to copy the WHOLE file, including
 *     the trailing newline: the paged `read` API is line-oriented and drops the
 *     final empty line, so `content.text` can never represent a file ending in
 *     a newline exactly.
 */
window.__ModuleLoader__.load({
  id: 'dsh-tcl-copy',
  factory: (require) => {
    const React = require('react')

    // Optional platform primitive; older hosts may not inject it.
    let primitives = null
    try {
      primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    } catch (e) {
      primitives = null
    }

    const ID = 'dsh-tcl-copy/tcl'
    const NS = 'dshTclCopy'
    const EXTENSIONS = ['tcl']

    // Drop line numbers above this size to keep the DOM small; copy is unaffected.
    const LINE_NUMBERS_MAX_BYTES = 2 * 1024 * 1024

    const zh = {
      title: 'TCL 文本',
      copy: '复制全文',
      copying: '正在读取…',
      copied: '已复制',
      tooLarge: '文件过大，无法复制全文',
      binary: '疑似二进制文件，无法复制',
      failed: '读取失败'
    }
    const en = {
      title: 'TCL text',
      copy: 'Copy full text',
      copying: 'Reading…',
      copied: 'Copied',
      tooLarge: 'File too large to copy',
      binary: 'Binary file cannot be copied',
      failed: 'Read failed'
    }

    // Parse a dsh-resource file address; percent-decode each path segment.
    function parseAddress(address) {
      if (typeof address !== 'string') return undefined
      const q = address.search(/[?#]/)
      const body = q === -1 ? address : address.slice(0, q)
      if (body.slice(0, 20) !== 'dsh-resource://file/') return undefined
      const tail = body.slice(20)
      if (tail.slice(0, 8) !== 'session/') return undefined
      const parts = tail.split('/')
      // parts[0] === 'session', parts[1] === sessionId, parts[2..] === path
      if (parts.length < 3 || parts[1] === '') return undefined
      try {
        return {
          sessionId: decodeURIComponent(parts[1]),
          path: parts.slice(2).map(decodeURIComponent).join('/')
        }
      } catch (e) {
        return undefined
      }
    }

    function toBytes(data) {
      if (data instanceof Uint8Array) return data
      if (data instanceof ArrayBuffer) return new Uint8Array(data)
      if (Array.isArray(data)) return new Uint8Array(data)
      return new Uint8Array(0)
    }

    /** Decode raw file bytes to text, honoring UTF-8 / UTF-16 BOMs. */
    function decodeText(data) {
      const b = toBytes(data)
      if (b.length === 0) return ''
      if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
        return new TextDecoder('utf-8').decode(b.subarray(3))
      }
      if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) {
        return new TextDecoder('utf-16le').decode(b.subarray(2))
      }
      if (b.length >= 2 && b[0] === 0xFE && b[1] === 0xFF) {
        return new TextDecoder('utf-16be').decode(b.subarray(2))
      }
      return new TextDecoder('utf-8').decode(b)
    }

    function fallbackClipboard(text) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.top = '0'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        return ok
      } catch (e) {
        return false
      }
    }

    function writeClipboard(text) {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(
          () => true,
          () => fallbackClipboard(text)
        )
      }
      return Promise.resolve(fallbackClipboard(text))
    }

    const STYLES = `
.dsh-tcl-copy-root{white-space:normal;flex-direction:column;flex:auto;width:100%;min-width:0;height:100%;min-height:0;display:flex;overflow:hidden}
.dsh-tcl-copy-toolbar{flex:none;display:flex;align-items:center;gap:8px;min-height:36px;padding:4px 10px;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dsh-tcl-copy-button{box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1;cursor:pointer}
.dsh-tcl-copy-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dsh-tcl-copy-button:disabled{opacity:.55;cursor:default}
.dsh-tcl-copy-button[data-state='copied']{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.dsh-tcl-copy-hint{font-size:12px;color:var(--dsw-alias-state-error-primary)}
.dsh-tcl-copy-code{--dsl-code-block-border-radius:0px;--dsl-code-block-line-white-space:pre;--dsl-code-block-background:transparent;flex-direction:column;flex:auto;min-width:0;height:100%;min-height:0;margin:0;display:flex;position:static}
.dsh-tcl-copy-code>[data-code-block-content]{flex:auto;min-width:0;min-height:0;display:block;position:relative;overflow:auto}
.dsh-tcl-copy-code>[data-code-block-content]::-webkit-scrollbar-track{margin:2px}
.dsh-tcl-copy-code pre{box-sizing:border-box;white-space:pre;word-break:normal;overflow-wrap:normal;min-width:100%;padding:16px;overflow:visible}
.dsh-tcl-copy-root[data-wrap='true'] .dsh-tcl-copy-code{--dsl-code-block-line-white-space:pre-wrap}
.dsh-tcl-copy-root[data-wrap='true'] .dsh-tcl-copy-code pre{white-space:pre-wrap;overflow-wrap:anywhere}
`.trim()

    function injectStyles() {
      if (typeof document === 'undefined') return
      if (document.getElementById('dsh-tcl-copy-styles')) return
      const el = document.createElement('style')
      el.id = 'dsh-tcl-copy-styles'
      el.textContent = STYLES
      document.head.appendChild(el)
    }

    // Read a service via ctx.get(), falling back to the reflected property.
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

    function apply(ctx) {
      injectStyles()

      const previews = getService(ctx, 'documentPreviews')
      const slots = getService(ctx, 'slots')
      const locale = getService(ctx, 'locale')
      const remote = getService(ctx, 'remote')
      const readBytes = remote && remote.workspaceFiles && remote.workspaceFiles.readBytes
      if (
        previews === undefined ||
        slots === undefined ||
        typeof readBytes !== 'function' ||
        primitives === null ||
        primitives.CodeBlock === undefined
      ) {
        console.warn('[dsh-tcl-copy] required services unavailable; skipping registration', {
          documentPreviews: previews !== undefined,
          slots: slots !== undefined,
          readBytes: typeof readBytes === 'function',
          codeBlock: !!(primitives && primitives.CodeBlock)
        })
        return
      }

      if (locale !== undefined) {
        ctx.effect(() => locale.register(NS, { zh, en }))
      }
      const t = locale !== undefined
        ? locale.bind(NS)
        : (key) => (zh[key] !== undefined ? zh[key] : key)

      function TclBody(props) {
        const resourceAddress = props.resourceAddress
        const content = props.content
        const wrap = props.wrap
        const scrollportRef = props.scrollportRef
        const tBody = typeof props.t === 'function' ? props.t : t
        const useTabInfo = props.useTabInfo

        // Cancellation signal from the owning tab (may be absent on older hosts).
        let signal
        if (typeof useTabInfo === 'function') {
          try {
            const info = useTabInfo()
            signal = info && info.tab ? info.tab.signal : undefined
          } catch (e) {
            signal = undefined
          }
        }

        const [copyState, setCopyState] = React.useState('idle') // idle|reading|copied|tooLarge|binary|failed
        const mountedRef = React.useRef(true)
        const timerRef = React.useRef(null)

        React.useEffect(() => {
          mountedRef.current = true
          return () => {
            mountedRef.current = false
            if (timerRef.current !== null) clearTimeout(timerRef.current)
          }
        }, [])

        if (!content || content.kind !== 'text') return null

        const reading = copyState === 'reading'
        const label = reading ? tBody('copying') : copyState === 'copied' ? tBody('copied') : tBody('copy')

        function onCopy() {
          if (copyState === 'reading') return
          const parsed = parseAddress(resourceAddress)
          if (parsed === undefined) {
            setCopyState('failed')
            return
          }
          setCopyState('reading')
          const promise = readBytes(parsed.sessionId, parsed.path, {}, signal)
          Promise.resolve(promise).then(
            (result) => {
              if (!mountedRef.current) return
              if (!result || result.ok === false) {
                const code = result && result.error && result.error.code
                if (code === 'workspace-file/too-large') setCopyState('tooLarge')
                else setCopyState('failed')
                return
              }
              const text = decodeText(result.value.data)
              if (text.indexOf('\u0000') !== -1) {
                setCopyState('binary')
                return
              }
              return writeClipboard(text).then((ok) => {
                if (!mountedRef.current) return
                if (!ok) {
                  setCopyState('failed')
                  return
                }
                setCopyState('copied')
                if (timerRef.current !== null) clearTimeout(timerRef.current)
                timerRef.current = setTimeout(() => {
                  if (mountedRef.current) setCopyState('idle')
                }, 1000)
              })
            },
            (err) => {
              if (!mountedRef.current) return
              if (signal && signal.aborted) return
              console.warn('[dsh-tcl-copy] readBytes failed', err)
              setCopyState('failed')
            }
          )
        }

        // Large files skip per-line spans; copy reads bytes and is unaffected.
        const lineNumbers = content.text.length < LINE_NUMBERS_MAX_BYTES

        let hint = null
        if (copyState === 'tooLarge') hint = tBody('tooLarge')
        else if (copyState === 'binary') hint = tBody('binary')
        else if (copyState === 'failed') hint = tBody('failed')

        return React.createElement(
          'div',
          { className: 'dsh-tcl-copy-root', 'data-wrap': wrap ? 'true' : 'false' },
          React.createElement(
            'div',
            { className: 'dsh-tcl-copy-toolbar' },
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'dsh-tcl-copy-button',
                'data-state': copyState,
                disabled: reading,
                onClick: onCopy
              },
              label
            ),
            hint !== null && React.createElement('span', { className: 'dsh-tcl-copy-hint' }, hint)
          ),
          React.createElement(primitives.CodeBlock, {
            className: 'dsh-tcl-copy-code',
            code: content.text,
            lang: undefined,
            streaming: !content.eof,
            lineNumbers,
            showHeader: false,
            contentRef: scrollportRef,
            wrap
          })
        )
      }

      ctx.effect(() =>
        previews.register({
          id: ID,
          extensions: EXTENSIONS,
          priority: 'extension',
          title: () => t('title'),
          loading: 'text-pages',
          wrap: true
        })
      )

      ctx.effect(() =>
        slots.inject('sidebar.right.tab.document', () =>
          slots.register({ name: 'sidebar.right.tab.document', key: ID, locale: NS }, TclBody)
        )
      )
    }

    return {
      name: 'dsh-tcl-copy',
      inject: ['slots', 'locale', 'remote', 'remote.workspaceFiles', 'documentPreviews'],
      apply
    }
  }
})
