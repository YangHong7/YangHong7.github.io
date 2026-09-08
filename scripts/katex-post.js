'use strict'

const katex = require('katex')

const renderMath = (tex, displayMode) => katex.renderToString(tex, {
  displayMode,
  output: 'htmlAndMathml',
  strict: 'warn',
  throwOnError: true
})

const renderTextSegment = source => source
  .replace(/(^|\n)[ \t]{0,3}\$\$[ \t]*\n([\s\S]+?)\n[ \t]*\$\$(?=\n|$)/g,
    (match, prefix, tex) => `${prefix}<div class="katex-block">${renderMath(tex.trim(), true)}</div>`)
  .replace(/\$(?!\$)((?:\\.|[^\\$\n])+?)\$(?!\$)/g,
    (match, tex) => renderMath(tex, false))

const renderPostMath = source => {
  const protectedCode = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g
  let cursor = 0
  let output = ''

  for (const match of source.matchAll(protectedCode)) {
    output += renderTextSegment(source.slice(cursor, match.index))
    output += match[0]
    cursor = match.index + match[0].length
  }

  return output + renderTextSegment(source.slice(cursor))
}

hexo.extend.filter.register('before_post_render', data => {
  if (!data.katex) return data

  data.content = renderPostMath(data.content)
  return data
})
