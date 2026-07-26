# S2 本机谱项目原创编制模板验收

## 定位

本切片在 canonical 声部组名称与乐器归属之上，提供不少于 18 个原创空白编制
模板，并把所选模板一次性物化为可独立编辑、保存和重新打开的本机谱项目。

模板只覆盖当前 schema 能真实表达的 `pitched` 五线谱、高音／低音谱号、基础
GM1 归属与多 part／多谱表／多声部。它不把普通五线谱冒充四线贝斯 TAB、鼓谱、
吉他 TAB 或古筝专用谱，因此只构成 S2“18 类以上原创模板”的有证据部分完成，
不代表完整谱种已经完成。

## Registry 与项目边界

- registry 至少包含 18 个原创模板；模板 ID 与中文名称必须唯一。
- 已发布 ID 采用 append-only 版本化语义；不原地改变既有 ID 的结构含义。
- 每个模板显式声明分类、名称、摘要、拍号、调号、BPM，以及每个 part 的名称、
  乐器归属、谱表谱号和空声部数量。
- registry 只能使用当前支持的 `pitched` staff、高音／低音谱号和合法 canonical
  乐器归属；不得包含曲谱事件、外部资源、采样或受版权保护的谱面内容。
- registry 和嵌套定义在运行时只读；创建时深拷贝调号与乐器归属。
- `templateId` 和 registry 引用不得写入项目。创建后的项目不随 registry 更新，
  也不回写模板。
- 本切片沿用 `score-document-v5` 与 `local-score-project-storage-v6`，不新增
  schema、IndexedDB 版本或旧数据迁移。

## 原子创建

- `createLocalScoreProjectFromTemplate` 必须在内存中一次生成完整项目：
  revision 为 1，undo／redo 为空，每个 voice 只有第 1 个空小节。
- part、staff、voice ID 由注入生成器产生并添加明确 kind 前缀。空值、非法字符、
  超长、重复或生成器异常必须 fail closed。
- 工厂最终必须通过当前 canonical parser；失败不得返回部分项目。
- UI 只能在完整物化后调用一次 `persistNewLocalScoreProject`。不得先保存默认空谱，
  再循环执行结构命令。
- 写入失败时项目列表、当前编辑器、模板选择和标题草稿保持可重试状态，不出现
  canonical 幽灵项目。
- 成功后直接打开首个 part／staff／voice；项目可继续编辑、保存并重新打开。

## UI 与诚实边界

- 创建区默认选择“空白高音五线谱”，按基础、键盘、室内乐、声乐分组展示模板。
- 选择模板只预览名称、摘要、part／谱表数、拍号、BPM、乐器归属与谱号，不产生
  持久化写入。
- UI 必须说明模板只决定新项目的初始空编制，创建后项目独立保存。
- UI 必须说明模板不包含曲谱内容、真实多乐器音色或完整总谱排版；当前所有声部
  仍使用钢琴采样预览。
- 存储不可用、忙碌或达到项目数量上限时，创建入口必须明确禁用并显示原因。

## 自动验收

- registry 数量、唯一性、exact validator、运行时只读与全部 pitched 边界。
- 每个模板物化、canonical parse／serialize round-trip、revision／history、空小节、
  ID 唯一性、深拷贝以及序列化结果不含 `templateId`。
- 钢琴双谱表、四声部钢琴、双钢琴、弦乐四重奏与最大编制 fixture。
- unknown template、非法 registry、非法／重复／中断结构 ID fail closed。
- mounted Panel 覆盖默认预览、20 个选项与分组、选择不写入、失败无 ghost、重试
  单次写入、成功打开首 voice、定向编辑与重新打开。
- 模板领域测试、Panel 回归、storage／capacity／recovery／presentation／playback
  回归、`npm run lint`、`npm run typecheck`、`npm run check` 和
  `git diff --check` 必须通过。

## 明确不做

- TAB、鼓谱、古筝谱、移调乐器、打击乐谱或中音谱号。
- 真实多乐器采样、按 part 音频路由、mute／solo、MIDI channel／bank。
- 总谱括号、分谱、页面系统、换行／分页、打印或 MusicXML 模板交换。
- 向既有项目套用模板、在线／用户自定义模板、模板同步或模板市场。

## 门禁与证据边界

QA level recommendation：`strict`。

桌面浏览器、Android WebView、Android 真机、真实多声部听感、低存储、后台恢复和
进程强杀均保持 `NOT_EXECUTED`，直到取得对应人工证据；自动测试、CI 和 Debug APK
不能替代这些证据。
