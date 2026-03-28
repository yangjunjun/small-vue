/**
 * watch.js — 侦听器
 *
 * watch(source, cb, options)：
 *   - 侦听响应式数据（reactive 对象或 ref）或 getter 函数
 *   - 数据变化时调用回调函数，传入新值和旧值
 *   - 支持 immediate：立即执行一次回调
 *   - 支持 deep：深层遍历触发依赖收集
 *
 * watchEffect(fn)：
 *   - 立即执行 fn，并自动追踪其中用到的响应式依赖
 *   - 依赖变化时重新执行 fn
 */

import { effect, activeEffect } from './effect.js'
import { isRef } from './ref.js'

/**
 * 侦听响应式数据变化
 * @param {object|Function} source — 响应式对象、ref 或 getter 函数
 * @param {Function} cb — 回调函数，签名为 (newValue, oldValue) => void
 * @param {object} options — { immediate: boolean, deep: boolean }
 */
export function watch(source, cb, options = {}) {
  let getter

  if (isRef(source)) {
    // ref 类型：包装为访问 .value 的 getter
    getter = () => source.value
  } else if (typeof source === 'function') {
    // getter 函数类型：直接使用
    getter = source
  } else {
    // reactive 对象类型：深层遍历收集依赖
    getter = () => traverse(source)
  }

  let oldValue
  let cleanup // 清理副作用的函数

  // 提供给用户的 onCleanup 注册函数
  const onCleanup = (fn) => {
    cleanup = fn
  }

  const job = () => {
    const newValue = effectFn()
    // 执行清理（如果有）
    if (cleanup) {
      cleanup()
    }
    // 执行回调
    cb(newValue, oldValue, onCleanup)
    oldValue = newValue
  }

  // 用 effect 包裹 getter，并通过调度器控制回调时机
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      // 依赖变化时执行 job（即调用 cb）
      job()
    }
  })

  if (options.immediate) {
    // 立即执行
    job()
  } else {
    // 先运行一次以收集依赖，记录初始值
    oldValue = effectFn()
  }

  // 返回停止侦听的函数（当前为 no-op，完整实现需维护 effect deps 清理）
  return () => { /* stop watcher — not yet implemented */ }
}

/**
 * 立即执行并自动追踪依赖的侦听器
 * @param {Function} fn — 副作用函数
 */
export function watchEffect(fn) {
  return effect(fn)
}

/**
 * 深层遍历对象，触发所有属性的 get，用于 deep watch
 * @param {*} value — 要遍历的值
 * @param {Set} seen — 已访问集合（避免循环引用）
 */
function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return value
  }
  seen.add(value)
  for (const key in value) {
    // 访问每个属性以触发 track
    traverse(value[key], seen)
  }
  return value
}
