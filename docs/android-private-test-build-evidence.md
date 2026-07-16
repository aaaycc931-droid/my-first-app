# Android 本地私测包构建证据

执行日期：2026-07-16

## P91 CI 独立复核工件

P91 已在 PR #342 的 GitHub Actions run `29490109582` 完成自动化验证：`quality` 与 `android-local` 两个 job 均为 PASS。对应 PR merge-test SHA 为 `9f7b481575e32b540ea15f67dbc23ccd24364026`，合并后的 `main` squash commit 为 `4c9e09a17eac6d7571b35660724bad9091c59933`。

该 run 上传了 artifact `8372077214`。上传前的独立 verifier 重新计算 APK SHA-256 与字节数，并交叉核对 `.sha256`、JSON/Markdown 报告、版本和 commit；工件内部 APK SHA-256 为 `c5060dad9fd6f11401b5c6eb2d08319b082272068a6abccb59dd20d819ecbcd4`。GitHub artifact ZIP digest 为 `fd416cf87553ed3d44d96a50ef79f1d0b373700d6554368474a4b6d82366fe11`。两者属于不同层级，不得互换。

这组证据证明 P91 的上传前独立工件复核在实际 CI 中通过，因此 Android 路线的 C1 可标记为 `PASS`。它仍不证明真实手机安装、离线音频、跨重启复练、后台恢复或长循环 QA。该工件也是 0.2.0/versionCode 2 版本切片之前的已验证基线；0.2.0 候选必须等待本切片 CI 重新构建并记录自己的 APK 摘要，不能沿用本节摘要。

## P90 CI 候选工件

P90 的 Android 本机错题复练切片已经在 PR #341 的 GitHub Actions run `29489428878` 完成自动化构建：`quality` 与 `android-local` 两个 job 均为 PASS。PR 的远端功能 commit 为 `7d80321c03e0136c9213bdb767c870102c022138`，PR merge-test SHA 为 `8e87ae1a0a706652b58752b28a76072fb7804cdd`，合并后的 `main` squash commit 为 `73e65f6ff9fa5fc9664aea910eab5da910dc7b3c`。

该 run 上传了 artifact `8371808955`；GitHub 提供的 artifact ZIP SHA-256 为 `a933369c439a87a72b3195482d30be9fb8f848317af11410d2a41ae7c7b2af4c`。这个摘要只校验 GitHub 下载的 ZIP 容器，**不是 ZIP 内 APK 的 SHA-256**。下载后的 APK 文件名、内部 `.sha256` 和 `android-local-build-report.json` 仍需用独立 verifier 相互核对，核对完成前不得把 ZIP 摘要写成 APK 摘要。

PR #341 的成功证明 P90 源码在对应 merge-test revision 通过自动化质量门禁、Gradle 单元测试、debug APK 构建和打包脚本；它不证明 `main` squash commit 已产生同 commit 的 APK，也不证明真实手机安装、跨重启错题复练、离线音频或后台恢复。该段保留为 P90 历史证据；P91 已在上节用新的 CI 工件完成独立 verifier 门禁并让 C1 达到 `PASS`。

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
- P90 PR #341 的旧 artifact 只记录了 GitHub ZIP 摘要；P91 PR #342 已用新 run 的独立 verifier 核对其工件内部 APK。0.2.0/versionCode 2 尚待本切片 CI 生成并核对新的候选工件。

## CI 可下载工件规则

后续每次 `android-local` GitHub Actions job 成功后，CI 会在调试 APK 构建完成后重新校验 APK 的签名、包名、版本、SDK、权限和内含本地资源，再上传一个保留 14 天的私测工件。工件包含：

- `solfeggio-local-test-v<version>-debug.apk`；
- 同名 SHA-256 校验文件；
- JSON 与 Markdown 构建报告，记录版本、commit、工作流 run、APK 大小和本地运行时边界检查结果。

如果 Gradle 测试/构建、源码 bundle 校验、APK 签名/结构校验或报告生成中的任一步失败，上传步骤不会执行。该机制不生成 AAB，不使用或保存 release 签名密钥，也不替代真实手机安装、飞行模式、音频和生命周期 QA。

QA level recommendation：**strict**。下一门槛是按 `docs/android-apk-release-plan.md` 的真机私测清单完成首台手机验收。
