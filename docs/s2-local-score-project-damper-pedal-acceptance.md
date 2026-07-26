# S2 本机谱项目制音踏板记号验收

## 定位

本切片在事件起点加入制音踏板起落记号：

```ts
damperPedalMark: "down" | "up" | null;
```

`down` 表示踩下，`up` 表示释放；note 与 rest 均可承载。记号不自动配对、不推断持续范围，也不把单独的 `up` 视为错误。

数据基线为 `score-document-v11` 与 `local-score-project-storage-v12`。storage v1–v11、document v1–v10 及 undo/redo 历史只读迁移为 `null`；读取旧项目不自动写回。

## 纵向行为

- 创建、更新、CAS、时钟保护、no-op、undo/redo、redo 清空、复制粘贴和序列化保留制音踏板字段。
- 当前版本严格拒绝缺失字段、未知值、大小写变体、空字符串和非字符串。
- 五线谱与固定 C 简谱读取同一 canonical 字段，提供中文可访问名称。
- Mobile 编辑仅在持久化成功后发布 canonical；保存失败保留旧谱面和当前草稿。
- playback 与 transport 不读取该字段，不发送 MIDI CC64，不改变 sustain、gate、velocity、duration、timbre、timeline、span、warning 或总时长。
- 保存编辑不得重建或中断正在运行的播放／节拍器 transport。

## 自动验收

- `test:local-score-project-damper-pedal`
- storage、旧版本迁移、容量、恢复候选、IndexedDB、playback、transport、staff/numbered preview 和 mobile behavior 回归
- Quality workflow 显式注册专项测试；`typecheck`、`lint`、`build` 和 `git diff --check` 通过

## 明确不做与证据边界

本切片不实现真实踏板播放、MIDI CC64、半踏板、换踏、柔音/中央踏板、MusicXML/MXL/MIDI round-trip、打印排版、云同步、协作或教师审核。

自动测试、CI、APK 构建和 Vercel 预览不等于 Android 真机、浏览器手测、真实播放、教师审核或正式发布证据；这些外部证据仍为 `NOT_EXECUTED`。
