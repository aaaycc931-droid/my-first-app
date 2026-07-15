"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "../../lib/platform/supabaseBrowser";

type Course = { id: string; title: string; description: string };
type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
};
type Exercise = {
  id: string;
  lesson_id: string;
  kind: string;
  title: string;
  instructions: string;
};

export function CourseLibrary() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    void Promise.all([
      client
        .from("courses")
        .select("id, title, description")
        .eq("is_published", true),
      client
        .from("lessons")
        .select("id, course_id, title, description, position")
        .eq("is_published", true)
        .order("position"),
      client
        .from("exercises")
        .select("id, lesson_id, kind, title, instructions")
        .eq("is_published", true),
    ]).then(([courseResult, lessonResult, exerciseResult]) => {
      setIsLoading(false);
      if (courseResult.error || lessonResult.error || exerciseResult.error) {
        setError("课程库暂时无法加载，请稍后重试。");
        return;
      }
      setCourses((courseResult.data ?? []) as Course[]);
      setLessons((lessonResult.data ?? []) as Lesson[]);
      setExercises((exerciseResult.data ?? []) as Exercise[]);
    });
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-2xl font-bold text-amber-950">课程库正在连接</h1>
        <p className="mt-3 leading-7 text-amber-950">
          正式课程库已具备数据模型与首批课程迁移。部署完成账户服务配置后，这里会显示可进入的系统课程；当前不会伪造已加载的云端课程。
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
        正在读取系统课程…
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        {error}
      </section>
    );
  }

  if (courses.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
        暂时没有已发布的系统课程。
      </section>
    );
  }

  return (
    <section>
      <p className="text-sm font-semibold text-indigo-700">系统课程</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">从基础能力开始练习</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        课程练习可以直接开始；登录后查看答案时会保存一条仅本人可见的练习记录。记录用于后续复练，不是正式分数或等级。
      </p>
      <div className="mt-6 grid gap-4">
        {courses.map((course) => (
          <article
            key={course.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-slate-950">{course.title}</h2>
            <p className="mt-2 text-slate-700">{course.description}</p>
            <ol className="mt-5 space-y-3">
              {lessons
                .filter((lesson) => lesson.course_id === course.id)
                .map((lesson) => {
                  const lessonExercises = exercises.filter(
                    (exercise) => exercise.lesson_id === lesson.id,
                  );
                  return (
                    <li key={lesson.id} className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">
                        第 {lesson.position} 课：{lesson.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {lesson.description}
                      </p>
                      {lessonExercises.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {lessonExercises.map((exercise) => (
                            <div
                              key={exercise.id}
                              className="rounded-xl border border-indigo-100 bg-white p-4"
                            >
                              <p className="font-semibold text-slate-900">{exercise.title}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {exercise.instructions}
                              </p>
                              {exercise.kind === "single_pitch" ? (
                                <Link
                                  href={`/practice?feature=ear-training&mode=single-pitch&exercise=${encodeURIComponent(exercise.id)}`}
                                  className="mt-3 inline-flex rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
                                >
                                  开始单音听辨
                                </Link>
                              ) : (
                                <p className="mt-3 text-sm text-slate-500">该练习入口正在准备中。</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">本课练习内容正在准备中。</p>
                      )}
                    </li>
                  );
                })}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
