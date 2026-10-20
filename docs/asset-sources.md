# Bluu Universe · 完整资源总表

**2026-10-20 当前RC82资源接入：复用扫掠实体完善笔压。** 构建及同构建实飞见[项目说明](项目目标与实现说明.md)文首；RC81详见Git提交5b2bb48与tests/v37-review.json。

| 模块／资源 | 使用分类 | RC82实际接入 |
| --- | --- | --- |
| 原sweptBody、平稳截面帧、局部bulges与封口 | 提取适配 | 实际复用于原268.4774单位长曲线；只有该配方采用圆润扁厚截面、温和径向肋纹／沿程偏移与减压区，32段截面提高几何采样。默认原旋涡作者网格及近远回卷字节隔离通过。 |
| PaintFlowManifest／既有PaintFlowSweep | 既有数据与模块复用 | 配方单独维护截面与笔压；原路径、三段双面金色区、图集、材质和运动映射保留。新S21568面，笔触场102804面／2绘制；相机代理使用当前完整基础网格，不包含Shader摆动。 |
| haefu、尾迹、房屋／家具／露台、作品册、内容与全景 | 直接保留 | 除两处笔触配置／生成器外JS指纹与RC81一致；35本地／31HTTP、11无损分块／8许可通过。无新下载、付费、手机端、后端或线上部署。 |
| 强肋纹／单向深度候选与实拍 | 仅诊断，未采用 | 端盖／法线失败及工业导轨观感均保留记录；不通过放宽断言接入。当前仅index-CMm1yelL.js计最终实机通过；高处环视与远处轮廓分别记录，不用局部截图代替整条曲线检查。 |

**历史RC79资源增量（2026-10-20）：连续S笔触与同体颜料。** 构建和实飞见历史记录；以下RC78及更早均为历史。

| 模块／资源 | 使用分类 | RC79实际接入 |
| --- | --- | --- |
| 原VortexField.sweptBody | 原项目模块提取适配 | 实际复用于268.4774单位S作者曲线，337环／18段截面，连续闭合体12132三角；移除旧S的短体、分段底层和独立coat生成，保留一套正式S实现。 |
| 已安装Three.js Curve.computeFrenetFrames | 直接使用 | 读取其实际生成的平稳截面帧，以作者平面确定初始宽度；仅新S开启。相邻截面点积最小.999208，原旋涡两条带的扫掠源网格隔离通过。不是仅参考算法后声称移植。 |
| PaintFlowSweep／PaintFlowManifest | 本地集成与既有数据适配 | 保留S全部路径点；截面、三段双面金色区写在配方中，同体顶点颜料及原切向动画映射由独立几何模块维护。全笔触场93368面／2绘制、8个嵌入颜料区，无独立金色薄层。 |
| 既有PaintFlowBlend、材质／时钟、Victor图集及颜料PNG | 直接保留 | 近远回卷全部几何／颜色／UV／动画属性与RC78逐字节一致；无新贴图、材质实例或循环。相机BVH使用当前93368面基础几何，Shader摆动与其他体积云仍未接入。 |
| 6K全景、haefu、共享房屋／家具／露台、项目内容 | 直接保留 | 资源35本地／31HTTP指纹、11无损分块／8许可通过。未下载、购买、添加手机实现或业务后端，本轮未部署。 |
| 捕获后坐标／mousemove观察与失败记录 | 仅测试诊断 | 最终通过为tests/v35-controls-final-verified.json；旧失败和捕获前超时保留。没有以忽略首个有效位移来改业务输入，真实系统失焦仍未验证。 |

**历史RC78资源增量（2026-10-20）：复用现有模块完善远回卷。** 构建与同构建实飞见[项目说明](项目目标与实现说明.md)文首；以下RC77及更早均为历史。

| 模块／资源 | 使用分类 | RC78实际接入 |
| --- | --- | --- |
| Three.js MarchingCubes | 直接使用已安装依赖 | 远回卷以128场采样生成实际外表面，近处仍96；沿用场梯度法线与凹折修正，远处容量68000面。未新增依赖或下载模型。 |
| 原PaintFlowBlend／PaintFlowField | 原项目模块提取适配 | 同一融合器现接入近、远两条配方，支持配方覆盖采样和截面参数；原金色coat足迹成为同一表面顶点颜料。远处59024面、单连通，整体105404面／2绘制；近回卷及完整S流字节隔离通过。 |
| PaintFlowManifest | 既有场景数据调整 | 保留远处位置／旋转／曲线与通行轴，改局部分支范围和源笔长；场景预算115000面。几何数据、材质、相机、角色碰撞与输入模块仍分别维护。 |
| 6K全景、Victor笔刷图集、颜料PNG、haefu、共享房屋／家具／露台 | 直接保留 | 无新素材、付费资源或手机专项；原资源35本地／31HTTP锁、11无损分块／8许可通过。相机BVH覆盖当前基础笔触几何，Shader摆动与其他体积云仍不在其内。 |
| 96采样碎珠候选、minimumScale与160采样探针 | 仅作本地诊断，未接入最终版本 | 失败与候选记录保留；最终使用128采样与.90深度、.26融合平滑度。原S流尖片及细纹尚未修复，不归入本轮收益。 |

**历史RC77资源增量（2026-10-20）：只调整现有融合笔触的着色法线。** 构建与验证见[项目说明](项目目标与实现说明.md)文首，以下RC76及更早为历史。

| 模块／资源 | 使用分类 | RC77实际接入 |
| --- | --- | --- |
| Three.js MarchingCubes.normalArray | 直接使用已安装依赖 | 实际读取生成网格的场梯度，经三轴逆缩放和焊接位置对应作为光照法线；不是仅参考文档或另加模型。 |
| PaintFlowBlend | 原项目模块提取适配 | 保留原位置／索引、UV、顶点颜料、动画及Shader；只改着色法线，凹折处回用原法线，CPU字节比较通过。 |
| 既有6K全景、Victor笔刷图集、颜料PNG、haefu角色、共享室内与露台 | 直接保留 | 资源字节与采样Shader源码未改，无下载或付费资源。三向采样等响应试验仅作本地诊断，未接入正式代码。 |

**2026-10-20 RC76资源增量：只维护电脑浏览器网页。** 构建与实测见 [电脑网页PR整合记录](desktop-pr-integration.md)，以下RC75及更早记录保留为历史。没有新增图片、模型、付费资产或运行时依赖。

| 模块／资源 | 使用分类 | RC76实际接入 |
| --- | --- | --- |
| 原6K全景／纹理加载器 | 直接使用既有资源 | 新笔触借用同一纹理，加载前隐藏，不重复销毁；全景半径实际5000。 |
| PainterlyParallax | 项目新增实现 | 3600实例，半径245／345／455，世界固定且可飞穿；上传前按相机空间中心深度排序，无新碰撞体或循环，非逐像素透明排序。 |
| Victor-EU ribbons／Sekuta82／CathyKernel | 本次仅参考 | 参照分层思路；本次没有下载或移植其代码，既有独立移植部分照旧。 |
| PortfolioNavigation／ProjectBook | 原模块扩展适配 | 复用本地截图、双页册、图片重试与取消；新增图文目录及相邻作品切换，删除手机单列分支。 |
| FlightLookInput／Interaction | 项目新增模块／原模块调整 | 单一鼠标捕获及右拖；Interaction只选取，复用SpaceController、CameraDirector与现有碰撞。 |
| PointerLockControls／Apple HIG／Codrops | 仅参考 | 没有引入第二相机控制器、第三方交互源码或新动画依赖。 |
| haefu角色、尾迹、共享房屋家具和露台 | 直接保留 | 资源字节、坐标与既有材质动画继续复用，不替换模型。 |

**历史RC75（2026-10-16）：仅电脑浏览器网页，删除手机专用实现。** 本地预览 http://127.0.0.1:4259/ ，JS `index-BY1xo9f7.js` / SHA-256 `80c83cbbba321a520c04d65c6b39b03cd254f9c25860552ea9af24e06fd909a7`；CSS `index-D6UpLLjA.css` / SHA-256 `75a44d415fdf2d9450e0dff3d953c64658069133d77739e9509716d60c759ad1`。站点已部署RC75／Sites版本5，发布源e89dbffd18c36c30ee200c3f8f8b0011079f04a7；GitHub实现dffd8d9已推送，访问范围保持仅所有者。线上同构建真实三轮验收通过。

最新用户要求覆盖此前“保留手机响应式”的范围：只维护电脑浏览器网页。已删除6个触屏飞行按钮、相关输入绑定和刷新引用、8组手机专用样式、手机项目册单列布局及手机相机/标签偏移；不再开展手机专项测试，历史手机记录只保留为过去状态。保留电脑窗口缩放、键鼠操作、双页项目册和减弱动态。路线提示移到底部左侧位置徽记上方，保留鼠标穿透；电脑窄窗口/短窗口收紧品牌高度，避免副标题压住近窗粒子字。蓝金星海、免费haefu角色、增强尾迹、共享工作室与露台继续复用，没有新增素材。首版左上提示盖住W、旧800像素手机提示盖住UNIVERSE均是历史未接受候选，不计入本版通过记录。本轮报告保存JS+CSS双指纹；DOM断言只验证布局，实际文字效果另看实拍。独立评审先因额度限制中断，恢复后已对本构建完成只读源码、实拍及真实键鼠复核：另298可信／0非可信，1440转向升降、近窗900四词、入屋ThreadCove／返回／出门通过，页面异常与请求失败0，未发现新的明确问题；没有复跑主代理全部三条路线和全部碰撞，自己的截图仅内存展示。

当前RC75同构建本地验证：9838可信／0非可信输入。6组电脑窗口和近窗四词、14项游戏键鼠、同页连续三轮进出、三条完整探索路线（15／21／18步）、项目册加载与重试、7类资源故障通过；正常游玩页面异常／请求失败0。身体实际接触墙壁／屋顶／栏杆与相机路径分开记录。32几何CPU、23飞行CPU、7相机CPU、35本地／31HTTP资源和原图无损重组通过。项目册故障测试含明确网络／decode注入，不能混称正常游玩失败。正式汇总tests/v27-review.json；实拍screenshots/v27-desktop-final-verified/与screenshots/v27-final-player/。本轮反重力未运行，使用安装版Chrome；独立复核在上述桌面范围通过，详见tests/v27-independent-review.json。整体星海美术、跨GPU及系统级失焦终审仍未完成。

线上RC75／Sites版本5最终验收：同一页面连续三轮实际键鼠3473可信／0非可信，完成自由飞行、绕屋、窗外家具、进屋项目概览／细节／返回／出门；页面异常、产品请求失败、平台诊断均0，11个无损分块全部HTTP200。JS、CSS与角色JSON指纹均与本地一致。首轮同样完成三轮，但因一条同源平台challenge请求ERR_ABORTED在最终总断言失败，原记录tests/v27-site-first-attempt.json完整保留，不改为通过；测试仅单列同源指定路径的取消诊断，全部原始requests仍保留，其他请求／页面错误仍阻断，并经独立代码复核。最终复验tests/v27-site-live-final.json为纯passed；实拍screenshots/v27-site-live-final/。浏览器已关闭；认证仅内存、隐藏stdin与同源header，不写凭据日志或录像，不宣称已撤销服务端令牌。

RC74同构建接触补验另存tests/v26-review.json：正面／背面／上方均实际键鼠接触、离开并恢复；完整前侧545与上方1072可信／0非可信，背面只复用整体失败记录里的passed子项，不编造未保存输入数。独立另523可信／0非可信实飞UNIVERSE首字母，亲看局部拨散、离开后TO整齐；未独立操作减弱动态。测试中的自然切词旧目标、不可达俯仰和扩大世界盒假设已纠正，没有改业务迁就测试。32项几何CPU验证含六面包络及临近边界25单位进近，不称飞遍六边界。资源总表的旧世界盒已按实际源码更正。

**历史 RC74（已上线Sites版本4）：粒子文字全角度呈现、蓝金尾迹增强。** 本地预览 http://127.0.0.1:4259/ ，`index-0biLc6aE.js`，SHA-256 `fdcc996aec6a71c34bf7e873330b4ecbb55dcee354e96ec8e2a7336496de2e40`；角色JSON SHA-256 `116155d645f126ad5cc43f77e11c155a2e6b895c2c6fafc5ea37360b36b53bc1`。站点 [Bluu Universe](https://bluu-universe.steady-teal-4820.chatgpt.site) 已部署RC74／Sites版本4，发布源c87a82896719db565bc59e1693026efa8e3d425b；GitHub实现7715448已推送，访问范围保持仅所有者。

粒子字原来采用固定朝向并按正面夹角淡出，侧面变薄、背面消失。现保留世界锚点与9000个真实粒子，每帧面向相机，取消角度淡出，厚度0.24→0.40；不是单纯双面材质。同步更新世界逆矩阵及速度变换，局部接触与字形一致。独立实飞发现角色遮住中央字符后，增加相机局部Y布局净空（最大8、靠近时按距离0.18限制），并同步approach／nearField／targets；暂停也更新布局，保持字形动画时间。保留depthTest，房屋和其他实体仍会真实遮挡，不能承诺贴近或任意手动瞄准时永无遮挡。

背包尾迹复用原FlightWake单池／双喷口世界位置：发射率58→210/秒、容量160→384、寿命0.44–0.60→0.70–0.95秒、宽度0.022–0.034→0.055–0.080、长度0.10–0.16→0.17–0.26、透明度0.72→0.95，新增亮度1.35；保留蓝金比例、方向光屑、松手渐退与刹车收尾，不改飞行输入和角色比例。没有下载新模型或素材。

当前同构建真实键鼠六方向／四词循环3641可信／0非可信，正常错误／请求失败0；主代理亲看正、侧、背、上下图。最终独立另968可信／0非可信，亲看4张实时图，背面／上方原中央遮挡P2关闭；推进165、转向Space173存活粒子，升高约1.79米，松手刹车后归零，无新增明确P1/P2。独立未复跑下方／全词循环／接触拨散，其范围与主代理分开。23飞行CPU、7相机CPU、尾迹30/60/120Hz与生命周期、文字旋转父级六轴／局部接触／暂停净空、35本地／31HTTP资源锁及原图无损重组通过。同一构建本地合计13270可信／0非可信：三条正常重载完整探索（4184／1231／2481）、同页连续三轮1136、14游戏操控302、六视角四词3641与尾迹295；正常页面异常／请求失败0。墙／栏／屋顶身体接触、独立相机路径、窗外家具、四项目／返回出门及7类资源故障通过。尾迹首轮捕获超时保留为失败记录，14操控随后实际获捕成功；尾迹用真实RMB复验通过，不掩盖首轮失败。线上同构建再完成三轮连续真实键鼠3381可信／0非可信，正常页面异常／请求失败0，11无损分块均HTTP200，JS与角色JSON双指纹一致。最终线上使用安装版Chrome无头模式和近目标真实短按／刹车；首轮可见Chrome在第二轮门前反馈过冲超时（1/3完成）保留为失败，不计通过。未改业务速度或坐标，未混用旧生产记录。完整本地汇总tests/v25-review.json，线上tests/v25-site-live-final.json，实拍screenshots/v25-site-live-final/；浏览器已关闭，令牌仅内存／隐藏stdin／同源header，无凭据日志或录像，不宣称已撤销服务端令牌。

RC73凹凸反光柔化保留在本构建；具体来源、隔离诊断与历史验证如下。AGY此前超时未恢复，本轮用真实Chrome和未参与修改的原生独立评审，不宣称反重力测试完成。整体星海形态、几何长槽、所有极端视角、真实OS失焦及跨GPU仍未全部验收，整体目标保持开放。

| RC74资源／模块 | 使用分类 | 实际接入 |
| --- | --- | --- |
| ParticleWords／WordFieldManifest | 原项目实现提取适配 | 保留Canvas采样／9000粒子／局部弹簧；新增面向相机、净空布局与同步接触逆变换，不称外部文字引擎移植。 |
| FlightWake／FlightEffects | 原项目模块直接复用并调参 | 池容量／发射率／尺寸／寿命增强，原方向光屑Shader增加亮度uniform；双喷口、蓝金比例和生命周期保留。 |
| haefu GLB／贴图／动画、Joan房屋家具／露台、ProjectBook | 直接保留 | 字节／坐标及逻辑保持，不新增付费资产。 |
| Three Vector3／Quaternion／Matrix4／Points | 直接使用已安装依赖 | 世界朝向、逆变换和点云渲染实际接入，无新依赖。 |

**历史 RC73（已并入RC74）：实体笔触凹凸反光柔化。** 预览 http://127.0.0.1:4259/ ，`index-BXAImFkc.js`，SHA-256 `8aebbc9e5cc85bd6f5594223ab39ab184518271f0dd431561d049dce781ffd62`；角色JSON SHA-256 `116155d645f126ad5cc43f77e11c155a2e6b895c2c6fafc5ea37360b36b53bc1`。RC73当时尚未发布，现已并入RC74。

