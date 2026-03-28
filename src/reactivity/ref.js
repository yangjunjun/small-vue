/**
 * ref.js — 基本值的响应式封装
 *
 * ref() 返回一个包含 .value 属性的响应式对象：
 *   - 访问 .value：调用 track() 收集依赖
 *   - 设置 .value：调用 trigger() 触发更新
 *   - 如果值是对象，内部使用 reactive() 处理，实现深层响应式
 */

import { track, trigger } from './effect.js'
import { reactive } from './reactive.js'

/**
 * 创建响应式引用
 * @param {*} value — 初始值（可以是基本类型或对象）
 * @returns {{ value: * }}
 */
export function ref(value) {
  return createRef(value)
}

function createRef(rawValue) {
  // 用于 track/trigger 的虚拟目标对象
  const refObj = {
    __isRef: true,
    _rawValue: rawValue,
    // 如果是对象类型，内部使用 reactive 转换
    _value: convert(rawValue),

    get value() {
      // 读取时收集依赖
      track(refObj, 'value')
      return this._value
    },

    set value(newValue) {
      // 只有值变化时才触发更新
      if (hasChanged(newValue, this._rawValue)) {
        this._rawValue = newValue
        this._value = convert(newValue)
        // 触发依赖
        trigger(refObj, 'value')
      }
    }
  }

  return refObj
}

/**
 * 如果值是对象，转为 reactive；否则原样返回
 */
function convert(value) {
  return typeof value === 'object' && value !== null ? reactive(value) : value
}

/**
 * 检查值是否发生变化（处理 NaN 情况）
 */
function hasChanged(newValue, oldValue) {
  return !Object.is(newValue, oldValue)
}

/**
 * 判断一个值是否是 ref
 */
export function isRef(ref) {
  return !!(ref && ref.__isRef === true)
}

/**
 * 自动解包 ref：如果是 ref 则返回 .value，否则原样返回
 */
export function unref(ref) {
  return isRef(ref) ? ref.value : ref
}
