/**
 * parse.js — 模板字符串解析器
 *
 * 将模板字符串解析为 AST（抽象语法树）。
 *
 * AST 节点类型：
 *   - Element:       { type: 'Element', tag, props, directives, children }
 *   - Text:          { type: 'Text', content }
 *   - Interpolation: { type: 'Interpolation', expression }  —  {{ expr }}
 *
 * 支持：
 *   - 普通元素标签（如 <div>、<span>）
 *   - 静态属性（id="app"）
 *   - 动态属性（:key="val" 或 v-bind:key="val"）
 *   - 事件绑定（@click="handler" 或 v-on:click="handler"）
 *   - 插值表达式（{{ expression }}）
 *   - 文本节点
 *   - v-if 指令（基础支持）
 *   - v-for 指令（基础支持）
 */

/**
 * 解析模板字符串，返回 AST 根节点（Fragment）
 * @param {string} template
 * @returns {{ type: 'Fragment', children: Array }}
 */
export function parse(template) {
  const context = createParseContext(template)
  const children = parseChildren(context, [])
  return { type: 'Fragment', children }
}

// ─── 上下文 ───────────────────────────────────────────────────────────

function createParseContext(content) {
  return { source: content }
}

function advanceBy(context, n) {
  context.source = context.source.slice(n)
}

function advanceSpaces(context) {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) advanceBy(context, match[0].length)
}

// ─── 子节点解析 ───────────────────────────────────────────────────────

function parseChildren(context, ancestors) {
  const nodes = []

  while (!isEnd(context, ancestors)) {
    const s = context.source
    let node

    if (s.startsWith('{{')) {
      node = parseInterpolation(context)
    } else if (s[0] === '<' && /[a-zA-Z]/.test(s[1])) {
      node = parseElement(context, ancestors)
    }

    if (!node) {
      node = parseText(context)
    }

    if (node) nodes.push(node)
  }

  return nodes
}

function isEnd(context, ancestors) {
  const s = context.source
  // 遇到祖先标签的结束标签时停止当前层级解析
  if (s.startsWith('</')) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (startsWithEndTagOpen(s, ancestors[i])) return true
    }
  }
  return !s
}

function startsWithEndTagOpen(source, tag) {
  return (
    source.startsWith('</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    /[\t\r\n\f />]/.test(source[2 + tag.length] || '')
  )
}

// ─── 插值 {{ }} ──────────────────────────────────────────────────────

function parseInterpolation(context) {
  advanceBy(context, 2) // 消耗 '{{'
  const closeIndex = context.source.indexOf('}}')
  const expression = context.source.slice(0, closeIndex).trim()
  advanceBy(context, closeIndex + 2) // 消耗表达式 + '}}'
  return { type: 'Interpolation', expression }
}

// ─── 文本节点 ─────────────────────────────────────────────────────────

function parseText(context) {
  let endIndex = context.source.length
  for (const token of ['<', '{{']) {
    const i = context.source.indexOf(token)
    if (i !== -1 && i < endIndex) endIndex = i
  }
  const content = context.source.slice(0, endIndex)
  advanceBy(context, content.length)
  return { type: 'Text', content }
}

// ─── 元素节点 ─────────────────────────────────────────────────────────

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
])

function parseElement(context, ancestors) {
  // 解析开始标签
  const element = parseOpenTag(context)

  // 自闭合或空标签
  if (element.isSelfClosing || VOID_TAGS.has(element.tag)) {
    return element
  }

  // 递归解析子节点
  ancestors.push(element.tag)
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  // 消耗结束标签
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseCloseTag(context)
  }

  return element
}

/**
 * 解析开始标签，返回元素节点（不含子节点）
 */
function parseOpenTag(context) {
  const match = /^<([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  const tag = match[1].toLowerCase()
  advanceBy(context, match[0].length)
  advanceSpaces(context)

  // 解析属性
  const { props, directives } = parseAttributes(context)

  // 检测自闭合 '/>'
  const isSelfClosing = context.source.startsWith('/>')
  advanceBy(context, isSelfClosing ? 2 : 1)

  return { type: 'Element', tag, props, directives, children: [], isSelfClosing }
}

/**
 * 消耗结束标签 </tag>
 */
function parseCloseTag(context) {
  advanceBy(context, 2) // '</
  const match = /^[^\t\r\n\f />]+/.exec(context.source)
  if (match) advanceBy(context, match[0].length)
  advanceSpaces(context)
  if (context.source.startsWith('>')) advanceBy(context, 1)
}

// ─── 属性解析 ─────────────────────────────────────────────────────────

/**
 * 解析属性列表
 * @returns {{ props: Array, directives: Array }}
 *   props:      [{ name, value }]           — 静态属性
 *   directives: [{ name, arg, value }]      — 指令（v-if、v-for、:bind、@on 等）
 */
function parseAttributes(context) {
  const props = []
  const directives = []

  while (
    context.source.length > 0 &&
    !context.source.startsWith('>') &&
    !context.source.startsWith('/>')
  ) {
    // 属性名
    const nameMatch = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
    if (!nameMatch) break
    const name = nameMatch[0]
    advanceBy(context, name.length)
    advanceSpaces(context)

    // 属性值
    let value = ''
    if (context.source.startsWith('=')) {
      advanceBy(context, 1)
      advanceSpaces(context)
      value = parseAttributeValue(context)
    }

    advanceSpaces(context)

    // 分类
    if (name.startsWith('v-')) {
      const rest = name.slice(2)
      const colonIdx = rest.indexOf(':')
      if (colonIdx !== -1) {
        directives.push({ name: rest.slice(0, colonIdx), arg: rest.slice(colonIdx + 1), value })
      } else {
        directives.push({ name: rest, arg: null, value })
      }
    } else if (name.startsWith(':')) {
      directives.push({ name: 'bind', arg: name.slice(1), value })
    } else if (name.startsWith('@')) {
      directives.push({ name: 'on', arg: name.slice(1), value })
    } else {
      props.push({ name, value })
    }
  }

  return { props, directives }
}

function parseAttributeValue(context) {
  const quote = context.source[0]
  let value

  if (quote === '"' || quote === "'") {
    advanceBy(context, 1)
    const endIndex = context.source.indexOf(quote)
    value = context.source.slice(0, endIndex < 0 ? undefined : endIndex)
    advanceBy(context, endIndex < 0 ? context.source.length : endIndex + 1)
  } else {
    const match = /^[^\t\r\n\f >]+/.exec(context.source)
    value = match ? match[0] : ''
    advanceBy(context, value.length)
  }

  return value
}
