import Link from "next/link";

import { AccountPanel } from "../../components/account/AccountPanel";

export default function AccountPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap gap-4 text-sm font-semibold text-indigo-700"><Link href="/home">← 返回学习首页</Link><Link href="/practice">进入练习</Link><Link href="/learn">查看系统课程 →</Link></div><div className="mt-6"><AccountPanel /></div><p className="mt-6 text-sm leading-6 text-slate-600">提示：正式云端服务启用后，你可以在这里管理登录、同步、导出和删除。现有本地练习仍可在不登录时使用。</p></div></main>;
}
