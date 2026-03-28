/**
 * reactive.js — 基于 Proxy 的响应式对象
 *
 * 使用 Proxy 拦截对象的 get / set 操作：
 *   - get：调用 track() 收集依赖
 *   - set：调用 trigger() 触发更新
 *
 * 支持嵌套对象自动递归代理（懒代理，访问时才转换）
 */

import { track, trigger } from './effect.js'

// 缓存已经代理过的对象，避免重复创建 Proxy
const proxyMap = new WeakMap()

/**
 * 将普通对象转换为响应式代理对象
 * @param {object} raw — 原始对象
 * @returns {Proxy}
 */
export function reactive(raw) {
  // 如果不是对象则直接返回
  if (typeof raw !== 'object' || raw === null) return raw

  // 已经代理过，直接返回缓存
  if (proxyMap.has(raw)) return proxyMap.get(raw)

  const proxy = new Proxy(raw, {
    get(target, key, receiver) {
      // 读取属性时收集依赖
      track(target, key)
      const value = Reflect.get(target, key, receiver)
      // 如果属性值也是对象，递归转换为响应式（懒代理）
      if (typeof value === 'object' && value !== null) {
        return reactive(value)
      }
      return value
    },

    set(target, key, value, receiver) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value, receiver)
      // 只有值真正发生变化时才触发更新
      if (oldValue !== value) {
        trigger(target, key)
      }
      return result
    },

    has(target, key) {
      // 拦截 in 操作符，收集依赖
      track(target, key)
      return Reflect.has(target, key)
    },

    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key)
      if (result) {
        trigger(target, key)
      }
      return result
    }
  })

  proxyMap.set(raw, proxy)
  return proxy
}
