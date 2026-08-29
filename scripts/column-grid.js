'use strict'

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const asArray = collection => {
  if (!collection) return []
  if (Array.isArray(collection)) return collection
  if (Array.isArray(collection.data)) return collection.data
  if (typeof collection.toArray === 'function') return collection.toArray()
  return []
}

const withRoot = value => {
  const source = String(value || '')
  if (/^(?:https?:)?\/\//.test(source)) return source

  const root = String(hexo.config.root || '/').replace(/\/+$/, '')
  const path = source.replace(/^\/+/, '')
  return `${root}/${path}`.replace(/\/{2,}/g, '/')
}

const formatDate = value => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getColumns = () => {
  const data = hexo.locals.get('data') || {}
  return Array.isArray(data.columns) ? data.columns : []
}

const getCategories = post => asArray(post && post.categories)

const getPostsForColumn = name => asArray(hexo.locals.get('posts'))
  .filter(post => getCategories(post).some(category => category.name === name))
  .sort((a, b) => new Date(b.date) - new Date(a.date))

const getCategoryDirectory = name => {
  const mapped = hexo.config.category_map && hexo.config.category_map[name]
  return `${hexo.config.category_dir || 'categories'}/${mapped || encodeURIComponent(name)}/`
}

const getCategoryPath = name => {
  const category = asArray(hexo.locals.get('categories')).find(item => item.name === name)
  if (category && category.path) return withRoot(category.path)

  return withRoot(getCategoryDirectory(name))
}

const renderColumnGrid = () => {
  const cards = getColumns().map(column => {
    const posts = getPostsForColumn(column.name)
    const latest = posts.length > 0 ? formatDate(posts[0].date) : '等待更新'
    const countLabel = `${posts.length} 篇文章`

    return `
      <a class="column-card" href="${escapeHtml(getCategoryPath(column.name))}" aria-label="进入${escapeHtml(column.name)}专栏">
        <span class="column-card-cover">
          <img src="${escapeHtml(withRoot(column.cover))}" alt="" loading="lazy">
          <span class="column-card-shade"></span>
          <span class="column-card-heading">
            <span class="column-card-eyebrow">${escapeHtml(column.eyebrow)}</span>
            <strong>${escapeHtml(column.name)}</strong>
            <span>${escapeHtml(column.tagline)}</span>
          </span>
        </span>
        <span class="column-card-body">
          <span class="column-card-description">${escapeHtml(column.description)}</span>
          <span class="column-card-meta">
            <span><i class="fas fa-book-open" aria-hidden="true"></i>${escapeHtml(countLabel)}</span>
            <span><i class="far fa-clock" aria-hidden="true"></i>${posts.length > 0 ? `更新 ${escapeHtml(latest)}` : escapeHtml(latest)}</span>
          </span>
        </span>
      </a>`
  }).join('')

  return `<div class="column-grid">${cards}</div>`
}

const renderPostTags = post => asArray(post.tags).slice(0, 4).map(tag => {
  const href = tag.path ? withRoot(tag.path) : '#'
  return `<a href="${escapeHtml(href)}">${escapeHtml(tag.name)}</a>`
}).join('')

const renderPostCard = post => {
  const href = withRoot(post.path)
  const cover = withRoot(post.cover || '/img/error-page.png')
  const description = post.description || '阅读全文，查看这篇文章的完整记录。'
  const title = post.title || '未命名文章'

  return `
    <article class="column-post-card">
      <a class="column-post-cover" href="${escapeHtml(href)}" aria-label="阅读${escapeHtml(title)}">
        <img src="${escapeHtml(cover)}" alt="" loading="lazy">
        <span class="column-post-shade"></span>
        <h2>${escapeHtml(title)}</h2>
      </a>
      <div class="column-post-body">
        <p>${escapeHtml(description)}</p>
        <div class="column-post-meta">
          <span><i class="far fa-calendar-alt" aria-hidden="true"></i>${escapeHtml(formatDate(post.date))}</span>
          <span><i class="far fa-file-alt" aria-hidden="true"></i>阅读文章</span>
        </div>
        <div class="column-post-tags">${renderPostTags(post)}</div>
      </div>
    </article>`
}

const renderCategoryDetail = page => {
  const columns = getColumns()
  const column = columns.find(item => item.name === page.category) || {
    name: page.category,
    eyebrow: 'COLUMN',
    tagline: '持续整理的主题专栏',
    description: '围绕这一主题整理的文章与实践记录。',
    cover: '/img/error-page.png',
    tags: []
  }
  const posts = asArray(page.posts)
  const postCards = posts.length > 0
    ? posts.map(renderPostCard).join('')
    : `
      <div class="column-empty-state">
        <span class="column-empty-mark" aria-hidden="true">·</span>
        <h2>暂时留白</h2>
        <p>这里还没有文章，之后会慢慢写下去。</p>
      </div>`

  return `
    <section class="column-detail" aria-labelledby="column-detail-title">
      <header class="column-detail-hero">
        <img src="${escapeHtml(withRoot(column.cover))}" alt="" aria-hidden="true">
        <span class="column-detail-shade"></span>
        <div class="column-detail-copy">
          <a class="column-detail-back" href="${escapeHtml(withRoot('categories/'))}"><i class="fas fa-arrow-left" aria-hidden="true"></i>全部专栏</a>
          <span class="column-detail-eyebrow">${escapeHtml(column.eyebrow)}</span>
          <h1 id="column-detail-title">${escapeHtml(column.name)}</h1>
          <p>${escapeHtml(column.tagline)}</p>
          <span class="column-detail-count">${posts.length} 篇文章</span>
        </div>
      </header>
      <div class="column-detail-intro">${escapeHtml(column.description)}</div>
      <div class="column-post-heading">
        <span>文章</span>
        <span>${posts.length}</span>
      </div>
      <div class="column-post-list">${postCards}</div>
    </section>`
}

hexo.extend.tag.register('column_grid', renderColumnGrid)

hexo.extend.generator.register('empty-column-pages', locals => {
  const existingCategories = new Set(asArray(locals.categories).map(category => category.name))
  const columns = locals.data && Array.isArray(locals.data.columns)
    ? locals.data.columns
    : getColumns()

  return columns
    .filter(column => !existingCategories.has(column.name))
    .map(column => ({
      path: `${getCategoryDirectory(column.name)}index.html`,
      layout: 'category',
      data: {
        title: column.name,
        category: column.name,
        type: 'category',
        aside: false,
        posts: []
      }
    }))
})

hexo.extend.filter.register('template_locals', locals => {
  if (!locals.page || !locals.page.category) return locals

  locals.page.type = 'category'
  locals.page.aside = false
  locals.body = renderCategoryDetail(locals.page)
  return locals
})
