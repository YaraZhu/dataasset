import { NextRequest, NextResponse } from 'next/server';
import {
  listNewsItems,
  insertNewsletter,
  listNewsletters,
  getLatestIssueNumber,
  getNewsItemsByIssue,
  markItemsToIssue,
  deleteNewsletter,
} from '@/lib/db';
import { generateNewsletter } from '@/lib/generator';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const newsletters = await listNewsletters();
    return NextResponse.json({ success: true, newsletters });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST：根据已采集资讯生成新一期周讯
// 支持可选 startDate/endDate：传入后只采用该日期范围内的未采用资讯，
// 不掺入历史累积数据，保证周报严格对应本次指定的数据周期。
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { startDate, endDate } = body || {};

    // 取未采用资讯（status=classified），可选按发布时间卡在 [startDate, endDate]
    const items = await listNewsItems({
      status: 'classified',
      limit: 500,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    });
    if (!items.length) {
      return NextResponse.json({ success: false, error: '所选日期范围内暂无可采纳的资讯，请先采集' }, { status: 400 });
    }

    // 期号：从 newsletters 表取最新期号 +1，与历史期刊期号唯一（不从条目推断，避免期号错乱/覆盖）
    const latest = await getLatestIssueNumber();
    const issueNumber = latest + 1;

    // 生成文稿（传入目标期号，且池子排除 adopted 条目）
    const draft = generateNewsletter(items, { issueNumber });

    // 入库
    const nl = await insertNewsletter({
      issue_number: draft.issueNumber,
      issue_title: draft.issueTitle,
      editor_note: draft.editorNote,
      sections: draft.sections,
      content: draft.content,
      start_date: draft.startDate,
      end_date: draft.endDate,
      status: 'draft',
    });

    // 标记被采纳资讯的期刊归属，并将其 status 由 classified → adopted
    // （adopted 条目不再进入后续生成，从根本上杜绝"点一次生成就重复一遍"）
    await markItemsToIssue(draft.issueNumber);

    return NextResponse.json({ success: true, newsletter: nl, draft, issueNumber });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '生成失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE：删除历史期刊（含其 issue 关联的资讯归属标记回退）
export async function DELETE(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const id = sp.get('id');
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
    await deleteNewsletter(String(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '删除失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}