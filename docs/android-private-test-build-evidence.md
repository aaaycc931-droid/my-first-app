# Android 本地私测包构建证据

执行日期：2026-07-16

## P103 探索性音高观察候选

P103 已在 PR #354 的 GitHub Actions run `29505316896` 完成自动化验证，两个 job 均 PASS；合并后的 main commit 为 `dfd3402a106138ff2aad464a6a962684f733fbd5`。artifact `8378264201` 下载 ZIP SHA-256 为 `dcb187d90f2203e374110eb7d62e517c1a7175228a6cb79044d1ab8a0f71e3de`，其内部 APK SHA-256 为 `389412852bfde6a0628be381f82eb5154b15682cfd8c70b56543a461581f769b`，与工件报告一致。

自动合成与真实挂载 DOM 测试不证明真实人声阈值、颤音教学适用性、真机采样/延迟或教育审核；P104 门槛仍未满足。

## P102 本机练声记录候选

P102 已在 PR #353 的 GitHub Actions run `29504298671` 完成自动化验证，`quality` 与 `android-local` 两个 job 均 PASS；合并后的 main commit 为 `1cc7ad9a1211994ec06f405ed0df10c8dfff2926`。artifact `8377845031` 下载 ZIP SHA-256 为 `5f35ed5890f840aefd96d27d92a623a8517eb9c6083620946d2f5580bba034af`，其内部 APK SHA-256 为 `3ac74de46162daead3ec3f4bb74536d998ce880c6af74fea14970a8ee489e64c`，与 `.sha256` 和 JSON 报告一致。

工件报告确认无网络/宽泛存储权限、无远程 server 或生产云端标识；麦克风只服务用户主动实时反馈和录音。自动 IndexedDB fake 与 CI APK 不证明真机跨重启、配额、WebView JSON 下载、录音回放或系统清理策略，也不包含 P103 探索性观察。

## P101 目标曲线与分段反馈候选

P101 已在 PR #352 的 GitHub Actions run `29502638657` 完成自动化验证，两个 job 均 PASS；合并后的 main commit 为 `84c329732f7e6a5498667027fd1ba731362c017e`。artifact `8377144432` 内 APK SHA-256 为 `e136f40a7a146d17537646016601c360bfbe24848c43aada7c3a4f595f0d7b63`，ZIP digest 为 `326a6da87a63702d015dbc39f525bbaaecf180d2bbe7a19bf1aa50b4834d16fb`。自动证据不证明真机目标同步或教学阈值，也不包含 P102 本机记录。

## P100 版本化练声生成器候选

P100 已在 PR #351 的 GitHub Actions run `29501929393` 完成自动化验证，`quality` 与 `android-local` 两个 job 均为 PASS；合并后的 main squash commit 为 `dadccec70c2a687327c1ec0d60d9b7bb93e6cd0d`。artifact `8376849801` 内 APK SHA-256 为 `0b0d7a467eb82e8fa87d0d685a704fe433d0056b715d31ab679e5656265a77db`，GitHub artifact ZIP digest 为 `8f533a3f656f041ba87164aa393ac62ecd29ccc0167670e692307d0efae8c8cc`。自动证据不证明真机参考音听感、调度精度、长循环发热或扬声器串音，也不包含 P101 目标曲线对照。

## P99 当前会话录音候选

P99 已在 PR #350 的 GitHub Actions run `29500985893` 完成自动化验证，`quality` 与 `android-local` 两个 job 均为 PASS；合并后的 main squash commit 为 `9dba1bbbec1e1e87cd9775643a6b5d4fad2a451e`。artifact `8376459594` 内 APK SHA-256 为 `d7dbc7b57628593b7421df5fb9f50654b62f357f19fb70f871e26562bef18b43`，GitHub artifact ZIP digest 为 `f08175ba32b723d098240fe02f9570dd74cb676e695e7cd9e275e4067491ae09`。

工件报告确认麦克风权限用于用户主动实时反馈和当前会话录音，仍无网络和宽泛存储权限。该自动证据不证明真机 MediaRecorder 编码、录音音质、回放、长时内存、来电打断或后台回收，也不包含 P100 练声生成器。

## P98 专业滚动曲线候选

P98 已在 PR #349 的 GitHub Actions run `29500174037` 完成自动化验证，`quality` 与 `android-local` 两个 job 均为 PASS；合并后的 main squash commit 为 `a85e4ba769c6fb7724d7b2075faf7f8b9cb7989d`。artifact `8376148510` 内 APK SHA-256 为 `52c9669d0bd42f3bec94df72c57d985728a11557d73c849a395998cb1764996a`，GitHub artifact ZIP digest 为 `e18142a77247b56e59d384b44b72c47133135bf7a3c872500691fc1e75b1f6e3`。

