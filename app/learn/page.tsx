import Link from "next/link";
import { CourseLibrary } from "../../components/learn/CourseLibrary";

export default function LearnPage() { return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap gap-4 text-sm font-semibold text-indigo-700"><Link href="/home">← 返回学习首页</Link><Link href="/practice">进入练习 →</Link></div><div className="mt-6"><CourseLibrary /></div></div></main>; }
