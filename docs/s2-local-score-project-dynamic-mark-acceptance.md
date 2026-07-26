# S2 本机谱项目力度记号验收

## 定位

本切片在 canonical 单音演奏法之后，为本机谱项目加入事件起点级力度记号。
力度记号随 revision、CAS、undo／redo、恢复候选、复制／粘贴和本机持久化演进；
五线谱与固定 C 简谱读取同一份数据。

数据基线升级为 `score-document-v10` 与 `local-score-project-storage-v11`。
storage v1–v10、document v1–v9 及其 undo／redo 历史只在读取时纯迁移；
打开旧项目不会自动写回，下一次显式保存才持久化新版本。

## Canonical 语义

每个 note／rest event exact 保存：

```ts
dynamicMark: "pp" | "p" | "mp" | "mf" | "f" | "ff" | null;
```

- 六个值依次表示很弱、弱、中弱、中强、强、很强；`null` 表示该起点没有显式记号。
- 力度记号属于事件起点，音符和休止符都可承载。
- 当前版本严格拒绝缺失字段、未知值、大小写变体、空字符串和非字符串；不做宽松修复。
- 本字段只保存用户明确输入，不自动识别、推断、延续、推荐或校正力度语境。

## 编辑、迁移与耐久性

- 新建 note／rest 默认 `dynamicMark: null`。
- `changeLocalScoreProjectEventDynamicMark` 必须依次验证 CAS、时间、输入和唯一事件定位。
- 相同值为 no-op；缺失事件、旧 revision、时钟回退和非法值均失败关闭。
- undo／redo 恢复完整值；undo 后新修改清空 redo。
- copy／paste 保留力度记号，既有延音线清除边界不变。
- clone、fingerprint、serialization、capacity、recovery candidate 与 IndexedDB round-trip
  均包含该字段。
- UI 只在保存成功后发布新 canonical。保存失败保留旧谱面和当前力度草稿，以便重试。

## 显示与播放边界

- 五线谱与固定 C 简谱显示同一 `pp`–`ff`，并提供简体中文可访问名称。
- 五线谱布局必须为力度记号保留独立行，避免与演奏法、歌词和和弦名称碰撞。
- 本切片是 display-only。力度记号不改变 velocity、gate、pitch、duration、timbre、
  timeline、span、warning 或总时长。
- 保存力度修改不得重建或中断正在运行的播放／节拍器 transport。
- revision-scoped schedule／pointer identity 可按既有规则变化；其他音乐播放语义必须等价。

## 自动验收

- focused domain 测试覆盖六值、null、note／rest、非法输入、CAS、时钟、not-found、
  no-op、undo／redo、copy／paste、serialization 和当前版本严格拒绝。
- 表驱动迁移覆盖 storage v1–v10、document v1–v9、undo／redo、输入不变与纯读取。
- staff／numbered presentation、容量、恢复候选、IndexedDB、playback 和 transport
  回归必须通过。
- Quality workflow 必须显式注册专项测试；`lint`、`typecheck`、`check` 与
  `git diff --check` 必须通过。

## 明确不做

- 真实力度播放、velocity 映射、力度持续范围、渐强／渐弱或自动演奏解释。
- MusicXML／MXL／MIDI round-trip、打印排版、云同步、协作或教师审核。

## 门禁与证据边界

QA level recommendation：`strict`。

Browser 手动 QA、Android WebView／真机、进程中断恢复、真实谱面排版可读性、
真实力度播放、格式 round-trip 和音乐教师审核均为 `NOT_EXECUTED`；自动测试、
CI 与 APK 构建不得替代这些外部证据。