工件报告继续确认 Debug 签名、`0.2.0` / versionCode 2、本地资源、无远程 server、无网络和宽泛存储权限。该自动证据包含 SVG 滚动曲线，但不证明真机刷新率、延迟、旋转、小屏可读性或人声准确度，也不包含 P99 会话录音。

## P97 实时音高帧候选

P97 已在 PR #348 的 GitHub Actions run `29499485270` 完成自动化验证，`quality` 与 `android-local` 两个 job 均为 PASS；合并后的 main squash commit 为 `1a13987d5b589125281c62754091a2b79654ed72`。artifact `8375849926` 内 APK SHA-256 为 `3ba5d57f41b3dc931356318b87f78b7aa24b8fb31e1bf69b99a544154d73d37e`，GitHub artifact ZIP digest 为 `d56c8ae0789ec32e9a04acc25235fc436f83ba66d7b8c359e4d268e79d80fb89`。

工件报告确认 Debug 签名、`0.2.0` / versionCode 2、本地资源、无远程 server、无网络和宽泛存储权限；`RECORD_AUDIO` 仅供用户主动开始的实时音高入口。该自动证据不证明真实手机权限弹窗、连续采集延迟、人声音高准确度、发热或后台行为，也不包含 P98 滚动曲线。

## P96 三难度题库候选

P96 已在 PR #347 的 GitHub Actions run `29498225599` 完成自动化验证，`quality` 与 `android-local` 两个 job 均为 PASS；合并后的 main squash commit 为 `fdba367c04efa3bd73dee0a598c67c79faea4861`。artifact `8375330934` 内 APK SHA-256 为 `d300ea6aef90d1c6749eae5a654f5b114f1a824ce1678d17adf04f62243c5935`，GitHub artifact ZIP digest 为 `8ac6a7304dde678075e7b24397539076462cb6e58d2b4da867e58d21393c912f`。

该工件包含四题型三难度题库，但不包含 P97 麦克风权限和实时音高反馈。自动构建不证明真机题库听感、难度递进或教育审核。

## P95 稳定复练目标候选

P95 已在 PR #346 的 GitHub Actions run `29496649623` 完成自动化验证，`quality` 与 `android-local` 两个 job 均为 PASS；合并后的 `main` squash commit 为 `701330bfed64ad6b17487cc6bdb7f72b7b2dd0a5`。artifact `8374699870` 内 `solfeggio-local-test-v0.2.0-debug.apk` 的 SHA-256 为 `9a902fd2e6dfa2acd02665d6a74f8729e1d3deaa453f9860a4ebe256f7eedd93`，GitHub artifact ZIP digest 为 `5c3dc2448b5e5807c5206bdbcd21ff6105b6d597d5c13e4d84d7d11ed54d2a9a`。

上传前 verifier 已核对版本、commit、摘要、字节数和精确四文件结构。该自动证据包含稳定 `variantId` 与旧复练队列迁移，不包含尚未发布的 P96 三难度题库，也不证明真实 Android 跨版本升级、跨重启、音频或 System WebView 行为。

## P94 本地参考钢琴候选

P94 已在 main commit `bcee6cda2b065716b81d1dc6bc6733f655965177` 的 GitHub Actions run `29494421135` 完成自动化验证，`quality` 与 `android-local` 两个 job 均为 PASS。artifact `8373799745` 内 `solfeggio-local-test-v0.2.0-debug.apk` 的 SHA-256 为 `1a3268298da6c69cc2d0575231c1a4b6a523470873fd6a1c3c33814b6d956062`，GitHub artifact ZIP digest 为 `6e4acddd3e745410bfdfe98b0397cfa6155673f955daa9d740f44969b7d8076d`。

上传前 verifier 已核对版本、commit、摘要、字节数与精确四文件结构；该自动证据不证明真实手机多指、延音、扬声器、旋转、后台残音或 System WebView 行为，也不包含 P95 及后续代码。

## P93 React 行为回归候选

P93 已在 PR #344 的 GitHub Actions run `29492560135` 完成自动化验证，`quality` 与 `android-local` 两个 job 均为 PASS。对应 PR merge-test SHA 为 `17ba814e577b8db93a13d0e17a2f7f5799784fd4`，合并后的 `main` squash commit 为 `fed5c96c75ad8cb786251a9aff8fb7bf242e82b7`。

artifact `8373062993` 内 `solfeggio-local-test-v0.2.0-debug.apk` 的 SHA-256 为 `6864b4649ba9937a2e563fb95a11099424035c0fc7b24e9d4205125bd3684c33`，GitHub artifact ZIP digest 为 `41834bb3cf2eb5c7375c7fcaaa4b4f86a746ac71b017386c39b1e746f0022926`。上传前 verifier 确认精确四文件、版本、commit、字节数与摘要一致。该证据不包含 P94 钢琴代码，也不证明真实手机行为。

