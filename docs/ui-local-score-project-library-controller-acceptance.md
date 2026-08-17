# 本机谱项目库 controller 验收

状态：**Active implementation acceptance**

最后核验：2026-08-17

规范来源：`docs/final-ui-refactor-compatibility-contract.md`

## 1. 动机

`mobile/src/LocalScoreProjectPanel.tsx` 此前直接持有本机项目列表、来源状态、读取状态和
删除确认，并直接编排首次读取、刷新、打开与删除。底层 storage use-cases 已经保护损坏
记录、不可用来源、并发 revision 和失败不删除等语义，但列表 latest-wins、组件卸载和
显式删除确认仍耦合在大型 JSX 中。

本切片新增框架无关项目库 controller 和薄 React hook。controller 只承接列表、刷新、
保存后置顶、打开和显式删除；hook 把既有 mobile storage use-cases 适配到中性 port。

## 2. 必须改变

- 面板不再直接调用 `listLocalScoreProjects`、`loadLocalScoreProject` 或
  `deleteLocalScoreProject`，也不再直接持有项目列表、来源状态和删除确认；
- controller snapshot 提供 projects、sourceStatus、pending delete id 和 library busy；
- 首次读取与手动刷新、连续打开均采用 latest-wins generation；旧成功或失败不能覆盖
  当前列表、打开结果、notice 或 busy；
- detach 后迟到的 list／open／delete 结果不能发布 snapshot、notice 或打开 callback；
- 保存、导入或编辑成功后的 upsert 继续把同 id 项目精确去重并置顶；
- 删除必须先对现有项目提出明确确认；取消不调用 storage，失败保留项目和确认供重试，
  成功只移除目标 id；
- 面板把既有非项目库 busy 与 controller busy 聚合，继续串行阻止所有 storage 修改；
- Android 静态门禁验证 controller、薄 hook、generation、显式确认与 UI 依赖方向。

## 3. 必须保留

- `mobile/src/runtime/localScoreProjectStorage.ts` 中 list／load／delete use-cases、IndexedDB
  adapter、错误分类、损坏记录保留、revision 冲突和全部中文通知保持唯一事实来源；
- 初始 loading、empty、partial、unavailable、not-found、打开成功和删除成功／失败文案；
- list 失败仍显示 unavailable 和空的可用列表，不把内存旧列表冒充当前存储事实；
- open 失败不改变 list sourceStatus；打开成功继续通过既有 `publishProject` 重置编辑器、
  使导出候选失效并把项目置顶；
- 返回列表继续先停用 autosave、清理编辑选择／复制状态、失效导出候选和停止播放，再刷新；
- 创建模板项目、MusicXML/MXL 导入确认、编辑 mutation、autosave/recovery、播放、schema、
  migration、容量限制、import/export controller 与 browser adapters 均不进入本 controller；
- 本机、离线、无上传、无账号同步、非评分和删除不可撤销边界。

## 4. 自动验收

- `test:mobile-local-score-project-behavior` focused controller tests 覆盖 list／open
  latest-wins、旧 rejection、当前读取失败、upsert 去重置顶、显式删除、失败重试、精确
  移除、三类迟到结果 detach guard 和 StrictMode replay；
- 既有面板行为继续覆盖创建／编辑／返回／重开闭环，以及删除取消、事务失败保留和恢复
  后重试；
- `test:local-score-project-storage`、`test:local-score-project-capacity` 与
  `test:local-score-project-indexeddb-recovery` 继续保护 storage、partial/corrupt、容量和
  revision 语义；
- `validate:android-local` 阻止 list／load／delete 编排或项目库 state 回流面板；
- `typecheck`、targeted lint、production build、documentation／repository／CI policy 与
  `git diff --check` 为合并门禁。

## 5. 未执行与不宣称

真实桌面浏览器、Android System WebView、已安装 APK、多个真实标签页、低存储、损坏
IndexedDB、屏幕阅读器和目标用户 QA 均保持 `NOT_EXECUTED`。本切片不改变数据、格式、
存储或迁移语义，也不表示模板创建、导入确认、编辑保存、autosave/recovery 或完整
score-project controller／最终 UI 重构已经完成。

QA level recommendation：**strict**。
