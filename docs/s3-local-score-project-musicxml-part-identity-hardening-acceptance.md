# S3 本机谱项目 MusicXML／MXL part identity fail-closed 硬化验收

QA level recommendation：**strict**

## 范围

本切片只收紧当前单 part MusicXML／MXL 导入所依赖的身份载体，不增加音乐语义，不改
`score-document-v13`、`local-score-project-storage-v14` 或迁移链：

- `part-list` 必须是大小写精确、无 namespace、无属性的唯一容器；
- `score-part` 与内容 `part` 必须大小写精确、无 namespace，且各自只含一个无
  namespace 的 `id` 属性；
- part ID 只接受最长 128 字符的 canonical ASCII XML ID 子集：
  首字符为 `A–Z`、`a–z` 或 `_`，后续字符可再包含数字、`.` 与 `-`；
- 两个 ID 不做 trim、大小写折叠或其他修正，必须 exact 相等；
- 唯一 `part-name` 必须大小写精确、无 namespace、无属性、无子元素，只含普通 text
  node；文本非空、已经 trim、无控制字符且最多 40 code point。

受控容器只允许元素和格式空白；comment、CDATA、processing instruction 或非空散落
文本一律 blocking。XML entity 解码后的文本可以进入 canonical，但不得因 trim、截断或
节点拼接改变内容。

## Fail-closed 边界

- `part-list`、`score-part`、`part-name`、内容 `part` 的 namespace／大小写变体、
  重复、错层级、额外属性或未知子元素必须 blocking。
- 缺失、空、超长、带首尾空白、非法字符或不一致的 part ID 必须 blocking。
- 空、首尾空白、超长、带控制字符、CDATA、comment、processing instruction、属性、
  namespace／大小写变体或子元素拼接的 `part-name` 必须 blocking。
- 任一 blocker 必须在项目物化前生效；不得分配 event ID、生成部分项目、修改
  revision／undo／redo 或持久化候选。
- GM1 `instrument-name` 继续与未修正的 exact part name 比较，instrument pair 的既有
  严格顺序和 ID 边界保持不变。

## 自动验收

1. canonical `P1` 与包含 `_`、`.`、`-` 的受控 ID 可正常导入；
2. 合法 unassigned 与 GM1 program `1`／`128` 输入继续通过；
3. 上述每类非法容器、ID、文本和节点类型都产生稳定 blocking code；
4. 每个非法 fixture 的 `createEventId` 调用次数为零；
5. focused importer、完整 Quality、Android 本地校验以及远端
   `quality`／`android-local` 门禁通过。

## 未执行与不宣称

本切片不硬化 note/rest/measure 的全部基础载体，不新增和弦类别、双升降、Unicode
升降号、转位、tempo map、多 verse、左右手、MIDI 或 OMR。

真实浏览器导入／下载／重开、Android WebView／实体设备、MuseScore／Dorico／Sibelius、
真实显示或播放及教师审核保持 `NOT_EXECUTED`。仓库内部测试不代表完整 MusicXML/MXL、
第三方兼容、完整 S3、正式 V1 或最终 APK 已完成。
