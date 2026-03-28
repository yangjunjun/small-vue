/**
 * examples/app.js — 示例根组件
 *
 * 使用 mini-vue 的 setup()、ref()、h()、onMounted 等 API
 * 实现一个包含计数器和嵌套组件的示例。
 */

import {
  ref,
  reactive,
  computed,
  watch,
  h,
  onMounted,
  onUpdated,
  onUnmounted
} from '../src/index.js'

// ─── 子组件：显示标题 ────────────────────────────────────────────────

const TitleComponent = {
  props: { title: String },

  setup(props) {
    onMounted(() => {
      console.log('[TitleComponent] onMounted — 标题组件已挂载')
    })

    return () =>
      h('h1', { style: 'color: #42b883; font-family: sans-serif;' }, props.title)
  }
}

// ─── 子组件：计数器 ──────────────────────────────────────────────────

const CounterComponent = {
  setup() {
    const count = ref(0)
    const double = computed(() => count.value * 2)

    // 侦听 count 变化
    watch(count, (newVal, oldVal) => {
      console.log(`[watch] count 从 ${oldVal} 变为 ${newVal}`)
    })

    onMounted(() => {
      console.log('[CounterComponent] onMounted — 计数器组件已挂载')
    })

    onUpdated(() => {
      console.log('[CounterComponent] onUpdated — 计数器已更新，当前值：', count.value)
    })

    onUnmounted(() => {
      console.log('[CounterComponent] onUnmounted — 计数器组件已卸载')
    })

    const increment = () => { count.value++ }
    const decrement = () => { count.value-- }
    const reset = () => { count.value = 0 }

    return () =>
      h('div', { style: 'border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin: 16px 0;' }, [
        h('p', { style: 'font-size: 48px; margin: 0; text-align: center; font-family: monospace;' },
          String(count.value)
        ),
        h('p', { style: 'color: #666; text-align: center;' },
          `双倍值：${double.value}`
        ),
        h('div', { style: 'display: flex; gap: 8px; justify-content: center; margin-top: 12px;' }, [
          h('button', {
            onClick: decrement,
            style: 'padding: 8px 24px; font-size: 20px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc;'
          }, '−'),
          h('button', {
            onClick: reset,
            style: 'padding: 8px 16px; font-size: 14px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #f5f5f5;'
          }, '重置'),
          h('button', {
            onClick: increment,
            style: 'padding: 8px 24px; font-size: 20px; cursor: pointer; border-radius: 4px; border: 1px solid #42b883; background: #42b883; color: white;'
          }, '+')
        ])
      ])
  }
}

// ─── 子组件：响应式用户信息表单 ─────────────────────────────────────

const UserInfoComponent = {
  setup() {
    const user = reactive({
      name: '小明',
      age: 18
    })

    const greeting = computed(() =>
      user.name ? `你好，${user.name}！今年 ${user.age} 岁。` : '请输入姓名'
    )

    const updateName = (e) => { user.name = e.target.value }
    const updateAge = (e) => { user.age = parseInt(e.target.value, 10) || 0 }

    return () =>
      h('div', { style: 'border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin: 16px 0;' }, [
        h('h3', { style: 'margin: 0 0 12px; font-family: sans-serif; color: #333;' }, '响应式表单示例'),
        h('div', { style: 'display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;' }, [
          h('label', { style: 'display: flex; align-items: center; gap: 8px;' }, [
            h('span', null, '姓名：'),
            h('input', {
              value: user.name,
              onInput: updateName,
              style: 'padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px;'
            }, null)
          ]),
          h('label', { style: 'display: flex; align-items: center; gap: 8px;' }, [
            h('span', null, '年龄：'),
            h('input', {
              value: String(user.age),
              onInput: updateAge,
              type: 'number',
              style: 'padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; width: 80px;'
            }, null)
          ])
        ]),
        h('p', {
          style: 'padding: 10px; background: #f0f8f4; border-radius: 4px; color: #42b883; font-family: sans-serif;'
        }, greeting.value)
      ])
  }
}

// ─── 根组件：App ─────────────────────────────────────────────────────

export const App = {
  setup() {
    const title = ref('🌱 small-vue — mini Vue3 实现')

    onMounted(() => {
      console.log('[App] onMounted — 应用已挂载！')
      console.log('[App] 打开控制台可以看到生命周期钩子和 watch 的日志输出')
    })

    return () =>
      h('div', {
        style: 'max-width: 600px; margin: 40px auto; padding: 0 20px; font-family: sans-serif;'
      }, [
        // 标题组件（嵌套组件示例）
        h(TitleComponent, { title: title.value }, null),

        // 说明文字
        h('p', { style: 'color: #666; line-height: 1.6;' },
          '这是一个从零实现的 mini Vue3 系统，涵盖响应式、虚拟DOM、组件、生命周期等核心功能。'
        ),

        // 分隔线
        h('hr', { style: 'border: none; border-top: 1px solid #eee; margin: 20px 0;' }, null),

        // 计数器组件
        h('h2', { style: 'color: #333; margin: 0 0 8px;' }, '📊 计数器示例'),
        h(CounterComponent, null, null),

        // 分隔线
        h('hr', { style: 'border: none; border-top: 1px solid #eee; margin: 20px 0;' }, null),

        // 响应式用户信息
        h('h2', { style: 'color: #333; margin: 0 0 8px;' }, '✏️ 响应式数据绑定'),
        h(UserInfoComponent, null, null),

        // 底部说明
        h('hr', { style: 'border: none; border-top: 1px solid #eee; margin: 20px 0;' }, null),
        h('p', { style: 'color: #999; font-size: 14px; text-align: center;' },
          '打开浏览器控制台查看生命周期钩子 & watch 日志'
        )
      ])
  }
}
