/**
 * renderer.js — 渲染器
 *
 * 实现：
 *   - createRenderer(options)：工厂函数，支持自定义 DOM 操作接口（平台无关）
 *   - render(vnode, container)：将 VNode 渲染到真实 DOM
 *   - patch(n1, n2, container)：对比新旧 VNode，最小化更新 DOM
 *
 * patch 策略：
 *   1. 类型不同：卸载旧节点，挂载新节点
 *   2. 文本节点：直接更新文本内容
 *   3. 元素节点：patchElement（更新 props + diff children）
 *   4. 组件节点：mountComponent / updateComponent
 */

import { Text, Fragment, isComponent, normalizeVNode } from './vnode.js'
import { mountComponent, updateComponent } from './component.js'
import { callHooks } from './lifecycle.js'

/**
 * 创建渲染器
 * @param {object} options — DOM 操作接口（默认为浏览器 DOM）
 */
export function createRenderer(options = {}) {
  const {
    createElement = tag => document.createElement(tag),
    createText = text => document.createTextNode(text),
    setText = (node, text) => { node.nodeValue = text },
    setElementText = (el, text) => { el.textContent = text },
    insert = (child, parent, anchor = null) => parent.insertBefore(child, anchor),
    remove = child => {
      const parent = child.parentNode
      if (parent) parent.removeChild(child)
    },
    patchProp = defaultPatchProp
  } = options

  /**
   * 核心 patch 函数：对比并更新 VNode
   * @param {VNode|null} n1 — 旧 VNode（null 表示初次挂载）
   * @param {VNode} n2 — 新 VNode
   * @param {Element} container — 父容器
   * @param {Element|null} anchor — 插入锚点
   */
  function patch(n1, n2, container, anchor = null) {
    // 类型不同：卸载旧节点
    if (n1 && n1.type !== n2.type) {
      unmount(n1)
      n1 = null
    }

    const { type } = n2

    if (type === Text) {
      // 文本节点
      processText(n1, n2, container, anchor)
    } else if (type === Fragment) {
      // 片段节点
      processFragment(n1, n2, container, anchor)
    } else if (typeof type === 'string') {
      // 普通 HTML 元素
      processElement(n1, n2, container, anchor)
    } else if (isComponent(n2)) {
      // 组件
      processComponent(n1, n2, container, anchor)
    }
  }

  // ─── 文本节点处理 ─────────────────────────────

  function processText(n1, n2, container, anchor) {
    if (!n1) {
      // 挂载
      n2.el = createText(n2.children)
      insert(n2.el, container, anchor)
    } else {
      // 更新
      const el = (n2.el = n1.el)
      if (n2.children !== n1.children) {
        setText(el, n2.children)
      }
    }
  }

  // ─── 片段节点处理 ─────────────────────────────

  function processFragment(n1, n2, container, anchor) {
    if (!n1) {
      mountChildren(n2.children || [], container, anchor)
    } else {
      patchChildren(n1, n2, container, anchor)
    }
  }

  // ─── 元素节点处理 ────────────────────────────

  function processElement(n1, n2, container, anchor) {
    if (!n1) {
      mountElement(n2, container, anchor)
    } else {
      patchElement(n1, n2)
    }
  }

  function mountElement(vnode, container, anchor) {
    const el = (vnode.el = createElement(vnode.type))

    // 设置 props
    if (vnode.props) {
      for (const key in vnode.props) {
        patchProp(el, key, null, vnode.props[key])
      }
    }

    // 处理子节点
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      mountChildren(vnode.children, el, null)
    }

    insert(el, container, anchor)
  }

  function patchElement(n1, n2) {
    const el = (n2.el = n1.el)

    // 更新 props
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProp(el, key, oldProps[key], newProps[key])
      }
    }
    // 删除不再存在的 props
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProp(el, key, oldProps[key], null)
      }
    }

    // 更新子节点
    patchChildren(n1, n2, el, null)
  }

  function mountChildren(children, container, anchor) {
    children.forEach(child => {
      patch(null, normalizeVNode(child), container, anchor)
    })
  }

  /**
   * diff 子节点
   * 三种情况：
   *   1. 新子节点是文本
   *   2. 新子节点是数组
   *   3. 新子节点为空
   */
  function patchChildren(n1, n2, container, anchor) {
    const c1 = n1.children
    const c2 = n2.children

    if (typeof c2 === 'string') {
      // 新子节点是文本
      if (Array.isArray(c1)) {
        c1.forEach(child => unmount(child))
      }
      if (c1 !== c2) {
        setElementText(container, c2)
      }
    } else if (Array.isArray(c2)) {
      if (Array.isArray(c1)) {
        // 新旧都是数组：带 key 的列表 diff
        patchKeyedChildren(c1, c2, container, anchor)
      } else {
        // 旧子节点是文本或空
        setElementText(container, '')
        mountChildren(c2, container, anchor)
      }
    } else {
      // 新子节点为空
      if (Array.isArray(c1)) {
        c1.forEach(child => unmount(child))
      } else if (typeof c1 === 'string') {
        setElementText(container, '')
      }
    }
  }

  /**
   * 带 key 的列表 diff 算法（简化的双端对比 + 最长递增子序列思路）
   *
   * 步骤：
   *   1. 预处理：从头部同步相同 key 的节点
   *   2. 预处理：从尾部同步相同 key 的节点
   *   3. 新节点多余：挂载
   *   4. 旧节点多余：卸载
   *   5. 中间乱序部分：建立 key→index 映射，复用/移动旧节点
   */
  function patchKeyedChildren(c1, c2, container, anchor) {
    let i = 0
    const l2 = c2.length
    let e1 = c1.length - 1
    let e2 = l2 - 1

    // 1. 从头部开始同步
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = normalizeVNode(c2[i])
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, anchor)
      } else {
        break
      }
      i++
    }

    // 2. 从尾部开始同步
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = normalizeVNode(c2[e2])
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, anchor)
      } else {
        break
      }
      e1--
      e2--
    }

    // 3. 旧节点已全部处理，新节点有剩余：挂载
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1
        const anchorNode = nextPos < l2 ? normalizeVNode(c2[nextPos]).el : anchor
        while (i <= e2) {
          patch(null, normalizeVNode(c2[i]), container, anchorNode)
          i++
        }
      }
    } else if (i > e2) {
      // 4. 新节点已全部处理，旧节点有剩余：卸载
      while (i <= e1) {
        unmount(c1[i])
        i++
      }
    } else {
      // 5. 中间乱序部分处理
      const s1 = i
      const s2 = i

      // 建立新节点 key → index 的映射表
      const keyToNewIndexMap = new Map()
      for (let j = s2; j <= e2; j++) {
        const n2 = normalizeVNode(c2[j])
        if (n2.key != null) {
          keyToNewIndexMap.set(n2.key, j)
        }
      }

      let patched = 0
      const toBePatched = e2 - s2 + 1
      // newIndex → oldIndex 的映射（0 表示新增）
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)

      // 遍历旧节点，查找可复用的新节点
      for (let j = s1; j <= e1; j++) {
        const prevChild = c1[j]
        if (patched >= toBePatched) {
          // 新节点已全部处理，多余的旧节点卸载
          unmount(prevChild)
          continue
        }

        let newIndex
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // 无 key：线性查找相同类型节点
          for (let k = s2; k <= e2; k++) {
            if (
              newIndexToOldIndexMap[k - s2] === 0 &&
              isSameVNodeType(prevChild, normalizeVNode(c2[k]))
            ) {
              newIndex = k
              break
            }
          }
        }

        if (newIndex === undefined) {
          unmount(prevChild)
        } else {
          newIndexToOldIndexMap[newIndex - s2] = j + 1
          patch(prevChild, normalizeVNode(c2[newIndex]), container, anchor)
          patched++
        }
      }

      // 从后往前遍历新节点，插入/移动
      for (let j = toBePatched - 1; j >= 0; j--) {
        const nextIndex = s2 + j
        const nextChild = normalizeVNode(c2[nextIndex])
        const nextAnchor = nextIndex + 1 < l2 ? normalizeVNode(c2[nextIndex + 1]).el : anchor

        if (newIndexToOldIndexMap[j] === 0) {
          // 新增节点
          patch(null, nextChild, container, nextAnchor)
        } else {
          // 移动节点（简化：直接 insert）
          insert(nextChild.el, container, nextAnchor)
        }
      }
    }
  }

  // ─── 组件节点处理 ────────────────────────────

  function processComponent(n1, n2, container, anchor) {
    if (!n1) {
      mountComponent(n2, container, patch, anchor)
    } else {
      updateComponent(n1, n2, patch)
    }
  }

  // ─── 卸载 ─────────────────────────────────

  function unmount(vnode) {
    if (!vnode) return

    // 调用组件的 onUnmounted 钩子
    if (vnode.component) {
      callHooks(vnode.component, 'unmounted')
    }

    const { type, children } = vnode

    if (type === Fragment) {
      // 片段：卸载所有子节点
      if (Array.isArray(children)) {
        children.forEach(child => unmount(child))
      }
    } else if (vnode.el) {
      remove(vnode.el)
    }
  }

  // ─── 渲染入口 ─────────────────────────────

  /**
   * 将 VNode 渲染到指定容器
   * @param {VNode|null} vnode — null 表示卸载
   * @param {Element} container
   */
  function render(vnode, container) {
    if (vnode === null) {
      // 卸载
      if (container._vnode) {
        unmount(container._vnode)
      }
    } else {
      // 首次挂载或更新
      patch(container._vnode || null, vnode, container)
    }
    // 记录当前 VNode，用于下次更新对比
    container._vnode = vnode
  }

  return { render, patch }
}

