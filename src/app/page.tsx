'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CategoryBadge, WorkflowSteps, PageHeader, EmptyState, StatCard } from '@/components/ui';

interface Item {
  id: string;
  title: string;
  category?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  publish_time?: string | null;
  status?: string;
}

interface Newsletter {
  id: string;
  issue_number: number;
  issue_title: string;
  status?: string;
  generated_at?: string;
}

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [itemRes, nlRes] = await Promise.all([
          fetch('/api/news-items?limit=200'),
          fetch('/api/newsletters'),
        ]);
        const itemsJson = await itemRes.json();
        const nlJson = await nlRes.json();
        if (itemsJson.success) {
          setItems(itemsJson.items || []);
          setTotal(itemsJson.total || 0);
        }
        if (nlJson.success) setNewsletters(nlJson.newsletters || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 六维统计
  const cats = ['政府行动', '企业行动', '数商行动', '金融行动', '研学行动', '联盟行动'];
  const catCount: Record<string, number> = {};
  for (const c of cats) catCount[c] = 0;
  for (const it of items) {
    if (it.category && catCount[it.category] !== undefined) catCount[it.category]++;
  }
  const withCategory = items.filter((it) => it.category).length;
  const adopted = items.filter((it) => it.status === 'adopted').length;
  const latestIssue = newsletters.length ? newsletters[0].issue_number : 0;
  const sourceCount = new Set(items.map((i) => i.source_name)).size;

  return (
    <div>
      <PageHeader
        title="数据资产动态周讯 · 智能系统"
        desc="纯代码自动化的信息采集 → 六维分类 → 归档入库 → 周讯文稿生成，流程全程可视化"
      />

      {/* 流程可视化 */}
      <Card className="p-5 mb-6">
        <div className="text-sm font-medium text-slate-500 mb-4">自动化工作流</div>
        <WorkflowSteps current={latestIssue > 0 ? 3 : 2} />
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <Link href="/collect" className="px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white hover:bg-[#2a4a74]">
            ① 去采集资讯
          </Link>
          <Link href="/database" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">
            ② 查看情报库
          </Link>
          <Link href="/generate" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">
            ③ 生成周讯文稿
          </Link>
        </div>
      </Card>

      {/* 统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="已入库资讯" value={total} hint={`${sourceCount} 个信息源`} />
        <StatCard label="已分类条目" value={withCategory} hint="六维分类完成" />
        <StatCard label="已生成期刊" value={newsletters.length} hint={`最新第 ${latestIssue} 期`} />
        <StatCard label="待处理" value={items.filter((i) => i.status === 'pending').length} hint="需人工确认" />
      </div>

      {/* 六维分布 + 最新资讯 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 六维分布 */}
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500 mb-4">六维度分类分布</div>
          {withCategory === 0 ? (
            <EmptyState text="暂无分类数据，先采集资讯" />
          ) : (
            <div className="space-y-3">
              {cats.map((c) => {
                const n = catCount[c] || 0;
                const pct = withCategory ? Math.round((n / withCategory) * 100) : 0;
                return (
                  <div key={c}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{c}</span>
                      <span className="text-slate-400">{n} 条</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: '#1e3a5f' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 最新资讯 */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-500">最新采集资讯</span>
            <Link href="/database" className="text-xs text-[#1e3a5f] hover:underline">
              查看全部 →
            </Link>
          </div>
          {items.length === 0 ? (
            <EmptyState text="暂无资讯，点击上方「去采集资讯」" />
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {items.slice(0, 12).map((it) => (
                <div key={it.id} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#1e3a5f]" />
                  <div className="min-w-0">
                    <div className="truncate text-slate-700">{it.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryBadge category={it.category} />
                      <span className="text-xs text-slate-400">{it.source_name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 期刊列表 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">历史周讯期刊</span>
          <Link href="/generate" className="text-xs text-[#1e3a5f] hover:underline">
            生成新一期 →
          </Link>
        </div>
        {newsletters.length === 0 ? (
          <EmptyState text="暂无期刊，生成第一期周讯" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {newsletters.slice(0, 6).map((nl) => (
              <div key={nl.id} className="rounded-lg border border-slate-100 p-4 hover:border-[#1e3a5f]/30 transition">
                <div className="font-medium text-slate-800 text-sm">{nl.issue_title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  第{nl.issue_number}期 · {nl.generated_at ? new Date(nl.generated_at).toLocaleDateString('zh-CN') : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {loading && (
        <div className="fixed bottom-6 right-6 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          数据加载中...
        </div>
      )}
    </div>
  );
}