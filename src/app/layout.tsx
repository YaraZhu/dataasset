import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '数据资产动态周讯 · 智能系统',
    template: '%s | 数据资产动态周讯',
  },
  description:
    '数据资产动态周讯智能系统：纯代码自动化的数据资产资讯采集、六维分类、归档入库与周讯文稿生成平台。',
};

const NAV = [
  { href: '/', label: '总览', icon: '▦' },
  { href: '/collect', label: '信息采集', icon: '⇣' },
  { href: '/database', label: '情报数据库', icon: '▤' },
  { href: '/generate', label: '周讯生成', icon: '✎' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-slate-50 text-slate-800 min-h-screen">
        <div className="flex min-h-screen">
          {/* 侧边导航 */}
          <aside className="hidden md:flex w-56 flex-col bg-[#1e3a5f] text-white">
            <div className="px-5 py-6">
              <div className="text-lg font-bold leading-snug">数据资产动态周讯</div>
              <div className="text-xs text-blue-200/70 mt-1">智能采集 · 分类 · 归档 · 生成</div>
            </div>
            <nav className="flex-1 px-3 space-y-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-white/10 transition"
                >
                  <span className="w-5 text-center">{n.icon}</span>
                  <span>{n.label}</span>
                </Link>
              ))}
            </nav>
            <div className="px-5 py-4 text-xs text-blue-200/50">
              纯代码自动化 · 流程可视化
            </div>
          </aside>

          {/* 主内容 */}
          <div className="flex-1 flex flex-col">
            {/* 移动端顶部导航 */}
            <header className="md:hidden sticky top-0 z-20 bg-[#1e3a5f] text-white px-4 py-3 flex items-center gap-4 overflow-x-auto">
              <span className="font-bold whitespace-nowrap">数据资产周讯</span>
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-sm whitespace-nowrap hover:text-blue-200">
                  {n.label}
                </Link>
              ))}
            </header>
            <main className="flex-1 p-4 md:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}