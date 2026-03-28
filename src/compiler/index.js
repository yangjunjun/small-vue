/**
 * compiler/index.js — 编译器入口
 *
 * 将模板字符串编译为可执行的渲染函数。
 *
 * 编译流程：
 *   template  →  parse()  →  AST  →  generate()  →  code  →  new Function()  →  render()
 */

import { parse } from './parse.js'
import { generate } from './codegen.js'

/**
 * 编译模板字符串，返回渲染函数
 * @param {string} template — HTML 模板字符串
 * @returns {Function} — 渲染函数，接受 (_ctx, _Vue) 参数
 *
 * 安全说明：内部使用 new Function() 将代码字符串转为可执行函数，
 * 与 Vue 官方编译器行为一致。请确保 template 来源可信，
 * 不要将用户的任意输入直接作为模板编译，以防止 XSS 攻击。
 */
export function compile(template) {
  // 1. 解析：模板字符串 → AST
  const ast = parse(template)

  // 2. 代码生成：AST → 渲染函数代码字符串
  const code = generate(ast)

  // 3. 创建渲染函数：通过 new Function 将代码字符串转为可执行函数
  //    _ctx：组件实例代理（setup 返回值 + props）
  //    _Vue：传入 h、createTextVNode 等运行时 API
  // eslint-disable-next-line no-new-func
  return new Function('_ctx', '_Vue', code)
}

export { parse } from './parse.js'
export { generate } from './codegen.js'
