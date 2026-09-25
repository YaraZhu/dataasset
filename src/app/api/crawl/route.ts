import { NextRequest, NextResponse } from 'next/server';
import { crawlAll, sampleData, aggregateSearch, SOURCES, type SourceConfig } from '@/lib/crawler';
import { classify, isRelevant } from '@/lib/classifier';
import { insertNewsItems, countNewsItems, listSources, listExistingSourceKeys } from '@/lib/db';
import { CATEGORIES } from '@/lib/classifier';
import { HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 转发链路追踪上下文（系统采集接口保留转发头）
    const forwardHeaders = HeaderUtils.extractForwardHeaders(req.headers);

    const body = await req.json().catch(() => ({}));
    const { startDate, endDate, sources, useSample = false } = body || {};

    // 从数据库读取启用的自定义信源；无自定义信源时退回内置 SOURCES
    let dbSources: SourceConfig[] = [];
    try {
      const enabled = await listSources({ enabledOnly: true });
      dbSources = enabled.map((s) => ({
        id: s.id,
        name: s.name,
        type: (s.type as SourceConfig['type']) || 'html',
        url: s.url,
        categoryHint: s.category || undefined,
      }));
    } catch {
      // 数据库不可用时忽略，走内置信源
    }

    const effectiveSources: SourceConfig[] =
      dbSources.length > 0 ? dbSources : SOURCES;

    // 真实采集：优先走聚合搜索（SDK web-search，线上沙箱可用，稳定命中数据资产主题+发布时间），
    // 聚合搜索失败或返回空时退回直抓内置信源
    let rawItems;
    if (useSample) {
      rawItems = sampleData();
    } else {
      rawItems = await aggregateSearch({ startDate, endDate, customHeaders: forwardHeaders });
      if (!rawItems.length) {
        rawItems = await crawlAll({ startDate, endDate, customSources: effectiveSources });
      }
    }

    // 统一时间范围过滤（真实抓取已由 crawlAll 过滤，此处兜底 sample 数据，
    // 确保采集结果严格卡在 [startDate, endDate] 内）
    if (startDate || endDate) {
      const toDay = (s: string): string | null => {
        const t = new Date(s).getTime();
        return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
      };
      const sd = startDate ? toDay(startDate) : null;
      const ed = endDate ? toDay(endDate) : null;
      rawItems = rawItems.filter((it) => {
        const d = it.publishTime ? toDay(it.publishTime) : null;
        if (!d) return false;
        if (sd && d < sd) return false;
        if (ed && d > ed) return false;
        return true;
      });
    }

    // 主题筛选 + 分类 + 去重入库
    let inserted = 0;
    const rows: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();

    // 已存在于数据库的 source_url / title 集合（用于跨批次去重，避免重复入库）
    let existingKeys = new Set<string>();
    try {
      existingKeys = new Set(await listExistingSourceKeys());
    } catch {
      // 忽略去重查询失败，退化为仅本批次去重
    }

    // 限定时间范围时，无时间戳条目一律不得入库
    const hasRange = Boolean(startDate || endDate);

    for (const item of rawItems) {
      const text = `${item.title} ${item.summary || ''} ${item.content || ''}`;
      if (!isRelevant(text)) continue;
      const key = item.sourceUrl || item.title;
      if (seen.has(key) || existingKeys.has(key)) continue;
      seen.add(key);
      existingKeys.add(key);

      // 限定时间范围但条目无发布时间时，直接丢弃（严格卡时间）
      if (hasRange && !item.publishTime) continue;

      const hinted = item.category || (item as unknown as Record<string, string | undefined>).category;
      const category = hinted as string | undefined || classify(text, item.sourceUrl);
      // 仅保留六类之一，未知分类不入库
      if (!category || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) continue;

      rows.push({
        title: item.title,
        summary: item.summary || item.title,
        content: item.content || item.summary || null,
        source_name: item.sourceName,
        source_url: item.sourceUrl || null,
        publish_time: item.publishTime || null,
        category,
        keywords: [category],
        crawl_time: new Date().toISOString(),
        original_title: item.title,
        original_summary: item.summary || item.title,
        status: 'classified',
        is_filtered: false,
      });
    }

    if (rows.length > 0) {
      inserted = await insertNewsItems(rows);
    }

    const total = await countNewsItems();

    return NextResponse.json({
      success: true,
      sourceCount: rawItems.length,
      effectiveSourceCount: effectiveSources.length,
      inserted,
      total,
      // 返回时间过滤后的候选条目供前端展示（说明"筛出哪些"，inserted 才是真正新增入库数）
      items: rawItems.map((it) => ({
        title: it.title,
        summary: it.summary || it.title,
        source_name: it.sourceName,
        source_url: it.sourceUrl || null,
        publish_time: it.publishTime || null,
        category: it.category || null,
      })),
      sources: effectiveSources.map((s) => ({ id: s.id, name: s.name })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '采集失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}