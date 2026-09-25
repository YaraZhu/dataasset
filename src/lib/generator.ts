import type { NewsItem } from '@/storage/database/shared/schema';
import { CATEGORIES } from './classifier';

// ===== 周讯生成器：纯代码模板，无 AI 依赖，严格对齐《数据资产生态圈动态周讯》工作手册范式 =====

export interface NewsletterDraft {
  issueNumber: number;
  issueTitle: string;
  editorNote: string;
  sections: Record<string, string>;
  content: string;
  startDate?: string;
  endDate?: string;
  adoptedCount: number;
}

export interface GenerateOptions {
  // 本次要生成的目标期号（由调用方从 newsletters 表取 max+1 传入，避免从条目推断导致期号错乱）
  issueNumber: number;
}

// 六类主体的固定顺序与序号（一~六）
const CATEGORY_CN: Record<string, string> = {
  '政府行动': '一、政府行动',
  '企业行动': '二、企业行动',
  '数商行动': '三、数商行动',
  '金融行动': '四、金融行动',
  '研学行动': '五、研学行动',
  '联盟行动': '六、联盟行动',
};

// 固定编者按（工作手册基准）
const FIXED_EDITOR_NOTE =
  '为追踪数据资产开发最新动态，数据资产专委会将持续组织内外力量开展数据资产生态圈信息收集研究，围绕"政府、企业、数商、金融、研学、联盟"六类主体，每周编发一期动态周讯，供社会各界和专家领导参阅。';

// 固定落款（工作手册基准）
const FIXED_SIGNATURE = [
  '出品：中关村软件和信息服务产业创新联盟 数据资产专委会',
  '审核专家：袁晓东 张珂',
  '编制组成员：王隆泰、刘庆文、张卫、蔡伽瑜、郑钰清、吕思雅、郑诗瑶、张晴源',
];

// 中央级单位关键词（政府行动排序：中央 > 省市）
const CENTRAL_KEYWORDS = [
  '国家数据局', '国务院', '国家发展改革委', '国家发改委', '工信部', '财政部',
  '中国人民银行', '人民银行', '住建部', '人力资源社会保障部', '人社部',
  '中央', '国家', '部委', '证监会', '银保监会', '科技部', '网信办',
];

// 一般资讯与重点资讯字数上限（一般 ≤120 字，重点 ≤180 字）
// 放宽原 80/100 的硬截断：周报正文尽量完整、少省略（用户明确要求）。
const NORMAL_LIMIT = 120;
const KEY_LIMIT = 180;

