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

## 2026-10-20 只读恢复条件核对

本次未启动浏览器。公开Chromium问题562403601的可读索引仍为New，Code Changes／Verified In未列修复；直接读取问题页面及可能重复的问题541310282失败，不能据此断言所有上游分支都未修。Playwright问题43036虽已关闭，维护者原文说明需等待Chromium修复后引入；其10月8日复现记录包括Chromium156，不能把“升级到更高版本”当作已验证方案。当前主干password_manager_util_win.cc仍可读到CheckBlankPasswordWithPrefs中的空密码LogonUser调用，但仅函数存在不足以证明某个已发布版本必然触发或不会触发。

只读WSL列表曾显示Ubuntu-24.04（WSL2，Stopped）和docker-desktop（Stopped）登记项；这不证明发行版可用，也不证明本机具备Linux测试环境。用户随后明确说明本机没有Linux，因此不能以登记项为由推进本机Linux方案。Docker Linux引擎管道不可用。没有启动发行版、Docker Desktop或安装组件。WSL在受限环境中第一次列表请求返回E_ACCESSDENIED，提升权限后的同一只读列表成功；这不属于浏览器尝试。Microsoft说明WSLg支持Linux图形程序和符合条件的vGPU加速，Playwright官方支持Linux＋Xvfb运行，但这些文档不能证明本机Linux WebGL、GPU、鼠标捕获或窗口显示已经可用。

以下仅保留曾提出的隔离方案，当前缺少可用Linux环境这一前提，不作为待执行步骤；未获授权安装Linux：

1. 必须先另行确认可用Linux环境并获得明确授权，才能考虑核对Linux内核、WSLg显示、Linux原生Node和浏览器依赖。当前不启动登记项，不安装Linux或系统包，不修改发行版、启停其他运行中的环境或调用Windows浏览器。
2. 保留tests/browser-runtime.mjs的Windows导入阻断。仅使用经路径／文件格式确认的Linux原生Node与Linux Chromium；禁止经WSL互操作意外调用Windows的node.exe／chrome.exe，也不使用猜测性禁用特性参数。项目构建和测试证据留在本项目；不同环境单独记录，不混用旧实机结果。
3. 首次只做一次有界启动核对：记录实际可执行文件、WebGL渲染器、显示与输入模式；失败即停止并保留日志。成功后才在同一构建上执行真实键鼠三轮及逐图自审，不把Linux／软件渲染结果当作Windows D3D11、物理屏幕观感或系统失焦通过。

Linux二进制不会执行Windows专用源文件是隔离依据，仍需验证环境和可执行文件，不能承诺所有运行风险已消除。当前状态是“本机Linux方案不具备执行前提，未实施”；Windows浏览器暂停继续有效。已通过的GitHub Linux CI（提交5008031）只证明远端runner的既测范围，不等于本机具备Linux或WSLg已验证。

方案依据：[Microsoft WSL图形应用说明](https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps)、[Playwright Linux CI与有界面运行](https://playwright.dev/docs/ci#running-headed)。

## 远端验收路径（不恢复本机浏览器）

可使用已公开项目的GitHub标准Ubuntu runner；无需本机Linux、Docker或Windows浏览器。手动任务 `.github/workflows/desktop-playthrough.yml` 复用原三路线与同页连续三轮脚本，串行执行，失败即停，截图／视频／JSON按提交SHA归档、保留1天。Linux浏览器使用与项目Playwright匹配的版本和显式SwiftShader软件渲染；报告记录实际渲染器与JS／CSS哈希。Windows导入阻断保持，不把远端任务当成本机测试恢复授权。

任务代码接入、任务通过、取回证据、自审画面分别记录；未得到运行结果前不宣称三轮通过。即使远端通过，仍不代表本机RTX4050／D3D11画质性能、系统失焦或最终用户手感通过。当前未调用反重力或独立评审者。
