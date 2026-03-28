/**
 * effect.js — 副作用函数与依赖追踪
 *
 * 核心数据结构：
 *   WeakMap<target, Map<key, Set<effect>>>
 *
 * 核心流程：
 *   effect(fn) → 执行 fn → 触发 proxy.get → track → 收集依赖
 *   响应式数据变化 → 触发 proxy.set → trigger → 执行所有依赖 effect
 */

// 当前正在执行的副作用函数
export let activeEffect = null

// 副作用函数调用栈，支持嵌套 effect
const effectStack = []

// 依赖存储：WeakMap<target, Map<key, Set<ReactiveEffect>>>
const targetMap = new WeakMap()

/**
 * 创建并执行副作用函数
 * @param {Function} fn  — 用户传入的副作用逻辑
 * @param {Object} options — { lazy: boolean, scheduler: Function }
 * @returns {ReactiveEffect}
 */
export function effect(fn, options = {}) {
  const effectFn = createReactiveEffect(fn, options)

  if (!options.lazy) {
    // 非懒执行，立即运行一次以收集依赖
    effectFn()
  }

  return effectFn
}

/**
 * 内部：创建响应式副作用函数
 */
function createReactiveEffect(fn, options) {
  const effectFn = function reactiveEffect() {
    if (effectStack.includes(effectFn)) {
      // 避免循环依赖导致的无限递归
      return
    }

    try {
      // 入栈，将 activeEffect 指向当前 effect
      effectStack.push(effectFn)
      activeEffect = effectFn
      return fn()
    } finally {
      // 出栈，恢复上一层 activeEffect
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1] || null
    }
  }

  effectFn.options = options
  // 记录该 effect 订阅了哪些依赖集合，便于清理
  effectFn.deps = []

  return effectFn
}

/**
 * 依赖收集：在响应式数据被读取时调用
 * @param {object} target — 原始对象
 * @param {string|symbol} key — 被读取的属性
 */
export function track(target, key) {
  if (!activeEffect) return

  // 获取或创建 target 对应的 depsMap
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  // 获取或创建 key 对应的 dep Set
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  // 将当前 effect 加入依赖集合
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    // 反向记录，让 effect 知道自己订阅了哪些 dep
    activeEffect.deps.push(dep)
  }
}

/**
 * 依赖触发：在响应式数据被修改时调用
 * @param {object} target — 原始对象
 * @param {string|symbol} key — 被修改的属性
 */
export function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (!dep) return

  // 遍历并执行所有依赖该属性的 effect
  dep.forEach(effectFn => {
    if (effectFn.options.scheduler) {
      // 如果有调度器（如 computed、watch），交由调度器处理
      effectFn.options.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}
