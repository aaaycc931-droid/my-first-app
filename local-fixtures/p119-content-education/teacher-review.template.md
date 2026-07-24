# P119 单教师独立审核表（私有填写模板）

> 每位教师使用独立副本。在两位教师都提交前，不得向任一方展示另一方的逐题结论。填写版不得提交 Git、上传聊天、进入 CI artifact 或打包进 APK。

## 批次与审核者

- manifest SHA-256：
- 已批准 batch 引用：
- 匿名 reviewer token：
- 身份／资质私有记录引用：
- 独立完成：是 / 否
- 审核开始时间：
- 审核完成时间：

## 逐题记录

每个 item 必须对六个维度分别记录 `PASS` 或 `FINDING`，不能只给总评。

| item ID | target-truth | answer-rule | terminology-solfege | difficulty-progression | explanation | misconception-risk | finding ID / 备注 |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

## 完整性检查

- [ ] reviewed item ID 与已批准 sample item ID 精确一致
- [ ] 无重复 item ID
- [ ] 无缺失 item ID
- [ ] 六个维度全部填写
- [ ] 每个 `FINDING` 都有唯一 finding ID
- [ ] 没有把自动测试或 `source.reviewState` 当成教师结论

## 汇总

- reviewed item 数：
- open finding 数：
- closed finding 数：
- 建议扩样的 kind × difficulty 层：
- 是否建议修改样本计划：是 / 否
- 私有签署证据引用：

只要 open finding 数大于 0，本教师记录和整个批次都不得标记为通过。
