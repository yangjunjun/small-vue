# small-vue 🌱

一个从零实现的 mini Vue3 系统，涵盖 Vue 3 的核心功能模块，代码结构清晰、注释详尽，适合学习参考。

---

## 目录结构

```
small-vue/
├── src/
│   ├── reactivity/
│   │   ├── effect.js       # 副作用函数、依赖追踪（track/trigger）
│   │   ├── reactive.js     # reactive() — 基于 Proxy 的响应式对象
│   │   ├── ref.js          # ref() — 基本值的响应式封装
│   │   ├── computed.js     # computed() — 带缓存的计算属性
│   │   ├── watch.js        # watch() / watchEffect() — 侦听器
│   │   └── index.js        # 统一导出
│   ├── runtime/
│   │   ├── vnode.js        # 虚拟 DOM（VNode）定义与 h() 函数
│   │   ├── renderer.js     # render()、patch()、DOM diff 算法
│   │   ├── component.js    # 组件挂载、setup()、props 处理
│   │   ├── lifecycle.js    # onMounted、onUpdated、onUnmounted
│   │   └── index.js        # 统一导出
│   ├── compiler/
│   │   ├── parse.js        # 模板字符串解析为 AST
│   │   ├── codegen.js      # AST 生成渲染函数代码
│   │   └── index.js        # compile() 入口
│   └── index.js            # 顶层导出：createApp、reactive、ref 等
├── examples/
│   ├── index.html          # 完整示例页面
│   └── app.js              # 示例组件（计数器 + 响应式表单 + 嵌套组件）
├── package.json
└── README.md
```

---

## 各模块功能说明

### 响应式系统（`src/reactivity/`）

| 文件 | 功能 |
|------|------|
| `effect.js` | 核心依赖追踪。使用 `WeakMap<target, Map<key, Set<effect>>>` 存储依赖关系；`track()` 收集依赖，`trigger()` 触发更新，`effect(fn)` 创建副作用 |
| `reactive.js` | 基于 `Proxy` 拦截对象的 get/set，实现深层响应式代理 |
| `ref.js` | 封装基本值为带 `.value` 的响应式对象；对象类型内部使用 `reactive` |
| `computed.js` | 懒计算 + 缓存（dirty 标志）；依赖变化时标记脏并通知订阅者 |
| `watch.js` | 支持侦听 ref、reactive 对象或 getter 函数；支持 `immediate` 和 `deep` 选项 |

### 运行时（`src/runtime/`）

| 文件 | 功能 |
|------|------|
| `vnode.js` | 定义 VNode 结构，实现 `h(type, props, children)` 创建虚拟节点 |
| `renderer.js` | `createRenderer()` 工厂函数；`patch()` 实现新旧 VNode diff；支持带 key 的列表 diff 算法 |
| `component.js` | 创建组件实例；执行 `setup(props, context)`；用 `effect` 包裹渲染实现自动更新 |
| `lifecycle.js` | 通过 `currentInstance` 全局变量关联钩子与组件；在挂载/更新/卸载时机调用 |

### 编译器（`src/compiler/`）

| 文件 | 功能 |
|------|------|
| `parse.js` | 将模板字符串解析为 AST；支持元素、文本、插值 `{{ }}`、属性、v-bind/v-on 指令 |
| `codegen.js` | 遍历 AST 生成 `h()` 调用代码字符串 |
| `index.js` | `compile(template)` 入口：parse → generate → `new Function` → 渲染函数 |

---

## 示例运行方法

```bash
# 安装 serve（如果没有）
npm install -g serve

# 或直接使用 npx
npx serve .
```

然后在浏览器中访问 `http://localhost:3000/examples/index.html`，即可看到：

- 🔢 **计数器组件**：点击按钮 +1 / −1 / 重置，展示响应式更新
- ✏️ **响应式表单**：输入框与计算属性实时绑定
- 🌐 **嵌套组件**：TitleComponent、CounterComponent、UserInfoComponent
- 📋 **生命周期日志**：打开控制台查看 onMounted / onUpdated / onUnmounted 输出

---

## 核心原理简要说明

### 响应式系统

```
响应式数据(Proxy)  →  effect(fn) 执行 fn  →  读取属性触发 get  →  track() 收集依赖
数据变化  →  set 触发  →  trigger()  →  执行所有依赖 effect  →  视图更新
```

- 依赖以 `WeakMap<target, Map<key, Set<effect>>>` 存储，精确到属性级别
- `computed` 通过 `lazy effect + scheduler` 实现按需计算与缓存
- `watch` 通过读取数据触发 track，在 scheduler 中执行用户回调

### 虚拟 DOM 与 Diff

- `h()` 创建轻量的 VNode 对象描述 DOM 结构
- `patch(n1, n2)` 对比新旧 VNode：类型不同则替换，相同则更新 props 和递归 diff 子节点
- 列表 diff 使用双端预处理 + key 映射复用，减少 DOM 操作

### 组件系统

- 每个组件创建一个 **实例对象**，包含 props、setupState、render、isMounted 等
- `setup(props, context)` 在挂载前执行，返回数据或渲染函数
- 组件渲染被 `effect()` 包裹：依赖的响应式数据变化时自动重新渲染
- 生命周期钩子通过全局 `currentInstance` 注册到当前组件

---

## 导出 API

```js
import {
  // 应用
  createApp,
  // 响应式
  reactive, ref, computed, effect,
  watch, watchEffect,
  // 运行时
  h, createTextVNode,
  onMounted, onUpdated, onUnmounted,
  // 编译器
  compile
} from './src/index.js'
```

