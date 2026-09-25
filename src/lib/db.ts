import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { NewsItem, Newsletter, Source } from '@/storage/database/shared/schema';

// ===== 资讯条目 =====
export async function insertNewsItems(items: Array<Record<string, unknown>>): Promise<number> {
  const client = await getSupabaseClient();
  const { error } = await client.from('news_items').insert(items);
  if (error) throw new Error(`插入资讯失败: ${error.message}`);
  return items.length;
}

export async function listNewsItems(params: {
  category?: string;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<NewsItem[]> {
  const client = await getSupabaseClient();
  const { limit = 200, offset = 0 } = params;
  let query = client
    .from('news_items')
    .select('*')
    .order('publish_time', { ascending: false })
    .range(offset, offset + limit - 1);
  if (params.category) query = query.eq('category', params.category);
  if (params.status) query = query.eq('status', params.status);
  if (params.keyword) query = query.ilike('title', `%${params.keyword}%`);
  if (params.startDate) query = query.gte('publish_time', params.startDate);
  if (params.endDate) query = query.lte('publish_time', params.endDate);
  const { data, error } = await query;
  if (error) throw new Error(`查询资讯失败: ${error.message}`);
  return (data as NewsItem[]) || [];
}

export async function getNewsItemsByIds(ids: string[]): Promise<NewsItem[]> {
  if (!ids.length) return [];
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('news_items')
    .select('*')
    .in('id', ids);
  if (error) throw new Error(`查询资讯失败: ${error.message}`);
  return (data as NewsItem[]) || [];
}

export async function updateNewsItem(id: string, patch: Record<string, unknown>): Promise<void> {
  const client = await getSupabaseClient();
  const { error } = await client
    .from('news_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`更新资讯失败: ${error.message}`);
}

export async function listExistingSourceKeys(): Promise<string[]> {
  const client = await getSupabaseClient();
  const { data, error } = await client.from('news_items').select('source_url,title');
  if (error) throw new Error(`查询已有资讯去重键失败: ${error.message}`);
  const keys: string[] = [];
  for (const it of (data as Array<{ source_url?: string | null; title?: string | null }>) || []) {
    if (it.source_url) keys.push(it.source_url);
    keys.push(it.title || '');
  }
  return keys;
}

export async function countNewsItems(filters: { status?: string } = {}): Promise<number> {
  const client = await getSupabaseClient();
  let query = client.from('news_items').select('*', { count: 'exact', head: true });
  if (filters.status) query = query.eq('status', filters.status);
  const { count, error } = await query;
  if (error) throw new Error(`统计资讯失败: ${error.message}`);
  return count || 0;
}

export async function getNewsItemsByIssue(issueNumber: number): Promise<NewsItem[]> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('news_items')
    .select('*')
    .eq('issue_number', issueNumber)
    .order('publish_time', { ascending: false });
  if (error) throw new Error(`查询期刊资讯失败: ${error.message}`);
  return (data as NewsItem[]) || [];
}

// ===== 周讯期刊 =====
export async function insertNewsletter(nl: Record<string, unknown>): Promise<Newsletter> {
  const client = await getSupabaseClient();
  const { data, error } = await client.from('newsletters').insert(nl).select();
  if (error) throw new Error(`插入周讯失败: ${error.message}`);
  return (data as Newsletter[])[0];
}

export async function listNewsletters(): Promise<Newsletter[]> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('newsletters')
    .select('*')
    .order('issue_number', { ascending: false })
    .limit(200);
  if (error) throw new Error(`查询周讯失败: ${error.message}`);
  return (data as Newsletter[]) || [];
}

export async function getLatestIssueNumber(): Promise<number> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('newsletters')
    .select('issue_number')
    .order('issue_number', { ascending: false })
    .limit(1);
  if (error) throw new Error(`查询最新期数失败: ${error.message}`);
  return (data && data.length ? (data[0] as { issue_number: number }).issue_number : 0) || 0;
}

export async function getNewsletterByIssue(issueNumber: number): Promise<Newsletter | null> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('newsletters')
    .select('*')
    .eq('issue_number', issueNumber)
    .maybeSingle();
  if (error) throw new Error(`查询周讯失败: ${error.message}`);
  return (data as Newsletter) || null;
}

// 将当前所有已分类资讯统一标记为指定期数，并将 status 由 classified 流转为 adopted，
// 使其不再进入后续期刊生成（避免同一批资讯被反复刊发）。
export async function markItemsToIssue(issueNumber: number): Promise<void> {
  const client = await getSupabaseClient();
  const { error } = await client
    .from('news_items')
    .update({ issue_number: issueNumber, status: 'adopted', updated_at: new Date().toISOString() })
    .eq('status', 'classified');
  if (error) throw new Error(`标记期刊失败: ${error.message}`);
}

// 删除指定期刊（仅删除 newsletters 记录本身，历史资讯保留）。若需把该期资讯退回 adoptive，
// 可另行调用 markItemsToIssue 回退，但默认仅删期刊记录。
export async function deleteNewsletter(id: string): Promise<void> {
  const client = await getSupabaseClient();
  const { error } = await client.from('newsletters').delete().eq('id', id);
  if (error) throw new Error(`删除期刊失败: ${error.message}`);
}

// ===== 信息源管理 =====
export async function listSources(params: { enabledOnly?: boolean } = {}): Promise<Source[]> {
  const client = await getSupabaseClient();
  let query = client
    .from('sources')
    .select('*')
    .order('created_at', { ascending: true });
  if (params.enabledOnly) query = query.eq('enabled', true);
  const { data, error } = await query;
  if (error) throw new Error(`查询信息源失败: ${error.message}`);
  return (data as Source[]) || [];
}

export async function insertSource(src: Record<string, unknown>): Promise<Source> {
  const client = await getSupabaseClient();
  const { data, error } = await client.from('sources').insert(src).select();
  if (error) throw new Error(`新增信息源失败: ${error.message}`);
  return (data as Source[])[0];
}

export async function updateSource(id: string, patch: Record<string, unknown>): Promise<void> {
  const client = await getSupabaseClient();
  const { error } = await client
    .from('sources')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`更新信息源失败: ${error.message}`);
}

export async function deleteSource(id: string): Promise<void> {
  const client = await getSupabaseClient();
  const { error } = await client.from('sources').delete().eq('id', id);
  if (error) throw new Error(`删除信息源失败: ${error.message}`);
}