import { useState } from "react";
import { LocalEarTrainingIntervalPanel } from "../../components/practice/LocalEarTrainingIntervalPanel";
import { LocalEarTrainingRhythmPanel } from "../../components/practice/LocalEarTrainingRhythmPanel";
import { LocalEarTrainingSinglePitchPanel } from "../../components/practice/LocalEarTrainingSinglePitchPanel";
import type { ChoiceActivityCheckedEvent } from "../../components/practice/useChoiceActivitySession";
import { LOCAL_CHINESE_FOUNDATION_COURSE, LOCAL_COURSE_LESSONS, createEmptyLocalCourseProgress, isLessonComplete, isLessonUnlocked, recordLocalCourseLessonCheck, type LocalCourseLesson, type LocalCourseProgress } from "../../lib/learning/localCoursePath";
import { clearMobileCourseProgress, loadMobileCourseProgress, saveMobileCourseProgress } from "./runtime/mobileCourseProgressStorage";

const browserStorage = () => { try { return window.localStorage; } catch { return null; } };

export function LocalCoursePathPanel() {
  const loaded = useState(() => loadMobileCourseProgress(browserStorage()))[0];
  const [progress, setProgress] = useState<LocalCourseProgress>(loaded.progress);
  const [notice, setNotice] = useState<string | null>(loaded.notice);
  const [sourceStatus, setSourceStatus] = useState(loaded.sourceStatus);
  const [activeLesson, setActiveLesson] = useState<LocalCourseLesson | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const complete = (event: ChoiceActivityCheckedEvent) => {
    if (!activeLesson) return;
    try { const next = recordLocalCourseLessonCheck(progress, activeLesson, event); const saved = saveMobileCourseProgress(browserStorage(), next); if (saved.notice) { setNotice(saved.notice); return; } setProgress(next); setSourceStatus("available"); setNotice("已记录：你完成了本课节的核对。结果不是分数、等级或通过判断。"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "课程状态已变化，请重新进入课节。"); }
  };
  const resetProgress = () => {
    const result = clearMobileCourseProgress(browserStorage());
    setConfirmReset(false);
    if (result.notice) {
      setNotice(result.notice);
      return;
    }
    setProgress(createEmptyLocalCourseProgress());
    setSourceStatus("available");
    setNotice("课程进度已重置。");
  };
  if (activeLesson) {
    const target = activeLesson.target;
    return <section className="grid gap-4" aria-label={`课程课节：${activeLesson.title}`}>
      <button type="button" onClick={() => setActiveLesson(null)} className="min-h-11 w-fit rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">返回课程路径</button>
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-sm font-semibold text-indigo-700">当前课节</p><h2 className="mt-1 text-xl font-black">{activeLesson.title}</h2><p className="mt-2 text-sm leading-6">{activeLesson.objective}</p><p className="mt-2 text-xs leading-5">选择答案并查看说明后记为已练习；答案一致或不同都可完成，不产生分数、等级或通过/失败。</p>{notice ? <p className="mt-3 rounded-xl bg-white p-3 text-sm" role="status">{notice}</p> : null}</div>
      {target.kind === "single-pitch" ? <LocalEarTrainingSinglePitchPanel initialReviewTarget={target} onActivityChecked={complete} /> : null}
      {target.kind === "interval" ? <LocalEarTrainingIntervalPanel initialReviewTarget={target} onActivityChecked={complete} /> : null}
      {target.kind === "rhythm" ? <LocalEarTrainingRhythmPanel initialReviewTarget={target} onActivityChecked={complete} /> : null}
    </section>;
  }
  if (sourceStatus === "unavailable") {
    return <section className="grid gap-4" aria-label="中文课程路径">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-violet-800 p-6 text-white">
        <p className="text-sm font-semibold text-indigo-100">本地课程 · 内容版本 {LOCAL_CHINESE_FOUNDATION_COURSE.contentVersion}</p>
        <h1 className="mt-2 text-2xl font-black">{LOCAL_CHINESE_FOUNDATION_COURSE.title}</h1>
        <p className="mt-3 text-sm leading-6 text-indigo-100">{LOCAL_CHINESE_FOUNDATION_COURSE.objective}</p>
        <p className="mt-3 font-bold">本机课程进度不可用，未生成课节摘要。</p>
      </div>
      {notice ? <p className="rounded-xl bg-amber-50 p-3 text-sm" role="status">{notice}</p> : null}
      <div>
        <button type="button" onClick={() => setConfirmReset(true)} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800">重置课程进度</button>
        {confirmReset ? <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alert"><p className="font-bold">确认清除无法读取的本机课程进度并从空进度开始？</p><div className="mt-3 flex gap-2"><button type="button" onClick={resetProgress} className="min-h-11 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">确认重置</button><button type="button" onClick={() => setConfirmReset(false)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">取消</button></div></div> : null}
      </div>
    </section>;
  }
  const done = LOCAL_COURSE_LESSONS.filter((item) => isLessonComplete(progress, item)).length;
  return <section className="grid gap-4" aria-label="中文课程路径">
    <div className="rounded-3xl bg-gradient-to-br from-indigo-950 to-violet-800 p-6 text-white"><p className="text-sm font-semibold text-indigo-100">本地课程 · 内容版本 {LOCAL_CHINESE_FOUNDATION_COURSE.contentVersion}</p><h1 className="mt-2 text-2xl font-black">{LOCAL_CHINESE_FOUNDATION_COURSE.title}</h1><p className="mt-3 text-sm leading-6 text-indigo-100">{LOCAL_CHINESE_FOUNDATION_COURSE.objective}</p><p className="mt-3 font-bold">已练习并核对 {done}/{LOCAL_COURSE_LESSONS.length} 课节</p></div>
    {LOCAL_CHINESE_FOUNDATION_COURSE.chapters.map((chapter) => <section key={chapter.id} className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-black">{chapter.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{chapter.objective}</p><ol className="mt-4 grid gap-3">{chapter.lessons.map((item, index) => { const completed = isLessonComplete(progress, item); const unlocked = isLessonUnlocked(progress, item); return <li key={item.id} className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold text-indigo-700">课节 {index + 1} · {completed ? "已核对" : unlocked ? "可开始" : "未解锁"}</p><h3 className="mt-1 font-black">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{item.objective}</p><button type="button" disabled={!unlocked} onClick={() => { setNotice(null); setActiveLesson(item); }} className="mt-3 min-h-11 rounded-xl bg-indigo-800 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300">{completed ? "再次练习" : unlocked ? "开始课节" : "完成上一课节后解锁"}</button></li>; })}</ol></section>)}
    {notice ? <p className="rounded-xl bg-amber-50 p-3 text-sm" role="status">{notice}</p> : null}
    <div><button type="button" onClick={() => setConfirmReset(true)} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800">重置课程进度</button>{confirmReset ? <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alert"><p className="font-bold">确认清除本机课程进度？</p><div className="mt-3 flex gap-2"><button type="button" onClick={resetProgress} className="min-h-11 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">确认重置</button><button type="button" onClick={() => setConfirmReset(false)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">取消</button></div></div> : null}</div>
    <p className="text-sm leading-6 text-slate-500">进度只保存在本机，仅包含课程/课节标识、内容版本和完成事实；不保存答案、正确性、录音、PCM、音高帧或 ActivitySession，不上传，也不生成能力评级。</p>
  </section>;
}
