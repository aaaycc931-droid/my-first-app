import {
  LOCAL_CHINESE_FOUNDATION_COURSE,
  getLocalCourseLessonAvailability,
  type LocalCourseLessonV1,
  type LocalCourseProgressV1,
} from "../../lib/learning/localCoursePath";

export function LocalCoursePathPanel({
  progress,
  notice,
  onStartLesson,
  onResetProgress,
}: {
  progress: LocalCourseProgressV1;
  notice: string | null;
  onStartLesson: (lesson: LocalCourseLessonV1) => void;
  onResetProgress: () => void;
}) {
  const completedCount = progress.completedLessonIds.length;
  const lessons = LOCAL_CHINESE_FOUNDATION_COURSE.chapters.flatMap((chapter) => chapter.lessons);

  return <section className="grid gap-4" aria-labelledby="local-course-title">
    <div className="rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-white p-6 ring-1 ring-amber-200">
      <p className="text-sm font-bold text-amber-800">P118a · 安装包内中文课程</p>
      <h1 id="local-course-title" className="mt-2 text-3xl font-black text-amber-950">{LOCAL_CHINESE_FOUNDATION_COURSE.title}</h1>
      <p className="mt-3 text-sm leading-7 text-amber-950">{LOCAL_CHINESE_FOUNDATION_COURSE.summary}</p>
      <p className="mt-3 text-sm font-semibold text-amber-900">已完成 {completedCount} / {lessons.length} 课。这里只记录课节完成事实，不生成分数、等级或通过／失败。</p>
    </div>

    {notice ? <p className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950" role="status">{notice}</p> : null}

    {LOCAL_CHINESE_FOUNDATION_COURSE.chapters.map((chapter) => <section key={chapter.chapterId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby={`${chapter.chapterId}-title`}>
      <p className="text-xs font-bold text-slate-500">章节 {chapter.order + 1}</p>
      <h2 id={`${chapter.chapterId}-title`} className="mt-1 text-xl font-black text-slate-950">{chapter.title}</h2>
      <ol className="mt-4 grid gap-3">
        {chapter.lessons.map((lesson) => {
          const availability = getLocalCourseLessonAvailability(progress, lesson.lessonId);
          const statusLabel = availability === "completed" ? "已完成" : availability === "available" ? "当前可开始" : "尚未解锁";
          return <li key={lesson.lessonId} className={`rounded-2xl border p-4 ${availability === "available" ? "border-amber-300 bg-amber-50" : availability === "completed" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-500">第 {lesson.order + 1} 课 · {statusLabel}</p>
                <h3 className="mt-1 font-black text-slate-950">{lesson.title}</h3>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${availability === "completed" ? "bg-emerald-200 text-emerald-950" : availability === "available" ? "bg-amber-200 text-amber-950" : "bg-slate-200 text-slate-600"}`}>{statusLabel}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{lesson.summary}</p>
            <ul className="mt-2 grid gap-1 text-sm leading-6 text-slate-600">
              {lesson.objectives.map((objective) => <li key={objective.objectiveId}>• {objective.description}</li>)}
            </ul>
            <p className="mt-2 text-xs leading-5 text-slate-500">完成条件：从本课入口完成一次规定练习并主动查看结果；答对与否都不转换为课程评分。</p>
            {availability === "available" ? <button type="button" onClick={() => onStartLesson(lesson)} className="mt-3 min-h-11 rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white">开始本课</button> : null}
            {availability === "locked" ? <button type="button" disabled className="mt-3 min-h-11 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">请先完成上一课</button> : null}
          </li>;
        })}
      </ol>
    </section>)}

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-950">本机进度与隐私</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">只保存课程版本、已完成课节和必要修订号；不保存答案、录音、PCM、Blob、音高帧、分析曲线、账号或设备身份。卸载或清除应用数据后消失。</p>
      {completedCount > 0 ? <button type="button" onClick={onResetProgress} className="mt-3 min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800">重置课程进度</button> : null}
    </section>
  </section>;
}
