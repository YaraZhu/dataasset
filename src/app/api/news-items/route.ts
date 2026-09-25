import { NextRequest, NextResponse } from 'next/server';
import { listNewsItems, updateNewsItem } from '@/lib/db';
import { countNewsItems } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const items = await listNewsItems({
      category: sp.get('category') || undefined,
      status: sp.get('status') || undefined,
      keyword: sp.get('keyword') || undefined,
      limit: Number(sp.get('limit') || 200),
      offset: Number(sp.get('offset') || 0),
    });
    const total = await countNewsItems();
    return NextResponse.json({ success: true, items, total });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, ...patch } = body || {};
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
    await updateNewsItem(String(id), patch);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '更新失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}