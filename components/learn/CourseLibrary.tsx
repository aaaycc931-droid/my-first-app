"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "../../lib/platform/supabaseBrowser";

type Course = { id: string; title: string; description: string };
type Lesson = { id: string; course_id: string; title: string; description: string; position: number };

export function CourseLibrary() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    void Promise.all([client.from("courses").select("id, title, description").eq("is_published", true), client.from("lessons").select("id, course_id, title, description, position").eq("is_published", true).order("position")]).then(([courseResult, lessonResult]) => {
      if (courseResult.error || lessonResult.error) { setError("课程库暂时无法加载，请稍后重试。"); return; }
      setCourses((courseResult.data ?? []) as Course[]);
      setLessons((lessonResult.data ?? []) as Lesson[]);
    });
  }, []);

  if (!isSupabaseConfigured) return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-2xl font-bold text-amber-950">课程库正在连接</h1><p className="mt-3 leading-7 text-amber-950">正式课程库已具备数据模型与首批课程迁移。部署完成账户服务配置后，这里会显示可进入的系统课程；当前不会伪造已加载的云端课程。</p></section>;
  if (error) return <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">{error}</section>;
  return <section><p className="text-sm font-semibold text-indigo-700">系统课程</p><h1 className="mt-2 text-3xl font-bold text-slate-950">从基础能力开始练习</h1><div className="mt-6 grid gap-4">{courses.map((course) => <article key={course.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">{course.title}</h2><p className="mt-2 text-slate-700">{course.description}</p><ol className="mt-5 space-y-3">{lessons.filter((lesson) => lesson.course_id === course.id).map((lesson) => <li key={lesson.id} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">第 {lesson.position} 课：{lesson.title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{lesson.description}</p></li>)}</ol></article>)}</div></section>;
}
