'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, CategoryBadge, PrimaryButton, WorkflowSteps, BackHome, EmptyState } from '@/components/ui';

interface Item {
  title: string;
  summary?: string;
  source_name?: string;
  source_url?: string;
  publish_time?: string;
  category?: string | null;
}

interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  category?: string | null;
  enabled: boolean;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

const CATEGORY_OPTIONS = ['政府行动', '企业行动', '数商行动', '金融行动', '研学行动', '联盟行动'];
const TYPE_OPTIONS = ['html', 'rss', 'json'];

export default function CollectPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useSample, setUseSample] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [result, setResult] = useState<{ inserted?: number; total?: number; error?: string } | null>(null);
  const [step, setStep] = useState(0);
  const [effectiveSourceCount, setEffectiveSourceCount] = useState<number | undefined>(undefined);

  // ===== 信息源管理状态 =====
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [srcError, setSrcError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newSrc, setNewSrc] = useState({ name: '', url: '', type: 'html', category: '', note: '' });

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch('/api/sources');
      const json = await res.json();
      if (json.success) {
        setSources(json.sources || []);
        setSrcError('');
      } else {
        setSrcError(json.error || '加载信息源失败');
      }
    } catch {
      setSrcError('加载信息源失败');
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  async function runCrawl() {
    setLoading(true);
    setStep(0);
    try {
      setStep(1);
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: startDate || undefined, endDate: endDate || undefined, useSample }),
      });
      const json = await res.json();
      if (!json.success) {
        setResult({ error: json.error || '采集失败' });
      } else {
        setItems(json.items || []);
        setResult({ inserted: json.inserted, total: json.total });
        setEffectiveSourceCount(json.effectiveSourceCount);
        setStep(3);
      }
    } catch {
      setResult({ error: '请求失败，请重试' });
    } finally {
      setLoading(false);
    }
  }

  async function addSource() {
    if (!newSrc.name.trim() || !newSrc.url.trim()) {
      setSrcError('名称和网址为必填项');
      return;
    }
    setAdding(true);
    setSrcError('');
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSrc.name.trim(),
          url: newSrc.url.trim(),
          type: newSrc.type,
          category: newSrc.category || null,
          note: newSrc.note.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setSrcError(json.error || '新增失败');
      } else {
        setNewSrc({ name: '', url: '', type: 'html', category: '', note: '' });
        setShowAdd(false);
        await loadSources();
      }
    } catch {
      setSrcError('新增失败，请重试');
    } finally {
      setAdding(false);
    }
  }

  async function toggleSource(s: Source) {
    setSrcError('');
    try {
      await fetch(`/api/sources?id=${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !s.enabled }),
      });
      await loadSources();
    } catch {
      setSrcError('操作失败，请重试');
    }
  }

  async function removeSource(s: Source) {
    if (!window.confirm(`确认删除信息源「${s.name}」？此操作不可恢复。`)) return;
    setSrcError('');
    try {
      const res = await fetch(`/api/sources?id=${s.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        setSrcError(json.error || '删除失败');
        return;
      }
      await loadSources();
    } catch {
      setSrcError('删除失败，请重试');
    }
  }

  return (
    <div>
      <BackHome />
      <PageHeader
        title="信息采集"
        desc="代码自动抓取数据资产相关资讯 → 六维分类 → 入库归档留痕"
      />

      {/* 采集控制 */}
      <Card className="p-5 mb-6">
        <div className="text-sm font-medium text-slate-500 mb-4">采集参数</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-500 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useSample} onChange={(e) => setUseSample(e.target.checked)} />
            使用演示数据（信源受限时兜底，保证流程可预览）
          </label>
          {effectiveSourceCount !== undefined && !useSample && (
            <span className="text-xs text-slate-400">本次将采集 {effectiveSourceCount} 个启用信源</span>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <PrimaryButton onClick={runCrawl} loading={loading} disabled={loading}>
            {loading ? '采集中...' : '一键采集'}
          </PrimaryButton>
          <span className="text-xs text-slate-400">自动完成：抓取 → 主题筛选 → 六维分类 → 入库</span>
        </div>
      </Card>

      {/* 流程状态 */}
      <Card className="p-5 mb-6">
        <WorkflowSteps current={loading ? step : step} />
      </Card>

      {/* 结果提示 */}
      {result?.error && (
        <Card className="p-4 mb-6 border-red-200 bg-red-50">
          <div className="text-red-600 text-sm">⚠ {result.error}</div>
        </Card>
      )}
      {result?.inserted !== undefined && !result.error && (
        <Card className="p-4 mb-6 border-emerald-200 bg-emerald-50">
          <div className="text-emerald-700 text-sm">
            ✅ 采集完成：新增 {result.inserted} 条数据资产资讯，当前情报库共 {result.total} 条
          </div>
        </Card>
      )}

      {/* 采集结果 */}
      <Card className="p-5 mb-6">
        <div className="text-sm font-medium text-slate-500 mb-4">
          采集结果{items.length > 0 && `（${items.length} 条待入库）`}
        </div>
        {items.length === 0 ? (
          <EmptyState text="暂无采集结果，点击「一键采集」" />
        ) : (
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-4 hover:border-[#1e3a5f]/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-800 text-sm">{it.title}</div>
                  <CategoryBadge category={it.category} />
                </div>
                {it.summary && <div className="mt-2 text-xs text-slate-500 line-clamp-2">{it.summary}</div>}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                  <span>{it.source_name}</span>
                  {it.publish_time && (
                    <span>{new Date(it.publish_time).toLocaleDateString('zh-CN')}</span>
                  )}
                  {it.source_url && (
                    <a href={it.source_url} target="_blank" rel="noreferrer" className="text-[#1e3a5f] hover:underline">
                      查看原文 ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ===== 信息源管理模块 ===== */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-slate-700">信息源管理</div>
            <div className="text-xs text-slate-400 mt-0.5">
              自定义采集信源，无需改代码即可新增 / 启停用；停用信源不会被采集
            </div>
          </div>
          <PrimaryButton onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? '收起' : '+ 新增信息源'}
          </PrimaryButton>
        </div>

        {srcError && <div className="mb-3 text-sm text-red-600">⚠ {srcError}</div>}

        {/* 新增表单 */}
        {showAdd && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">信息源名称 *</label>
                <input
                  value={newSrc.name}
                  onChange={(e) => setNewSrc({ ...newSrc, name: e.target.value })}
                  placeholder="如：某某数据交易所官网"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">网址 *</label>
                <input
                  value={newSrc.url}
                  onChange={(e) => setNewSrc({ ...newSrc, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">采集方式</label>
                <select
                  value={newSrc.type}
                  onChange={(e) => setNewSrc({ ...newSrc, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">所属维度</label>
                <select
                  value={newSrc.category}
                  onChange={(e) => setNewSrc({ ...newSrc, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">自动分类</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">备注</label>
                <input
                  value={newSrc.note}
                  onChange={(e) => setNewSrc({ ...newSrc, note: e.target.value })}
                  placeholder="可选，说明来源类型、更新频率等"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <PrimaryButton onClick={addSource} loading={adding} disabled={adding}>
                {adding ? '保存中...' : '保存'}
              </PrimaryButton>
              <button
                onClick={() => { setShowAdd(false); setSrcError(''); }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 信息源列表 */}
        {sourcesLoading ? (
          <div className="text-center py-8 text-sm text-slate-400">加载中...</div>
        ) : sources.length === 0 ? (
          <EmptyState text="暂无自定义信息源，点击「新增信息源」添加（未添加时采集将使用系统内置信源）" />
        ) : (
          <div className="space-y-3">
            {sources.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-100 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{s.name}</span>
                    <CategoryBadge category={s.category} />
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">{s.type}</span>
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-slate-400 hover:text-[#1e3a5f] truncate max-w-lg">
                    {s.url}
                  </a>
                  {s.note && <div className="mt-1 text-xs text-slate-400">{s.note}</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      s.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {s.enabled ? '采集中' : '已停用'}
                  </span>
                  <button
                    onClick={() => toggleSource(s)}
                    className="text-xs text-[#1e3a5f] hover:underline"
                  >
                    {s.enabled ? '停用' : '启用'}
                  </button>
                  <button
                    onClick={() => removeSource(s)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}