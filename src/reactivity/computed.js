/**
 * computed.js — 计算属性
 *
 * computed() 返回一个只读的 ref 对象，具有以下特性：
 *   - 懒计算：第一次访问 .value 时才执行 getter
 *   - 缓存：依赖未变化时直接返回缓存值（dirty 标志控制）
 *   - 响应式：当依赖的响应式数据变化时，重新计算
 */

import { effect, track, trigger } from './effect.js'

/**
 * 创建计算属性
 * @param {Function} getter — 计算函数
 * @returns {{ value: * }} — 只读 ref
 */
export function computed(getter) {
  // dirty 为 true 表示需要重新计算
  let dirty = true
  // 缓存的计算结果
  let value

  // 使用 lazy effect 包裹 getter，不立即执行
  // 通过 scheduler 控制：依赖变化时只标记 dirty，不立即重算
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      if (!dirty) {
        // 依赖变化时标记为脏，并通知 computed 的订阅者
        dirty = true
        trigger(computedRef, 'value')
      }
    }
  })

  const computedRef = {
    __isRef: true,

    get value() {
      // 只有脏时才重新计算
      if (dirty) {
        dirty = false
        value = effectFn()
      }
      // 收集对 computed 本身的依赖
      track(computedRef, 'value')
      return value
    }
  }

  return computedRef
}
