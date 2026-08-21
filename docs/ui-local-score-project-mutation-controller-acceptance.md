# 本机谱项目编辑持久化 controller 验收

状态：**Active implementation acceptance**

最后核验：2026-08-21

规范来源：`docs/final-ui-refactor-compatibility-contract.md`

## 1. 动机

`mobile/src/LocalScoreProjectPanel.tsx` 在项目库、MusicXML 导入和导出 controller 抽离后，
仍直接调用编辑保存 use-case，并在 JSX 文件内编排 proposal、busy、storage 结果、发布项目
与通知。底层 storage 已保护项目身份、连续 revision、容量和并发冲突，但组件卸载后的迟到
写入结果仍可能尝试发布界面状态，编辑保存边界也无法脱离大型面板独立验证。

本切片新增框架无关编辑持久化 controller 和薄 React hook。controller 只承接一次已保存
项目到 proposal 的串行持久化编排；hook 把既有 storage use-case 适配到中性 port。

## 2. 必须改变

- 面板不再直接调用 `persistLocalScoreProjectChange`，也不再直接持有编辑保存 busy；
- controller snapshot 提供 mutation busy，并与既有 panel/library busy 聚合；
- 同一时刻只允许一次编辑写入，重复操作不调用 domain proposal 或 storage；
- proposal 只有在既有 storage use-case 返回 `saved` 后才发布为当前项目；
- `unchanged` 保留当前发布项目，并继续显示既有无变化通知；
- invalid、conflict、capacity、unavailable、domain exception 与意外 port rejection 均失败关闭，
  不发布未确认 proposal；
- detach 后迟到成功或失败不得发布 snapshot、notice 或 saved callback；
- React StrictMode effect replay 不得提前永久 detach controller；
- Android 静态门禁验证 controller、薄 hook、串行、detach 与 UI 依赖方向。

## 3. 必须保留

- `mobile/src/runtime/localScoreProjectStorage.ts` 的 identity、revision、capacity、错误分类、
  原子 put 与全部中文 storage 通知继续是唯一事实来源；
- autosave dirty/saving/deferred/recovery gate 仍在调用编辑 mutation 前阻止写入；
- 保存成功、无变化、领域修改无效和 storage 失败的既有用户可见文案；
- 保存成功继续通过既有 `publishProject` 更新当前项目、选择、导出失效和项目库置顶；
- 模板创建、MusicXML/MXL 导入确认、autosave/recovery、项目列表/open/delete、播放、
  schema、migration、容量算法和 editor domain commands 不进入本 controller；
- 本机、离线、无上传、无账号同步、非评分与现有数据格式边界。

## 4. 自动验收

- `test:mobile-local-score-project-behavior` focused controller tests 覆盖保存成功、串行拒绝、
  unchanged、storage 拒绝、port rejection、domain exception、detach 后迟到结果和
  StrictMode replay；
- 既有面板行为继续覆盖创建、编辑、undo/redo、结构修改、保存失败、冲突与重开闭环；
- `test:local-score-project-storage`、capacity 与 IndexedDB recovery 继续保护持久层语义；
- `validate:android-local` 阻止编辑保存编排或 storage use-case 回流面板；
- typecheck、lint、production build、documentation/repository/CI policy 与
  `git diff --check` 为合并门禁。

## 5. 未执行与不宣称

真实桌面浏览器、Android System WebView、已安装 APK、多标签页并发、低存储、损坏
IndexedDB、屏幕阅读器和目标用户 QA 均为 `NOT_EXECUTED`。本切片不改变编辑、数据、格式、
存储或迁移语义，也不表示模板创建、导入确认、autosave/recovery、完整 score-project
controller 或最终 UI 重构已经完成。

QA level recommendation：**strict**。
