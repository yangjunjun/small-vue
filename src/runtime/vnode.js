/**
 * vnode.js — 虚拟 DOM（VNode）定义
 *
 * VNode 是对真实 DOM 的轻量描述，结构如下：
 *   {
 *     type,      — 节点类型：字符串（元素标签）| 对象/函数（组件）| Symbol（特殊）
 *     props,     — 属性对象，如 { id: 'app', onClick: fn }
 *     children,  — 子节点：字符串（文本）| VNode[] | null
 *     el,        — 对应的真实 DOM 节点（挂载后填充）
 *     component, — 组件实例（组件节点挂载后填充）
 *     key,       — 用于 diff 算法的 key
 *   }
 */

// 特殊节点类型
export const Text = Symbol('Text')       // 文本节点
export const Fragment = Symbol('Fragment') // 片段节点（多根）

/**
 * 创建 VNode
 * @param {string|object|Function|Symbol} type — 节点类型
 * @param {object|null} props — 属性
 * @param {string|Array|null} children — 子节点
 * @returns {VNode}
 */
export function h(type, props = null, children = null) {
  // 规范化 children
  if (typeof children === 'string' || typeof children === 'number') {
    // 文本内容：直接保留
    children = String(children)
  } else if (!Array.isArray(children)) {
    // null / undefined / boolean 统一为 null
    if (children !== null && children !== undefined) {
      children = [children]
    }
  }

  return {
    type,
    props,
    children,
    el: null,       // 真实 DOM 引用（渲染后设置）
    component: null, // 组件实例（组件渲染后设置）
    key: props && props.key != null ? props.key : null
  }
}

/**
 * 创建文本节点 VNode
 * @param {string} text
 */
export function createTextVNode(text) {
  return h(Text, null, String(text))
}

/**
 * 判断是否是组件类型的 VNode（type 为对象或函数）
 */
export function isComponent(vnode) {
  return typeof vnode.type === 'object' || typeof vnode.type === 'function'
}

/**
 * 规范化 VNode：处理原始字符串/数字为文本 VNode
 */
export function normalizeVNode(vnode) {
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return createTextVNode(String(vnode))
  }
  return vnode
}
