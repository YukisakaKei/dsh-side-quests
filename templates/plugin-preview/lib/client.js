/**
 * __PLUGIN_NAME__ — browser half.
 *
 * Registers a document preview renderer for __PLUGIN_EXTENSIONS_TEXT__ and a
 * body component in the sidebar document slot. Display reuses the host's
 * `text-pages` paging and the shared `CodeBlock` primitive.
 *
 * The copy button here comes from `CodeBlock` and copies the currently loaded
 * text. For exact full-file copy (including the trailing newline), see the
 * `readBytes` approach in docs/development.md.
 */
window.__ModuleLoader__.load({
  id: '__PLUGIN_NAME__',
  factory: (require) => {
    const React = require('react')

    let primitives = null
    try {
      primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    } catch {
      primitives = null
    }

    const ID = '__PLUGIN_ID__'
    const NS = '__PLUGIN_LOCALE_NS__'
    const EXTENSIONS = __PLUGIN_EXTENSIONS_JSON__
    const LINE_NUMBERS_MAX_BYTES = 2 * 1024 * 1024

    const zh = {
      title: '__PLUGIN_TITLE__',
      copy: '复制',
      copied: '已复制'
    }
    const en = {
      title: '__PLUGIN_TITLE__',
      copy: 'Copy',
      copied: 'Copied'
    }

    function getService(ctx, name) {
      let value
      try {
        value = ctx.get(name)
      } catch {
        value = undefined
      }
      if (value === undefined) value = ctx[name]
      return value
    }

    function Body(props) {
      const content = props.content
      const fallbackT = (key) => (zh[key] !== undefined ? zh[key] : key)
      const t = typeof props.t === 'function' ? props.t : fallbackT

      if (!content || content.kind !== 'text' || primitives === null) return null

      return React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0
          }
        },
        React.createElement(primitives.CodeBlock, {
          code: content.text,
          lang: undefined,
          streaming: !content.eof,
          lineNumbers: content.text.length < LINE_NUMBERS_MAX_BYTES,
          showHeader: true,
          contentRef: props.scrollportRef,
          wrap: props.wrap,
          copyLabel: t('copy'),
          copiedLabel: t('copied')
        })
      )
    }

    function apply(ctx) {
      const previews = getService(ctx, 'documentPreviews')
      const slots = getService(ctx, 'slots')
      const locale = getService(ctx, 'locale')

      if (
        previews === undefined ||
        slots === undefined ||
        primitives === null ||
        primitives.CodeBlock === undefined
      ) {
        console.warn('[__PLUGIN_NAME__] required services unavailable; skipping registration')
        return
      }

      if (locale !== undefined) {
        ctx.effect(() => locale.register(NS, { zh, en }))
      }
      const t =
        locale !== undefined
          ? locale.bind(NS)
          : (key) => (zh[key] !== undefined ? zh[key] : key)

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
          slots.register({ name: 'sidebar.right.tab.document', key: ID, locale: NS }, Body)
        )
      )
    }

    return {
      name: '__PLUGIN_NAME__',
      inject: ['slots', 'locale', 'documentPreviews'],
      apply
    }
  }
})
