import { NextRequest, NextResponse } from 'next/server';
import { listSources, insertSource, updateSource, deleteSource } from '@/lib/db';

export const runtime = 'nodejs';

// GET /api/sources — 信息源列表（前端信息源管理页）
export async function GET(req: NextRequest) {
  try {
    const sources = await listSources();
    return NextResponse.json({ success: true, sources });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '查询信息源失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/sources — 新增信息源
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, url, type, category, note } = body || {};
    if (!name || !url) {
      return NextResponse.json({ success: false, error: '名称和网址为必填项' }, { status: 400 });
    }
    const src = await insertSource({
      name,
      url,
      type: ['rss', 'json', 'html'].includes(type) ? type : 'html',
      category: category || null,
      note: note || null,
      enabled: true,
    });
    return NextResponse.json({ success: true, source: src });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '新增信息源失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PATCH /api/sources?id=xxx — 编辑信息源（改名/改网址/启停用）
export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.url !== undefined) patch.url = body.url;
    if (body.type !== undefined && ['rss', 'json', 'html'].includes(body.type)) patch.type = body.type;
    if (body.category !== undefined) patch.category = body.category || null;
    if (body.note !== undefined) patch.note = body.note || null;
    if (body.enabled !== undefined) patch.enabled = !!body.enabled;

    await updateSource(id, patch);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '更新信息源失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/sources?id=xxx — 删除信息源
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });
    }
    await deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '删除信息源失败';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}