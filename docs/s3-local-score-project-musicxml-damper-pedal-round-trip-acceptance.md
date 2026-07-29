# S3 本机谱项目 MusicXML/MXL 单事件制音踏板记号 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- canonical note/rest 的事件起点 `damperPedalMark` 可取 `down`、`up` 或
  `null`；本切片不修改 canonical schema、storage 版本、编辑器或播放语义。
- `down` 确定性映射为目标 note/rest 紧邻之前的
  `<direction><direction-type><pedal type="start"/></direction-type><voice>1</voice><staff>1</staff></direction>`；
  `up` 映射为同一结构的 `type="stop"`；`null` 不生成 direction。
- `.musicxml` 与 `.mxl` 必须由 canonical importer 无损重建相同
  `damperPedalMark`。
- 保持 S2 canonical 语义：踏板标记只属于事件起点，不要求 down/up 配对，孤立
  `up` 合法，不推断持续区间。

MusicXML 4.0 规定 `<pedal>` 是 `<direction-type>` 的空子元素，`type` 为必需
属性；`<direction>` 可关联同一 voice 中随后出现的第一个 note。本切片进一步收紧
为单 part、staff、voice 中紧邻的后继 note/rest，避免 offset 或版式信息造成歧义。

规范参考：

- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/pedal/>
- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction/>
- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction-type/>

## 严格 MusicXML 结构

- `<direction>` 必须是 measure 的直接子元素，且紧邻其目标 note/rest；每个事件
  最多一个踏板 direction。二者之间只允许 XML 格式化空白文本；非空文本、CDATA、
  comment 或 processing instruction 均不得被当作可忽略间隔。
- direction、direction-type、pedal、voice、staff 和目标 note 的元素名必须是
  大小写精确的无 namespace MusicXML 名称；错大小写、前缀或外部 namespace 必须
  blocking。
- `<direction>` 必须无属性，并依次且仅包含一个 `<direction-type>`、`<voice>1`
  和 `<staff>1`。
- `<direction-type>` 必须无属性，并且只包含一个直接 `<pedal>`。
- `<pedal>` 必须为空，只能有唯一 `type="start"` 或 `type="stop"`；所有可选版式
  属性均不在本轮子集。
- direction、direction-type、pedal、voice 与 staff 不得包含额外元素、非空文本、
  CDATA、comment 或 processing instruction。
- `change`、`continue`、`sostenuto`、`resume`、`discontinue`、重复或悬空
  direction、错误 voice/staff、offset、sound、words、wedge、direction-based
  dynamics 和其他 direction 语义必须 blocking；不得选择第一项、猜测、归一化
  或静默忽略。

## 自动验收

- XML 与 MXL 覆盖 down/up/null、note/rest、同小节与跨小节事件，以及与 dot、
  fermata、tie／tied、slur、lyric、fingering、articulations、dynamic 共存。
- 同一 canonical revision 重复生成 XML／MXL 字节一致；XML 与 MXL 解包 XML
  语义一致，canonical re-import projection exact 保留 `damperPedalMark`。
- 覆盖未知 type、缺失 type、附加属性、文本、CDATA、comment、processing
  instruction、嵌套、错层级、重复、悬空、非紧邻和其他 direction，且 blocking
  输入不得分配 canonical event id。
- focused import／export tests、S2 pedal regressions、documentation hygiene、
  lint、typecheck、完整 `check`、Android 本地校验／构建和 `git diff --check`
  必须通过。

## 人工与外部 QA

真实桌面浏览器导入、下载与重开，Android WebView／真机，以及
MuseScore／Dorico／Sibelius 等第三方独立阅读器中的踏板符号显示、布局和重新打开
均为 `NOT_EXECUTED`。真实踏板音频、MIDI CC64 与教师审核也为 `NOT_EXECUTED`。
仓库内部 parser、DOM 测试、CI 或 APK 不能替代这些证据。

踏板持续状态、半踏、sostenuto／soft pedal、自动配对、版式与 pedal line、真实
播放、MIDI、OMR、完整 MusicXML/MXL、完整 S3 与正式版 V1 仍未完成或为
`NOT_EXECUTED`；本切片不得被描述为完整踏板系统、完整格式往返或正式发布完成。
