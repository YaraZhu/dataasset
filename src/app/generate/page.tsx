'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, PrimaryButton, WorkflowSteps, BackHome, EmptyState } from '@/components/ui';

interface Newsletter {
  id: string;
  issue_number: number;
  issue_title: string;
  editor_note?: string;
  content?: string;
  sections?: Record<string, string>;
  generated_at?: string;
  status?: string;
}

const CATS = ['政府行动', '企业行动', '数商行动', '金融行动', '研学行动', '联盟行动'];

export default function GeneratePage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [selected, setSelected] = useState<Newsletter | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function load() {
    const res = await fetch('/api/newsletters');
    const json = await res.json();
    if (json.success) {
      setNewsletters(json.newsletters || []);
      if (json.newsletters?.length && !selected) {
        setSelected(json.newsletters[0]);
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/newsletters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || '生成失败');
      } else {
        setSelected(json.newsletter);
        await load();
      }
    } catch {
      setError('请求失败');
    } finally {
      setGenerating(false);
    }
  }

  async function exportTxt() {
    if (!selected?.content) return;
    const blob = new Blob([selected.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `数据资产动态周讯_第${selected.issue_number}期.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function removeSelected() {
    if (!selected) return;
    if (!window.confirm(`确认删除第 ${selected.issue_number} 期期刊？此操作不可恢复。`)) return;
    setError('');
    try {
      const res = await fetch(`/api/newsletters?id=${encodeURIComponent(selected.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || '删除失败');
      } else {
        setSelected(null);
        await load();
      }
    } catch {
      setError('请求失败');
    }
  }

  return (
    <div>
      <BackHome />
      <PageHeader
        title="周讯生成"
        desc="纯代码模板按工作手册范式生成周讯文稿，无需 AI 参与"
      />

      <Card className="p-5 mb-6">
        <WorkflowSteps current={3} />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>数据周期（可选，留空则基于全部未采用资讯）</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
            <span>至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <PrimaryButton onClick={generate} loading={generating} disabled={generating}>
            {generating ? '生成中...' : '生成新一期周讯'}
          </PrimaryButton>
          {selected && (
            <>
              <button
                onClick={exportTxt}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
              >
                ⬇ 导出文稿
              </button>
              <button
                onClick={removeSelected}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                🗑 删除本期
              </button>
            </>
          )}
          <span className="text-xs text-slate-400">基于已采集并分类的资讯自动成稿</span>
        </div>
        {error && <div className="mt-3 text-sm text-red-500">⚠ {error}</div>}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 期刊列表 */}
        <Card className="p-4 lg:col-span-1">
          <div className="text-sm font-medium text-slate-500 mb-4">历史期刊 ({newsletters.length})</div>
          {newsletters.length === 0 ? (
            <EmptyState text="暂无期刊" />
          ) : (
            <div className="space-y-2">
              {newsletters.map((nl) => (
                <button
                  key={nl.id}
                  onClick={() => setSelected(nl)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition ${
                    selected?.id === nl.id
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                      : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium">第{nl.issue_number}期</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {nl.generated_at ? new Date(nl.generated_at).toLocaleDateString('zh-CN') : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* 文稿预览 */}
        <Card className="p-6 lg:col-span-2">
          {!selected ? (
            <EmptyState text="点击「生成新一期周讯」或选择历史期刊查看" />
          ) : (
            <div>
              <h2 className="text-xl font-bold text-slate-800">{selected.issue_title}</h2>
              {selected.editor_note && (
                <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="font-medium">编者按：</span>
                  {selected.editor_note}
                </p>
              )}
              <div className="mt-5 space-y-5">
                {CATS.map((c) => {
                  const sec = selected.sections?.[c];
                  if (!sec) return null;
                  return (
                    <div key={c}>
                      <h3 className="font-semibold text-[#1e3a5f] mb-2 border-l-4 border-[#1e3a5f] pl-2">{c}</h3>
                      <pre className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed font-sans">{sec}</pre>
                    </div>
                  );
                })}
              </div>
              {selected.content && (
                <details className="mt-6">
                  <summary className="text-sm text-[#1e3a5f] cursor-pointer">查看完整 Markdown 文稿</summary>
                  <pre className="mt-3 text-xs text-slate-500 bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                    {selected.content}
                  </pre>
                </details>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}