| RC73资源／模块 | 使用分类 | 实际接入 |
| --- | --- | --- |
| Victor-EU makeBrushAtlas / R-G-B-A原图集 | 直接复用提取实现 | 原数据及过滤／mip／尺寸不变，flow保留真实刷毛高度、覆盖和色调；非flow Shader逐字一致。 |
| 原Van Gogh颜料PNG／6K蓝金星海 | 直接使用既有资产 | 原图字节不变，无损分块沿用；flow改用现有三向颜料采样，不新增图片。 |
| VortexPaintMaterial／PaintFlowManifest | 本地局部适配 | 仅flow的凹凸幅度、颜料高度、连续切向梯度和对象空间洗色；不是新移植外部渲染引擎。 |
| PaintFlowField／hh-hang相机代理 | 直接保留 | 全部绘制属性／索引和BVH代理字节不变，58356面／2绘制；Field只更新Shader cache key。 |
| haefu／Joan房屋家具与露台／FlightWake／ProjectBook | 直接保留RC72成果 | 本轮代码不进入这些模块，原许可与付费角色排除保持。 |

正常键鼠前／侧／背2109可信、近笔触十转向／俯仰1312可信，0非可信／异常／请求失败。独立另1659可信／0非可信实飞近观、转向升降、侧面离开，页面异常／请求失败0；亲看8图（本次实时3图），支持保留局部收益、未确认新增P1/P2。非flow星核／云／翼／光环实际生成Shader及uniforms/material逐字一致，全部绘画属性／索引和相机代理字节不变，仍58356三角／2绘制；35本地／31HTTP资源锁通过。完整路线正在当前构建重验，不混用RC72通过记录。

几何长槽／接片与侧面大蓝面仍待优化；诊断response覆盖不是生产实现。RC73当时未单独发布，现已并入RC74。AGY此前超时未恢复，本轮独立Chrome评审，无新外部资源。

**历史 RC72（2026-10-15）：项目册图片加载与恢复，已部署，本地／线上实机复验通过。** 本地预览 http://127.0.0.1:4259/ ，`index-B9FhTVrA.js`，SHA-256 `852cd6d6112296ec8e217114bdbcf9a3640a56cefdeb3c2080f40b754691dc84`；角色JSON SHA-256 `116155d645f126ad5cc43f77e11c155a2e6b895c2c6fafc5ea37360b36b53bc1`。

| RC72资源／模块 | 使用分类 | 实际接入 |
| --- | --- | --- |
| ThreadCove／Clawtide／Folio原截图 | 直接使用 | 原public/assets/projects文件字节未改，无下载、压缩或替换。 |
| ProjectBook／原DOM纸册／字体 | 本地模块局部适配 | 固定画框、decode请求代次、失败重试、焦点、关闭与重开恢复；真实页与翻页副本统一样式。 |
| Apple交互感觉 | 仅参考 | 克制淡入和及时反馈，没有引入Apple代码或素材。 |
| haefu／FlightWake／共享Joan室内与露台／6K星空／笔刷图集 | 直接复用既有成果 | 本轮业务修改不进入模型、绘画、控制、碰撞或相机模块；原许可、无损传输和8份部署通知保持。 |
| Sites验收令牌 | 仅本次测试授权 | 隐藏stdin／进程内存／同源请求头，未写入仓库或日志；不属于产品新增认证功能。 |

当前RC72已部署，Site为版本3。授权变化前的登录阻碍及旧构建通过结论仅为历史；当前结果以同版tests/v23-review.json为准，同一最终构建本地11095可信／0非可信，三条正常重载完整路线、同页连续三轮、14游戏操控、室内交互与图片九项专项通过；正常页面异常／请求失败0。图片专项的2失败与1取消是明确网络注入，受控decode时序另标辅助。独立另186可信／0非可信，三项P2已关闭，1次注入失败外无请求异常。35本地／31HTTP资源锁、无损重组及8许可、23飞行CPU／7相机CPU、7类资源故障通过。 线上生产版本同构建三轮4523可信／0非可信通过，页面异常／请求失败0，11分块均HTTP200；真实键鼠近笔触、升降绕屋、窗外家具、项目概览／细节、返回出门及3/3连续进出已验。JS及角色JSON双指纹与本地一致，浏览器已关闭；完整本地证据tests/v23-review.json与tests/v23-site-live.json，实拍screenshots/v23-site-live/。截图／报告／录像不上传公开仓库。笔触长槽和全场最差视角仍开放。

**历史 RC71（2026-10-15）：无损部署传输、实体笔触相机避障。** 本地预览 http://127.0.0.1:4259/ ，构建 `index-D2Y-ihsj.js`，SHA-256 `4175603634499f01cc351a26c6135c47b7ecde8931e062903445e133c56b256a`；角色JSON SHA-256 `116155d645f126ad5cc43f77e11c155a2e6b895c2c6fafc5ea37360b36b53bc1`。