// ─── 默认 DOM 渲染器 ──────────────────────────

export const renderer = createRenderer()
export const { render, patch } = renderer

// ─── 工具函数 ─────────────────────────────────

/**
 * 判断两个 VNode 是否是相同类型（type 相同且 key 相同）
 */
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

/**
 * 默认的 prop 更新处理器
 */
function defaultPatchProp(el, key, prevValue, nextValue) {
  if (key === 'class') {
    el.className = nextValue || ''
  } else if (key === 'style') {
    if (nextValue === null) {
      el.removeAttribute('style')
    } else if (typeof nextValue === 'string') {
      el.style.cssText = nextValue
    } else {
      // 对象形式
      for (const styleName in nextValue) {
        el.style[styleName] = nextValue[styleName]
      }
      // 删除旧的样式
      if (prevValue && typeof prevValue === 'object') {
        for (const styleName in prevValue) {
          if (!nextValue[styleName]) {
            el.style[styleName] = ''
          }
        }
      }
    }
  } else if (key.startsWith('on')) {
    // 事件监听：onClick → click
    const eventName = key.slice(2).toLowerCase()
    if (prevValue) {
      el.removeEventListener(eventName, prevValue)
    }
    if (nextValue) {
      el.addEventListener(eventName, nextValue)
    }
  } else if (key !== 'key') {
    // 普通属性
    if (nextValue === null || nextValue === false) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, nextValue)
    }
  }
}
