/**
 * src/index.js — small-vue 顶层入口
 *
 * 导出所有公共 API，并实现 createApp()。
 *
 * 使用方式：
 *   import { createApp, ref, reactive, h } from './src/index.js'
 *
 *   const app = createApp(RootComponent)
 *   app.mount('#app')
 */

import { render } from './runtime/renderer.js'
import { h } from './runtime/vnode.js'

// ─── 响应式 API ───────────────────────────────────────────────────────
export { effect, track, trigger } from './reactivity/effect.js'
export { reactive } from './reactivity/reactive.js'
export { ref, isRef, unref } from './reactivity/ref.js'
export { computed } from './reactivity/computed.js'
export { watch, watchEffect } from './reactivity/watch.js'

// ─── 运行时 API ───────────────────────────────────────────────────────
export { h, createTextVNode, Text, Fragment } from './runtime/vnode.js'
export { createRenderer } from './runtime/renderer.js'
export { onMounted, onUpdated, onUnmounted } from './runtime/lifecycle.js'

// ─── 编译器 API ───────────────────────────────────────────────────────
export { compile } from './compiler/index.js'

// ─── createApp ────────────────────────────────────────────────────────

/**
 * 创建应用实例
 * @param {object} rootComponent — 根组件选项对象（含 setup、render 等）
 * @returns {{ mount: Function }}
 */
export function createApp(rootComponent) {
  // 创建根组件 VNode
  const app = {
    _component: rootComponent,
    _container: null,

    /**
     * 挂载应用到 DOM 容器
     * @param {string|Element} containerOrSelector — CSS 选择器或 DOM 元素
     */
    mount(containerOrSelector) {
      // 解析容器
      const container =
        typeof containerOrSelector === 'string'
          ? document.querySelector(containerOrSelector)
          : containerOrSelector

      if (!container) {
        console.warn(`[small-vue] 找不到挂载容器：${containerOrSelector}`)
        return
      }

      app._container = container

      // 清空容器内容（支持服务端渲染的占位内容）
      container.innerHTML = ''

      // 创建根组件 VNode 并渲染
      const vnode = h(rootComponent, null, null)
      render(vnode, container)

      return app
    },

    /**
     * 卸载应用
     */
    unmount() {
      if (app._container) {
        render(null, app._container)
      }
    }
  }

  return app
}
