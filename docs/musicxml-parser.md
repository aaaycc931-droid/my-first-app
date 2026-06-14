# MusicXML Parser（MVP）

`parseMusicXML` 将最小的 `<score-partwise>` MusicXML 字符串转换为应用当前使用的
`ParsedScore`。它的目标是先提供稳定、可运行的 MusicXML 导入边界，而不是覆盖完整的
MusicXML 标准。

## 当前支持

- 从 `<measure number="...">` 读取小节号；缺少 `number` 时按出现顺序编号。
- 从 `<pitch>` 的 `<step>`、可选 `<alter>` 和 `<octave>` 生成音名。
  - `alter=1` 转为升号（例如 `F#4`）。
  - `alter=-1` 转为降号（例如 `Bb3`）。
- 同时输出相同值的 `pitch` 和兼容 UI / 播放逻辑的 `note`。
- 优先从 `<type>` 读取 `whole`、`half`、`quarter` 或 `eighth`。
- 缺少 `<type>` 时，根据 `<duration>` / `<divisions>` 粗略推断时值。
- 按小节累计每个音符的 `beat`。
- 跳过 `<rest/>`，但休止符仍会推进拍点。
- 为每个音符设置默认 `confidence: 0.8` 和 `source: "musicxml"`。
- 空输入、没有音符的输入或缺少 pitch 的单个音符会被安全跳过。

## 示例

样例文件位于 `lib/musicxml/__fixtures__/simple-score.musicxml`。它会转换为：

```ts
[
  { pitch: "C4", note: "C4", duration: "quarter", measure: 1, beat: 1, confidence: 0.8, source: "musicxml" },
  { pitch: "D4", note: "D4", duration: "quarter", measure: 1, beat: 2, confidence: 0.8, source: "musicxml" },
  { pitch: "E4", note: "E4", duration: "half", measure: 1, beat: 3, confidence: 0.8, source: "musicxml" },
  { pitch: "F#4", note: "F#4", duration: "quarter", measure: 2, beat: 1, confidence: 0.8, source: "musicxml" },
  { pitch: "G4", note: "G4", duration: "half", measure: 2, beat: 3, confidence: 0.8, source: "musicxml" },
]
```

第二小节的 quarter rest 不会出现在数组中，但会使 G4 从 beat 3 开始。

## 当前不支持

- 复杂和弦
- 多声部
- tie
- 附点
- 多个 staff
- 复杂拍号

这是 MVP parser。后续接入 Audiveris 后，可以基于真实输出样本逐步增强结构校验、和弦、
多声部和更完整的 MusicXML 时值处理。
