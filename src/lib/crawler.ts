import { SearchClient, Config } from 'coze-coding-dev-sdk';
import { classify, isRelevant, TOPIC_KEYWORDS } from './classifier';

// ===== 采集引擎：纯代码抓取，无 AI 依赖 =====

export interface RawNewsItem {
  title: string;
  summary?: string;
  content?: string;
  sourceName: string;
  sourceUrl?: string;
  publishTime?: string; // ISO 字符串
  category?: string; // 分类提示（来源默认类型）
}

export interface SourceConfig {
  id: string;
  name: string;
  type: 'rss' | 'json' | 'html';
  url: string;
  categoryHint?: string;
}

// 标准化的权威信息源配置（国内可访问为主，按六维覆盖专业信源）
export const SOURCES: SourceConfig[] = [
  // ===== 政府行动 =====
  {
    id: 'gov-cn',
    name: '中国政府网·政策',
    type: 'rss',
    url: 'https://www.gov.cn/zhengce/zuixin/index.htm',
    categoryHint: '政府行动',
  },
  {
    id: 'nda',
    name: '国家数据局',
    type: 'html',
    url: 'https://www.nda.gov.cn/',
    categoryHint: '政府行动',
  },
  {
    id: 'ndrc',
    name: '国家发改委',
    type: 'rss',
    url: 'https://www.ndrc.gov.cn/',
    categoryHint: '政府行动',
  },
  {
    id: 'gov-datasites',
    name: '数据局政策汇总',
    type: 'html',
    url: 'https://www.gov.cn/zhengce/',
    categoryHint: '政府行动',
  },

  // ===== 数商行动（各地数据交易所） =====
  {
    id: 'gy-bigdata',
    name: '贵阳大数据交易所',
    type: 'html',
    url: 'https://www.gbdex.com.cn/',
    categoryHint: '数商行动',
  },
  {
    id: 'sz-data',
    name: '深圳数据交易所',
    type: 'html',
    url: 'https://www.szdex.com/',
    categoryHint: '数商行动',
  },
  {
    id: 'sdscene',
    name: '上海数据交易所',
    type: 'html',
    url: 'https://www.chinadep.com/',
    categoryHint: '数商行动',
  },
  {
    id: 'bj-data-ex',
    name: '北京国际大数据交易所',
    type: 'html',
    url: 'https://www.bjidex.com.cn/',
    categoryHint: '数商行动',
  },
  {
    id: 'data-trade-net',
    name: '数据交易网',
    type: 'html',
    url: 'https://www.shujiaoyi.cn/',
    categoryHint: '数商行动',
  },
  {
    id: 'data-cooperative',
    name: '中国数据要素市场平台',
    type: 'html',
    url: 'https://www.datascent.com/',
    categoryHint: '数商行动',
  },

  // ===== 金融行动 =====
  {
    id: 'eastmoney',
    name: '东方财富',
    type: 'html',
    url: 'https://finance.eastmoney.com/',
    categoryHint: '金融行动',
  },
  {
    id: 'sina-finance',
    name: '新浪财经',
    type: 'html',
    url: 'https://finance.sina.com.cn/',
    categoryHint: '金融行动',
  },
  {
    id: 'stcn',
    name: '证券时报',
    type: 'html',
    url: 'https://www.stcn.com/',
    categoryHint: '金融行动',
  },
  {
    id: 'jrj',
    name: '金融界',
    type: 'html',
    url: 'https://www.jrj.com.cn/',
    categoryHint: '金融行动',
  },
  {
    id: '10jqka',
    name: '同花顺财经',
    type: 'html',
    url: 'https://www.10jqka.com.cn/',
    categoryHint: '金融行动',
  },

  // ===== 研学行动（研究院/智库） =====
  {
    id: 'caict',
    name: '中国信通院',
    type: 'html',
    url: 'https://www.caict.ac.cn/',
    categoryHint: '研学行动',
  },
  {
    id: 'ccid',
    name: '赛迪研究院',
    type: 'html',
    url: 'https://www.ccidgroup.com/',
    categoryHint: '研学行动',
  },
  {
    id: 'cass',
    name: '中国社科院',
    type: 'html',
    url: 'https://cass.cn/',
    categoryHint: '研学行动',
  },
  {
    id: 'szhh-co',
    name: '数据要素社',
    type: 'html',
    url: 'https://www.zhihuitouzi.com.cn/',
    categoryHint: '研学行动',
  },

  // ===== 联盟行动 =====
  {
    id: 'dacpa',
    name: '中国数据资产联盟（深圳）',
    type: 'html',
    url: 'https://www.dacpa.org.cn/',
    categoryHint: '联盟行动',
  },

  // ===== 企业行动（行业综合） =====
  {
    id: 'news-cn-fortune',
    name: '新华社财经',
    type: 'html',
    url: 'https://www.news.cn/fortune/',
    categoryHint: '企业行动',
  },
  {
    id: 'xjp-report',
    name: '数据资产生态圈观察',
    type: 'html',
    url: 'https://www.toutiao.com/',
    categoryHint: '企业行动',
  },
];

