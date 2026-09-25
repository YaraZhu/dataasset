'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, CategoryBadge, BackHome, EmptyState } from '@/components/ui';

interface Item {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  source_name?: string;
  source_url?: string;
  publish_time?: string;
  category?: string | null;
  status?: string;
  crawl_time?: string;
  original_title?: string;
}

const CATS = ['全部', '政府行动', '企业行动', '数商行动', '金融行动', '研学行动', '联盟行动', '未分类'];

export default function DatabasePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [cat, setCat] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (cat !== '全部') params.set('category', cat);
      if (keyword) params.set('keyword', keyword);
      const res = await fetch(`/api/news-items?${params}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.items || []);
        setTotal(json.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  return (
    <div>
      <BackHome />
      <PageHeader title="情报数据库" desc={`数据资产资讯归档库，可追溯、可核查，共 ${total} 条`} />

      {/* 筛选 */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                cat === c ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
          <div className="ml-auto">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="搜索标题..."
              className="w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* 列表 */}
      <Card className="p-5">
        <div className="text-sm font-medium text-slate-500 mb-4">归档资讯列表</div>
        {items.length === 0 ? (
          <EmptyState text={loading ? '加载中...' : '暂无归档资讯，请先采集'} />
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-lg border border-slate-100 p-4 hover:border-[#1e3a5f]/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-800 text-sm">{it.original_title || it.title}</div>
                  <CategoryBadge category={it.category} />
                </div>
                <div className="mt-2 text-xs text-slate-500 line-clamp-2">{it.summary || it.content}</div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="font-medium">{it.source_name}</span>
                  <span>采集于 {it.crawl_time ? new Date(it.crawl_time).toLocaleString('zh-CN') : '-'}</span>
                  {it.publish_time && <span>发布于 {new Date(it.publish_time).toLocaleDateString('zh-CN')}</span>}
                  <span className={`px-2 py-0.5 rounded text-[10px] ${it.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {it.status === 'pending' ? '待分类' : '已归档'}
                  </span>
                  {it.source_url && (
                    <a href={it.source_url} target="_blank" rel="noreferrer" className="text-[#1e3a5f] hover:underline font-medium">
                      查看原文 ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}