// ===== 六维分类器：纯关键词规则，无 AI 依赖 =====

export const CATEGORIES = [
  '政府行动',
  '企业行动',
  '数商行动',
  '金融行动',
  '研学行动',
  '联盟行动',
] as const;

export type Category = (typeof CATEGORIES)[number];

// 数据资产相关主题关键词（信息筛选）
export const TOPIC_KEYWORDS = [
  '数据资产',
  '数据要素',
  '数据交易',
  '数据入表',
  '数据管理',
  '数字化转型',
  '公共数据',
  '数据治理',
  '数据确权',
  '数据流通',
  '数据交易所',
  '数据要素市场化',
  '数据产权',
  '数据安全',
  '数据价值',
];

// 六维度分类关键词规则（按来源域名 + 内容关键词双重匹配）
const SOURCE_RULES: Array<{ category: Category; domains: string[]; keywords: string[] }> = [
  {
    category: '政府行动',
    domains: [
      'gov.cn', 'nda.gov.cn', 'ndrc.gov.cn', 'miit.gov.cn', 'mofcom.gov.cn',
      'stats.gov.cn', 'ndb.gov.cn', 'pkulaw.com',
    ],
    keywords: ['政府', '国家数据局', '发改委', '政策', '部委', '十四五', '国务院', '公共数据开放', '政务数据', '数据条例'],
  },
  {
    category: '企业行动',
    domains: [],
    keywords: ['企业', '上市公司', '集团', '公司发布', '数据入表', '国企', '央企', '数字化转型实践'],
  },
  {
    category: '数商行动',
    domains: ['chinadatamarket', 'sdscene', 'dataeco', 'datayuan', 'eflorist', 'bkzx'],
    keywords: ['数商', '数据服务商', '数据经纪', '数据产品', '数据交易平台', '生态伙伴', '交易所会员'],
  },
  {
    category: '金融行动',
    domains: ['eastmoney', 'sina', 'cnstock', 'stcn', 'yicai', 'jrj', '10jqka'],
    keywords: ['银行', '金融', '保险', '证券', '数据资产入表', '质押', '融资', '信贷', '授信', '估值'],
  },
  {
    category: '研学行动',
    domains: ['cnic', 'carl', 'cass', 'edu.cn', 'cnki', 'iyiou'],
    keywords: ['研究院', '研究', '学者', '大学', '论文', '课题', '报告', '白皮书', '学术', '智库'],
  },
  {
    category: '联盟行动',
    domains: [],
    keywords: ['联盟', '协会', '商会', '委员会', '论坛', '峰会', '生态圈', '产业联盟', '合作组织'],
  },
];

// 信息筛选：是否包含数据资产主题关键词
export function isRelevant(text: string): boolean {
  if (!text) return false;
  return TOPIC_KEYWORDS.some((kw) => text.includes(kw));
}

// 六维分类：返回命中的分类标签，无命中返回 null
export function classify(text: string, sourceUrl?: string): Category | null {
  const content = `${sourceUrl || ''} ${text || ''}`;
  const scores: Array<{ category: Category; score: number }> = [];

  for (const rule of SOURCE_RULES) {
    let score = 0;
    // 来源域名匹配（权重高）
    if (sourceUrl && rule.domains.some((d) => sourceUrl.includes(d))) score += 2;
    // 内容关键词匹配
    for (const kw of rule.keywords) {
      if (text && text.includes(kw)) score += 1;
    }
    if (score > 0) scores.push({ category: rule.category, score });
  }

  if (!scores.length) return null;
  // 取最高分
  scores.sort((a, b) => b.score - a.score);
  return scores[0].category;
}

// 批量分类并返回统计
export function classifyAndStats(items: Array<{ text: string; sourceUrl?: string }>) {
  const result: Record<Category, number> = {
    '政府行动': 0,
    '企业行动': 0,
    '数商行动': 0,
    '金融行动': 0,
    '研学行动': 0,
    '联盟行动': 0,
  };
  for (const item of items) {
    const c = classify(item.text, item.sourceUrl);
    if (c) result[c]++;
  }
  return result;
}