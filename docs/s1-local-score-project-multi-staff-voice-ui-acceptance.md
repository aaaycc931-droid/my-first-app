# S1 本机谱项目多谱表／多声部 UI 验收

## 定位

本切片把 `ScoreDocument` 已有的多 part、staff、voice 数据从“只能 round-trip、界面
固定编辑第一声部”推进为可见、可选择、可定向编辑的 S1 闭环。

用户可以在当前项目中选择已有 part、谱表与声部；在当前 part 下增加一个空 pitched
谱表，或在当前谱表下增加一个空声部；随后在选中声部中输入、选择、移动、复制、
粘贴、撤销／重做、预览与重新打开。所有写入继续先持久化，成功后才发布。

## 领域与持久化语义

- 新增谱表必须接收显式、全项目唯一的 `staffId` 与初始 `voiceId`，谱表类型固定为
  `pitched`，谱号只允许当前 v3 已支持的高音或低音谱号。
- 新增声部必须接收显式、全项目唯一的 `voiceId`。
- 新谱表／声部的空小节编号从目标 part／staff 已有声部的小节编号并集确定；至少
  包含第 1 小节，升序且不得复制任何事件。
- 删除只允许删除完全没有事件的声部或谱表；每个谱表至少保留一个声部，每个 part
  至少保留一个谱表。拒绝删除时 canonical 项目保持不变。
- 每个成功命令只增加一个连续 document revision，复用 expected revision CAS、
  ISO 时间和设备时钟回退检查；undo／redo 保存完整多谱表内容。
- IndexedDB 协议、项目 schema、recovery candidate schema 与容量限制不变。

## UI 与定向编辑

- 编辑器显示 part、谱表、声部三个简体中文选择器，并明确标识当前编辑目标。
- part 或谱表切换后，若原下级选择不存在，稳定回退到该层第一个可用目标；切换声部
  清除不属于新声部的事件选择，但不创建 revision。
- 目标小节、事件列表、新增／更新／删除、移动、复制／粘贴、追加／删除空小节、
  谱号修改、五线谱与固定 C 简谱都必须使用精确的
  `partId + staffId + voiceId`。
- 编辑一个声部不得删除、重排或改写其他 part、staff、voice 的事件和身份。
- 播放计划继续使用完整 canonical document；切换编辑声部或双视图不得停止、
  重建或缩窄正在进行的完整谱面播放。
- 新增／删除谱表或声部属于显式结构保存，必须遵守 settings autosave 与 transport
  互斥；播放中不得静默改变 document。
- storage、CAS、容量或事务失败时继续显示最后保存的完整谱面，并提供简体中文恢复
  说明，不得留下仅存在于 UI 的幽灵谱表或声部。

## Presentation

- staff 与 numbered presentation 接受可选精确声部目标；省略时保持第一声部兼容。
- 目标 part、staff 或 voice 不存在时 fail closed，不回退到别的声部冒充结果。
- token location、选择、播放光标、延音线与歌词必须保留精确声部身份。
- 可访问名称使用“当前声部”，并提供足以区分目标的 part／谱表／声部身份。

## 自动验收

- 领域测试覆盖新增谱表、增加声部、空小节模板、唯一 ID、CAS、时钟、连续 revision、
  删除空目标、拒绝非空目标和拒绝删除最后一个目标。
- presentation 测试覆盖默认第一声部、精确选择第二声部／第二 part、目标不存在、
  五线谱与固定 C token/location 一致。
- mounted Panel 测试使用真实多谱表／多声部项目，覆盖导航、定向新增和编辑、切换
  清理选择、其他声部保持、保存失败保持 canonical、撤销／重做与重新打开。
- 播放与 transport 回归证明切换编辑声部和双视图不重建控制实例、不停止声音。
- `npm run lint`、`npm run typecheck`、相关 focused tests、`npm run check` 与
  `git diff --check` 必须通过。

## 明确不做

- 创建／删除 part，part 名称、乐器、分谱或编制管理。
- 同屏总谱排版、跨谱表连谱号、大谱表括号、跨声部符干／连音排版。
- 中音、次中音、打击乐、TAB 谱号或 S2 高级符号。
- 跨声部移动／粘贴自动合并、声部交换、自动分声部或 MIDI 量化。
- MusicXML/MXL/MIDI 导入导出、打印、云同步或教师批注。
- 把 Browser、WebView、真机或真实强杀场景标记为自动测试已证明。

## 门禁与证据边界

QA level recommendation：`strict`。本切片改变核心谱面结构、持久化 revision、
撤销／重做、播放文档与选择语义。

桌面浏览器、Android WebView、Android 真机、多指／旋转、低存储、后台恢复和进程
强杀均保持 `NOT_EXECUTED`，直到取得对应人工证据。自动测试与 CI Debug APK
不能替代这些证据。