// 标准化的数据资产关注主题词（用于抓取页面后过滤）
export { TOPIC_KEYWORDS } from './classifier';

interface FetchOptions {
  timeoutMs?: number;
}

async function fetchText(url: string, opts: FetchOptions = {}): Promise<string | null> {
  const { timeoutMs = 15000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 从 HTML 中提取链接列表（按 href 过滤 + 提取标题）
function extractLinks(html: string, baseUrl: string, limit = 60): Array<{ url: string; title: string }> {
  const links: Array<{ url: string; title: string }> = [];
  const anchorRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) && links.length < limit) {
    const href = m[1].trim();
    const titleRaw = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!titleRaw || titleRaw.length < 8) continue;
    if (/undefined|javascript:|#|mailto:|\.css|\.js|\.png|\.jpg|\.ico/i.test(href)) continue;
    const url = href.startsWith('http') ? href : new URL(href, baseUrl).href;
    links.push({ url, title: titleRaw });
  }
  return links;
}

// 时间解析：从标题和内容中提取 YYYY-MM-DD
function extractDate(text: string): string | undefined {
  const m = text.match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (m) {
    const [_, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return undefined;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&ldquo;|&rdquo;|&middot;|&mdash;/g, ' ').replace(/\s+/g, ' ').trim();
}

// 聚合搜索关键词组：覆盖数据资产各细分领域的具体事件/主题词。
// 关键设计：数据资产是巨量细分领域，必须用"具体事件/机构/制度词"去召回，
// 仅靠 8 个泛词会漏掉大量藏在具体事件里的新闻（如"数据专家咨询委员会""数据集团收费标准"）。
// 历史日期靠下方按 publish_time 精确过滤召回；不依赖搜索默认排序。
export const AGGREGATE_QUERIES = [
  // 顶层制度/政策
  '数据要素 政策 意见',
  '数据要素 市场化 改革',
  '数据要素 价值释放',
  '数据要素× 行动计划',
  '数字经济发展 工作要点',
  '数据产权 登记 指引',
  '数据产权 登记 制度',
  '数据资产 入表 试点',
  '数据资产 全过程 管理',
  '数据资产 会计处理',
  '公共数据 授权运营',
  '公共数据 资源登记',
  '数据资产 评估 准则',
  '数据资产 定价',
  // 组织机构/会议
  '国家数据专家咨询委员会',
  '国家数据局 工作会议',
  '数据要素 综合试验区',
  '数据基础 设施 建设 现场会',
  '数字中国建设峰会',
  '数据要素 论坛 峰会',
  '数据要素 大赛',
  '数据交易所 挂牌',
  '数据产品 上市 交易所',
  '数据资产 融资 质押',
  '数据资产 增信 贷款',
  '数据资产 证券化',
  // 流通/服务/技术
  '数据流通 服务机构',
  '数据商 生态',
  '数据跨境 流动 负面清单',
  '可信数据空间',
  '数据标注 基地',
  '高质量数据集 建设',
  '数据治理 标准',
  '数据集团 收费 标准',
  '数元 计费',
  '数据要素 市场 报告',
  '数据资产 白皮书',
  '行业数据 价值 案例',
  '数据赋能 千行百业',
  '企业 数据 资源 入表',
  '数据资产 研究院',
  '数据财政',
];

// 聚合搜索采集器：基于 Coze 托管 web-search（SDK advancedSearch），
// 返回带标题/链接/摘要/发布时间的真实资讯条目。线上沙箱无外网直连也可用。
export async function aggregateSearch(params: {
  startDate?: string;
  endDate?: string;
  customHeaders?: Record<string, string>;
} = {}): Promise<RawNewsItem[]> {
  const { startDate, endDate, customHeaders } = params;

  const config = new Config();
  const client = new SearchClient(config, customHeaders);

  // 将用户选定的日期范围编码进查询词，提高对目标时段内容的召回（搜索引擎对年份/月份敏感）。
  // 例：2026-07-01 → "2026年7月"
  const ym = (d?: string): string | null => {
    if (!d) return null;
    const t = new Date(d).getTime();
    if (isNaN(t)) return null;
    const dt = new Date(t);
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月`;
  };
  const rangeHint = [startDate ? ym(startDate) : null, endDate ? ym(endDate) : null]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(' ');
  const queries = rangeHint
    ? AGGREGATE_QUERIES.map((q) => `${q} ${rangeHint}`)
    : AGGREGATE_QUERIES;

  const items: RawNewsItem[] = [];
  for (const q of queries) {
    try {
      const resp = await client.advancedSearch(q, {
        searchType: 'web',
        count: 20, // 放大召回，历史日期时命中更多候选供精确过滤
        needUrl: true,
        needSummary: true,
      });
      for (const wi of resp.web_items || []) {
        const title = (wi.title || '').trim();
        const url = wi.url;
        if (!title || !url) continue;
        // 摘要优先级：SDK 的 summary（可能是 AI 汇聚的更完整摘要）> snippet（搜索结果短摘要）
        // > title。snippet 常被搜索引擎掐头去尾带省略号，尽量用更完整来源，减少周报"残缺缩写"。
        const full = (wi.summary || wi.content || '').trim();
        const short = (wi.snippet || '').trim();
        const summary = full || short || title;
        // 直接使用搜索结果的发布时间（可能为 ISO 或空）
        let publishTime: string | undefined;
        const pt = (wi.publish_time || '').trim();
        if (pt) {
          const t = new Date(pt).getTime();
          if (!isNaN(t)) publishTime = new Date(t).toISOString();
        }
        items.push({
          title,
          summary,
          content: full || short || title,
          sourceName: wi.site_name || '聚合搜索',
          sourceUrl: url,
          publishTime,
          category: undefined, // 由 route 统一分类
        });
      }
    } catch {
      // 单个关键词失败不影响其他关键词
    }
  }

  // 主题筛选：仅保留数据资产相关
  let relevant = items.filter((it) =>
    isRelevant(`${it.title} ${it.summary || ''} ${it.content || ''}`),
  );

  // 日期范围过滤：限定范围时无时间戳/超范围的条目一律丢弃
  const toDay = (d: string): string | null => {
    const t = new Date(d).getTime();
    return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
  };
  const startDay = startDate ? toDay(startDate) : null;
  const endDay = endDate ? toDay(endDate) : null;
  if (startDay || endDay) {
    relevant = relevant.filter((it) => {
      const day = it.publishTime ? toDay(it.publishTime) : null;
      if (!day) return false;
      if (startDay && day < startDay) return false;
      if (endDay && day > endDay) return false;
      return true;
    });
  }

  // 去重（按 URL + 标题）
  const seen = new Set<string>();
  const dedup = relevant.filter((it) => {
    const k = it.sourceUrl || it.title;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return dedup;
}

// 抓取单个信息源并解析为原始条目
async function crawlSource(source: SourceConfig): Promise<RawNewsItem[]> {
  const html = await fetchText(source.url);
  if (!html) return [];

  const links = extractLinks(html, source.url);
  const items: RawNewsItem[] = [];

  for (const link of links) {
    const publishDate = extractDate(link.title);
    const item: RawNewsItem = {
      title: link.title,
      sourceName: source.name,
      sourceUrl: link.url,
      summary: link.title,
      publishTime: publishDate ? new Date(`${publishDate}T00:00:00+08:00`).toISOString() : undefined,
      content: link.title,
    };
    // 分类：优先用来源提示，再按内容关键词
    const text = `${link.title} ${source.categoryHint || ''}`;
    const category = source.categoryHint && isRelevant(link.title)
      ? source.categoryHint
      : classify(link.title, source.url);
    item.category = category || undefined;
    items.push(item);
  }

  return items;
}

function categoryForHint(hint: string): string {
  return hint;
}

// 主采集入口：遍历全部信息源，按日期范围过滤 + 主题筛选 + 分类
export async function crawlAll(params: {
  startDate?: string;
  endDate?: string;
  sources?: string[];
  customSources?: SourceConfig[];
} = {}): Promise<RawNewsItem[]> {
  const { startDate, endDate } = params;
  const sourceList = params.customSources?.length
    ? params.customSources
    : params.sources?.length
    ? SOURCES.filter((s) => params.sources!.includes(s.id))
    : SOURCES;

  const all: RawNewsItem[] = [];
  for (const source of sourceList) {
    try {
      const items = await crawlSource(source);
      all.push(...items);
    } catch {
      // 跳过失败信源，继续抓其他
    }
  }

  // 主题筛选
  const relevant = all.filter((it) => isRelevant(`${it.title} ${it.summary || ''}`));

  // 归一化到纯日期字符串（yyyy-mm-dd），结束日含全天
  const toDay = (d: string): string | null => {
    const t = new Date(d).getTime();
    if (isNaN(t)) return null;
    return new Date(t).toISOString().slice(0, 10);
  };
  const startDay = startDate ? toDay(startDate) : null;
  const endDay = endDate ? toDay(endDate) : null;

  // 日期范围过滤：一旦限定了时间范围，无时间戳的条目一律丢弃（不得放行），
  // 以保证采集结果严格卡在用户设定的 [startDate, endDate] 内。
  let result = relevant;
  const hasRange = Boolean(startDay || endDay);
  if (hasRange) {
    result = result.filter((it) => {
      const day = it.publishTime ? toDay(it.publishTime) : null;
      if (!day) return false; // 限定范围时无时间直接剔除
      if (startDay && day < startDay) return false;
      if (endDay && day > endDay) return false;
      return true;
    });
  }

  // 去重（按 URL + 标题）
  const seen = new Set<string>();
  const dedup = result.filter((it) => {
    const key = it.sourceUrl || it.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return dedup;
}

// 模拟数据（开发/演示环境信源不可达时的兜底，标注来源）
export function sampleData(): RawNewsItem[] {
  const now = new Date();
  const day = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
  const items: RawNewsItem[] = [
    {
      title: '国家数据局印发公共数据资源开发利用最新政策，推动数据要素市场化配置',
      summary: '国家数据局发布新政策，推动公共数据开发利用，促进数据要素市场化配置改革。',
      sourceName: '国家数据局',
      sourceUrl: 'https://www.nda.gov.cn/sjj/gzdt/',
      publishTime: day(1),
      category: '政府行动',
    },
    {
      title: '多家上市公司完成数据资源入表，数据资产价值加速显性化',
      summary: '随着数据入表政策落地，多家上市公司将数据资源纳入财务报表，数据资产价值加速体现。',
      sourceName: '东方财富',
      sourceUrl: 'https://finance.eastmoney.com/a/cywjh.html',
      publishTime: day(2),
      category: '企业行动',
    },
    {
      title: '数据交易所跨境数据流通服务升级，数商生态加速构建',
      summary: '多地数据交易所升级跨境数据流通服务，吸引更多数据服务商加入生态。',
      sourceName: '大数据产业生态联盟',
      sourceUrl: 'https://www.cbdio.com/',
      publishTime: day(3),
      category: '数商行动',
    },
    {
      title: '商业银行探索数据资产质押融资新模式，激活企业数据融资价值',
      summary: '多家银行开展数据资产质押融资试点，为拥有数据的科技型企业提供信贷支持。',
      sourceName: '新浪财经',
      sourceUrl: 'https://finance.sina.com.cn/',
      publishTime: day(4),
      category: '金融行动',
    },
    {
      title: '研究机构发布《数据要素市场发展报告》揭示数据要素市场化进程',
      summary: '权威研究机构发布数据要素市场发展报告，系统梳理数据要素市场化配置的阶段成果与趋势。',
      sourceName: '研究报告',
      sourceUrl: 'https://www.cnitpm.com/',
      publishTime: day(5),
      category: '研学行动',
    },
    {
      title: '全国数据要素产业联盟成立，协同推进数据要素市场生态建设',
      summary: '数据要素产业相关联盟成立，聚集产学研各方力量协同推进数据要素市场生态建设。',
      sourceName: '产业联盟',
      sourceUrl: 'https://www.cbdio.com/',
      publishTime: day(6),
      category: '联盟行动',
    },
    {
      title: '地方政府出台数据资产运营管理细则，规范公共数据授权运营',
      summary: '多个地方政府出台数据资产运营管理细则，规范公共数据授权运营流程与责任边界。',
      sourceName: '中国政府网',
      sourceUrl: 'https://www.gov.cn/zhengce/',
      publishTime: day(7),
      category: '政府行动',
    },
    {
      title: '软件企业通过数据治理提升数据质量，支撑数据资产化落地',
      summary: '软件与信息技术企业加强数据治理体系建设，提升数据质量以支撑数据资产化落地。',
      sourceName: '新华社财经',
      sourceUrl: 'https://www.news.cn/fortune/',
      publishTime: day(8),
      category: '企业行动',
    },
  ];
  return items;
}