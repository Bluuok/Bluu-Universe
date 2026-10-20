# Windows 浏览器测试暂停（2026-10-20）

用户提供的安全事件调查显示，十轮本项目 Chrome 测试与十次本机账户失败验证逐项对应，随后触发账户锁定；另一次补充检查也对应失败验证。测试触发与累积的责任在本项目测试执行方式。

Chromium 新配置启动时的空密码检查是高度吻合的机制：上游源码与问题报告说明该检查调用 Windows LogonUser。此次本机日志证明 Chrome 发起错误密码验证，但未直接采集其密码参数或 API 调用栈，不能将“本机提交空密码”写成直接观测事实。

- 暂停在这台 Windows 主机启动 Chrome / Chromium 测试，包括无头、系统 Chrome、Playwright 随附浏览器和持久配置启动。不得通过换路径、换参数、自动重试或临时移除拦截绕过。
- 已纳入 Git 的测试脚本统一从 tests/browser-runtime.mjs 导入 chromium；该模块在 Windows 导入时立即报错，不执行浏览器启动。Linux 保留原 Playwright 导出，不代表此次已完成 Linux 浏览器验收。
- 未纳入 Git 的 native-window-focus-review.mjs 及忽略目录中的历史脚本未改写，不受上述入口拦截保护，禁止运行。新脚本不得直接导入 Playwright 绕过入口；命令行临时脚本也必须遵守暂停。
- CPU 检查、源码检查、构建及本地静态预览服务可继续。禁止为验证拦截有效而实际启动浏览器；只验证导入报错、静态入口覆盖和语法。
- 不修改 Windows 密码、账户或锁定策略，不结束用户正常使用的浏览器，不把降低系统保护作为修复。

这是项目测试入口的止损措施，尚未修复或实机验证 Chromium 的根因。恢复本机浏览器测试前，需要确定适用的上游修复或隔离方案，说明剩余风险并取得用户明确同意。不得将串行执行、无头模式、复用配置或更换 Chromium 版本单独称为已验证的预防方案。

相关来源：[Playwright 同类报告](https://github.com/microsoft/playwright/issues/43036)、[Chromium 问题](https://issues.chromium.org/issues/562403601)、[Chromium Windows 密码检查源码](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/password_manager/password_manager_util_win.cc)。