function stripHtml(s?: string): string {
  return (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 日期格式化：M月D日
function formatMD(d?: string | Date | null): string {
  if (!d) return '';
  let dt: Date;
  if (d instanceof Date) dt = d;
  else dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

// 日期格式化：YYYY-MM-DD（用于刊头数据周期）
function formatYMD(d?: string | Date | null): string {
  if (!d) return '';
  let dt: Date;
  if (d instanceof Date) dt = d;
  else dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isCentral(name: string): boolean {
  return CENTRAL_KEYWORDS.some((k) => name.includes(k));
}

// 生成单条正文：序号、事件主体：X月X日，事件内容。
// 事件主体优先级：source_name 机构名 > 标题；内容优先级：summary > 标题
function buildEntry(globalIdx: number, it: NewsItem): string {
  const subject = stripHtml(it.source_name || it.original_title || it.title) || '数据资产动态';
  const time = formatMD(it.publish_time);
  let content = stripHtml(it.summary || it.title || it.original_summary || '');

  // 字数控制：超一般上限标记为【重点】；复用重点上限，仅对真正的超长稿
  // 在"句末标点处"收尾截断，不再中间强加省略号，保证正文完整可读
  let mark = '';
  if (content.length > NORMAL_LIMIT) {
    mark = '【重点】';
    if (content.length > KEY_LIMIT) {
      const base = content.slice(0, KEY_LIMIT);
      const cut = Math.max(
        base.lastIndexOf('。'),
        base.lastIndexOf('！'),
        base.lastIndexOf('？'),
        base.lastIndexOf('；'),
      );
      content = cut > 10 ? base.slice(0, cut + 1) : base;
    }
  }

  // 内容若已以句末标点结尾则不再重复追加句号
  content = content.replace(/[。！？!?]+$/, '');

  const timePart = time ? `${time}，` : '';
  return `${globalIdx}、${subject}：${timePart}${mark}${content}。`;
}

// 生成完整周讯文稿（Markdown，对齐工作手册范式）
export function generateNewsletter(items: NewsItem[], options: GenerateOptions = { issueNumber: 1 }): NewsletterDraft {
  const { issueNumber } = options;
  // 待采纳条目（数据资产主题、且未被历史期刊采用过）。排除 adopted 已采用，
  // 避免同一批资讯被反复生成进多期期刊（这是"点一次生成就重复一遍"的根因之一）。
  let pool = items.filter((it) => (it.status !== 'pending' || it.category) && it.status !== 'adopted');
  // 按标题去重：同一条资讯（标题归一化相同）只保留一条，避免历史同标题多 record 在同一期内重复出现
  const seenTitles = new Set<string>();
  pool = pool.filter((it) => {
    const key = (it.original_title || it.title || '').normalize('NFKC').trim();
    if (!key) return true;
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  // 按六维度分组
  const grouped: Record<string, NewsItem[]> = {};
  for (const cat of CATEGORIES) grouped[cat] = [];
  for (const it of pool) {
    if (it.category && grouped[it.category]) {
      grouped[it.category].push(it);
    }
  }

  // 类内排序：政府行动的中央单位优先，其余按发布时间升序（先发在前）；无日期排后
  for (const cat of CATEGORIES) {
    grouped[cat].sort((a, b) => {
      if (cat === '政府行动') {
        const an = isCentral(a.source_name || a.original_title || '');
        const bn = isCentral(b.source_name || b.original_title || '');
        if (an !== bn) return an ? -1 : 1;
      }
      const at = a.publish_time ? new Date(String(a.publish_time)).getTime() : 0;
      const bt = b.publish_time ? new Date(String(b.publish_time)).getTime() : 0;
      if (isNaN(at) && isNaN(bt)) return 0;
      if (isNaN(at)) return 1;
      if (isNaN(bt)) return -1;
      return at - bt;
    });
  }

  // 期号由调用方传入（取自 newsletters 表 max+1），不在此处从条目推断
  // 三位数期号（001、012...）
  const issuePad = String(issueNumber).padStart(3, '0');

  const published = pool
    .filter((it) => it.publish_time)
    .map((it) => new Date(String(it.publish_time)).getTime())
    .filter((t) => !isNaN(t));
  const startDate = published.length ? new Date(Math.min(...published)).toISOString() : undefined;
  const endDate = published.length ? new Date(Math.max(...published)).toISOString() : undefined;

  // 各维度正文 + 全刊连续编号
  const sections: Record<string, string> = {};
  const lines: string[] = [];
  let globalIdx = 0;

  for (const cat of CATEGORIES) {
    const secItems = grouped[cat].slice(0, 12);
    if (!secItems.length) continue;
    const secLines: string[] = [];
    for (const it of secItems) {
      globalIdx += 1;
      secLines.push(buildEntry(globalIdx, it));
    }
    sections[cat] = secLines.join('\n');
    lines.push(`### ${CATEGORY_CN[cat]}`);
    lines.push('');
    lines.push(...secLines);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const total = pool.length;
  const adopted = pool.filter((it) => it.status === 'adopted').length;
  const editorNote = FIXED_EDITOR_NOTE;

  // 刊头：标题 + 三位期号 + 数据周期
  const period = `（${formatYMD(startDate)} 至 ${formatYMD(endDate)}）`;
  const contentLines: string[] = [
    `# 数据资产生态圈动态周讯  第${issuePad}期${period}`,
    '',
    `> **编者按**：${editorNote}`,
    '',
    '---',
    '',
    ...lines,
    '## 出品与栏目信息',
    '',
    ...FIXED_SIGNATURE.map((s) => `- ${s}`),
    '',
  ];

  const content = contentLines.join('\n');
  const issueTitle = `数据资产动态周讯  第${issuePad}期`;

  return {
    issueNumber,
    issueTitle,
    editorNote,
    sections,
    content,
    startDate,
    endDate,
    adoptedCount: adopted || total,
  };
}