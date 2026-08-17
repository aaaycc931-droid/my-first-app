# 本机谱项目 MusicXML／MXL 导出 controller 验收

状态：**Active implementation acceptance**

最后核验：2026-08-17

规范来源：`docs/final-ui-refactor-compatibility-contract.md`、
`docs/s3-local-score-project-musicxml-export-acceptance.md`

## 1. 动机

`mobile/src/LocalScoreProjectPanel.tsx` 此前直接持有导出格式和候选，并负责调用
MusicXML/MXL 候选生成、确认重验和浏览器下载 port。既有 domain use-case 已完整保护
canonical 校验、blocking ledger、fingerprint、stale project、MXL 重建和大小上限，既有
browser adapter 也已保护同步 anchor click、Blob URL 与幂等 cleanup；但二者的受控编排、
候选失效和迟到 cleanup 通知仍耦合在大型 JSX。

本切片只新增框架无关同步 controller 和薄 React hook。controller 复用既有两个纯
export use-case，并通过中性 download port 调用既有 browser adapter；面板只呈现候选、
ledger、disabled reason，并转发用户意图。

## 2. 必须改变

- 面板不再直接调用 export draft／confirm use-case、download port 或持有 format／draft state；
- controller 承接检查、格式切换、清除、项目失效、明确确认、下载结果和既有中文通知；
- 候选检查不能创建 Blob、URL、anchor 或下载；只有明确确认成功后调用 download port；
- confirm use-case 到 `downloadPort.download` 必须处于同一同步调用栈，不能插入
  `await`、Promise 或 microtask，以保留浏览器 user activation；
- 格式切换、项目发布／修改／切换、返回列表和清除候选立即使旧候选失效；
- URL cleanup callback 是唯一异步结果；旧 callback 在格式切换、清除、项目失效、
  后续操作或卸载后不能覆盖当前通知；
- Android 静态门禁验证同步 controller、薄 hook、cleanup stale guard 和 UI 依赖方向。

## 3. 必须保留

- `createLocalScoreProjectMusicXmlExportDraft` 是候选、ledger、XML/MXL、大小和文件名的
  唯一 use-case；`confirmLocalScoreProjectMusicXmlExportDraft` 继续执行 current project、
  revision、fingerprint、tamper、format 与 payload 重验；
- `lib/platform/browserFileDownload.ts` 继续独占 Blob、object URL、同步 anchor click、
  anchor removal、cleanup 调度和幂等 revoke；本切片不修改或复制 adapter；
- `.musicxml`／`.mxl` 选择、候选摘要、完整 blocking ledger、明确确认和全部中文文案；
- 成功下载后保留候选；确认、下载或 cleanup 失败也保留候选，以便检查和重试；
- blocking、dirty autosave、saving、播放、恢复候选和其他 `structureMutationDisabled`
  条件继续阻止检查或确认；这些页面级 gate 不进入 controller；
- 导出不修改项目、revision、undo／redo、IndexedDB、恢复候选、项目列表或应用容量；
- MXL archive 仍由 domain use-case 生成，download adapter 保持格式无关；
- 本机、离线、无上传、无账号／云同步、非评分和非完整 MusicXML 边界。

## 4. 自动验收

- `test:mobile-local-score-project-behavior` 覆盖 controller ready／blocked／throw、同步下载、
  XML/MXL request、成功／失败保留候选、stale project、格式切换、清除、静默失效、
  cleanup stale guard 和 StrictMode replay；
- 既有面板行为继续覆盖候选前零下载、明确确认后单次下载、dirty／recovery gate、
  blocking ledger、URL 创建／回收失败和 store／revision／history 不变；
- `test:local-score-project-musicxml-export` 继续覆盖全部格式语义、round-trip、fingerprint、
  tamper、MXL、大小和 blocking use-case；
- 既有 browser download port 测试继续覆盖同步 click、有效 Uint8Array view、anchor cleanup
  和幂等 URL revoke；
- `validate:android-local` 阻止 export use-case、download 调用或 format／draft state 回流面板；
- `typecheck`、targeted lint、documentation／repository／CI policy 与 `git diff --check`
  为合并门禁。

## 5. 未执行与不宣称

真实桌面浏览器、Android System WebView、已安装 APK、系统文件保存体验、低内存、
大文件性能、MuseScore 等第三方阅读器、屏幕阅读器、教师和目标用户 QA 均保持
`NOT_EXECUTED`。本切片不改变 MusicXML/MXL 语义、canonical／storage schema、迁移、
正式 OMR、上传、同步、评分或 V1 完成状态，也不表示完整 score-project controller 或
最终 UI 重构已经完成。

QA level recommendation：**strict**。
