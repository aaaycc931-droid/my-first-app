# Android 本地私测包构建证据

执行日期：2026-07-16

## 候选包

| 项目 | 结果 |
| --- | --- |
| 文件名 | `solfeggio-local-test-v0.1.0-debug.apk` |
| 源码 commit | `7839fd7` |
| 文件大小 | 5,024,254 bytes |
| SHA-256 | `b9582f9b582b9d1e1714a13a2cff70126a96647790ec345b00c47b8b2cb64914` |
| applicationId | `com.aaaycc931.solfeggio` |
| versionCode / versionName | `1` / `0.1.0` |
| minSdk / targetSdk | `24` / `36` |
| 签名 | Android Debug，APK Signature Scheme v2 验证通过 |
| 签名证书 SHA-256 | `41bbd0bb389ab883454eb644120803a5d19b8d9ca00bf2319f55b379a1fe7ddb` |

源码 commit 之后只增加本证据文档，不改变 APK 的源代码、资源或构建配置。

## 已执行并通过

- `npm run check`：ESLint、TypeScript、Vite 移动构建、本地模式验证和 Next.js 生产构建通过。
- 四个 focused tests：单音、音程、节奏和旋律听写确定性逻辑通过。
- `npm audit --omit=dev --audit-level=high`：0 vulnerabilities。
- `./gradlew testDebugUnitTest`：固定 applicationId 单元测试通过。
- `./gradlew assembleDebug`：94 个任务成功完成。
- `apksigner verify --verbose --print-certs`：V2 签名验证通过。
- `aapt dump badging`：包名、版本、应用名、minSdk 和 targetSdk 与本表一致。
- `aapt dump permissions`：没有 `android.permission.INTERNET`、麦克风或存储权限；仅有 AndroidX 自动生成的包内动态接收器保护权限。
- APK 结构检查：包含本地 `index.html`、CSS、JavaScript 和应用图标。
- 移动 bundle 检查：没有生产 Supabase URL、`NEXT_PUBLIC_SUPABASE`、`supabase-js` 或 `vercel.app` 标识。
- 启动图和桌面图标已完成本地像素目视检查。

## 尚未执行

- 没有连接真实 Android 设备，因此未执行安装、飞行模式冷启动、系统 WebView、真实扬声器播放、后台恢复和 20 轮稳定性 QA。
- Chromium 自动交互环境下载失败，因此没有声称完成模拟手机视口浏览器 QA。
- 当前为调试证书签名的私测包；专用 release key、覆盖升级和回滚尚未执行。

QA level recommendation：**strict**。下一门槛是按 `docs/android-apk-release-plan.md` 的真机私测清单完成首台手机验收。
