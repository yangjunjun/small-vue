/**
 * codegen.js — 代码生成器
 *
 * 将 AST 节点转换为对应的 h() 函数调用代码字符串，
 * 生成的代码可通过 new Function() 执行，得到渲染函数。
 *
 * 示例：
 *   AST: Element { tag: 'div', props: [{name:'id',value:'app'}], children: [...] }
 *   → 代码: h('div', { id: 'app' }, [...])
 */

/**
 * 根据 AST 生成渲染函数代码字符串
 * @param {object} ast — parse() 返回的 AST 根节点
 * @returns {string} — 渲染函数的完整代码字符串
 */
export function generate(ast) {
  const context = createCodegenContext()
  genNode(ast, context)
  // 使用 with(_ctx) 将模板中的变量引用代理到组件实例，与 Vue 官方编译器策略一致。
  // 注意：with 语句在严格模式下不可用，因此生成的函数不能置于 'use strict' 环境。
  return `
with (_ctx) {
  const { h, createTextVNode } = _Vue
  return ${context.code}
}
`.trim()
}

function createCodegenContext() {
  return {
    code: '',
    push(str) { this.code += str }
  }
}

/**
 * 根据节点类型分发到对应的代码生成函数
 */
function genNode(node, context) {
  if (!node) {
    context.push('null')
    return
  }

  switch (node.type) {
    case 'Fragment':
      genFragment(node, context)
      break
    case 'Element':
      genElement(node, context)
      break
    case 'Text':
      genText(node, context)
      break
    case 'Interpolation':
      genInterpolation(node, context)
      break
    default:
      context.push('null')
  }
}

/**
 * 生成 Fragment（根节点包含多个子节点）
 */
function genFragment(node, context) {
  if (node.children.length === 1) {
    genNode(node.children[0], context)
  } else {
    context.push('[')
    node.children.forEach((child, index) => {
      if (index > 0) context.push(', ')
      genNode(child, context)
    })
    context.push(']')
  }
}

/**
 * 生成元素节点：h('tag', props, children)
 */
function genElement(node, context) {
  const { tag, props, directives, children } = node

  context.push(`h('${tag}', `)

  // 生成 props 对象
  genProps(props, directives, context)

  context.push(', ')

  // 生成子节点
  if (!children || children.length === 0) {
    context.push('null')
  } else if (children.length === 1) {
    genNode(children[0], context)
  } else {
    context.push('[')
    children.forEach((child, index) => {
      if (index > 0) context.push(', ')
      genNode(child, context)
    })
    context.push(']')
  }

  context.push(')')
}

/**
 * 生成 props 对象代码
 * 合并静态属性和指令（v-bind、v-on、v-if、v-for 等）
 */
function genProps(props, directives, context) {
  // 检查是否有 v-if 或 v-for（特殊处理）
  // 简化实现：将 v-if 的条件包装为三元表达式（在 genElement 外部处理）
  // 这里只处理 props 和简单指令

  const allProps = []

  // 静态属性
  props.forEach(({ name, value }) => {
    allProps.push(`${JSON.stringify(name)}: ${JSON.stringify(value)}`)
  })

  // 处理指令
  directives.forEach(({ name, arg, value }) => {
    if (name === 'bind' && arg) {
      // :key="expr" → key: expr
      allProps.push(`${JSON.stringify(arg)}: ${value}`)
    } else if (name === 'on' && arg) {
      // @click="handler" → onClick: handler
      const eventName = `on${arg[0].toUpperCase()}${arg.slice(1)}`
      allProps.push(`${JSON.stringify(eventName)}: ${value}`)
    } else if (name === 'if') {
      // v-if 不加入 props，在外层处理（简化：忽略）
    } else if (name === 'for') {
      // v-for 不加入 props（简化：忽略）
    }
  })

  if (allProps.length === 0) {
    context.push('null')
  } else {
    context.push(`{ ${allProps.join(', ')} }`)
  }
}

/**
 * 生成文本节点：createTextVNode('content')
 */
function genText(node, context) {
  context.push(`createTextVNode(${JSON.stringify(node.content)})`)
}

/**
 * 生成插值节点：内联表达式
 */
function genInterpolation(node, context) {
  // 直接将表达式嵌入代码，通过 with(_ctx) 访问上下文
  context.push(`(${node.expression})`)
}
