# S1 本机谱项目持久化速度与版本迁移验收

## 完成范围

- 新建项目使用已保存的 90 BPM；允许保存 30–240 之间的整数 BPM。
- 播放器只消费项目最后成功保存的 BPM，不使用未保存输入。
- 保存速度产生连续 document revision，但不加入谱面内容撤销／重做栈。
- 项目 envelope 从 `local-score-project-storage-v1` 升为 v2；`score-document-v1` 与 IndexedDB object store 结构不变。
- 读取旧 v1 时只在内存确定性补齐 90 BPM，不自动回写、不改变项目身份、时间、revision 或历史。
- 用户明确保存下一次修改时，使用现有预期 revision 与原子事务写为 v2。
- 迁移写遇容量、quota、普通写入失败或事务中止时保留原始 v1；恢复条件后可重试。
- 损坏的已知版本记录标记为损坏并原样保留；未知未来版本标记为不支持并原样保留。

## 自动验收

- 新建默认值、30/240 边界、越界、NaN 与小数。
- 同值不增 revision；修改成功只更新速度与 revision，不改变谱面撤销／重做内容。
- v1 读取、列表、深复制与 v2 round-trip；读取不自动写回。
- 显式保存后原子升级为 v2；stale writer、容量和事务失败继续 fail closed。
- UI 保存失败时播放器保持旧 BPM，输入草稿可恢复后重试；重新打开恢复已保存 BPM。
- 所有既有 `test:*` 命令继续在 Quality workflow 中恰好执行一次。

## 不在本切片

- 节拍器、预备拍、tempo map、渐快／渐慢和播放相位同步。
- ScoreDocument 全局 schema 升级或 IndexedDB 数据库结构迁移。
- 批量自动回写、云同步、账号、导入导出或 P119d 状态变更。

## 人工 QA 状态

| 验证面 | 状态 |
| --- | --- |
| 桌面浏览器 QA | `NOT_EXECUTED` |
| Android WebView QA | `NOT_EXECUTED` |
| Android 真机 QA | `NOT_EXECUTED` |

QA level recommendation：`strict`。本切片改变项目持久化 schema、播放速度来源和失败恢复语义。

P119d 两份独立逐题六维审核与教育有效性仍为 `NOT_EXECUTED`，正式评估门禁仍为 `BLOCKED`。
