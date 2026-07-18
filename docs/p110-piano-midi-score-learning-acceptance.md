# P110 多音色、MIDI 与谱面学习验收边界

更新：2026-07-18
QA level recommendation：**strict**

## 交付范围

P110 在 P109 本地钢琴之上交付一个离线、非评分的完整切片：

1. 同一套 Public Domain 三层 Splendid Grand Piano 采样形成六种本机处理预设。每个预设有独立 ID、中文名称、滤波/包络参数和许可来源；产品不得称为六套独立乐器采样库。
2. 用户主动请求 Web MIDI 权限后，可选择输入设备，将 note-on、note-off、0–127 力度和 CC64 延音踏板映射到本地钢琴。设备切换、拔线、切页、后台和卸载必须全停。
3. 不支持 Web MIDI、权限拒绝或没有设备时显示中文原因，屏幕钢琴、音色、录制和谱面学习仍可继续使用。Android APK 的 USB MIDI 只在实际 System WebView 与硬件验证通过后才可标记 PASS。
4. 内置项目原创 8 音单声部练习，提供谱面预览、瀑布视图、30–180 BPM 播放和全停。
5. 用户可选择最大 2 MB 的本机 `.musicxml`/`.xml`；文件不上传、不持久化。解析结果标记为待检查草稿，显示解析器限制，并允许移除音符。
6. MusicXML 草稿只有在用户主动检查并确认后才允许播放；任何修改都会使确认失效。替换、错误或清除文件必须清除旧草稿和下游可播放状态。

## 明确不做

- 不提供图片/PDF OCR、生产 OMR、压缩 MXL、完整 MusicXML 标准、复杂多声部或谱面排版编辑。
- 不把导入草稿称为正式转写、最终目标、正确谱面或评分依据。
- 不保存或上传本机乐谱，不建立公开曲库，不复制竞品谱面、课程、资产或 UI。
- 不实现高级 MIDI 录制/编辑；P109 事件录制只复用已进入本地钢琴的标准音符、力度与踏板事件。

## 自动退出门槛

- 六个音色 ID 唯一、许可 manifest 明确、默认采样失败仍可降级。
- MIDI 解码覆盖跨通道 note-on/off、零力度 note-on、CC64 阈值和无关消息忽略。
- MusicXML 草稿覆盖空/格式错误/越界/上限、修改后 stale、确认 gate、确定性播放和全停。
- 真实挂载移动 React 测试覆盖六音色 UI、不支持 MIDI 降级、设备力度/踏板/断连、MusicXML 检查确认修改清除，以及原创谱面/瀑布播放。
- `lint`、`typecheck`、focused tests、移动构建、Android 本地 bundle 校验、Next.js build、Gradle 单元测试和 debug APK 构建通过。

## 真机退出门槛

P110 开发合并可在自动门槛通过后完成，但 USB MIDI 专业能力和移动音色体验必须继续保持 `IN_PROGRESS`，直到按 `docs/android-piano-manual-test-protocol.md` 在已安装 APK、真实 OTG/MIDI 硬件和适用 System WebView 上执行并记录。缺少硬件或 Web MIDI 不支持必须记为 `UNSUPPORTED/BLOCKED`，不能伪装为 PASS。
