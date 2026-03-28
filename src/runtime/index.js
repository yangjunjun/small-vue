/**
 * runtime/index.js — 运行时模块统一导出
 */

export { h, createTextVNode, normalizeVNode, Text, Fragment } from './vnode.js'
export { createRenderer, renderer, render } from './renderer.js'
export { mountComponent, updateComponent, createComponentInstance, setupComponent } from './component.js'
export { onMounted, onUpdated, onUnmounted, setCurrentInstance, callHooks } from './lifecycle.js'
