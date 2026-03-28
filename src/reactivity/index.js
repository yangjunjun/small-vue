/**
 * reactivity/index.js — 响应式模块统一导出
 */

export { effect, track, trigger } from './effect.js'
export { reactive } from './reactive.js'
export { ref, isRef, unref } from './ref.js'
export { computed } from './computed.js'
export { watch, watchEffect } from './watch.js'
