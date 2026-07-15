import Link from "next/link";

import { AccountPanel } from "../../components/account/AccountPanel";

export default function AccountPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/practice" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">← 返回练习</Link><div className="mt-6"><AccountPanel /></div><p className="mt-6 text-sm leading-6 text-slate-600">提示：正式云端服务启用后，你可以在这里管理登录、同步、导出和删除。现有本地练习仍可在不登录时使用。</p></div></main>;
}