站点 [Bluu Universe](https://bluu-universe.steady-teal-4820.chatgpt.site) 已成功部署RC71（Sites版本2），保持既有owner-private访问范围。发布源提交b5621647e98ca69b4ea1accfbe1e5ece1b4fb61c，与本地通过测试的构建字节一致；GitHub实现提交b29e116已推送。公开GitHub为 [Bluuok/Bluu-Universe](https://github.com/Bluuok/Bluu-Universe)。旧“尚未上线”和“实体笔触未接相机BVH”仅是历史状态，现以本段及同构建证据为准。私有站点登录后的线上键鼠验收尚未完成，自动审批拒绝生成免登录测试令牌，等待明确授权或正常登录；没有使用其他途径绕过。

源PNG原样保留，构建时按4MiB分片，运行时校验分片长度和整图SHA-256再交给原TextureLoader；6K背景9片、颜料2片，中文及编码路径统一，缺片、截断和同长度篡改可被拒绝。原图画质不变，8份许可文件同步到部署产物。Windows发布使用进程内Git Bash与TAR_OPTIONS=--force-local，沿用原站点，不覆盖旧失败恢复提交。

实际飞到近笔触处复现宇航员大半被遮挡，现直接复用已接入hh-hang的buildStaticMergedMesh／attachBoundsTree，为两组实体绘画网格克隆基础几何BVH，交给现有CameraAvoidance。代理不参与渲染或角色身体碰撞，原绘制属性／索引、材质、58356面／2绘制和haefu／暖木房屋／露台保持。同位置十个真实鼠标转向与俯仰视角恢复角色可见。

同一RC71真实Chrome：三条正常重载完整探索9228可信输入、14游戏操控312、同页不刷新连续三轮1212、近笔触十视角1316，合计12068可信／0非可信；正常页面错误和请求失败0。包含升降绕屋、窗外家具、墙／栏杆／屋顶身体接触、项目查看与返回出门；身体碰撞与相机避障分别记录。另通过35本地／31HTTP资源锁、无损重组及8许可一致、23飞行CPU、7相机CPU、绘画结构隔离与7类故障注入。局部CPU／自动故障检查不冒充美术验收，旧RC70／RC69输入不计本轮。

独立终审：未参与修改的评审者另用安装版Chrome headless真实键鼠1513可信／0非可信，正常出生飞近笔触、多方向右拖、升降／制动／离开恢复，异常／请求失败0；亲看四张实时截图，角色可见、离开后相机恢复，未发现新增P1/P2。此结果不证明逐帧无突跳或用户主观手感接受，自有浏览器关闭；AGY此前超时未恢复，本轮不宣称完成新的反重力测试。**整体目标保持开放**：相机代理只覆盖两组实体笔触基础面，不覆盖Shader约±0.18轻摆和其他体积云；静态缓存不保证未来变换自动更新。近笔触长槽／局部形态、所有最差角度、真实OS失焦、跨GPU及私有线上操作尚未全面验证。完整本地证据见tests/v22-review.json，历史报告／截图／录像不上传公开仓库。

| RC71资源或模块 | 使用分类 | 实际范围 |
| --- | --- | --- |
| haefu、Joan共享室内／露台、原6K与颜料PNG | 直接使用既有资产 | 模型／贴图／家具坐标保持；付费宇航员排除。 |
| hh-hang colliderBuild／本地CameraAvoidance | 提取适配，实际接入 | 原合并克隆与BVH构建函数直接调用，新增paint-surfaces相机代理；身体胶囊求解未改，不称移植完整CameraSystem。 |
| AssetTransport／构建插件 | 本项目新增小型适配 | 超限原图无损分块与完整性校验，部署同步原licenses八文件；不是新下载或压缩降画质。 |
| Shader轻摆／其他体积云相机代理 | 尚未接入 | 不用基础面采样外推全场遮挡。 |
| Apple式反馈 | 仅参考交互目标 | 保留RC69标签／项目册已有动效，本轮未引入Apple代码或素材。 |

以下表格及记录为对应历史构建，不改写为RC71新接入证据。

**历史 RC69（2026-10-14）使用状态：尾迹和室内交互局部适配，没有新增外部资源。** 预览 http://127.0.0.1:4259/ ，`index-BaV9cXRL.js`，SHA-256 `575af7116ec9aa03529a89b4ec1233a835080868aa54fb0324c3473778e22ca4`；角色JSON SHA-256 `116155d645f126ad5cc43f77e11c155a2e6b895c2c6fafc5ea37360b36b53bc1`。下面旧阶段的“本轮未改”仅指当时，本轮状态以本表为准。

| 资源或模块 | 本轮状态 | 实际接入范围 |
| --- | --- | --- |
| haefu宇航员／原float／角色贴图 | 直接使用，保留RC68局部表面适配 | 原GLB、骨骼、UV与贴图字节未改；本轮只接入尾迹presence，原许可与来源通知保持。付费宇航员仍排除。 |
| Joan房间8GLB／3KTX2／既有家具 | 直接使用既有资产 | 保持同一房间／桌椅／植物／露台坐标；暖色反馈只调现有项目屏幕的独立材质，不移动家具，不替换室内。 |
| FlightWake／FlightExhaust | 复用本地模块并提取适配 | 世界空间池、同一场景更新／释放链、一次尾迹绘制；新增方向投影细光屑、出生插值、淡出与短软喷焰。没有声称新移植外部粒子库。 |
| FlightEffects | 本项目新增小型配置 | 仅分离尾迹／喷焰视觉调参；不扩建通用框架。 |
| ProjectBook／Interaction／RoomScene | 复用本地实现并局部适配 | 开册与翻页独立取消、当前画面接续关闭、标签／屏幕／按压反馈与焦点清理。既有Joan参考／适配来源边界保持，不称完整上游runtime移植。 |
| CameraDirector／SpaceController／hh-hang碰撞提取 | 直接复用已接入模块 | 相机只在项目查看／返回／缩放调用调整时长；飞行参数与身体求解不改。身体接触与相机BVH采样分别验证，笔触仍不在相机BVH内。 |
| 蓝金6K天空／Victor图集／RC67笔触／固定星星PNG | 直接使用或沿用历史提取适配 | 无新下载、新贴图、新模型、付费或画质降级；来源、许可与既有未接入项不变。 |
| 苹果界面交互观感 | 仅设计参考 | 用户要求的克制、连续、响应及时作为手感方向；没有下载Apple资产或声称移植其代码。 |
| 403花盆／受限HTML／此前超时AGY | 尚未接入／本轮未恢复 | 没有绕过限制、重试外发或宣称反重力测试通过。 |

最终同构建10419次root可信输入、211次独立可信输入，非可信与正常页面异常／请求失败0；独立复核问题已修。35本地／31HTTP原资源锁、5类隔离加载故障通过。完整本地证据 `tests/v20-review.json`，实拍 `screenshots/v20-interior-accepted/` 与 `screenshots/v20-wake-final/`。截图／录像／日志／恢复资料继续不入公开仓库。整体美术、近笔触遮挡及跨设备仍开放；网站尚未托管。`docs/design-implementation.md`已历史合并，本表是唯一正式资源总表。

**历史 RC68（2026-10-14，角色局部优化）：保留 haefu 手办比例，改善推进姿态、面罩、接缝和喷口；整体美术仍开放。** 预览 http://127.0.0.1:4259/ ，`index-DMToGUhc.js`，SHA-256 `b320f8772c7feeebbccae3dfc92e45fadbdcb44dae21a1d335a65a4b36a0f30a`；角色配置 SHA-256 `116155d645f126ad5cc43f77e11c155a2e6b895c2c6fafc5ea37360b36b53bc1`。角色JSON是动态资源，必须与JS双指纹对应，不能只凭同名JS混用配置验证。

原GLB、2048²贴图、骨骼与float文件字节保留。CharacterSurface在原模型后背轮廓收拢11个角点（最大位移0.02367世界单位），UV／索引／skin精确不变；这是局部轮廓收圆，**没有新增细分曲面，也不称完整圆润重建**。256个法线在同位置、同骨骼权重下柔化，60°限制保留折边。面罩调为深蓝柔光；未采用过黑强光方案。背包原徽记保留，未覆盖另一个圆角罩壳；双喷口改空心Cylinder与Torus口沿，颜色变暗、内芯缩小。

推进倾角由45°改为0.20rad（约11.5°），极限俯仰组合约0.275rad，保持正立轻倾；移动／键鼠参数不变。原FlightWake单owner继续使用，基础发射率138→48／秒，尺寸／寿命收小，松手／制动消退。源模型与所有不透明喷口均纳入实际包络及淡出，火焰单独淡出；没有拿相机避障冒充身体碰撞。窄门附件试验曾超出约3mm，收回后最大0.702624小于原0.712；飞行六组姿态最大约0.93644小于原1.012，未扩大胶囊。CPU检查源GLB、原UV／skin／索引、零新增塌缩／零反面及淡出；纹理解码是尺寸占位，不能充当GPU验收。

最终同构建14项真实游戏键鼠专项通过（302可信／0非可信），三轮正常重载完整探索通过（4450／1493／2681可信），覆盖近远笔触穿行、升降绕屋、墙／栏／屋顶身体接触、窗外家具、入屋四项目、返回和出门；页面错误／请求失败0。角色专项另247次真实输入；前侧背近景采用明确标记的相机诊断，仅看美术，不算游玩。35本地／31HTTP原资源锁与23飞行CPU复核通过。

同一未参与修改的独立评审指出浅色圆盘喷口并推动修复，最终代码／图／双指纹复核建议保留；还正常出生完成234可信／0非可信键鼠短线（推进、右拖转向、升降、X停），页面异常／请求失败0，自有浏览器关闭。独立短线未重跑完整屋内路线，不计入root输入。AGY上次超时未恢复，本轮不声称反重力测试通过。背包侧面仍偏方，既有近笔触角色遮挡、全动画、真实OS失焦／全部故障与低端硬件尚未全验；整体目标不标完成。

实际直接使用／提取适配的来源仍为 haefu、已安装Three GLTFLoader／PBR／Cylinder／Torus、原本地float和FlightWake；本轮没有下载新模型或贴图。局部轮廓适配与法线辅助为本项目新增，不冒称从外部移植。原笔触RC67收益、房屋／露台共享实体与输入状态代码保持。本地完整证据 `tests/v19-review.json`、截图 `screenshots/v19-character-final-rings/`，不混入试验构建。公开仓库不上传录像／恢复资料，网页尚未上线。


**历史 RC67（角色优化前）：近回卷更扁宽，金色边缘更柔和；整体美术未完成。** 本地预览 http://127.0.0.1:4259/ ，`index-DSFevSUD.js`，SHA-256 `1e5c8b198486d837a618fa24d7c597f80764a5ddf7c11830fc0826e019bb28bc`。只改 PaintFlowManifest / PaintFlowBlend；宇航员、房屋、操控和既有13云保持。

复用已安装 Three MarchingCubes 与现有 Victor 图集／油画颜料，调整真实来源截面的近似隐式融合场：宽度1.18、深度0.65、轴向重叠1.70、截面指数3.4。按实际融合primitive重算范围，修掉初试端部裁切开口。4条已有coat的顶点覆盖值做两轮成对扩散，减弱金边锯齿；保持顶点覆盖和，不声称物理表面积颜料守恒，不增加独立悬空金层。资源状态仍为直接使用／提取适配，无新下载。

实际网格11098顶点／22212面，零坏边、零真塌缩，仍有5个拓扑隧道和8个非零微小面；没有完整自交证明。全场58356面、2绘制、0新纹理，原60000预算不变。三轮正常重载后的真实键鼠完整路线通过（4486／1529／2647可信输入，错误／资源请求失败0），覆盖近远回卷穿行、升降绕屋、墙／栏／屋顶身体接触、窗外家具、四项目与返回出门；另有近回卷前侧背2009次真实输入。不是同页不刷新连续三轮，也没有重跑全部失焦／缩放／故障专项。

独立评审核对最终构建、代码和三图，支持局部保留，无新增P1/P2；最终版独立新增实操0，1538次独立输入属于中间BrJg版。AGY上次超时，本轮未重启，不宣称反重力测试完成。背面长槽／局部鼓节及近侧角色遮挡仍待改进：现有相机BVH未覆盖笔触，不能把其视线字段当作绘画遮挡通过。源码已公开的授权保留，网页托管仍未成功。

本地详证见 `tests/v18-review.json` 与 `screenshots/v18-model-final/`；历史结果不计作本轮通过。公开仓库不上传录像／恢复文件；`node tests/paint-blend-check.mjs` 可检当前拓扑及覆盖范围，缺少私有RC65恢复点时明确跳过历史字节比较。


**2026-10-14 托管尝试：** 已获部署授权并创建仅所有者可访问的 Sites 项目；源码上传被服务端 `artifacts_git_receive_pack_object_too_large` 拒绝，尚未上线。最大资源为 36,417,642 字节的原有 6K 星空 PNG，服务端未返回具体限额或违规对象。保留画质与 RC66 原构建；站点身份见 `.openai/hosting.json`，失败记录见 `tests/sites-deployment.json`。


**历史 RC66（优化前）：近回卷融合获得局部保留意见；整体美术仍未通过。** 预览 http://127.0.0.1:4259/ ，`index-Bbz_stEr.js`，SHA-256 `7c5e864b14e19d7efe84f0382972f45bfd29333dda3d310ba18f88821445d13e`。RC58冻结对照4258不改。57项源码／入口指纹、同构建实操、失败记录、独立复核与逐项未完成审计见`tests/v17-review.json`；包号0.4.0-alpha.11为历史值。

本轮只修改PaintFlowManifest／PaintFlowField并新增小型PaintFlowBlend。依据已有35段近回卷真实扫掠网格截面，采样385个有向椭球做平滑融合，再直接调用已安装Three0.161.0的MarchingCubes提取网格；不是原三角网格精确布尔并集，也不是新增GPU体积雾。4条真实coat窄条足迹成为融合面的顶点颜料；另10独立金薄层、S流带／远回卷全部几何及动画、13原云密度／几何／材质保持。既有Victor图集／颜料、haefu、Joan家具／门窗／露台和6K资源原样复用，无下载、素材、纹理或依赖新增。

修掉初试角度UV跨缝插值、宽模糊金斑和塌缩面：实际位置焊接后删除6个塌缩面、紧缩顶点、重算法线，V改连续局部流向投影。最终近体11027顶点／22070面／33105边，单连通、边配对方向相反、逐顶点邻域单闭环；体积356.815887。Euler=-8／genus=5，**闭合不等于无孔：有5个拓扑通孔，不称无孔实心流带，也尚未证明完全无自交。** 14个非零微小面与平滑法线指标仍透明保留，原失败记录不删除。全场169个作者来源段对应131件实际几何（近39件换1），17底层、14金标记（10薄层＋4嵌色）、58214三角、2绘制；paths中的strokes／段长是作者来源统计。临时CPU三份网格数组约23.6MiB，不是峰值内存验收。各同机位实测绘制／纹理／几何／program数不增，三角比RC65增加11018。

**RC65游戏式操控完整保留：** 点击空画面或“开始操控”捕获鼠标，相对位移直接转向、停鼠保持、可连续转圈；WASD前后左右，空格／Shift升降，X刹车；Esc释放／暂停／清键，未捕获时右键拖动可转向恢复。当前同一RC66通过14键鼠专项（296可信／0非可信）、三条正常开局完整路线15／21／18点（8760可信）、同页不刷新不H连续三轮进出（1148可信，entries/exits3/3）、前窗／机器人／地板实际身体接触（269可信）。墙／栏杆／屋顶、窗外家具、四项目、返回和出门覆盖在完整路线。1798相机采样中54次独立避障，采样视线无false，不外推全部绘画表面遮挡。10共用实体UUID、9静态矩阵保持，椅子位置不变、仅原有转动；正常路线错误／请求失败0，录像／截图留证。

同构建通过8笔触CPU、3融合结构／非目标隔离、3原13云回归、23飞行、11门廊、7相机、82静态接触、5缩放／Tab、目录／转场输入／合册、5资源故障、35本地／31HTTP和星星PNG复核。固定5机位对照用于美术诊断，另有真实键鼠路线，不能互相冒充。初试DVG／DaV和失败判据记录属于各自构建，不计最终通过。

同一未参与修改的只读评审者先指出692个UV跨缝面和真塌缩面，修后独立核对拓扑及5图，并正常出生真实键鼠近观前／侧／背：1580可信／0非可信、页面错误0，RTX4050／ANGLE D3D11，自有浏览器关闭；支持保留局部收益，未确认新增P1/P2。`tests/v17-native-review.json`由主代理据返回证据记录，评审者未写文件。一次额度失败后在重置时刻后恢复同一评审，终审已完成；反重力此前硬超时无最终评审，本轮未恢复，不宣称外部测试通过。

**仍未完成：** 鼓节、圆厚／并排条带感、近金色偏弱和S／远回卷木片端面；整体美术与用户主观手感尚未接受。全部动画自交、绘画表面最差相机遮挡、所有近道具／岩面／外边界、物理显示器／跨设备／峰值内存未全面验证。实际标签／OS失焦尝试仍未触发blur，Esc释放与CPU模拟blur分别记录。目标active，后续继续整体空间构图与近景可见性。未公开部署，无业务后端。

以下旧端口、PID、暂停状态及测试结论属于RC66当时快照；当前以文首RC69指纹与复验为准，独立冻结RC58仍保留。`docs/design-implementation.md`已历史合并，不重新创建第二套说明。



| RC66资源／模块 | 本轮实际使用分类 | 范围 |
|---|---|---|
| haefu GLB／Joan房间／原6K全景／原颜料／固定星星PNG | 直接使用既有资源 | 字节未改，无下载、付费或新资产；星星仍为固定2D摆件，花盆403仍未接入。 |
| Victor brushAtlas | 沿用历史提取适配 | 原提取生成器及MIT来源不变，PaintFlow借用同一图集及颜料；沿用RC64颜色调制与U相位，本轮近体融合未改图集／颜料／shader起伏参数，不新增或重复释放。 |
| sweptBody／PaintFlowField／PaintFlowBlend | 直接复用本地模块并局部适配 | 真实35段截面参与近回卷椭球融合／提面，真实4条coat足迹投影颜料；S／远数组及材质逐字节相同。不是外部完整场景移植或精确三角布尔并集。 |
| hh-hang碰撞提取／CameraAvoidance | 沿用实际接入模块，本轮未改 | 胶囊求解／静态BVH构建与相机避障独立；原“相机未接入、边界只按脚原点”描述已过时，实际main接入CameraAvoidance，控制器先调用bodyBounds再减速／限位。全边界实操仍未遍历。 |
| SpaceController／Interaction／CameraDirector | 沿用RC65已修正本地模块，本轮未改 | 实际相对鼠标／捕获释放、WASD与X刹车保留并复验；身体碰撞与相机避障分别验证。 |
| Three r161 MarchingCubes／mergeVertices | 直接使用已安装模块 | PaintFlowBlend实际import并在CPU执行，现有单Three runtime与MIT来源保持；不新增GPU密度纹理或云层，不下载新依赖。源码SHA见v17-review。 |
| starry_night_flowing_sky.html／403花盆 | 尚未接入 | 没有本地可读源，不以参考或记忆仿写宣称提取。 |

这是本项目唯一长期维护的资源总表。以下为历史阶段摘要。历史稳定入口RC47：`index-DaTbmLnE.js`，http://127.0.0.1:4246/ ，SHA-256 `8f376c72a484a5bd4eff4074da0633aa1628c96c00b0445925740287468db868`；RC41（4240）保留回退。新增稀疏蓝金飞掠、浮岩程序表面、适度扩区与9000粒子文字；不增加外部纹理／字体／模型或依赖，35本地／31HTTP原资源字节复核通过。原Vortex/StarRiver、认可Sapphire、Joan房间、haefu角色、Victor图集、6K全景及已有许可保留。室外候选RC50（4249）只重塑／增厚已有云体，不新增素材；RC50原包及稳定RC47保留；RC53局部着色修正已冻结待独立窄审；RC55三核心独立窄审已通过，4255保留控制基线；RC56单星团4256已独立建议保留，当前RC57形体4257已冻结并补安全回归，35本地／31HTTP资源再次匹配；4253仅为工作目录预览。PaintFlow旧实验保留，交互闭环后已恢复形体迭代。本轮不新增来源展示。指定HTML仍403，未绕过或提取；此前星星图导出中断记录仅属旧文件；获准PNG已在RC58接入，限定独立专项通过。所有任务Standard、不开Fast，RC47功能与RC50云体独立窄审已归档，不能外推本轮新笔触通过。

用户已声明此前列出作者许可本人复用。该声明与各项公开许可并列记录，不扩展成所有人可任意再分发，也不代替第三方字体、材质、音乐或模型条款。本轮仅独立新项目与本地预览，不改原作品站/Profile，不公开部署，不购买资产。没有来源证据的 URL、许可、版本、演示或资产不得补造；免费浏览或源码公开不自动等于允许复制。

alpha.10历史体积数据边界（仅指原四体与旧世界盒）：渲染entry box的空角可超出探索盒（上方星河空盒maxY=42.216），不代表可见云体或碰撞扩大。全部非零体素中心转换到世界后，按一体素线性插值支撑保守扩边；上方实际support maxY=35.157<38，四体均在原世界边界内。密度纹理由各自材质负责释放，Vortex/StarRiver dispose幂等；借用颜料和图集按原所有者释放。CPU结果不代替实际像素验收。

## 立体笔触形体候选（RC57已恢复显示，整体视觉未验收）

当前先执行《项目目标与实现说明》4.0交互修复；下述4.1美术合同已暂挂，F源码与完整dist保留在E:/temp/starhaven-paint54-f-source；本段是已有资源如何使用的状态说明，不新增来源展示。保留RC50独立确认的体量、主云两体559899字节，现有13体／64步、6K、行星、角色与房间。已复用本地sweptBody、现有图集／颜料和单SpaceScene更新链，以独立PaintFlowManifest／PaintFlowField组织主次回卷、S形流带和最多240段真实厚笔触；首轮新增≤60000三角／≤3绘制、0新纹理／素材／依赖，金色段≤12%。该上限保留；最新净空修正版实际133段／40964三角／2绘制／13金段，0新增纹理／素材／依赖。SpaceScene拥有并更新、释放，借用图集／颜料不重复释放，开关关闭不构造笔触资源。主云附加三粗环已拒收关闭；当前新回卷仍有石片分块感和侧面偏薄，未获视觉验收，不能当稳定候选。上述是暂停前的实验检查范围；当前因用户要求扩大实际世界，探索地标／9条云路随范围同步扩大，不能继续声称全部13云密度不变。主旋涡、行星、6K、房间、角色和第三方资源字节保留。近景实体与194000远景表面实例明确区分；受限HTML／失败PNG均不依赖。全部必要许可通知保留。

## 本轮流动星空源与原创模块

单星团RC56已接入并冻结供窄审：480点中的首团80点形成金核／蓝色弯臂，其他点和既有材质／生命周期保持。功能、接口与验收统一见《项目目标与实现说明》4.0；无新增外部模型或纹理。

| 资源 | 来源/身份 | 当前使用状态 |
|---|---|---|
| starry_night_flowing_sky.html | 用户Library `libfile_37156b94f2a481919290cb49f398689b`，提供元数据42705字节，说明含Three128/GLSL、StarryFlowingSky/buildAirCurrentRibbonGeometry。 | 两次官方prepare_materialize_file及消费者helper均HTTP403，无可读本地文件/本地SHA，未实看、未提取；不绕权限或拿云路径当本地。授权复用与第三方依赖条款分别保留；取得源后先实看再适配同r161单runtime。 |
| ExplorationManifest/ExplorationField | 本项目路线/实体模块，复用已接入PaintedCloudVolume、Victor共享图集和原夜空颜料。 | 实际使用：6站、9局部密度云、三维密度通行核心/云岸（159个分离辅助笔触已移除）、11浮岩；不是上述HTML提取。拥有几何/材料/密度、借用纹理，生命周期测试通过。 |
| FlightExhaust/推进动作 | 原创程序双喷口/蓝金短喷流/余辉与原haefu骨骼叠加。 | 实际使用；按推力变化，原GLB、float文件、贴图字节保留，不称原作者新动画或更换主角。 |

## 来源批次与状态

| 批次 | 原始来源与范围 |
|---|---|
| B0 · 原资源地图 | 用户 Library 原《资源地图》（2026-10-04），`libfile_2d527a95507081918bea73271ba4f906`；本轮只读恢复到工作区 `_resource-map-original.txt`。原报告引用编号没有完整 URL 的条目仍保留索引。旧 stars、Lighthouse、排行榜、性能描述、模型能力及价格不继承为现时事实。 |
| B1 · 此前搜索/补充 | 历史讨论与补充案例：CRT、双入口、设备展品、房间教学、Bruno、控制器、未定位案例；只是来源批次，不代表全部下载或使用。 |
| B2 · 确认方案指定 | 用户确认Joan唯一主底座、three-player-controller为外部飞行复用候选、haefu主角、蓝金星海与本地预览边界；复用优先，不拼多runtime。指定意图、基线思路参考与本轮胶囊/静态builder实际接入状态分别记录。 |
| B3 · 当前素材/本地证据 | 本地 vendor、public、package/lock、源码、SOURCE/manifest、用户上传模型及真实项目截图。固定提交、版本、路径与下文 SHA-256 是当前事实依据。 |
| B4 · Still Night 新补充 | 精确作者、repo、demo 与作者说明已核；用户称作者已同意本人复用，当前未接入。 |
| B5 · 前轮官方核对 | 官方 GitHub README/LICENSE/About、作者页与文档，2026-10-06 核对。演示地址代表官方所列链接，不代表外站运行验收。 |
| B6 · alpha.5定点提取 | 2026-10-07按已规划的笔触缺口，提取Victor-EU的MIT图集生成器和必需工具函数，固定commit/原与提取文件hash；不下载整站或新框架。 |

状态含义：**实际使用**有本项目加载/调用证据；**已安装未调用**仅在依赖中；**已下载未接入**有文件但无活动 loader/导入；**参考**仅阅读/美术方向；**备选/待接入**尚未采用；**待核实**缺精确来源；**退役**已被替换。表中“无；未锁”明确表示无本地对应文件/依赖，也没有固定提交或版本。

## 已采用底座、资产与运行工具

| 名称、repo/demo与已知说明 | 批次、作用与可直接复用部分 | 局限、许可/用户授权 | 实际状态、路径与锁定 |
|---|---|---|---|
| Joan Ramos Refusta / [jrefusta/joan-portfolio](https://github.com/jrefusta/joan-portfolio)；独立demo地址本轮未核 | B0/B2/B3/B5；室内主底座。8 GLB+3 KTX2 与 vendor 字节一致；`src/Experience/Navigation.js` 的拾取、高亮、镜头特写/返回思路可提取。 | 仓库 LICENSE 为 MIT，package 元数据 UNLICENSED 冲突保留记录；用户声明本人许可。当前 Interaction/CameraDirector 是参考后独立重写，非完整上游 runtime。原作者资料、音乐、字体与小游戏没有随资产自动接入。 | 资产实际使用；`vendor/joan-portfolio` clean 提交 `081030cf5fa0f43e39e7d727789f138d704a211c`；`public/assets/room/models/`、`textures/`；`licenses/joan-portfolio-MIT.txt`。11文件哈希见下表。 |
| [jrefusta/joan-arcade-machine](https://github.com/jrefusta/joan-arcade-machine)；独立 arcade 源库，未确认独立 demo | B1/B5；街机交互/游戏代码候选。当前房间里的 `arcadeMachine.glb` 来自 Joan 主仓库，作为静态星图展品。 | [MIT](https://github.com/jrefusta/joan-arcade-machine/blob/master/LICENSE)；首版已确认不做小游戏，不能由 GLB 的存在推断已接入游戏。 | 参考/未接入；独立仓库无本地文件、未锁；当前静态模型路径 `public/assets/room/models/arcadeMachine.glb` 属上一行提交。 |
| hh-hang / [three-player-controller](https://github.com/hh-hang/three-player-controller)；原生Three控制器 | B2/B3；飞行参考后独立改写；原胶囊与完整静态builder仅esbuild去types、算法零改，SpaceCollision实际调用。v0.2新增cameraRaycast.js提取适配CameraSystem.ts:344–359最近命中循环，替换ctrl/vehicle筛选为明确活动mesh列表；本地五射线/绕障由CameraAvoidance实现，非原updateWithRaycast/完整CameraSystem。 | MIT/copyright2026屈航；原movement、AnimationSystem与完整CameraSystem未接；仅最近命中循环提取适配，SPACE相机避障已接，不能称整套原相机移植。固定Three161/BVH0.7.8的ESM smoke17/17（14行为+3限制）通过；裸Node CJS双身份、zero-distance无效初始姿态、单位缩放/segment start=0为已记录限制，不推定peer范围全兼容。 | 胶囊/静态builder直接提取使用、camera命中循环提取适配实际调用；飞行仅参考后改写；`src/vendor/hh-hang/{capsuleCollision.js,colliderBuild.js,cameraRaycast.js,LICENSE.three-player-controller.txt,provenance.json,sha256.json}`、`src/core/SpaceCollision.js`与SpaceController/main。固定v0.6.2/`ca82bbc76a3b9b0afa80c73b60167adf6123b9b6`，原vendor保留。browser模块metafile单Three；生产共享Node21项通过，正式候选browser运行回归已通过。输出hash见下表。 |
| [haefu Cute Astronaut](https://sketchfab.com/3d-models/cute-astronaut-816bd786fe8b4559a009de6a95582003)；用户上传原始 GLB | B2/B3；最终主角。5,736三角面、54骨骼、2048²内嵌贴图与作者 extras 保留；用配置适配材质、节点与比例。 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；用户上传身份与授权边界在 character manifest。内嵌1条 walk 动作保留但不映射飞行；最终视觉仍以实际页面复审为准。 | 实际使用；`incoming/cute_astronaut.glb` 与 `public/assets/character/astronaut.glb` 字节相同，1,198,772字节；SHA-256 `0fc948127a889f64ed4659f74d084d998eb68acb92d7a892965a03edbea2905d`。配置 `public/assets/character/manifest.json`；来源 `SOURCE.md`。 |
| Starhaven_Float 本地外部动作适配 | B3；在现成 haefu 骨骼上补4.8秒、四条肩/前臂 quaternion 轻循环，原比例/绑定姿态保留，无根位移、缩放或腿部轨道。 | 本项目新增动作；不是下载的写实漂浮动画包，不称已 retarget 上游动作。角色原 CC BY 4.0 仍适用。 | 实际使用；`public/assets/character/float.animation.json`、`src/config/AnimationMap.js`；本地JSON固定字节见下表，未另设发布版本；alpha.11另在CharacterScene叠加推进/制动骨骼姿态，原四轨文件不变。 |
| 花叔/alchaincyf / [3d-vibe-coding-handbook 星月夜](https://github.com/alchaincyf/3d-vibe-coding-handbook) · [原demo](https://github.com/alchaincyf/3d-vibe-coding-handbook/tree/master/demos/%E6%98%9F%E6%9C%88%E5%A4%9C) | B1/B2/B3；Cni历史两PNG、makePlane/共同画布配准/局部z惯性及三frame六层机制全退役。当前仍采样原layer-夜空.png色/纹理作为世界绘画体积色素，layer-星月与旋涡.png不再加载。 | [CC BY-NC-SA4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)+用户本人许可仍覆盖活动采样素材；保留梵高1889、花叔/alchaincyf、@HoodyLiu出处。当前不是原Basic配准/层z惯性，也不是原demo提供的360；村庄/柏树、camera/renderer/OrbitControls/UI/timer未接。 | 夜空采样实际使用；原六层/Basic配准/z惯性退役，星月PNG保留未加载；`public/assets/sky/candidates/`原件/来源/hash不删。release `v260914c`、tree `272a90ef84a078464dc277624267cb9b2dfe6449`；参考zip33,613,022字节/SHA `841977f4266d86ace830ebeac2328f2e8f4aab58b3f68d9d1212193f1d572c55`，16解包hash一致；入口 `vendor/starry-night-reference/package/10-demo-星月夜/星月夜/index.html`。 |
| 本项目ImageGen全向远景blue-gold-panorama.png与新世界绘画体积 | B3；生成1774×887全向图作Sphere远景，Three成熟API CatmullRomCurve3/Points/BufferGeometry构造固定世界体积与星点。C9世界配置已冻结11volumes/24,750paint/3,210stars，参数以AssetManifest/StarfieldBackdrop为准。 | 新生成工具素材，保留来源，不乱赋MIT/CC0或冒充原demo360；夜空PNG采样仍遵上一行许可。DN9无画卡/鼠标绕圈通过，极点/经线/视差未过；C9构建、Node与browser运行回归通过，独立定向视觉复审已通过；数量不等于视觉验收。 | 原图保留未加载；C9历史引擎部分保留，当前底稿见下一行；`src/scenes/StarfieldBackdrop.js`、`src/scenes/sky/SkyShaders.js`、AssetManifest；`public/assets/sky/world/blue-gold-panorama.png`与SOURCE.md。PNG3,182,010字节/SHA `0357bb0e805fdc6ce00599dd5c8406dae7a896cf4ed6c90d1a85a48a024c0c16`；无独立第三方repo版本，C9历史候选独立视觉复验通过，用户桌面艺术最终验收待确认。 |
| 本项目ImageGen v0.3历史重绘与原生GPU笔触 | B3；历史直接接入重绘底稿，194,000远景实例笔触继续保留；保留原蓝金构图/24,750体积色素/3,210世界星点。生成请求6K但工具实际仍1774×887。 | 生成素材保留两参考来源，不乱赋MIT/CC0；新笔触shader本项目编写，Three原生API直接使用，不称上游模块移植或超分。底稿/笔触没有实体碰撞；当前首组实体Vortex另见下一行，该历史阶段未完成宏观组合；RC6主线复验另见当前汇总。 | 直接使用生成图、原生Three API；`public/assets/sky/world/blue-gold-panorama-v03.png`、`src/scenes/sky/PaintedSkyStrokes.js`、SkyShaders/StarfieldBackdrop/AssetManifest；源于v0.3/index-DSr0_Xfi.js，该底稿当前退役保留，笔触继续加载且共享下面的用户6K全景。PNG3,383,920字节/SHA `3f1c3432bf7e743c7c41ce49f7352e97e3b51040b428454283aa0cd1d0984146`；精确提示词/模式见world/SOURCE.md，实际测试见v03报告，最终高清源图/用户美术仍未完成。 |
| 用户蓝金星河UltraSharp 6K全景 | B3；直接使用用户提供PNG原字节，6144×3072；底稿和远景笔触共享同一纹理/经线极点采样，中近景三维层保留。 | 用户本机生成/超分结果；来源原路径和低分候选身份见world/SOURCE.md，未提供处理manifest或生成平台许可，不冒称原生6K、恢复原细节或第三方CC0。仅用于本地授权项目，未购买/发布。 | 实际接入；`public/assets/sky/world/blue-gold-panorama-v07-6k.png`，36,417,642字节，SHA `dfb52f96469267b8e920f3111b40e2f64cfd1eb61644f6a2fb106fe9cff65e0a`；AssetManifest/StarfieldBackdrop实际加载，源像素6144×3072已浏览器核对；tests/v07-review.json为同版证据。远景不具实体碰撞或平移视差，完整全向景观未完成。 |
| 本项目VortexField立体旋涡与星核 | B3；本地路径/截面、星核与通道，直接用已安装Three r161。alpha.10将主次扫掠采样为3D密度体，星核/金晕继续MeshStandardMaterial；未下载外部旋涡模型。 | 本地实现，不是ImageGen、视频或alchaincyf源码移植。借用夜空颜料的CC BY-NC-SA4.0/用户许可及Victor图集MIT保留，不扩大授权。 | 实际使用；VortexField/VortexManifest/PaintedCloudVolume；原主次各15,424面仅作authoring输入，显示各12面entry box内进行64步积分。实体视觉半径2.4/代理2.55保持；碰撞与云体分开。原体积云阶段证据tests/v10-review.json，当前RC16与独立SolMax分构建证据汇入tests/v11-review.json；用户最终美术确认仍未完成。 |
| 本项目StarRiverField上下立体星河 | B3；复用本地sweptBody路径/截面与PaintedCloudVolume，借用同一Victor图集和夜空颜料，未下载或仿称上游整站移植。 | 本地布局/体积算法；图集MIT与夜空CC BY-NC-SA4.0/用户许可保持；装饰云体可穿越，无实体代理。 | 实际使用；StarRiverManifest/StarRiverField/PaintedCloudVolume；后上/东下两条路径，原各6960面为authoring输入，显示各12面ray-entry box与内部密度；18项星河及11项云体数据/释放检查，实机验证另记。 |
| [Quaternius Ultimate Space Kit](https://quaternius.com/packs/ultimatespacekit.html)；[作者分发](https://poly.pizza/bundle/Ultimate-Space-Kit-YWh743lqGX)；[GLB转换来源](https://opengameart.org/content/ultimate-space-kit-by-quaternius) | B2/B3；天线、两小行星、机器人、植物、太阳能板、螺旋树候选；作者2023-03包称92模型，取得转换包87 GLB，已选7个。可取所需道具，不整体塞入站点。 | [CC0](https://creativecommons.org/publicdomain/zero/1.0/)；转换分发与作者来源分开保留。当前 src 没有这些文件的 loader 引用，不能称已用于外景；动物宇航员/枪械不作主角。 | 已下载未接入；`public/assets/spacekit/{antenna,asteroid-large,asteroid-small,floating-robot,plant,solar-panel,spiral-tree}.glb`；SOURCE/manifest逐项证据。原下载 `E:/temp/starhaven-assets/ultimate_space_kit-glb.zip`，SHA `61ee5a5199d1abe419bb15ca580ab047449c3c4500b73962d4be01faa11bf8a0`；未锁独立repo提交。 |
| [Quaternius Astronaut / poly.pizza](https://poly.pizza/m/3hC2i0CTuO) 历史机械角色 | B3；早期灰盒主角，已被 haefu 替换。 | CC0；不以当前 astronaut.glb 证明退役资产仍在运行。 | 退役；旧活动文件被 haefu 覆盖，无独立保留路径/版本可证明。 |
| [Three.js](https://github.com/mrdoob/three.js)；[文档/示例](https://threejs.org/) | B2/B3；唯一3D runtime，GLTFLoader/KTX2Loader/Draco loader、动画与射线拾取等。可复用同版本官方 addons。 | MIT，`licenses/three-MIT.txt`；禁止引入第二份不同版本 Three 或独立相机写入者。 | 实际使用；`package.json/package-lock.json`、`src/`、`node_modules/three`；严格 `0.161.0`（r161）。 |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | B3；本轮胶囊/静态合并碰撞依赖，已安装并接入SpaceCollision。 | MIT，`licenses/three-mesh-bvh-MIT.txt`；npm deprecated有安装实录，仅验证精确Three0.161.0/BVH0.7.8组合，不作宽泛兼容声明。单Three browser证据与裸Node CJS限制分别记录。 | 实际使用/正式场景运行回归已通过；package/lock、node_modules/three-mesh-bvh、SpaceCollision；严格 `0.7.8`。 |
| Draco / Basis Universal 解码器；[Draco](https://github.com/google/draco) · [Basis](https://github.com/BinomialLLC/basis_universal) | B3；解码 Joan GLB/KTX2。采用 Three0.161.0 配套解码器。 | Apache-2.0，保留 `licenses/draco-Apache-2.0.txt`、`basis-Apache-2.0.txt`。此前旧Draco曾报 Unexpected geometry type，替换后资源载入已验证；不是随意跨版本解码器。 | 实际使用；`public/assets/room/draco/`、`basis/`；分发版本锁在 Three0.161.0，未另锁独立解码器repo提交。 |
| [GSAP / ScrollTrigger](https://github.com/greensock/GSAP)；[官方文档](https://gsap.com/docs/) | B0/B2/B3；动效库候选，源码阅读/现有交互节奏参考。 | GSAP3.12.5为 [Standard许可](https://gsap.com/standard-license)，不是MIT；已保留 `licenses/gsap-notice.txt`、`gsap-README-license.md`。当前 src 无调用，ScrollTrigger 未接入。 | 已安装未调用；`package.json/package-lock.json`、`node_modules/gsap`；严格 `3.12.5`。 |
| [Vite](https://github.com/vitejs/vite)；[文档](https://vite.dev/) | B3；实际替代 Joan 旧Webpack构建工具，构建/本地预览，不是第二3D runtime。 | MIT；本阶段已构建，未另增工具/runtime。 | 实际构建工具；`package.json/package-lock.json`、`node_modules/vite`；严格 `6.1.0`。 |
| [Playwright](https://github.com/microsoft/playwright)；[文档](https://playwright.dev/) | B3；实际浏览器回归与截图开发工具。 | Apache-2.0；隔离 Chromium/SwiftShader 记录不等于真实手机/GPU验收。 | 实际开发工具；`tests/`、`package.json/package-lock.json`；`@playwright/test` 严格 `1.51.1`。本阶段实际运行；当前证据见tests/v11-review.json；v10及此前为历史。 |
| 系统中文字体栈 | B3；当前DOM中文排版，不引入原站未核字体。 | 使用本机/系统字体，不下载或重新分发字体文件；无独立字体资源包许可。 | 实际使用；`src/style.css`；随操作系统解析，未锁字体版本、无字体资产文件。 |
| Web Audio 本地轻交互音 | B3；主动开启后的合成短音，默认静音，无背景音乐。 | 本项目生成逻辑，不复用原站音乐/音效；不把后续第三方音频推定同许可。 | 实际使用；`src/main.js`；浏览器API，无下载音频文件/独立版本。 |
| 原创建筑补壳、露台与程序道具 | B3；按共享BuildingLayout补外墙/屋顶/露台；本轮前窗4.4×4.45/玻璃opacity.11，共享原桌椅、植物、书架、白板与木露台。 | 本项目程序几何；保留Joan来源，不称整房从零原创。DN9窗口/确认入房通过，九实体UUID/八静态matrix一致，C9的完整进出运行回归已通过；不替代空间深度视觉验收。 | 实际使用；BuildingLayout/StudioBuilding/SpaceScene/RoomScene；当前alpha.11保留原房间/建筑；本轮tests/v11-rc6-player-review.json三路线通过；tests/v10-player-review.json属alpha.10历史，tests/v08-player-review.json属于alpha.8历史；tests/v07-review.json是alpha.7历史；tests/v06-review.json为alpha.6历史；tests/v05-review.json是alpha.5材质历史；tests/v04-review.json三路线为alpha.4历史；Cni/C9只是历史，用户最终艺术待确认。 |

旧星海SOURCE/manifest的DKpZJTzf是移植历史标记；Cni保留于`.baseline/CniDwZE5.zip`，其两PNG/三frame六层机制已退役。当前为Sphere远景+远景实例笔触+固定世界点体积+VortexField/StarRiverField的3D密度云体及实体星核+SapphirePlanet三维行星，alpha.5另外共享Victor干刷图集；来源见public/assets/sky/world/SOURCE.md。村庄/柏树/Meshopt仅vendor参考。仍一个renderer/CameraDirector/RAF，不把原demo包装成360成功模块；C9复验只属历史，alpha.4与用户最终美术分别记录。

## 主角、动作与外景备选

室内星星摆件：`public/assets/room/props/star-ceramic.png`，1254×1254 RGBA、839043字节、SHA-256 `de47d38fd207d74e045d3d2edd7e1c5c54c22ca5b5e459df1fc964f2bf4469a1`。已实际看图，按用户“先贴”采用原PNG字节；固定朝向透明平面，约0.59m有效高度，原矮柜表面支撑，不随镜头旋转，不遮展品交互，内外共用同一房间实体。不是原生3D模型；侧角会变薄。花盆PNG官方取用HTTP403，本机无可读图片，未接入，未绕过。

### 本阶段资源整合与下阶段取用顺序

alpha.6只读实看原Quaternius大/小岩石、静态植物与螺旋树轮廓（tests/v06-asset-inspection.json、screenshots/v06-asset-inspection）。未为复用计数替换现有道具；红青螺旋植物暂不适合暖木工作室。动画机器人此次静态预览未得到可靠外形验收，Box3/骨骼预热问题不推定源模型故障，仍未接入。七个原GLB字节、来源与未用状态保留。

用户新全景：首次读取路径C:/Users/ertstyuqk/Downloads/印象派星河环景油画 Muted_.png，当时核实原PNG 1774×887、2,995,490字节，SHA256 b6fed3ad6cfbd526557c55269fbca48adb65fdc7a4b93d873b0cf8a5c76c8820；收束记录时该路径已不存在，保留已核实元数据，不推定其他新文件与它相同。用户生成并指出线条过多；已实看，均匀波带缺宏观主次，不复制入public、不活动加载、不称6K。此为alpha.6被否定候选的历史记录；alpha.7用户另提供6K星河图并直接接入，背景与可接近三维景观共同组成世界。生成平台及进一步分享权利未补造。

alpha.4整理时未新增素材；alpha.5新增定点笔触源码提取，没有购买资产。34条原文件字节锁继续核对。只有一份资源总表，SOURCE/manifest保留各资产出处，配置/模型/材质/动作/碰撞/相机/状态分别维护。用户要求alpha.4结束先暂停，2026-10-07恢复并自行生成素材，随后要求alpha.7完成后休整；下表继续区分实际接入与尚未采用。

| 资源组 | 当前接入证据与分类 | 恢复后的整合边界 |
|---|---|---|
| Joan房间、家具、木露台 | 模型/纹理直接使用，共享坐标与实体；拾取/镜头只是思路参考后本地重写。三轮窗外/入室/展品验证保留。 | 继续作为唯一房间；替换项目介绍只改ProjectRegistry/content-notes，家具模型和BuildingLayout保持独立，不引入上游整站runtime。 |
| haefu主角与float动作 | GLB/内嵌贴图直接使用；float.animation.json是本地动作适配，原walk未映射飞行。 | 保留可爱比例和深蓝面罩；如后续换动作，单独校验骨骼映射/真实skinned包络再调整胶囊，不凭动画名宣称已retarget。付费主角不纳入。 |
| 蓝金底稿、原夜空颜料、远景笔触、立体旋涡 | 底稿直接使用生成输出；原夜空texture实际共享采样；PaintedSkyStrokes/VortexField本地编写，Three原生API直接用。 | alpha.7已改短笔触/云团明暗/轻金晕并直接接入用户6144×3072超分图；旧1774×887图只作历史，alpha.8已接入蓝金行星，alpha.9已添加上下两条立体星河，alpha.10沿用同一图集/颜料/扫掠输入并用PaintedCloudVolume积分厚度。实体核代理与装饰云体分开，不增加第二相机/动画循环。 |
| hh-hang胶囊/builder/最近命中叶模块 | 前两者直接提取且仅去types；最近命中循环提取适配；移动速度仅参考后独立实现。完整CameraSystem/AnimationSystem未接。 | 继续复用已验证的生产模块，新增实体只加锚点/代理。相机与身体分别验证，不扩写成完整上游控制器移植。 |
| 7个Space Kit道具 | 已下载未接入，逐文件hash/CC0来源齐；当前程序机器人、小行星、卫星不来自这些GLB。 | 如现有小道具确需替换，再选单个GLB验证比例、材质、世界锚点和独立代理；它们不能充作宏大油画旋涡，也不因文件存在计入画面丰富度。 |
| Still Night、其他作品站、所附视频、GSAP | 前三类仅参考/未接入；视频原始源码与许可未核。GSAP已安装但src未调用。 | 先不新增依赖/多runtime；只有现有实现遇到具体缺口时再定点核对可复用部分。不得称已移植、按记忆仿写为复用，或把参考帧当网站资产。 |

新增用户视频参考仅作设计分析，不载入网页、不复制为运行资产。原件D:/xwechat_files/wxid_0up0g7qq8ene22_b7f7/msg/video/2026-10/94d5bb57657812415867cc86e2d48931_raw.mp4，SHA-256 `9feb903165c784aeef03867731ed7b1a4ac0e213f99812b9516ba5810fdbec5a`；实测2400×1080/36.488秒/77,754,763字节，和方案所述压缩版规格不同。画面显示Elio，但未核实原始源码、作者身份与资产许可；状态“仅参考，尚无可复用源码”。原始解码帧在screenshots/reference-video，解析记录tests/reference-video-inspection.json；不是项目运行截图，也不计为业务测试或高清资产接入。

v0.2起已按完整胶囊含skin收缩世界盒；旧alpha.11的`[-230,-140,-245]..[240,165,235]`仅为历史。2026-10-16核对RC74实际`ExplorationTuning.worldBounds`为`[-1500,-900,-1600]..[1600,1100,1500]`，现有`SpaceController`先调用`SpaceCollision.bodyBounds`再减速及限位。飞行胶囊radius/segmentLength/footOffsetY/skin为1.0/.14/−.18/.012，含skin的横向半径1.012，垂直覆盖脚下原点−.192..1.972；确认靠泊另用原正立胶囊。当前32项几何CPU检查包括六面包络与从边界内25单位开始的六轴进近，仅为局部数学验证，不冒充从正常出生飞遍六个外边界。SPACE CameraAvoidance在既有最近命中叶模块适配上增加中心/脚/头高度查询及眼点避障，并实际检测vortexCore；后续实体笔触基础面代理见前文RC71。不是完整上游CameraSystem移植或连续体积扫掠。原胶囊/builder去types直接提取、cameraRaycast最近命中循环提取适配、飞行仅参考后改写、GSAP已安装未调用/Space Kit已下载未接入等分类继续保留。旧C9只验脚下原点，不作为新实现通过证据；当前实跑同构建记录单独维护。

| 名称、repo/demo与已知说明 | 批次、作用与可直接复用部分 | 局限、许可/用户授权 | 状态、实际路径、锁定 |
|---|---|---|---|
| [ARK Chibi Astronaut](https://sketchfab.com/3d-models/chibi-astronaut-8e16849ed0ab411098057697c2ecb587) | B2；白蓝大头盔角色备选，原预览手托土星。 | 原讨论记录CC BY4.0；未下载验包，骨骼、48.2k面/无动画等预览信息不当成本地验证。若采用需去土星、调pose并保留出处。 | 备选未下载未接入；无；未锁。当前主角确定haefu。 |
| [Animated Astronaut Character in Space Suit Loop](https://sketchfab.com/3d-models/animated-astronaut-character-in-space-suit-loop-8fe5c8d3365e4d87bb7bc253d53a64e1) | B2；walking/waving/drifting/idle 动作参考候选。 | 原讨论记录CC BY4.0；写实比例与Q版骨骼不一致，需验包/retarget/rest pose/root-motion核对，不能将整包或作者动作称已用。 | 参考/未下载未接入；无；未锁。当前float为本地四骨循环。 |
| [flo-bit/tiny-planets](https://github.com/flo-bit/tiny-planets) · README声明 [demo](https://flo-bit.dev/tiny-planets/)（未实测） | B2；微型星球、浮岛外景候选，可提取模块思路。 | MIT记录；未下载锁定或兼容验证，不能引入整站runtime。 | 备选未下载未接入；无；未锁。 |
| [Sketchfab](https://sketchfab.com/) 模型平台 | B0/B2；通过作者正常下载流程取得明确授权的模型。 | 平台不是统一模型许可；每模型检查作者、下载条件和CC/自定义条款，不抓受限文件。 | 平台参考；当前仅haefu已由用户上传接入；平台整体无本地路径/固定版本。 |

## 作品集参考仓库与演示

以下仓库均不在本项目 vendor、依赖或活动资产中；“可复用”仅说明许可和模块层面的候选用途，不代表已复制或适配。

| 名称、repo/demo与已知说明 | 批次、作用与可直接复用部分 | 局限、许可/用户授权 | 状态、实际路径、锁定 |
|---|---|---|---|
| [Still Night / joshuagarcia-git/still-night](https://github.com/joshuagarcia-git/still-night) · [demo](https://stillnight.joshua-garcia.com/) · [作者说明](https://joshua-garcia.com/still-night) | B4/B5；原生WebGL2画作点云、分区运动与音画互动参考。 | [README](https://github.com/joshuagarcia-git/still-night/blob/main/README.md) 明确 ©2026 Joshua Garcia All rights reserved；用户称已获作者本人许可。该许可不扩为所有人的开放许可；首版无背景音乐。 | 参考/未接入；无；未锁。不能与本项目已用 alchaincyf 星海混称。 |
| [iTzRitual/folio-2026](https://github.com/iTzRitual/folio-2026) · [demo](https://folio-2026-alpha.vercel.app/) | B1/B5；CRT工作站揭示、DOM与镜头节奏参考；React/R3F整站不接。 | [自定义署名许可](https://github.com/iTzRitual/folio-2026/blob/master/LICENSE)：允许复制修改，但公开衍生页面需清晰可见、可点击的Natan Mokrzycki作者署名；仅源码/README不足。用户本人授权并列保留。 | 参考/未接入；无；未锁。 |
| [kwiruu/portfolio](https://github.com/kwiruu/portfolio) · [demo](https://www.keiru.dev/) | B1/B5；Website/FPS双入口、项目交互与GSAP过渡。 | 根目录未发现项目级LICENSE、官方许可元数据为空；用户已声明作者许可本人复用，第三方资产单独核对。不能记MIT。 | 参考/未接入；无；未锁。 |
| [Armando-ic/portfolio](https://github.com/Armando-ic/portfolio) · [demo](https://armando-portfolio-3d.web.app/) | B1/B5；可行走设备房、机柜展品、移动端控制/平面fallback。 | 根目录未发现项目级LICENSE、官方许可元数据为空；保留用户本人授权，音频/云联系服务不随参考接入。 | 参考/未接入；无；未锁。 |
| [davidhckh/portfolio-2025](https://github.com/davidhckh/portfolio-2025) · [demo](https://david-hckh.com/) | B0/B1/B5；Vue/Three视觉、shader案例与沉浸过渡。 | [自定义许可](https://github.com/davidhckh/portfolio-2025/blob/main/license.md)：仅个人/教学，源码/README/公开衍生部署可见署名，不删原声明；商业使用、转售或实质再分发须事先书面许可。用户本人授权不扩为通用许可。 | 参考/未接入；无；未锁。 |
| [sanidhyy/space-portfolio](https://github.com/sanidhyy/space-portfolio) · [demo](https://spaceportfolio.netlify.app/) | B0/B5；太空主题页面与信息层级，可提取布局/主题模块。 | [MIT](https://github.com/sanidhyy/space-portfolio/blob/main/LICENSE)；模型/字体/第三方服务仍按各自许可。Next/R3F整站不接当前底座。 | 参考/未接入；无；未锁。 |
| [sanidhyy/3d-portfolio](https://github.com/sanidhyy/3d-portfolio) · [demo](https://shubam.netlify.app/) | B0/B5；React/TS/Three作品集展示与动效候选。 | [MIT，实际文件LICENSE.md](https://github.com/sanidhyy/3d-portfolio/blob/main/LICENSE.md)；第三方资产不自动MIT。 | 参考/未接入；无；未锁。 |
| [GourangaDasSamrat/3D-React-Portfolio](https://github.com/GourangaDasSamrat/3D-React-Portfolio) · README [demo](https://gouranga-das.netlify.app/) | B0/B5；3D hero、动态画廊与项目排版。 | [MIT](https://github.com/GourangaDasSamrat/3D-React-Portfolio/blob/main/LICENSE)；About另列 [gourangadas.netlify.app](https://gourangadas.netlify.app/)，与README地址不同，保留差异不声称两站同样有效。 | 参考/未接入；无；未锁。 |
| [red1-for-hek/portfolio-website](https://github.com/red1-for-hek/portfolio-website) · [myworks](https://www.redoyanulhaque.me/myworks) · [play](https://www.redoyanulhaque.me/play) | B0/B5；项目索引与独立互动入口；官方 `src/App.tsx` 确实定义两路由。 | [MIT](https://github.com/red1-for-hek/portfolio-website/blob/main/LICENSE)；不将原图ChatGPT/国际象棋等演示带入首版。 | 参考/未接入；无；未锁。 |
| [andrewwoan/sooahs-room-folio](https://github.com/andrewwoan/sooahs-room-folio) · README [demo](http://sooahs-room-folio.com/) · [教学](https://youtu.be/AB6sulUMRGE) | B1/B5；初学者房间教学、物件交互与室内构图。 | [代码MIT](https://github.com/andrewwoan/sooahs-room-folio/blob/main/LICENSE.md)；README另列材质、音乐、音效、壁纸、字体来源，作者的商业材质许可不能推定转移给复用者。assets逐项核。 | 参考/未接入；无；未锁。 |
| [brunosimon/folio-2019](https://github.com/brunosimon/folio-2019) · [demo](https://2019.bruno-simon.com/) | B1/B5；空间导航、互动组织与镜头节奏。 | [MIT](https://github.com/brunosimon/folio-2019/blob/master/license.md)；第三方资产另核。 | 参考/未接入；无；未锁。 |
| [brunosimon/folio-2025](https://github.com/brunosimon/folio-2025) · [demo](https://bruno-simon.com/) | B1/B5；完整3D世界组织、手感与美术；Blender文件公开可阅读。 | [代码MIT](https://github.com/brunosimon/folio-2025/blob/main/license.md)；[作者说明](https://github.com/brunosimon/folio-2025/blob/main/sources/index.html) 明确服务端不公开、无服务端也能运行，Kounine音乐CC0。未找到Blender单独CC0声明，不能写“Blender和音乐都CC0”。 | 参考/未接入；无；未锁。 |
| [pmndrs/ecctrl](https://github.com/pmndrs/ecctrl) · [demo](https://ecctrl.app/) | B1/B5；角色控制备选，R3F/Rapier路线。 | [MIT](https://github.com/pmndrs/ecctrl/blob/main/LICENSE)；依赖另一套React/Rapier栈，不接当前原生Three底盘。 | 备选/未接入；无；未锁。 |
| [yomotsu/camera-controls](https://github.com/yomotsu/camera-controls) · [文档/demo](https://yomotsu.github.io/camera-controls/) | B1/B5；原生Three平滑镜头、边界/碰撞控制候选。 | [MIT](https://github.com/yomotsu/camera-controls/blob/dev/LICENSE)；需要按当前Three验证；即使采用也只能由CameraDirector统一写入。 | 备选/未接入；无；未锁。 |
| [elijah-farrell/Awwwards-Portfolio](https://github.com/elijah-farrell/Awwwards-Portfolio) · [demo](https://awwwards-portfolio-template.vercel.app/) | B0/B5；行星hero、滚动视差与排版；README明确基于Ali-Sanati作品。 | 根目录无LICENSE、官方许可元数据为空；原图“MIT”无依据，不沿用。公开源码本身不提供复制授权。 | 参考/未接入；无；未锁。 |
| [Ali-Sanati/awwwards-portfolio](https://github.com/Ali-Sanati/awwwards-portfolio) · [官方教学](https://youtu.be/i0229UsdBwc)；独立demo未确认 | B0/B5；3D hero、GSAP滚动教学；README提供assets ZIP。 | 根目录无LICENSE、官方许可元数据为空；不能继承原图“应该MIT”，assets ZIP不证明逐项许可。 | 参考/未接入；无；未锁。 |
| [sanidhyy/duolingo-clone](https://github.com/sanidhyy/duolingo-clone) · [demo](https://lingo-clone.vercel.app/) | B0/B5；语言学习UI/流程与Auth候选，和本项目主线低相关。 | [MIT](https://github.com/sanidhyy/duolingo-clone/blob/main/LICENSE)；图像/音频/外部服务另核，不引入整套后端。 | 参考/未接入；无；未锁。 |
| [sanidhyy/modern-portfolio](https://github.com/sanidhyy/modern-portfolio) · [demo](https://awersome-portfolio.netlify.app/) | B0/B5；常规信息排版、Next/Framer Motion动效。 | [MIT](https://github.com/sanidhyy/modern-portfolio/blob/main/LICENSE)；原图排名/性能指标不复制。 | 参考/未接入；无；未锁。 |
| [sanidhyy/next-portfolio](https://github.com/sanidhyy/next-portfolio) · [demo](https://portfolionext-js.netlify.app/) | B0/B5；简洁作品集与信息组织候选。 | [MIT](https://github.com/sanidhyy/next-portfolio/blob/main/LICENSE)；不能因原地图多处提及重复记为多个已用底座。 | 参考/未接入；无；未锁。 |

## 原资源地图组件、平台与泛称资源索引

“可直接复用”列必须结合框架和当前许可理解：没有安装、没有固定示例或字体/模型来源的条目不能直接复制到本项目。下面保留原图组件名；不把原图方案A/B/C的多runtime拼接建议转为本项目架构决定。

| 名称、官方入口/repo/demo | 批次、作用与可直接复用部分 | 局限、许可/用户授权 | 状态、实际路径、锁定 |
|---|---|---|---|
| React Three Fiber / R3F · [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) · [文档](https://r3f.docs.pmnd.rs/) | B0/B5；React封装Three场景参考。 | MIT；依赖React，不为本项目引入第二runtime。 | 参考/未接入；无；未锁。 |
| Drei · [pmndrs/drei](https://github.com/pmndrs/drei) · [文档/示例](https://drei.docs.pmnd.rs/)；OrbitControls、Text、Text3D、Loader、Points、shaderMaterial | B0/B5；现成相机、文字、加载、点云与shader封装帮助组件，作为模块思路候选。 | MIT代码；Text3D字体文件/环境贴图/模型/shader许可另核。Drei OrbitControls不是本项目相机控制器；当前唯一CameraDirector。 | 参考/未接入；无；未锁。 |
| maath / [pmndrs/math](https://github.com/pmndrs/math)（原maath入口重定向） | B0/B5；数学、阻尼与粒子帮助函数候选。 | 当前math MIT已核；原maath具体版本未锁，不能把当前重定向仓库当已安装旧包。 | 备选/未接入；无；未锁。 |
| [react-scroll](https://github.com/fisshy/react-scroll) | B0/B5；滚动导航候选。 | MIT；React依赖，当前作品集交互非滚动整站，不接。 | 参考/未接入；无；未锁。 |
| Framer Motion / Motion · [motiondivision/motion](https://github.com/motiondivision/motion) · [文档/demo](https://motion.dev/) | B0/B5；页面/卡片过渡候选。 | MIT代码；当前未安装。Framer建站服务与此库不是同一许可对象。 | 参考/未接入；无；未锁。 |
| [Lenis](https://github.com/darkroomengineering/lenis) · [demo](https://lenis.darkroom.engineering/) | B0/B5；平滑滚动候选。 | MIT；不为外部漂浮加入无关滚动控制，不覆盖DOM正常阅读。 | 参考/未接入；无；未锁。 |
| [Locomotive Scroll](https://github.com/locomotivemtl/locomotive-scroll) · [demo](https://locomotivemtl.github.io/locomotive-scroll/) | B0/B5；滚动视差候选。 | MIT；版本与DOM行为需独立评估，当前不用。 | 参考/未接入；无；未锁。 |
| smooth-scrollbar · [dolphin-wood/smooth-scrollbar](https://github.com/dolphin-wood/smooth-scrollbar) | B0/B5；平滑滚动库候选，旧入口重定向需保留名称。 | MIT；当前无接入，不与镜头/输入争用。 | 参考/未接入；无；未锁。 |
| [Shadertoy](https://www.shadertoy.com/) / 原图 shadered.toys 泛称 | B0；GLSL背景、波纹/噪声方向索引。 | shadered.toys具体页面/身份未核；Shadertoy作品逐项看作者与许可，不能按平台名写统一免费可复制。当前天空没有取此shader。 | 参考/待核实具体作品；无；未锁。 |
| react-spinners-kit；原图误链 [KyleAMathews/dualstack README](https://github.com/KyleAMathews/dualstack/blob/main/README.md) | B0/B5；loader候选索引。 | 原链接不是该库，错误已更正、原链接不采用。正确官方候选 [dmitrymorozoff/react-spinners-kit](https://github.com/dmitrymorozoff/react-spinners-kit) 的MIT已另核；不把它默认为原引用的固定版本。 | 已更正来源/候选未接入；无；未锁。 |
| [CodePen](https://codepen.io/) · [许可说明](https://blog.codepen.io/documentation/licensing/)；[CodeSandbox](https://codesandbox.io/) | B0/B5；具体3D卡片、loader和交互示例的检索平台。 | CodePen公开Pens默认MIT，私有Pens无隐含许可，外部资产另核；CodeSandbox按具体repo/沙箱许可。原图无精确示例URL，不能直接复制某例。 | 平台参考；无具体本地示例；未锁。 |
| [Spline](https://spline.design/) · [导出文档](https://docs.spline.design/exporting-your-scene/web/exporting-as-code) | B0/B1/B5；3D场景制作与模型/代码导出工具候选。 | 服务/方案条款；各种导出不等价，事件、交互和动画保留能力需按格式核对，不能泛称场景→GLB/JSX即可完全复用。历史具体Spline案例URL未知。 | 参考/未接入；无；未锁。 |
| [Rive](https://rive.app/) · [runtime仓库入口](https://github.com/rive-app) | B0/B5；向量/状态机互动动画工具候选。 | 官方runtime有MIT许可，但编辑器/素材需另核；主要交付.riv，不是glTF三维资产工具。 | 参考/未接入；无；未锁。 |
| [Webflow](https://webflow.com/) · [代码导出说明](https://help.webflow.com/hc/en-us/articles/33961386739347-How-do-I-export-my-Webflow-site-code) | B0/B5；建站雏形候选。 | 服务条款；导出需符合付费Workspace条件，CMS/表单等不完整，不花钱范围内不采用。 | 平台参考/未用；无；未锁。 |
| [Framer](https://www.framer.com/) · [整站导出限制](https://www.framer.com/help/articles/can-i-export-my-website-to-html-and-self-host-it/) | B0/B5；托管建站灵感候选。 | 服务条款；不能整站导出HTML自托管，不能当现成源码底座；本项目不使用其托管。 | 平台参考/未用；无；未锁。 |
| [Durable](https://durable.com/) AI建站平台（原图durable.co） | B0/B5；静态雏形工具原图索引。 | 当前官方入口已核；具体整站源码导出与方案本轮未锁，不据此承诺源码可复用。 | 平台参考/未用；无；未锁。 |
| [Awwwards](https://www.awwwards.com/) / CSSDA · [CSS Design Awards](https://www.cssdesignawards.com/) | B0/B1；获奖站、主题素材、视觉检索索引。 | 收录不授予站点代码/资产复制许可；“珠穆朗玛作品集”精确作者/URL未给，保留待核实。 | 平台参考；无具体下载资产；未锁。 |
| GitHub Topics · [3d-portfolio](https://github.com/topics/3d-portfolio) / [react-portfolio](https://github.com/topics/react-portfolio) | B0；原图按标签寻找候选的索引。 | Topics不是统一模板/许可证；按具体repo核对，不继承stars筛选结论。 | 检索入口参考；无固定资源；未锁。 |
| [Envato](https://elements.envato.com/) 设计集市 | B0；悬停卡片/预览动画的泛称来源。 | 商业素材需按具体购买/订阅许可，原图无具体模板；免费首版不购买、不接入。 | 参考/未用；无；未锁。 |
| [MDX](https://mdxjs.com/) · [React Router](https://reactrouter.com/) · [Netlify Forms](https://docs.netlify.com/manage/forms/setup/) | B0；原图模板的内容页、路由、联系表单候选索引。 | MDX/React Router开源代码与Netlify服务条款分别核对；当前ProjectRegistry+DOM与原生状态机已实现相应入口，没有安装这三项，也没有联系后端。 | 参考/未接入；无；未锁。 |
| [React](https://react.dev/) / [Next.js](https://nextjs.org/) / [TypeScript](https://www.typescriptlang.org/) / [TailwindCSS](https://tailwindcss.com/) / [Git](https://git-scm.com/) / [Lighthouse](https://github.com/GoogleChrome/lighthouse) | B0；原图模板的框架、语言、开发/测量工具索引。 | 对应框架/工具许可按具体版本核对，本轮不追加独立审查；不能将原图Lighthouse分数当当前网站结果。当前原生Three项目未引入React/Next/TS/Tailwind运行依赖。 | 框架/测量参考，未接入；Git为工具索引，本项目当前没有.git、不能提供Git diff；未锁宿主版本；其余无项目路径/固定版本。 |
| HTML/CSS、GLSL、JSON、glTF/GLB、JPEG/PNG/WebP、Canvas降级、IntersectionObserver/Lazy Loading | B0；原图技术、资源格式、压缩/延迟加载策略索引，可按需要采用格式/API。 | 格式/API不是有统一资产许可的下载包；当前glTF/KTX2/PNG实际使用见前表，不能继承原图性能结论。新增转换须保留原许可。 | 策略/格式参考；HTML/CSS/JSON当前实际文件见src/config/content-notes；未锁独立资源，资产路径/版本以前表实际条目为准。 |

## AI、Skills、MCP与开发工具索引

本节工具不计为站点运行依赖。原图“GPT-6/6.1能力”“全自动部署”等描述不继承；工具能力、套餐和安装状态以当前可调用证据为准。AGENTS.md 是代理指令格式，MCP 是 Model Context Protocol，两者不是同一个“Multi-tool协议”。

| 名称、官方入口/repo | 批次、作用与可直接复用部分 | 局限、许可/用户授权 | 状态、实际路径、锁定 |
|---|---|---|---|
| OpenAI [Codex CLI](https://github.com/openai/codex) / 当前Codex Agent环境 | B0/B3/B5；本次开发、文档整理与工具协调在Codex Agent环境完成；CLI为原图具名工具索引。 | CLI [Apache-2.0](https://github.com/openai/codex/blob/main/LICENSE)；宿主服务/模型条款独立，不是网站依赖；当前环境不证明单独CLI已启动，不复制原图模型能力排名。 | Agent环境实际开发工具；CLI单独启动未证实、项目未安装CLI包；无项目路径/固定CLI版本。 |
| Anthropic [Claude Code](https://github.com/anthropics/claude-code) | B0/B5；原图编码代理候选。 | [LICENSE](https://github.com/anthropics/claude-code/blob/main/LICENSE.md) 为All rights reserved/Anthropic Commercial Terms，不能写整个产品MIT。 | 参考/本项目未用；无；未锁。 |
| [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) | B0/B5；Claude会话调用Codex的插件候选；官方仓库已确认存在。 | Apache-2.0；原图来源曾待核，本轮精确repo核对后保留；不因存在就宣称已安装。 | 备选/未安装未接入；无；未锁。 |
| [GitHub Copilot](https://docs.github.com/en/copilot/get-started/about-github-copilot) | B0/B5；IDE补全/聊天候选。 | 服务与套餐条款，不是站点代码许可证；无本项目使用证据。 | 参考/未用；无；未锁。 |
| [AGENTS.md](https://agents.md/) · [agentsmd/agents.md](https://github.com/agentsmd/agents.md) / Skills | B0/B2/B5；项目级代理指令与任务技能形式，当前已按用户范围处理本机目标模式适用内容。 | 格式仓库MIT；每个Skill有自己的指令/许可，不存在“所有Skills统一可复制”的许可。项目具体AGENTS文件未据本表宣称存在。 | 开发约定/形式索引；宿主相关指令已核；项目内未发现AGENTS/.agents/skills，未锁Skill包版本，无站点运行导入。 |
| [MCP](https://modelcontextprotocol.io/docs/getting-started/intro) · [官方repo](https://github.com/modelcontextprotocol/modelcontextprotocol) | B0/B3/B5；宿主工具协议，GitHub/浏览器/文件工具可供开发读取。 | 官方许可存在MIT→Apache-2.0迁移、部分旧贡献MIT，非规范文档CC BY4.0；不能笼统记全部MIT。各连接器许可/权限独立。 | 当前宿主工具机制；项目无MCP server或runtime依赖；未锁项目版本。 |
| Antigravity / AGY 独立审查 | B3；本轮先核官方已安装Antigravity2.15.1及agy CLI，以标准gemini-3.1-pro-high/high实际调用。 | 原生/browser与Chrome DevTools MCP未暴露，使用独立无头Chromium真实键鼠桥接，不能称原生浏览器测试。 | 历史飞行阶段/RC2补测部分未完成；本次RC5通过独立真键鼠完成全部三路线并实看截图，报告tests/v11-rc5-antigravity-review.json保留原文与事实更正。RC6定向流动复核已完成，tests/v11-rc6-antigravity-review.json保留原文及cloudDistance语义更正；实看静止视角流动/淡入淡出和剩余侧背硬边。RC6该专项不含全三路线；不称原生浏览器或跨构建全面通过。 |
| SolMax RC6 独立只读复验 | 父代理6.1 Sol Max标准档，独立无头Chromium正常出生真实键鼠；不改源码/配置/dist/文档，不注入位置或朝向。 | 1180可信输入、0错误；另8应用click未计入。仅首轮视觉抽查未发现P0/P1；后续同包控制专项发现四项P1（tests/v11-rc6-solmax-flight-review.json），不能沿用首轮结论。首轮主线视觉抽查，近侧大瓣薄硬边及星冠占屏为P2。未跑全六站，未验证原生OS失焦。 | 原始tests/v11-rc6-solmax-review.json；精选实拍及两段核对有效录屏screenshots/v11-rc6-solmax。完整六站由主代理RC6验证；RC11控制复测原始数据见tests/v11-rc11-solmax-flight-summary.json，正式评审文字待回传。不混同Antigravity专项或用户最终美术确认。 |
| ChatGPT Library / Library skill | B0/B3；恢复原资源地图、取得用户上传haefu模型与维护三张自有实际截图。 | 宿主工具/技能，用户文件权限与第三方资产许可分别保留；不自动公开或将素材授权给他人。 | 实际开发资源工具；原地图file ID见B0、haefu上传身份见character manifest、历史三张自有截图v4对应Cni；项目无Library运行依赖/固定包版本。 |
| [Figma](https://www.figma.com/) / Figma-to-Code / [TeleportHQ](https://teleporthq.io/) | B0；设计转JSX/原型候选。 | 平台/插件/素材逐项条款，本轮未核固定插件包；生成源码与设计资产许可不能混同。 | 参考/未用；无；未锁。 |
| GPT-4/6前端Prompt、stylegen、layoutgen、文本生成Skill | B0；原图泛称前端指令集与文案辅助索引。 | 没有精确Skill包/repo/作者/URL或固定版本；不编造已安装能力、许可或真实个人经历。 | 待核实具体资源；无；未锁。 |
| [AutoGPT / autoGPT](https://github.com/Significant-Gravitas/AutoGPT) | B0/B5；原图浏览器自动化候选。 | 平台部分Polyform Shield、其余部分MIT；不是整个仓库统一MIT；本项目无使用证据。 | 参考/未用；无；未锁。 |
| browser plugin / Claude+browser模式 | B0；泛称页面截图、灵感提取方式。 | 无插件ID、repo或调用证据；页面可浏览不等于可复制。实际当前截图来自Playwright记录，不冒称用过这些泛称工具。 | 待核实；无；未锁。 |
| [Sourcegraph / Cody](https://sourcegraph.com/docs/cody) · [StackOverflow](https://stackoverflow.com/) · GitHub搜索 | B0/B3/B5；源码/API示例检索索引。 | Sourcegraph当前产品/服务条款独立；StackOverflow答案、GitHub代码按具体来源许可，不把搜索结果统一标MIT。本轮官方GitHub读取已用，Sourcegraph/StackOverflow未用。 | GitHub读取为实际开发工具；其余参考；宿主工具/公开页面，无站点依赖；未锁项目版本。 |
| SonarLint / [SonarQube for IDE](https://www.sonarsource.com/products/sonarqube/ide/) | B0/B5；静态分析候选。 | 未核具体AI功能、安装或插件许可；不能把原图“with AI”记为已完成性能审查。 | 参考/未用；无；未锁。 |
| [YouTube](https://www.youtube.com/) / [Bilibili（B站）](https://www.bilibili.com/) 开发案例视频及评论 | B0/B1；教学/思路平台，已确认的具体教学链接见参考仓库表。 | 原图“用Claude快速搭3D网页”等视频未给精确URL；视频/评论不授权其示例资产任意复制。 | 平台参考；匿名视频待核实；无；未锁。 |

## 原图匿名案例、主题与历史未定位索引

以下不是已取得的固定资源包。没有精确作者/作品URL的条目统一不可声称“可直接复制”；许可、可下载资产和本地使用证据未知。保留名称便于日后补证。

| 名称与已知说明 | 批次、作用/可复用判断 | 局限、许可/授权 | 状态、实际路径、锁定 |
|---|---|---|---|
| Ashwoq个人3D房间 | B0；原图称React/R3F工作室与可点击显示器、标签项目展示，构图参考。 | 精确repo/demo/作者页未给；不能按名称匹配其他房间站或推定许可。 | 待核实；无；未锁。 |
| ITom走廊、Txema键盘、tdbsgng、WawaSensei、Spline确切案例 | B1；历史提及的走廊/键盘/教学/3D场景参考名。 | 精确URL/repo未确认，不猜链接或许可；Spline平台入口不代表此处具体作品。 | 每项均待核实；无；未锁。 |
| deko付费资源 | B1；历史讨论提及USD18.99付费素材。 | 18.99只保留为历史记录，不当实时价格；免费首版已排除，无购买或授权资产。 | 排除/未用；无；未锁。 |
| 3D卡片hover/鼠标视差/传送门、3D跟随鼠标按钮、液体按钮 | B0；交互细节参考，可在确切授权示例后评估提取。 | 原图只给搜索词，无精确CodeSandbox/GitHub/CodePen示例、许可或下载文件。 | 匿名参考/待核实；无；未锁。 |
| 准备好的GLB场景：旋转地球、星云、Bento盒子 | B0；小场景装饰方向。 | 没有具体模型URL/作者/许可；不等于本项目已有这些GLB。 | 匿名参考/待核实；无；未锁。 |
| 粒子汇聚加载、加载条、Three.js loader具体示例；参数粒子span | B0；加载体验/点云思路。 | 无固定示例；span是原图文字标记，不是已识别库；Loader/Points库入口另见Drei表。 | 匿名参考/待核实；无；未锁。 |
| Framer Motion+React Router具体转场；3D文字/Logo具体字体 | B0；页面切换、字体造型思路。 | 没有具体示例/字体文件；库MIT不覆盖未知字体。 | 匿名参考/待核实；无；未锁。 |
| 互动项目详情：滚动触发变镜头/视差；粒子爆炸/粒子蒙版/加载与页面转场 | B0；镜头叙事和进入节奏参考。 | 无具体站点/代码/素材许可；当前门框遮挡流程不能证明复制了匿名案例。 | 主题参考；无；未锁。 |
| 透明头部导航+滚动进度；VR眼镜/书本翻页/相册About | B0；导航与个人介绍形式参考；具名red1另见仓库表。 | 无匿名案例URL；具体字体、模型和互动实现均未取得。 | 主题参考；无；未锁。 |
| 悬停短视频/粒子项目预览；漂浮粒子/数字雨/流线光WebGL背景；Shader3D官方示例 | B0；卡片预览与背景效果方向。 | Envato仅平台名；Shader3D无法唯一识别产品/示例，无具体资源/许可。当前天空不冒称复用这些shader。 | 主题参考/具体资源待核实；无；未锁。 |
| 技术栈旋转地球/GitHub排行；暗黑CRT扫描线/像素字体 | B0；技能与复古屏幕表现方向。 | 无固定代码、地球模型、字体许可；CRT具名iTzRitual另见仓库表，未接入。 | 主题参考；无；未锁。 |
| Awwwards“珠穆朗玛作品集”、主题素材仓库、各类3D轮播/库 | B0；原图泛称收藏方向。 | 无精确作者/URL/repo；不按收录或排名推定许可、性能与下载能力。 | 待核实；无；未锁。 |
| 五创意方向：科技实验室/游戏室；宇宙星际旅行；赛博朋克数据中心；混合现实/手绘未来；低聚几何/极简艺术 | B0；保留原图五主题构思，可参考叙事，不是五套资产或架构。 | 无固定资源包、许可或本地接入证明。当前已确认“蓝金星海+暖木工作室”，不据原图再混入多runtime。 | 主题参考；无；未锁。 |

## 真实项目内容与截图

| 名称、repo/demo与已知说明 | 批次、作用与可直接复用部分 | 局限、许可/用户授权 | 状态、实际路径与锁定 |
|---|---|---|---|
| [ThreadCove](https://github.com/Bluuok/ThreadCove)；独立在线demo未提供 | B3；电脑/研究桌展品，个人AI研究工作台；两张实际应用截图。 | 本地LICENSE Apache-2.0，README MIT标记冲突；对话/文件是人工准备的演示数据，不证明在线模型研究成果。 | 内容/截图实际使用；`public/content-notes.json`、`public/assets/projects/threadcove-{home,conversation}.png`；源 `E:/zzzz/ThreadCove/docs/images/`，读取HEAD `59307df993ea18897d6804d2b22a289f7ae88eed`。 |
| [Clawtide](https://github.com/Bluuok/Clawtide)；独立在线demo未提供 | B3；调度台展品，自托管数字员工/计划任务；两张真实浏览器界面截图。 | MIT；保留HappyClaw/riba2534来源署名。截图用演示fixtures，不调用模型、不写应用数据，不是生产记录；不同IM接入程度不统一宣称完成。 | 内容/截图实际使用；`public/assets/projects/clawtide-{chat,tasks}.png`；源 `E:/zzzz/Clawtide/docs/assets/readme/`，HEAD `320ab84fac1edf60c6aa2cb987f8c99d61938ca4`；截图源日期2026-09-29/commit `7ff39ba`。 |
| [Folio / helsome/folio](https://github.com/helsome/folio) · 本人 [PR109](https://github.com/helsome/folio/pull/109)、[PR110](https://github.com/helsome/folio/pull/110)、[PR111](https://github.com/helsome/folio/pull/111)、[PR288](https://github.com/helsome/folio/pull/288) | B3；贡献板。109/110/111已合并，288待合并（2026-10-06核对快照）；两张PortfolioRiskPanel真实组件渲染。 | 本人贡献展示/用户本地授权，保留上游与第三方条款；上游整体许可未在本表重新锁证，不填猜测。受控样例不是实际账户；Yansivra为衍生项目，不拿其新品牌截图冒充Folio。 | 内容/两截图实际使用；`public/assets/projects/folio-risk-{after,partial}.png`；来源 `Bluuok/folio-contributions` 分支 `fix/portfolio-risk-currency/docs/pr-screenshots/pr-225-{after,partial}.png`，字节hash见下表；未锁该分支完整提交。 |
| [DeerFlow / bytedance/deer-flow](https://github.com/bytedance/deer-flow) · [PR6192](https://github.com/bytedance/deer-flow/pull/6192) · [PR6193](https://github.com/bytedance/deer-flow/pull/6193) | B3；贡献板，真实日志路径/技能开关开发文档修正；两PR在2026-10-03已合并。 | MIT；只表述本人文档贡献，不宣称整个Agent运行时为本人作品。无来源明确的贡献界面截图。 | 内容/PR链接实际使用；`public/content-notes.json`、`src/config/ProjectRegistry.js`；无截图；证据按PR编号/合并日期锁定，未复制上游runtime。 |
| Bluu名片 / [Bluuok GitHub](https://github.com/Bluuok) | B3；联系与简历入口，已知显示名来自本地原站数据，只读提取。 | 邮箱/简历/职业/地点未知，保持null与可配置；不编造个人经历。 | 配置实际使用；`public/content-notes.json`、`src/config/ProjectRegistry.js`；原证据 `E:/zzzz/personal-site/src/data/site.ts`，未修改原站；未锁原站完整提交。 |

项目截图是实际运行页面/组件图，不是ImageGen或静态伪造；数据模式在 content-notes 逐项标明。2026-10-06已有项目/PR公共链接HTTP核对，不意味着以后永远可用。展品运行只使用这些内容与链接，不把ThreadCove/Clawtide/Folio/DeerFlow后端打包进本作品集。

## 当前文件字节锁定

以下SHA-256记录文件身份，含活动文件、退役保留素材、已下载未加载资产；活动状态以前文为准。Joan11文件与固定vendor一致，haefu与incoming一致，两旧PNG与上游一致；星月PNG未加载，夜空PNG改作色素采样。哈希不证明视觉通过。路径相对E:/zzzz/Starhaven-Portfolio，历史SOURCE/build记录不替代候选验证。

| 实际文件路径 | 字节 | SHA-256 |
|---|---:|---|
| `public/assets/room/models/arcadeMachine.glb` | 105968 | `4f106f455ea88bcc718886526c95fc097cc9dbb4630c1cc8ba645b9b00e09101` |
| `public/assets/room/models/leftMonitor.glb` | 3712 | `b8ae3661bf011865527c26e79661fd56b66eb17f7ff24ac9733e2a04a006b9b6` |
| `public/assets/room/models/rightMonitor.glb` | 3744 | `4fd329051598d9be897b9ddd51c11821d9e060e5480b16c3db57abd30f74c692` |
| `public/assets/room/models/room.glb` | 39956 | `225d85dd2ae612c5c5f488ff8cbb626fcca7ebcca507ca5882cf475d93bb8102` |
| `public/assets/room/models/room2.glb` | 33848 | `9487f3e8e0350b71570f357b72310a04f3d3bce2cdc3af06132e274f03f436c4` |
| `public/assets/room/models/room3.glb` | 355392 | `4f25a2d36256e86ebba52241304a9b465189ad6f3237d707c55a3f8742444629` |
| `public/assets/room/models/topChair.glb` | 39620 | `3dbc7f5aab22dd7ded6aadde48611da1c4435d9e2f8952cd8d8cf580ea84c55e` |
| `public/assets/room/models/whiteboard.glb` | 7212 | `f2109ce730c9875b481d67c9c13e0f2627c3d4f45a3187075c93abfcc3bbb341` |
| `public/assets/room/textures/baked1.ktx2` | 983978 | `7200b9e1bf8dcb0b6f385f43ce7bd218647cdad9fede1bbb38a259c3d5d379fa` |
| `public/assets/room/textures/baked2.ktx2` | 1217496 | `faff2eb723831d8fe503c7f452bd75fe0b7611d521a15edab1151e1dff54687b` |
| `public/assets/room/textures/baked3.ktx2` | 1504212 | `12a2736dbeb0f5d5139a6c864c583a22d197525fa1790d91fb77e04b379dcade` |
| `public/assets/character/astronaut.glb` | 1198772 | `0fc948127a889f64ed4659f74d084d998eb68acb92d7a892965a03edbea2905d` |
| `public/assets/character/float.animation.json` | 3460 | `dc0dffd3ba0398efff7610c792d1903cc86b2ad1c9fb8ac8fe2332b766c274e2` |
| `public/assets/sky/candidates/layer-夜空.png` | 6159983 | `a77703e1cff496c9525d545b985610c9d545b953949178d93676754292d5016c` |
| `public/assets/sky/candidates/layer-星月与旋涡.png` | 1914365 | `79162a69ed34b443c42aa9843ba123005caf0d8e3730482e6043addc1ac5f84c` |
| `public/assets/sky/world/blue-gold-panorama.png` | 3182010 | `0357bb0e805fdc6ce00599dd5c8406dae7a896cf4ed6c90d1a85a48a024c0c16` |
| `public/assets/sky/world/blue-gold-panorama-v03.png` | 3383920 | `3f1c3432bf7e743c7c41ce49f7352e97e3b51040b428454283aa0cd1d0984146` |
| `public/assets/sky/world/blue-gold-panorama-v07-6k.png` | 36417642 | `dfb52f96469267b8e920f3111b40e2f64cfd1eb61644f6a2fb106fe9cff65e0a` |
| `src/vendor/hh-hang/capsuleCollision.js` | 2152 | `b288483bcd81e33843359ef23cf571e3322cf99376bfd2a0c249162da51fbe36` |
| `src/vendor/hh-hang/colliderBuild.js` | 6333 | `02d53e297dd0c2a4ab27b5935f16de1f62e57297408202d0d31904182ac21cd1` |
| `src/vendor/hh-hang/cameraRaycast.js` | 506 | `9ec56ce9129b64552cf92f31d5ebff0191b74e596a0ab060f32200cd3c24d1a3` |
| `src/vendor/hh-hang/LICENSE.three-player-controller.txt` | 1084 | `14fafdcdf5295edb55c525ab13a5db45c75407566cf0cb1f4301ddee999662fc` |
| `public/assets/spacekit/antenna.glb` | 29380 | `26a099187aae0bcef5f189065ef7a57da559c53723a049a98053f24f75855cb0` |
| `public/assets/spacekit/asteroid-large.glb` | 18608 | `c4e9f04c04419e67e919c4533dfd6044abc5f0640afa9d0e174cf474285d380c` |
| `public/assets/spacekit/asteroid-small.glb` | 18076 | `c601f06428037dca25ca91d31f9923df8f9aaeeec90506d9329f7214568e9caf` |
| `public/assets/spacekit/floating-robot.glb` | 205104 | `3819a4914bb8216c60cbd51df63893c5975c0786f99f9b35dfb2bdec07caa25a` |
| `public/assets/spacekit/plant.glb` | 17356 | `d8d3e6594fe97cbe1f78cb3017539d18c00c885da210dee896ec33e387fc097c` |
| `public/assets/spacekit/solar-panel.glb` | 43724 | `2e7d429ad216bb8d2ac08d6d11c4d56359264ee1067d8b32726c387f284dd2ff` |
| `public/assets/spacekit/spiral-tree.glb` | 35944 | `16b571e404dff48380d8289a92596d41a5b49e75fae9e0151d1a3fc1fc0a4e86` |
| `public/assets/projects/threadcove-home.png` | 103218 | `e263597324b8ea7d03f8d1e9becddcedf90f963155960c85b0ce0dae8e1b2202` |
| `public/assets/projects/threadcove-conversation.png` | 95386 | `ba06da2f09a758416cd48a87412d5a7d3d4de4a48998cc994d0a357bc2532018` |
| `public/assets/projects/clawtide-chat.png` | 71168 | `f9e3453a8864977606f67fc16ae07fd4aaafc6e8bd9dd2bc38f7a709c2a96c01` |
| `public/assets/projects/clawtide-tasks.png` | 145934 | `2a4be221f93fca721e85637b68c987dadeda9dae66d11bb2f60d78595fa2b2aa` |
| `public/assets/projects/folio-risk-after.png` | 18241 | `5b258c0edf00de24e000d7d0b1624f195ed8caf39083791a18368b159e370acb` |
| `public/assets/projects/folio-risk-partial.png` | 20301 | `70708dfebf3db3ba725b848274a958671a4958475ca8e4aa254c3d57e4602f1e` |

## 已提取笔触与规划素材

本节统一维护定点素材状态。**Victor图集与用户蓝金行星已提取适配并实际使用，其余项仍未在当前src接入**。公开源码/免费模型不代表已经采用；RC6仅为已完成的局部验收对照；当前阶段正在收尾，完成独立复验后按用户要求暂停。用户最新反馈白灰雾团及部分星球效果一般，不能把RC6抽查当作美术接受或停止条件。官方素材403不阻塞其他优化；以后取得可读源时先实看，再提取具体模块。不要新建第二份资源总表。

| 来源 | 许可与可复用部分 | 接入边界与当前状态 |
|---|---|---|
| [Victor-EU/the-world-of-van-gogh · brush.js](https://github.com/Victor-EU/the-world-of-van-gogh/blob/8cb50612e5769229da3781679cb3dc1b06d3d441/src/brush.js) | MIT，Victor Zhang (Victor-EU)；**实际提取makeBrushAtlas与必要util**。256×512 RGBA数据图，8种笔触；R高度/G覆盖/B色调/A第二颜料权重，A不是透明度。 | **提取适配、实际使用**；src/vendor/victor-eu/{brushAtlas.js,util.js,LICENSE.txt,provenance.json}，commit 8cb50612e5769229da3781679cb3dc1b06d3d441。原生成器及util前缀保留，原文件/提取文件hash见provenance。alpha.5提取阶段由VortexField调用生成器，五材质共享一图；当前Vortex仍是唯一图集所有者，StarRiver和ExplorationField借用；曲面采样/完整3×3支撑邻域、三平面核、渐隐和Standard光照由本项目适配。没有采用上游NOISE/BRUSH/LIGHT整段GLSL、sky.js、相机/renderer/RAF。alpha.5提取阶段只增加1张GPU数据纹理，不增加draw或几何；后续密度云/探索场另有几何和密度纹理，不沿用该计数。5项通道/共享/释放辅助检查见tests/v05-brush-atlas.json；美术见同版实图。 |
| [spite/codevember-2017 · alien-strands](https://github.com/spite/codevember-2017/blob/master/alien-strands/index.html) | README为 **CC BY 4.0**，不是MIT。可提取noiseFunc六次有限差分归一化curl和addCurve环形采样扰动CatmullRom的点数学。 | 待提取，无本地文件/提交锁。旧Geometry.vertices/fromGeometry/addAttribute/merge不兼容r161；不搬30条细管、Maf/noisejs整栈、相机/RAF。只用于少量不同深度的路径，当前Vortex不是其实现。 |
| [wwwtyro/space-3d](https://github.com/wwwtyro/space-3d) | Unlicense；离线星空生成，支持六面各4096 PNG，组合cubemap输出至多2048。 | 待评估，无本地输出/提交锁。默认风格并非蓝金油画；高像素需实际核对。天空远景无平移视差，不能替代三维景观，也不把输出另称作者明示CC0。 |
| [KayKit Furniture Bits 1.0](https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0) | 免费基础包CC0，50+静态家具；小灯/扶手椅可作缺口摆件。 | 待用未下载，GLTF需连带bin/atlas。不包含付费EXTRA/SOURCE，不替换Joan房间或为丰富度批量塞模型。已有Quaternius七件应优先复核。 |
| [ggwzrd/threejs-galaxy](https://github.com/ggwzrd/threejs-galaxy) | MIT；可参考InstancedBufferGeometry的世界深度/分布数学。 | 待提取；上游Three ^0.145，整类自带renderer/camera/RAF、depthTest=false，不直接移植。仅少量分支布局，保留当前遮挡与材质。 |
| [AmitDigga/threejs-galaxy-shader](https://github.com/AmitDigga/threejs-galaxy-shader) | MIT；GPU点位/三维分布方向参考。 | 低优先级，未用；GPU变换与CPU包围盒不一致须显式处理frustum culling，点云不能代替宽而有厚度的笔触实体。 |
| 用户`sapphire_gold_planet.html` | 用户蓝金行星，原HTML44,330字节，SHA256 577d28ea68a7c2458a5bd2a7dac31e2ec28b272ac040b590fb6e64ab77a46bb1；Library libfile_dc5c019f1a2c81919a7c47a2a840e6dd、上传 file_000000005bbc81f9a87fd84cf2d95122。用户授权本项目复用，不推定统一公开许可；原代码保留Ashima噪声署名。 | **提取适配、实际接入alpha.8**。七个GLSL常量以及球/气氛/宽金环几何参数来自原HTML；src/scenes/sky/SapphirePlanet{,Shaders}.js和config/PlanetManifest.js接入同r161、唯一更新/相机管线，法线改同世界坐标，经线改整数周期，修正逆序smoothstep、输出颜色/背面气氛并过滤亚像素环纹。原球128×128、气氛96×96、环360×64保留；角色/相机共用独立4.96半径球代理，环/气氛可穿越。vendor/user-sapphire-planet/source.html原字节、extract.mjs和provenance.json保留来源与可复现提取。未接入原CDN/UI/fonts/背景/renderer/RAF/bloom；原参考实看为tests/v08-planet-reference.json，产品构建与独立复核另记。 |
| 用户PNG手办/多视角图方向 | 可用作小型摆件、sprite或建模参考；保留作者/授权和原图。 | 未取得具体项目文件/模型许可；多角度PNG不是完整网格或骨骼模型，不直接标为可全向绕行的3D资产。选用后分别登记。 |

Donitzo volumetricfog、TinyTreats等尚未锁到精确接口与许可，不列为确认免费可直接接入；体积雾也不能替代可穿行厚度，且需避免遮住暖光主屋。付费主角/素材维持排除。2026-10-07已获用户明确恢复授权；候选记录不授权购买、权限扩大或公开部署。

## 下一阶段素材计划与集中提示词

2026-10-07最新指令为“做完新阶段先停下来，规划一下接下来的方向和我要生成的”。本节是阶段末规划，不代表已生成、已下载或下一阶段已获实施指令。**目前没有已证实必须重新生成的素材。** 优先复用用户已有代码；不要把当前配色/构图问题全部转化为素材需求。最终对应对象以实拍核对，已认可Sapphire保持原设计。

| 优先级／是否生成 | 素材与用途 | 风格参照、类型 | 接入方式 | 验收标准 |
|---|---|---|---|---|
| 必须优先复核；已有，无需重生 | starry_night_flowing_sky.html：连贯流动、可穿越厚笔触云路 | 用户已生成的42705字节完整Three/GLSL代码；以原程序实际画面为准。官方materialize两次403，未取得可读内容、未视觉检查。 | 权限恢复后用正常消费者落盘，先独立实看，再提取StarryFlowingSky/buildAirCurrentRibbonGeometry所需部分，适配现有r161及唯一renderer/CameraDirector/update；不套iframe、不复制原相机/RAF。 | 正、侧、背及内部有厚度和流向；停稳可辨流动；中近层真实遮挡视差；穿越无大片白幕、硬矩形、尖薄叶。检查释放和实际路线帧时间。未取得前不声称已接入。 |
| 必须保留复用；不生成 | 已认可sapphire_gold_planet、用户6K全景、Victor图集、haefu角色、Joan共享房间 | 原代码、原图、原模型与许可完整保留 | Sapphire已在单runtime使用，参数和shader身份保留；只在后续用户认可后评估环境对比、取景、光照适配。6K超分图不冒称原生生成。 | 保持已认可球体及宽金环；房内外实体一致；资源字节锁匹配。不为“更多星球”替换此球。 |
| 可选生成；先评估现有材质 | Vortex白金星核：改善原创核泛白、缺少暖金暗面层次 | 蓝金油画环境与认可Sapphire仅作配色参照；真实3D材质/模块，非新Sapphire | 首选现有材质/光照调校；若仍不足，替换现有半径2.4星核的外观，保留2.55实体代理、位置与云路通道。 | 正侧背三向成立；亮部有金色细节、暗面可读；不出现全白大块或全屏bloom，不扩大碰撞体。 |
| 可选生成；先改善现有轮廓/布局 | CircuitRock路线浮岩：区分重复蓝灰多面体和地标 | 深靛蓝/青蓝岩层、少量暖金矿脉；两种真实闭合3D几何/材质变体 | 复用现有11处位置、尺度、路径和碰撞约束；新单位几何完全落在现有代理包络内，保留固定种子和dispose。 | 近景岩层可读、远景两种轮廓可区分；全向可绕、实体碰撞与可见边界一致，不增加一批新星球或路线。 |
| 当前不需要生成 | 透明PNG、角色替身、全新背景、额外道具包 | PNG只适合参考或少量表面贴花，不能替代可穿越云、可绕行星核/浮岩 | 本阶段不接入；先把飞行、云体和三层构图做好 | 不用相机朝向的图片冒充完整3D；不增加素材堆积。 |

当前泛白已有可修代码原因：七组近景粉尘原Additive叠加，经固定视角隐藏/Normal隔离后确认；已改Normal与.60颜料强度。原四云crest向蓝色混合.30，真实密度数据保留。RC14增强深蓝阴影后实拍放大梳齿纹，已拒绝，最终版未保留该阴影增强；更连续的体积塑形列后续。尚不能把视觉遗留项判定为必须新生成。白金圆核是Vortex，蓝灰多面体是CircuitRock；两者都不是用户已认可Sapphire。

### 备用提示词1：Vortex星核（可选，暂停后确认再使用）

> 为现有Three.js r161场景制作蓝金油画风的真实3D星核材质模块。它是旋涡中心的小型暖金星核，不是土星，不要重设计已认可的Sapphire蓝金行星。参考随任务提供的现有蓝金夜空和星核实拍：深蓝环境、暖金内部、克制的浅金亮部，有清楚暗面与缓慢连续的厚涂纹理；避免纯白大块、塑料高光、满屏雾和全局bloom。适配现有半径2.4球体，不扩大几何包络；保持位置及2.55碰撞代理。输出可复用JavaScript/GLSL模块，接收现有THREE与elapsed/dt，参数可调，提供dispose并明确资源所有权。不创建renderer、camera、RAF、UI或外部网络依赖；不内置额外背景。可另外提供独立预览HTML启动器；不创建renderer/camera/RAF的约束针对生产模块，演示启动器与模块分开，接入时只取模块。附正面、侧面、背面和光照参数说明，三个方向均有金色细节与体积；单张透明图片不合格。保留所用第三方许可。

### 备用提示词2：CircuitRock浮岩（可选，暂停后确认再使用）

> 为现有蓝金油画宇宙制作两种可复用的真实3D浮岩变体，替换已有路线浮岩外观，不新增星球、建筑或路线。参考随任务提供的蓝金夜空及当前浮岩实拍：深靛蓝至青蓝的大岩层、少量暖金矿脉，轮廓和层次明确，细节克制；避免统一浅灰、规则低多边形球、满表面发光和密集尖刺。几何闭合、正侧背均成立，所有顶点落在单位球内，沿用现有主体填充程度（原径向约.92–1.00）；避免深凹、镂空或显著缩小，以复用现有位置、非均匀缩放及碰撞代理，并实测各方向可见表面与接触间隙。输出Three.js r161几何/材质模块，以固定种子控制变体，参数可调、共享与独占资源清楚，提供dispose。不创建renderer、camera、RAF、UI，不加载外部资源；可另附独立预览HTML启动器；上述运行入口限制针对生产模块，示例与模块分开，接入时只取模块。近景能读出岩层，远景两种形态可辨；不要用透明PNG或面向相机的平面冒充体积。保留第三方许可。

调用上述提示词时附**现有项目真实截图及认可参考**；本节未执行生成，也未购买或安装新工具。用户已有流动HTML优先取回，当前不提供重复生成任务。

## 控制器提取技术记录

hh-hang固定v0.6.2 / `ca82bbc76a3b9b0afa80c73b60167adf6123b9b6`：capsuleCollision取原utils第59–68/251–295行，colliderBuild为完整builder，仅esbuild去types、算法未改；SpaceCollision实际调用create/apply/buildStaticMergedMesh/attachBoundsTree。cameraRaycast从CameraSystem.ts:344–359最近命中循环提取适配，改用明确活动mesh列表；本地CameraAvoidance负责五射线/三高度与候选视图，非整套CameraSystem。

原movement、AnimationSystem与完整CameraSystem未接。正立、单位缩放、segment start=0为适用前提；zero-distance无效初始姿态、裸Node CJS双Three身份为限制。browser metafile单Three，精确Three161/BVH0.7.8 ESM smoke17/17（14行为+3限制）及生产共享Node21通过，不推定所有peer范围兼容或美术通过。当前身体/相机边界与动态锚点的唯一说明见目标文档；不执行旧C9原点限制。

## 退役星月夜移植与v1技术附录

本附录吸收旧design-implementation独有数据，只为来源核对和恢复取舍；下面的“当时”均指DK/v1阶段，**不是当前alpha.8模块或下一步实施指令**。

### 星月夜移植基线（build index-DKpZJTzf.js）

该构建是revision-capture/Library v3历史基线；下文三frame/六层/Basic/z惯性机制在新全向引擎已退役，不当当前实现。Cni是后续已验P1基线，C9是本地初稿内部复验通过构建；仍一套Three r161/renderer/CameraDirector，不接原独立相机/OrbitControls/UI/timer。

实际提取原 makePlane 的白色 MeshBasicMaterial 与 SRGB/透明/DoubleSide/depthWrite=false/toneMapped=false 配置、适用的 sky z=0 和 stars z=.11 层定义、共同画布与宽高配准、group/renderOrder 以及 z 深度惯性。每组两层使用相同 source crop 与实际源图比例；原 PNG 和共享 Texture 保持不变，不通过 Texture.clone 分别改色。renderOrder 为 -30/-29。

| 固定景幕 | 世界位置 | 同组 crop（left/top/width/height） | 画层宽×高 |
|---|---|---|---|
| main | [-68,-40,-85] | [.29,.04,.49,.61] | 124×122.182358 |
| door | [0,10,100] | [.44,.06,.27,.19] | 180×100.2572 |
| window | [100,12,0] | [.41,.04,.29,.18] | 160×78.6045 |

三个 frame 的位置与朝向固定在同一世界，室内外状态和相机运动不会带动它们。六层是两张源图在三个方向的配准实例，不是原五层的整包移植。村庄、柏树 GLB 只保留在 vendor 参考中，未加入活动 public 资产。

原 z 公式 i*.0022 + L.z*expandNow*2.05 按 width/4 转为世界尺度；原每帧 .075 逼近改为 dt 等价指数惯性，适配目标 .06±.02、速度 .18 的轻微深度变化，仅改变组内局部 z。alphaMap 使用 256² 单通道覆盖 DataTexture，经独立 uv1/channel=1 处理边缘与主屋后的安静区；同组夜空/星月继承同一遮罩。它不生成 RGB 画纹或改写源像素颜色。上述是静态实现与构建状态，不能替代真实运行画面的视觉判断。

### 星月夜 v1 历史核对与移植边界

下表及其后的压暗、拉伸和暂停记录描述 build index-BJK0dhHY.js 的历史实现，用于说明当时移植依据；不代表当前alpha.8实现或继续开发授权。

实读上游 Git 树及官方 v260914c 的 10-demo-starry-night.zip；包 33,613,022 字节，发布 SHA-256 与包内 16 项 SHA-256 都通过。完整原版放在 vendor/starry-night-reference/package/10-demo-星月夜/星月夜/，代码与 Git 入口逐字节相同。原版不是全天球太空，而是同画布分层的 2.5D/局部真 3D 画作展示。

| 核对项 | 原 demo 实际实现 | v1 作品集实际实现 |
|---|---|---|
| 纹理与画层 | 夜空、星月旋涡、远山、村庄、柏树五个配准画层；七 PNG 中另两张为缩略图 | 只复用夜空、星月旋涡两张原 PNG；四个绘制条目是它们的裁切实例，不是五层移植 |
| 透明材质 | makePlane：原色 MeshBasicMaterial、SRGB、透明、DoubleSide、depthWrite=false、toneMapped=false | 自写 ShaderMaterial 的乘色、亮度、饱和度、安静区与边缘羽化；这部分是本项目适配，不是上游 shader |
| 坐标与深度 | 同一 3840×3041 画布，平面宽 4、按画幅比例计算高；各层 group/renderOrder，z 为 0/.11/.23/.44/.74 | 主画层、独立金星裁切与三个世界景幕方向自行安排；未保留原画层共同裁切、原深度展开 |
| 真 3D | village.glb 10,309,772 字节/18,203 面；cypress.glb 8,869,748 字节/19,798 面；Box3 按源图 box 统一比例配准 | 两模型已取得并验证，仅作参考，未加入作品集活动 public 资产；当时没有复用其配准或 PBR 修正 |
| 材质修正 | GLB metalness=0、roughness=.92、移除 metalnessMap、envMapIntensity=0；两 GLB 无骨骼、无 clips | 尚未移植；不能称已有原模型动效 |
| 动态 | expandNow 向目标惯性逼近，group z 平滑展开；OrbitControls 与相机过渡产生视差；没有油画流动 shader/星云粒子机制 | backdrop.update 为空；世界景幕静止，相机运动来自现有 CameraDirector |
| 运行时 | 原版自带 Three r160、Meshopt；有独立 renderer/相机/loop/UI | 作品集固定 Three r161 与唯一 CameraDirector；不能把另一 renderer、OrbitControls 或相机写入者拼进去 |

v1 过暗有具体原因：主画原像素在线性 RGB 上分别只保留约 .0857/.1459/.2544，再乘 .82 不透明度；原 makePlane 是白色、原色、不做该压暗。v1 门外/窗外裁切的画幅分别被纵向拉伸约 1.40/1.65 倍；这是配准比例问题，不能用试色补救。该 v1 阶段曾暂停新增天空实现，先核对上游成功模块；当时已获授权进行实际移植。

**可直接提取的成功模块**：原 LAYERS/group/renderOrder 数据方式、makePlane 透明原色材质、按共同画布比例配准的平面、Box3/box 模型配准、Tripo 材质修正、层深度展开函数。源代码见 index.html 第 131、208、245、283、344 行。

原 demo 直接 renderer.render，没有 composer；v1 主站曾使用 ACES/OutputPass 和轻 bloom。当时已移除 composer、OutputPass 与 bloom，改为唯一 renderer 直接 renderer.render；renderer 使用 ACES、曝光 .85。PBR 与室内 RoomBasic 材质参与 tone mapping，天空材质 toneMapped=false 保留上游蓝金原色。最终颜色仍需实际运行画面确认。原参考已实际运行，两真 3D 加载标记均确认；village.glb 的 HTTP200/完整解码之后另有可重复 ERR_ABORTED 请求记录，未冒称参考网络全验收通过。

**仅需少量适配**：使用本项目同一 Three r161；将原画层放入共同固定 worldRoot，以相同 UV 裁切与实际画幅比例缩放；夜空与星月层保留共同配准和浅层深度；用现有 dt/update 驱动原展开惯性，保持室内外位置关系。原 camera/renderer/OrbitControls/UI/setInterval 不搬入，镜头仍由 CameraDirector 驱动。原材质路径优先恢复真实蓝金，停止扩大自研颜色 shader。

**真实缺口与取舍**：原 demo 没有 360° 无缝天空、宇宙飞行、流动星云或漂浮建筑；这几项不能冒称现成模块。远山、村庄、柏树是陆地原画景物，需按宇宙构图另定远景/浮岛/植被角色，不能为了“五层全用”塞满画面或取代主工作室。两个模型含 8K 底色与 4K ORM/法线，不能把原包未经取舍整体作为站点依赖；参考取得与活动资源接入应明确区分。上述为 v1 阶段的移植取舍依据；当时实际接入范围见前文，最终构图仍须以真实运行画面确认，不凭静态解析自行视觉验收。


Cni历史冻结字节：JS `index-CniDwZE5.js` SHA `dbd377204fbd1077a9666d13efaa66bc2b2c2699bbe1eb55715b40d9feb662ec`；CSS `index-TQlhjVky.css` SHA `130a60906109bf4daf5075b251f773585019b0bee820105f31ad4274ffb7a46b`；当时HTML SHA `64c7c5091d7b8c61c4e22a130687cb4f19879407d026f0b8727a8e26c8fa8725`。其main画幅124/羽化.085/原裁切/屋顶上金星随新引擎退役，不作当前取景/星点声明。

v1 BJK曾见中间调偏黑蓝、金星偏灰黄，冷暖不足，硬墙角/厚平顶、门框招牌薄片支撑不自然；角色/家具/露台方向已认可。此记录只说明为何保留现有角色/房间并局部改屋壳，不把旧缺陷重新认定为当前实测。

构建、路线、C9详测、Library v3/v4身份与恢复包统一见 [目标说明的历史证据](项目目标与实现说明.md)。原JSON/截图/哈希档案保留，不重写旧报告；当前4240冻结构建为alpha.11 RC41，4238保留RC39，4235保留RC36，4231保留RC32，4222保留RC23，4219／4217／4215保留RC20／RC18／RC16，4209保留RC11控制复验、4202保留历史RC6，JS身份见表首与tests/v11-review.json；4175是此前预览，不能使用旧SHA证明当前源码。RC41仅代码与已有材质调整，无新增图片／模型接入；本次未上传Library截图。
