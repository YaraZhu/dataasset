import Link from 'next/link';

// ===== 共享 UI 组件 =====

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-white border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = 'bg-[#1e3a5f]',
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className={`mt-2 text-3xl font-bold ${accent === 'text' ? 'text-[#1e3a5f]' : 'text-slate-800'}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

// 六维度分类色板
export const CATEGORY_COLORS: Record<string, string> = {
  '政府行动': '#1e3a5f',
  '企业行动': '#0e7490',
  '数商行动': '#7c3aed',
  '金融行动': '#b45309',
  '研学行动': '#15803d',
  '联盟行动': '#be123c',
};

export function CategoryBadge({ category }: { category?: string | null }) {
  if (!category) return <span className="text-xs text-slate-400">未分类</span>;
  const color = CATEGORY_COLORS[category] || '#64748b';
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {category}
    </span>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">🗂</div>
      <div className="text-slate-400 text-sm">{text}</div>
    </div>
  );
}

// 流程步骤条（采集 → 分类 → 归档 → 生成）
export function WorkflowSteps({ current }: { current: number }) {
  const steps = [
    { label: '信息采集', desc: '抓取资讯' },
    { label: '智能分类', desc: '六维归类' },
    { label: '归档入库', desc: '留档溯源' },
    { label: '周讯生成', desc: '成稿输出' },
  ];
  return (
    <div className="flex items-center gap-2 md:gap-4">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="flex-1">
            <div
              className={`rounded-lg px-2 py-2 text-center text-xs md:text-sm transition ${
                done
                  ? 'bg-emerald-600 text-white'
                  : active
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <div className="font-medium">
                {done ? '✓ ' : `${i + 1}. `}
                {s.label}
              </div>
              <div className="text-[10px] opacity-80 hidden md:block">{s.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">{title}</h1>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({
  onClick,
  children,
  disabled,
  loading,
  className = '',
}: {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4a74] disabled:opacity-50 transition ${className}`}
    >
      {loading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

export function BackHome() {
  return (
    <Link href="/" className="text-sm text-[#1e3a5f] hover:underline inline-flex items-center gap-1">
      ← 返回总览
    </Link>
  );
}