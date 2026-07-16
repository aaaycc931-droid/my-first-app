export type LearningMode = "hobby" | "exam";
export type PracticeModuleAvailability = "available" | "planned";

export type PracticeModuleDefinition = {
  id: string;
  title: string;
  description: string;
  href: string;
  availability: PracticeModuleAvailability;
  modeTags: LearningMode[];
};

export type PracticeModulePreferences = {
  version: 1;
  mode: LearningMode;
  visibleModuleIds: string[];
};

export const practiceModulePreferenceStorageKey =
  "sight-singing-learning-home:v1";

export const practiceModules: PracticeModuleDefinition[] = [
  { id: "courses", title: "系统课程", description: "按基础课程逐步学习，并在登录后保存私人练习记录。", href: "/learn", availability: "available", modeTags: ["hobby", "exam"] },
  { id: "single-pitch", title: "单音听辨", description: "听一个音并辨认音名，适合建立稳定的音高记忆。", href: "/practice?feature=ear-training&mode=single-pitch", availability: "available", modeTags: ["hobby", "exam"] },
  { id: "interval", title: "音程听辨", description: "练习上行与下行音程，理解两个音之间的距离。", href: "/practice?feature=ear-training&mode=interval", availability: "available", modeTags: ["hobby", "exam"] },
  { id: "ear-rhythm", title: "节奏听辨", description: "听辨四拍节奏形状，建立节拍与疏密感。", href: "/practice?feature=ear-training&mode=rhythm", availability: "available", modeTags: ["hobby", "exam"] },
  { id: "melody-dictation", title: "旋律听写", description: "听短旋律并按顺序填写音名，训练工作记忆。", href: "/practice?feature=ear-training&mode=melody", availability: "available", modeTags: ["hobby", "exam"] },
  { id: "sight-singing", title: "视唱与录音反馈", description: "使用本地旋律目标、录音和可解释音高提示进行跟练。", href: "/practice?feature=local-melody", availability: "available", modeTags: ["exam"] },
  { id: "rhythm", title: "节拍与节奏", description: "使用节拍器、点击练习和延迟校准观察节奏稳定性。", href: "/practice?feature=rhythm", availability: "available", modeTags: ["exam"] },
  { id: "sheet-music", title: "乐谱草稿练习", description: "导入本地乐谱参考，检查草稿后创建临时练习目标。", href: "/practice?feature=sheet-music", availability: "available", modeTags: ["exam"] },
  { id: "piano-midi", title: "钢琴与 MIDI", description: "屏幕钢琴、参考音和 MIDI 输入练习辅助。", href: "#planned-piano-midi", availability: "planned", modeTags: ["hobby", "exam"] },
  { id: "sound-packs", title: "练习音色", description: "在练习中选择钢琴、纯音等参考音色。", href: "#planned-sound-packs", availability: "planned", modeTags: ["hobby", "exam"] },
  { id: "recognition-lab", title: "识谱实验室", description: "开发阶段的图片识谱、MusicXML 和 Audiveris 边界验证入口。", href: "/recognize", availability: "available", modeTags: ["exam"] },
];

const defaultModuleIds: Record<LearningMode, string[]> = {
  hobby: ["courses", "single-pitch", "interval", "ear-rhythm", "melody-dictation"],
  exam: ["courses", "sight-singing", "rhythm", "sheet-music", "interval", "melody-dictation"],
};

export const createDefaultModulePreferences = (
  mode: LearningMode,
): PracticeModulePreferences => ({
  version: 1,
  mode,
  visibleModuleIds: [...defaultModuleIds[mode]],
});

export const reconcileModulePreferences = (
  value: unknown,
  fallbackMode: LearningMode = "hobby",
): PracticeModulePreferences => {
  if (!value || typeof value !== "object") {
    return createDefaultModulePreferences(fallbackMode);
  }
  const candidate = value as Partial<PracticeModulePreferences>;
  const mode = candidate.mode === "exam" ? "exam" : "hobby";
  const knownIds = new Set(practiceModules.map((module) => module.id));
  const visibleModuleIds = Array.isArray(candidate.visibleModuleIds)
    ? candidate.visibleModuleIds.filter(
        (id, index, ids): id is string =>
          typeof id === "string" && knownIds.has(id) && ids.indexOf(id) === index,
      )
    : [];
  return {
    version: 1,
    mode,
    visibleModuleIds: Array.isArray(candidate.visibleModuleIds)
      ? visibleModuleIds
      : createDefaultModulePreferences(mode).visibleModuleIds,
  };
};

export const moveVisibleModule = (
  preferences: PracticeModulePreferences,
  moduleId: string,
  direction: -1 | 1,
): PracticeModulePreferences => {
  const currentIndex = preferences.visibleModuleIds.indexOf(moduleId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= preferences.visibleModuleIds.length) {
    return preferences;
  }
  const visibleModuleIds = [...preferences.visibleModuleIds];
  [visibleModuleIds[currentIndex], visibleModuleIds[nextIndex]] = [
    visibleModuleIds[nextIndex],
    visibleModuleIds[currentIndex],
  ];
  return { ...preferences, visibleModuleIds };
};

export const toggleVisibleModule = (
  preferences: PracticeModulePreferences,
  moduleId: string,
): PracticeModulePreferences => {
  if (!practiceModules.some((module) => module.id === moduleId)) return preferences;
  const isVisible = preferences.visibleModuleIds.includes(moduleId);
  return {
    ...preferences,
    visibleModuleIds: isVisible
      ? preferences.visibleModuleIds.filter((id) => id !== moduleId)
      : [...preferences.visibleModuleIds, moduleId],
  };
};
