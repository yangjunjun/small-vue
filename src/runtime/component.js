/**
 * component.js — 组件挂载与更新
 *
 * 组件实例（instance）结构：
 *   {
 *     vnode,       — 组件 VNode
 *     type,        — 组件选项对象
 *     props,       — 响应式 props
 *     setupState,  — setup() 返回的数据
 *     render,      — 渲染函数
 *     subTree,     — 上次渲染的子树 VNode
 *     isMounted,   — 是否已挂载
 *     hooks,       — 生命周期钩子 { mounted: [], updated: [], unmounted: [] }
 *   }
 */

import { reactive } from '../reactivity/reactive.js'
import { effect } from '../reactivity/effect.js'
import { setCurrentInstance, callHooks } from './lifecycle.js'
import { h } from './vnode.js'

/**
 * 创建组件实例
 */
export function createComponentInstance(vnode) {
  const instance = {
    vnode,
    type: vnode.type,           // 组件选项对象
    props: {},                   // 将从 vnode.props 提取，reactive 化
    setupState: {},              // setup() 的返回值
    render: null,                // 渲染函数
    subTree: null,               // 当前渲染的子树
    isMounted: false,
    hooks: {}                    // 生命周期钩子
  }
  return instance
}

/**
 * 初始化组件：处理 props、执行 setup()、获取 render 函数
 */
export function setupComponent(instance) {
  const { props: vnodeProps = {} } = instance.vnode

  // 将所有 vnode props 直接转为响应式（简化实现，不区分 props/attrs）
  instance.props = reactive(Object.assign({}, vnodeProps))

  // 执行 setup()
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type

  // 设置当前实例，使生命周期钩子可以正确注册
  setCurrentInstance(instance)

  // 构建 setup context
  const setupContext = {
    emit: createEmit(instance),
    attrs: {},
    slots: {}
  }

  if (Component.setup) {
    const setupResult = Component.setup(instance.props, setupContext)
    setCurrentInstance(null) // setup 执行完毕后清空

    if (typeof setupResult === 'function') {
      // setup 直接返回渲染函数
      instance.render = setupResult
    } else if (typeof setupResult === 'object' && setupResult !== null) {
      // setup 返回数据对象，供 render 函数使用
      instance.setupState = setupResult
    }
  } else {
    setCurrentInstance(null)
  }

  // 获取渲染函数：优先使用 setup 返回的，其次使用组件选项中的
  if (!instance.render) {
    instance.render = Component.render
  }
}

/**
 * 创建组件的 emit 函数
 */
function createEmit(instance) {
  return function emit(event, ...args) {
    const handlerName = `on${event[0].toUpperCase()}${event.slice(1)}`
    const handler = instance.vnode.props && instance.vnode.props[handlerName]
    if (handler) {
      handler(...args)
    }
  }
}

/**
 * 挂载组件
 * @param {VNode} vnode — 组件 VNode
 * @param {Element} container — 挂载容器
 * @param {Function} patch — 渲染器的 patch 函数
 * @param {Element|null} anchor — 挂载锚点
 */
export function mountComponent(vnode, container, patch, anchor = null) {
  // 创建组件实例
  const instance = createComponentInstance(vnode)
  // 将实例挂到 vnode 上，方便后续更新时访问
  vnode.component = instance

  // 初始化：处理 props，执行 setup
  setupComponent(instance)

  // 用 effect 包裹渲染，实现响应式自动更新
  setupRenderEffect(instance, vnode, container, patch, anchor)
}

/**
 * 用 effect 包裹组件渲染逻辑，实现自动追踪依赖并在数据变化时更新
 */
function setupRenderEffect(instance, vnode, container, patch, anchor) {
  effect(() => {
    if (!instance.isMounted) {
      // —— 首次挂载 ——

      // 执行渲染函数，得到子树 VNode（代理组件实例以访问 setupState 和 props）
      const subTree = renderComponentRoot(instance)
      instance.subTree = subTree

      // 将子树渲染到容器
      patch(null, subTree, container, anchor)

      // 记录根 DOM 节点
      vnode.el = subTree.el

      instance.isMounted = true

      // 调用 onMounted 钩子
      callHooks(instance, 'mounted')
    } else {
      // —— 更新 ——

      const prevTree = instance.subTree
      const nextTree = renderComponentRoot(instance)
      instance.subTree = nextTree

      // diff 新旧子树
      patch(prevTree, nextTree, container, anchor)
      vnode.el = nextTree.el

      // 调用 onUpdated 钩子
      callHooks(instance, 'updated')
    }
  })
}

/**
 * 执行组件的渲染函数，返回 VNode 子树
 * 通过 Proxy 将 this 代理到 setupState 和 props，方便渲染函数中使用
 */
function renderComponentRoot(instance) {
  const { render, setupState, props } = instance

  // 创建渲染代理，让 render 函数可以通过 this.xxx 访问 setupState 和 props
  const proxy = new Proxy(instance, {
    get(target, key) {
      if (key in target.setupState) {
        return target.setupState[key]
      }
      if (key in target.props) {
        return target.props[key]
      }
      return target[key]
    },
    set(target, key, value) {
      if (key in target.setupState) {
        target.setupState[key] = value
        return true
      }
      if (key in target.props) {
        target.props[key] = value
        return true
      }
      target[key] = value
      return true
    }
  })

  return render.call(proxy, proxy)
}

/**
 * 更新组件（父组件重渲染时调用）
 */
export function updateComponent(n1, n2, patch) {
  // 复用组件实例
  const instance = (n2.component = n1.component)
  // 更新 props
  updateProps(instance, n2.props)
}

function updateProps(instance, nextProps = {}) {
  const { props } = instance
  // 更新已有 props
  for (const key in nextProps) {
    props[key] = nextProps[key]
  }
  // 删除不再存在的 props
  for (const key in props) {
    if (!(key in nextProps)) {
      delete props[key]
    }
  }
}
