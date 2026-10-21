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

### 本次运行结果：完整远端验收仍受阻

- 39431143122／9c56c4d：就绪等待实际30秒超时，0轮完成；查明原120秒参数错放在arg位置，已修正。不能由该超时认定产品启动根因已解决。
- 39432135609／ef07f7d：已读到ready=true及真实WebGL2／SwiftShader信息；首张Playwright截图30秒超时，失败截图也未生成，0轮完成。两次归档下载连接失败，改用受大小限制、含SHA校验的项目日志取证通道，成功取回两份JSON。
- 39433554711／cf0fc07：切换CDP当前视图截图并校验完整1440×960尺寸，仍在10秒有界截图等待时失败；未取得有效PNG，0轮完成。没有降低画质、暂停动画或写入角色／场景状态；已停止继续创建完整远端复验任务。

后两次JSON均绑定JS index-CMm1yelL.js／SHA256 606910f7fd4762cc0fed99f4c3ae88ced24dee3d3de607c069797f412153d489，以及CSS index-B6xKz6MJ.css／SHA256 ae31713306657d071a6d78d500f97f2eb19bec83451ff351df6bf3e3443c2feb。网页ready=true不代表截图、操控、家具可见性或美术通过；本次没有新的完整键鼠或视觉通过证据。

cf0fc07的常规天空与作品集CI通过；Game mouse-look regression（39433516138）在点击后等待pointerLockElement的15秒检查失败，当前未定位归因，不写成已修复或全部CI通过。此轮仅修改测试、工作流与说明，业务源码／资源未改，Windows浏览器拦截保持，本机Linux／Docker未启动，线上未部署。后续需先取得可靠的实时渲染与操作证据，才能继续美术验收，不能用更多CPU检查冒充目标已达成。

### 2026-10-21 显示层取证已接通，完整操作尚未通过

任务39585395973（42cd6d8）从Linux X11显示层取得两张1600×1100完整桌面PNG和独立H.264录屏，避开先前受阻的Chromium截图／录屏链路。大小与SHA校验后已取回项目证据，主代理看过出生与移动后的画面、抽查录屏0／8／16秒。片尾黑色画面属于浏览器关闭后的X11桌面，不能据此认定网页黑屏。当前只取回末段预览，未观看完整录像。

报告绑定RC82的同一JS／CSS双哈希，实际WebGL2渲染器为ANGLE／SwiftShader。40次可信／0非可信输入，13份被动样本；角色实际前进、转向和升高，样本起终点距离14.3152。首个[-15,12,-15]目标在60秒内未到达，0轮完成；页面异常／请求失败均0仍不能算完整验收。详见tests/v43-review.json及原始tests/remote-player.json，证据位于.baseline/v43-x11/run-39585395973/。

后续任务[39587367340](https://github.com/Bluuok/Bluu-Universe/actions/runs/39587367340)（4ac3308）保持业务构建、1440×960网页画质、原目标与碰撞断言，按数秒一次反馈的实际软件渲染速率增加等待，分别在标准Ubuntu runner运行探索与连续进出。两项均已失败；整批结束后通过CLI成功取回分目录证据，探索日志首次45秒下载超时，延长为一次120秒有界下载后成功。各文件大小与SHA校验通过，不混用两个job的summary。

- 探索job119179505113：第一路线15步，包括远近笔触前／中／后绕行、物理飞回工作室、入屋、ThreadCove状态打开、返回和出门；第一路线1882可信／0非可信、609被动样本。第二路线实际记录左墙与背墙方向身体接触，在飞向east-back时浏览器关闭；3601秒录屏和任务起止时间与60分钟子任务上限相符，报告最终错误为keyboard.up的page closed，不能据此认定产品自行崩溃。第三路线未执行；栏杆、屋顶及专门窗内家具路线本轮未覆盖。相机与身体数据仍分开，不由墙面接触推断相机通过。
- 连续job119179505320：第一轮已实际进入同一房间、打开ThreadCove状态、返回并出门；房间与家具UUID不变、entries=1／exits=1。出门后900ms W及500ms X没有产生位移，z始终16.4459，原“向外离开超过2单位”断言失败，0轮passed。失败路径未保存原始输入数组，不能补造该任务可信输入计数。探索首轮503ms W也完全落在2729618.8与2732002.0两次被动帧样本之间，位置同样不动；旧探索脚本只检查SPACE便标passed，这条脚本通过不能计为满足用户整轮要求，也不能据此确认正常GPU下存在出门锁死。
- 取回14张完整桌面PNG与两段末20秒预览（原视频918.125／3601秒）。主代理逐图查看，并分别抽查预览0／8／16秒，确认房间、露台和真实转向画面；未观看两份完整原视频。发现route-2-normal-spawn仍显示加载界面、route-1-project-threadcove实际显示ROOM、出门图仍有转场提示；这些与被动状态不符，截图采集成功不等于显示帧与状态同步，拒绝作为项目册或转场视觉通过。近景笔触仍偏平滑的观感问题保留。原始证据位于.baseline/v44-remote-routes/run-39587367340-job-各job编号/。

一次[OpenGL环境探测39593683659](https://github.com/Bluuok/Bluu-Universe/actions/runs/39593683659)（4bb43c2）仅在远端使用[ANGLE官方后端选择](https://github.com/google/angle/blob/main/doc/DebuggingTips.md)与[Mesa软件渲染环境变量](https://docs.mesa3d.org/envvars.html)，保持同一构建及1440×960画质，不禁用watchdog或sandbox。实际报Error creating WebGL context，就绪120秒失败，0张截图／0轮；报告已按SHA取回至.baseline/v45-probe/run-39593683659/，不再尝试更多后端。4bb43c2的controller／portfolio-smoke／sky-smoke常规CI通过，不能抵消这次探测或完整路线失败。

自行复核后，两个路线脚本改为复用departAfterExit：实际按住W直到观测到向外超过2单位，再按X并核对速度低于.15，要求仍处SPACE且入屋次数不增加；不写角色、相机或场景坐标。只完成三个相关脚本的语法、diff与64入口Windows拦截检查，未再次启动远端完整浏览器，不宣称修改已实机通过。综述tests/v45-review.json记录原始结果与该修正的验证边界。

本轮由主代理验收，未调用反重力或独立评审。完整三轮、截图显示同步、全部最差视角与美术、Windows GPU／真实系统失焦仍未通过或未验证；在现有环境下停止继续重复整批尝试，目标未完成。业务源码、资源、JS／CSS与RC82保持一致，本机浏览器、Linux／Docker均未启动，线上未部署。
