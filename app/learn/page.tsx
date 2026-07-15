import Link from "next/link";
import { CourseLibrary } from "../../components/learn/CourseLibrary";

export default function LearnPage() { return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/practice" className="text-sm font-semibold text-indigo-700">← 返回练习</Link><div className="mt-6"><CourseLibrary /></div></div></main>; }
