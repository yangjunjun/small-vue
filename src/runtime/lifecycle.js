/**
 * lifecycle.js — 生命周期钩子
 *
 * 使用全局变量 currentInstance 追踪当前正在初始化的组件实例。
 * 生命周期钩子函数（onMounted、onUpdated、onUnmounted）在 setup() 期间调用，
 * 将回调注册到当前组件实例上，在对应时机由渲染器调用。
 */

// 当前正在初始化的组件实例
export let currentInstance = null

/**
 * 设置当前组件实例（在 setup() 调用前设置，调用后清空）
 */
export function setCurrentInstance(instance) {
  currentInstance = instance
}

/**
 * 注册 onMounted 钩子
 * 组件首次挂载到 DOM 后调用
 * @param {Function} fn
 */
export function onMounted(fn) {
  registerHook('mounted', fn)
}

/**
 * 注册 onUpdated 钩子
 * 组件因响应式数据变化重新渲染后调用
 * @param {Function} fn
 */
export function onUpdated(fn) {
  registerHook('updated', fn)
}

/**
 * 注册 onUnmounted 钩子
 * 组件从 DOM 卸载后调用
 * @param {Function} fn
 */
export function onUnmounted(fn) {
  registerHook('unmounted', fn)
}

/**
 * 内部：将钩子函数注册到当前组件实例
 */
function registerHook(type, fn) {
  if (!currentInstance) {
    console.warn(`[small-vue] ${type} 钩子只能在 setup() 内部调用`)
    return
  }

  // 初始化钩子数组
  if (!currentInstance.hooks[type]) {
    currentInstance.hooks[type] = []
  }

  currentInstance.hooks[type].push(fn)
}

/**
 * 调用组件实例上指定类型的生命周期钩子
 * @param {object} instance — 组件实例
 * @param {string} type — 钩子类型名称
 */
export function callHooks(instance, type) {
  const hooks = instance.hooks && instance.hooks[type]
  if (hooks) {
    hooks.forEach(fn => fn())
  }
}
