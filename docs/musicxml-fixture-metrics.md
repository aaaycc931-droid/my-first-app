# MusicXML fixture metrics（Phase A24）

## 用途与范围

本页记录仓库现有 MusicXML fixtures 的轻量开发/评估指标，用于了解样本大小、当前 MVP
解析器输出的 notes 数量和单次解析耗时。这些数据不是性能基准测试，也不是对 Production
吞吐量、延迟或资源使用的承诺。

指标通过以下命令采集：

```bash
npm run musicxml:metrics
```

该脚本复用现有 `parseMusicXML`，不复制解析逻辑。下表为 2026-06-14 在当前开发环境中的
一次运行结果：

| Fixture path | File size (bytes) | File size (KB) | Notes | Parse duration (ms) | Parse succeeded |
| --- | ---: | ---: | ---: | ---: | :---: |
| `lib/musicxml/__fixtures__/simple-score.musicxml` | 1,295 | 1.26 | 5 | 3.046 | yes |
| `lib/musicxml/__fixtures__/omr-like-score.musicxml` | 3,288 | 3.21 | 7 | 0.246 | yes |
| `lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.musicxml` | 92,766 | 90.59 | 226 | 7.737 | yes |

`audiveris-basic-01.musicxml` 是由真实 Audiveris 工具导出的样本，不是为解析器手写的最小
MusicXML fixture。

## 对 2 MB 限制的当前判断

当前最大 fixture 约为 90.59 KB，明显低于 2 MB（2,097,152 bytes）上传限制；因此 2 MB
对于仓库现有三份 fixtures 是足够的。不过样本数量和复杂度仍然有限，尤其只有一份真实
Audiveris 样本，不能据此认定 2 MB 对未来所有真实乐谱都足够。Production 前仍需持续用
更多有代表性的真实样本验证文件大小分布和解析表现。

## 结果解释与更新方式

- 解析耗时会随机器、Node.js 版本、系统负载和 CI 环境变化，不应视为稳定性能承诺。
- 单次运行的毫秒数只适合作为轻量观察值，不适合用于严格的性能回归阈值。
- 如果未来新增真实样本，应重新运行 `npm run musicxml:metrics`，并用新的命令输出更新
  本文档表格和对 2 MB 限制的判断。
