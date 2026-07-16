# Android APK 正式发布路线

状态：**正式版优先交付路线**
生效日期：2026-07-16
应用 ID：`com.aaaycc931.solfeggio`
应用名称：`视唱练耳`

## 1. 产品决策

Android APK 已由产品所有者从 V1 非目标提升为正式版优先交付物。Web 入口继续保留并作为同一套产品、后端和用户数据的基础运行时；Android 不是另一套独立业务实现。

首个 Android 正式版必须同时提供：

- 可直接安装到真实 Android 手机的签名 APK；
- 用于 Google Play 内部测试和后续发布的签名 AAB；
- 与生产域名完成 Digital Asset Links 验证的全屏应用体验；
- 能从邮箱 magic link / App Link 返回应用并恢复 Supabase 会话；
- 核心课程、练习、麦克风、录音、回放、文件选择和错误恢复的真机证据；
- 没有网络时的中文安全降级页面，不展示可能过期的私人数据。

## 2. 选定架构

V1 使用 **Next.js PWA + Android Trusted Web Activity（TWA）**：

```text
Android APK / AAB
→ 已验证的 TWA 容器
→ 生产 PWA / Next.js
→ Supabase Auth、Postgres 与后续私有服务
```

选择原因：

1. 当前产品依赖动态 Next.js、Vercel 和 Supabase，不是可直接静态导出的纯前端。
2. 当前音频、录音、文件输入和练习模块已经以 Android Chrome 支持的 Web API 为基础。
3. TWA 使用用户设备的受支持浏览器运行生产 PWA，能够保持同一套 Web 代码、登录会话和快速发布链路。
4. Digital Asset Links 同时证明 APK 与生产站点属于同一发布者；验证失败时必须视为发布阻塞，而不是接受带浏览器工具栏的降级结果。

V1 不采用以下路线：

- 不进行 React Native / Flutter 全量重写；这会复制 UI、音频和认证逻辑，并延迟正式闭环。
- 不在 Capacitor 生产配置中使用远程 `server.url` 加载 Vercel；该配置属于开发/live reload 用途。
- 不用未验证域名、通用 WebView 或只打开外部浏览器的空壳冒充 APK 完成。

如果后续需要后台实时音频、USB/MIDI、复杂离线课程或浏览器无法提供的低延迟能力，再以有基准的原生模块或第二阶段原生客户端决策扩展，不在 V1 静默重写。

## 3. 交付阶段

| 阶段 | 交付物 | 退出条件 |
| --- | --- | --- |
| A. PWA 基础 | manifest、192/512/maskable 图标、service worker、安全离线页 | 生产 HTTPS 可读取；安装清单自动校验通过；不缓存认证/API 私有响应 |
| B. 调试 APK | TWA Android 工程、固定包名、调试签名 APK | 构建可重复；APK 能安装、启动和进入生产首页 |
| C. 域名与认证 | `assetlinks.json`、App Links、Supabase redirect allowlist | 验证状态通过；magic link 从邮件回到 App；冷启动/热启动均恢复会话 |
| D. 核心真机 QA | 3 档 Android 设备上的课程、练习、音频、麦克风、录音、回放、文件选择 | 权限允许/拒绝/重试、后台切换、断网恢复和 20 轮稳定性均有证据 |
| E. 发布签名 | 受保护 upload key、签名 APK/AAB、版本号、校验和、回滚包 | Secret 不入仓库；签名可验证；旧版可升级；回滚演练通过 |
| F. Play 就绪 | 内部测试、隐私/数据安全表、商店说明、截图、图标和分级 | Play 内部测试安装通过；所有声明与真实数据行为一致 |

## 4. PWA 与缓存边界

- service worker 只预缓存离线说明和公开图标。
- 导航使用 network-first；断网时只显示离线说明。
- 不缓存 Supabase、认证回调、账户资料、练习记录、上传、导出、删除、评测或其他私人响应。
- 更新不能在用户录音或播放过程中强制刷新；新版本在下次安全导航或重启时生效。
- PWA 安装成功不等于 APK 完成；必须继续通过 TWA 验证、签名、安装和真机门槛。

## 5. Android 权限与生命周期

- 麦克风只在用户明确点击录音/实时反馈后请求。
- 拒绝权限时显示中文原因和可继续使用的非录音路径；不得循环弹窗。
- 停止、离开页面、应用进入后台、系统中断和异常必须释放媒体轨、AudioContext 任务和计时器。
- 从后台恢复时不自动录音、播放或提交练习。
- 文件选择只读取用户明确选择的文件，不请求宽泛存储权限。
- 蓝牙/声卡物理延迟与应用调度延迟分别记录，不承诺无法测量的零延迟。

## 6. 构建与签名安全

- 调试 APK 可以使用专用调试证书，但不得作为正式发布包。
- 正式 upload key、密码和证书不进入 Git、构建日志、截图或公开工件。
- CI 从受保护 Secret 读取签名材料，产生可追溯 APK/AAB、SHA-256 校验和和版本记录。
- `assetlinks.json` 必须包含当前调试/内测或 Play App Signing 所需的正确 SHA-256 指纹；证书变化必须先更新并验证域名关联。
- 最终发布前必须验证从上一正式版本升级不会清除 Supabase 会话或本地用户选择。

## 7. 当前第一执行序列

1. 合并 PWA 安装基础并部署生产。
2. 使用生产 manifest 生成固定包名的 TWA Android 工程。
3. 生成调试 APK，记录文件哈希并做结构检查。
4. 部署调试证书对应的 Digital Asset Links。
5. 在真实 Android 手机上安装并完成启动、导航、magic link、音频与麦克风 QA。
6. 后续所有核心功能 PR 同时执行 Web 和 Android APK 回归，不把 APK 留到项目末尾一次性适配。

## 8. 完成判定

只有 `docs/final-release-definition-of-done.md` 的 Android 门槛和其他全部 V1 MUST 门槛均为 `PASS`，才能宣布 Android 正式版完成。调试 APK、能打开首页、PWA 可安装、模拟器通过或普通 Chrome 通过都只是阶段证据，不是最终发布证明。
