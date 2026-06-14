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

## 新增真实样本后的更新流程

每次只接入一个已确认来源的真实 Audiveris 样本，并按以下流程更新指标：

1. 按
   [`docs/audiveris-real-sample-expansion-plan.md`](./audiveris-real-sample-expansion-plan.md)
   完成命名、脱敏、`source.md` 和 `expected.json`。
2. 检查 `scripts/collect-musicxml-fixture-metrics.mjs` 的 fixture 路径列表；该脚本当前
   使用显式列表，因此必须以最小改动加入新 `.musicxml` 路径。
3. 运行：

   ```bash
   npm run musicxml:metrics
   ```

4. 从同一次命令输出复制新样本的以下字段到本页表格：
   - `File size (bytes)`：原始字节数。
   - `File size (KB)`：脚本按 1024 bytes 换算的显示值。
   - `Notes`：当前 `parseMusicXML` 返回的 notes 数量。
   - `Parse duration (ms)`：本次单次解析耗时。
   - `Parse succeeded`：按脚本结果填写 `yes` 或 `no`。
5. 更新表格上方的采集日期；如果运行环境与当前开发环境明显不同，也应简要注明。
6. 按新的最大文件、样本类别和失败情况重新审阅“对 2 MB 限制的当前判断”，不能只追加
   表格而保留已经失效的结论。
7. 运行并记录完整验证：

   ```bash
   npm run musicxml:metrics
   npm run validate:musicxml
   npm run validate:musicxml-import-ui
   npm run build
   ```

解析耗时必须与同一行的大小和 notes 数量来自同一次 metrics 运行。不要手工推算 notes
数量或解析耗时，也不要为了得到成功指标而修改、生成或伪造真实样本。若解析失败，应保留
脚本失败结果并在接入记录中解释，不得虚填为成功。

## Production 证据边界

当前表格只有一份真实 Audiveris 导出样本。现有结果只能说明 2 MB 限制相对当前 fixtures
足够，不能证明该限制覆盖 medium、complex、multi-line、longer score 或其他真实导出，
也不能证明解析正确性、耗时、内存和并发表现满足 Production。

新增少量样本并通过验证仍不自动满足 Production 条件。必须持续扩展有代表性的真实样本，
结合 Production 策略中的其他安全、隐私、访问控制、回退和人工验收条件，再经过明确发布
评审；在此之前继续保持 Preview-only / dev-only。