## P92 0.2.0 可追溯候选

P92 已在 PR #343 的 GitHub Actions run `29490844673` 完成自动化验证：`quality` 与 `android-local` 两个 job 均为 PASS。对应 PR merge-test SHA 为 `559bbaada2564618b3501c48223a47fa2cde017e`，合并后的 `main` squash commit 为 `4eb473289f0075a7e7a8c776f0d873f7981c84dc`。

该 run 上传了 artifact `8372367371`。其中 `solfeggio-local-test-v0.2.0-debug.apk` 的 SHA-256 为 `c64e7220fd4ae1919ebe63583194010d31f7ea062cf4bcbd9680bdf119914949`，GitHub artifact ZIP digest 为 `6606cb6e39dfd637dbc35535189419ef3443453c41d76e2f20c4aace471be88f`。版本为 `0.2.0` / versionCode `2`；版本单一来源、Gradle 映射、变更记录、固定 Actions commit 与 Gradle 分发包摘要均通过门禁。该包仍是 Android Debug 签名，不证明覆盖升级、回滚或真实手机 QA。

## P91 CI 独立复核工件

P91 已在 PR #342 的 GitHub Actions run `29490109582` 完成自动化验证：`quality` 与 `android-local` 两个 job 均为 PASS。对应 PR merge-test SHA 为 `9f7b481575e32b540ea15f67dbc23ccd24364026`，合并后的 `main` squash commit 为 `4c9e09a17eac6d7571b35660724bad9091c59933`。

该 run 上传了 artifact `8372077214`。上传前的独立 verifier 重新计算 APK SHA-256 与字节数，并交叉核对 `.sha256`、JSON/Markdown 报告、版本和 commit；工件内部 APK SHA-256 为 `c5060dad9fd6f11401b5c6eb2d08319b082272068a6abccb59dd20d819ecbcd4`。GitHub artifact ZIP digest 为 `fd416cf87553ed3d44d96a50ef79f1d0b373700d6554368474a4b6d82366fe11`。两者属于不同层级，不得互换。

这组证据证明 P91 的上传前独立工件复核在实际 CI 中通过，因此 Android 路线的 C1 可标记为 `PASS`。它仍不证明真实手机安装、离线音频、跨重启复练、后台恢复或长循环 QA。该工件是 0.2.0/versionCode 2 之前的历史基线；当前候选以 P92 小节为准。

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
- 历史 0.1.0 候选的 `aapt dump permissions`：没有 `android.permission.INTERNET`、麦克风或存储权限；P97 起的候选会仅新增用户主动实时音高反馈所需的 `RECORD_AUDIO`，仍不得包含网络或宽泛存储权限。
- APK 结构检查：包含本地 `index.html`、CSS、JavaScript 和应用图标。
- 移动 bundle 检查：没有生产 Supabase URL、`NEXT_PUBLIC_SUPABASE`、`supabase-js` 或 `vercel.app` 标识。
- 启动图和桌面图标已完成本地像素目视检查。

## 尚未执行

- 没有连接真实 Android 设备，因此未执行安装、飞行模式冷启动、系统 WebView、真实扬声器播放、后台恢复和 20 轮稳定性 QA。
- Chromium 自动交互环境下载失败，因此没有声称完成模拟手机视口浏览器 QA。
- 当前为调试证书签名的私测包；专用 release key、覆盖升级和回滚尚未执行。
- P90 PR #341 的旧 artifact 只记录了 GitHub ZIP 摘要；P91 PR #342 已验证独立 verifier 门禁，P92 PR #343 已生成并核对 0.2.0/versionCode 2 候选工件。

## CI 可下载工件规则

后续每次 `android-local` GitHub Actions job 成功后，CI 会在调试 APK 构建完成后重新校验 APK 的签名、包名、版本、SDK、权限和内含本地资源，再上传一个保留 14 天的私测工件。工件包含：

- `solfeggio-local-test-v<version>-debug.apk`；
- 同名 SHA-256 校验文件；
- JSON 与 Markdown 构建报告，记录版本、commit、工作流 run、APK 大小和本地运行时边界检查结果。

如果 Gradle 测试/构建、源码 bundle 校验、APK 签名/结构校验或报告生成中的任一步失败，上传步骤不会执行。该机制不生成 AAB，不使用或保存 release 签名密钥，也不替代真实手机安装、飞行模式、音频和生命周期 QA。

QA level recommendation：**strict**。下一门槛是按 `docs/android-apk-release-plan.md` 的真机私测清单完成首台手机验收。
