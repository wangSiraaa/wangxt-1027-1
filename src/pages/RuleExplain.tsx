import { useState } from 'react';
import { BookOpen, Shield, HelpCircle, ShieldCheck, Users as UsersIcon, ArrowRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const rules = [
  {
    code: 'R001',
    title: '欠费居民限制规则',
    level: '拦截',
    levelColor: 'bg-rose-500',
    icon: Shield,
    desc: '存在欠费的居民仅允许选择免费基础包，付费慢病包将被系统拦截。',
    trigger: 'resident.has_arrears = 1 AND package.type = "paid"',
    action: '拦截签约提交，返回 R001_BLOCK',
    threshold: 'max_arrears_amount = ¥200',
    example: {
      name: '王五（RES003）有欠费¥250 → 选择高血压慢病包',
      result: '❌ 拦截：仅允许选择免费基础包',
      resultType: 'blocked',
    },
    remediation: [
      '补缴全部欠费后系统自动解除限制',
      '申请特殊豁免（卫健管理员审批）',
      '选择免费基础包获得基础服务',
    ],
  },
  {
    code: 'R002',
    title: '慢病包必须绑定责任医生',
    level: '拦截',
    levelColor: 'bg-rose-500',
    icon: HelpCircle,
    desc: '慢病包（category=chronic）签约时 requires_doctor=1，必须分配责任医生，且医生必须在职可用。',
    trigger: 'package.requires_doctor = 1 AND (doctor IS NULL OR doctor.is_available = 0)',
    action: '拦截签约提交和审批，返回 R002_BLOCK',
    threshold: '无医生、医生停职休假或停诊均触发',
    example: {
      name: '李四（RES002）选高血压慢病包但不指定医生',
      result: '❌ 拦截：慢病包必须绑定责任医生',
      resultType: 'blocked',
    },
    remediation: [
      '在签约表单或团队审核页面分配责任医生',
      '选择团队内 specialty 匹配的医生（高血压、糖尿病等）',
      '检查医生 is_available 状态，选择可用医生',
    ],
  },
  {
    code: 'R003',
    title: '签约期内不可重复签同类包',
    level: '拦截',
    levelColor: 'bg-amber-500',
    icon: UsersIcon,
    desc: '同一居民在签约期内（状态=pending/approved/active 且 end_date≥今日），不得重复签约同一 category 类别的签约包。',
    trigger: `已有合同 WHERE resident_id=? AND category=? AND status IN (...) AND end_date >= today`,
    action: '拦截签约提交，返回 R003_BLOCK',
    threshold: '同类包 category 相同即触发（basic 或 chronic）',
    example: {
      name: '张三已签高血压慢病包→再尝试签糖尿病慢病包（同属chronic）',
      result: '❌ 拦截：签约期内已有同类包未到期',
      resultType: 'blocked',
    },
    remediation: [
      '等待原签约到期后再签新包',
      '申请终止原签约（卫健管理员审批）',
      '原签约到期后自动解除限制',
    ],
  },
  {
    code: 'R004',
    title: '团队容量上限校验',
    level: '预警 / 拦截',
    levelColor: 'bg-amber-500',
    icon: ShieldCheck,
    desc: '签约时校验团队 current_capacity / max_capacity 阈值：≥90% 预警，=100% 拦截。',
    trigger: 'team.current_capacity >= team.max_capacity',
    action: '90% 提示（R004_WARN），100% 拦截（R004_BLOCK）',
    threshold: 'TEAM001=500, TEAM002=500, TEAM003=600, TEAM004=400',
    example: {
      name: '团队容量 495/500 → 签约',
      result: '⚠️ 预警：容量使用率 99%，请警惕',
      resultType: 'warn',
    },
    remediation: [
      '分配居民到其他有容量的团队',
      '卫健管理员上调团队 max_capacity',
      '调配医生资源扩容团队',
    ],
  },
  {
    code: 'R005',
    title: '覆盖率重算规则',
    level: '计算',
    levelColor: 'bg-blue-500',
    icon: ArrowRight,
    desc: '覆盖率重算按社区维度聚合，留存统计口径快照，确保"统计口径说得清"。',
    trigger: '管理员主动点击"重算覆盖率"按钮',
    action: '生成 statistics_snapshot + coverage_detail',
    threshold: `覆盖率 = Σ active+approved 合同的居民去重 / 居民总数`,
    example: {
      name: '系统重算：8居民，已签约5 → 覆盖率62.5%',
      result: '✅ 快照生成，留存口径、补贴、团队利用率',
      resultType: 'success',
    },
    remediation: [
      '检查居民档案完整性',
      '审批待审核签约以提高覆盖率',
      '导出快照供审计留痕',
    ],
  },
  {
    code: 'R006',
    title: '转团队与续约留痕',
    level: '流程',
    levelColor: 'bg-emerald-500',
    icon: ShieldCheck,
    desc: '转团队与续约必须通过审批流程，审批人、意见、时间、核对项完整写入 approval_record 表。',
    trigger: 'transfer=true 或续约接口调用',
    action: '写入审批记录 + 合同 version++',
    threshold: '四大核对项：容量、医生、服务范围、随访',
    example: {
      name: '张三从 TEAM001 → TEAM002 转团队审批',
      result: '✅ 审批通过，team_capacity_check=1 ... version++',
      resultType: 'success',
    },
    remediation: [
      '审批前完成四大核对项勾选',
      '续约前查看原合同 version 是否连续',
      '转团队后检查容量增减的原子性',
    ],
  },
];

const demoAccounts = [
  { role: '社区居民', id: '身份证号 / 手机号', account: '110101198001011234', password: 'password', path: '/resident-select' },
  { role: '医生团队', id: '工号', account: 'EMP001', password: 'password', path: '/team-approval' },
  { role: '卫健管理员', id: '账号', account: 'admin', password: 'password', path: '/admin-stats' },
];

const subsidyStandard = [
  { package: '高血压慢病包（PKG002）', price: 120, subsidy: 80, net: 40 },
  { package: '糖尿病慢病包（PKG003）', price: 150, subsidy: 100, net: 50 },
  { package: '高血压+糖尿病合并包（PKG004）', price: 240, subsidy: 160, net: 80 },
  { package: '老年人健康包（PKG005）', price: 180, subsidy: 120, net: 60 },
];

export default function RuleExplain() {
  const [active, setActive] = useState(rules[0].code);
  const r = rules.find((x) => x.code === active)!;
  const Icon = r.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={24} className="text-indigo-600" /> 规则解释
        </h1>
        <p className="text-sm text-slate-500 mt-1">签约规则、审核规范、统计口径、补贴标准全部公开透明，三方都能说得清</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {demoAccounts.map((a) => (
          <div key={a.role} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs text-slate-500">演示账号 · {a.role}</div>
            <div className="mt-1 text-lg font-bold text-slate-800">{a.account}</div>
            <div className="text-xs text-slate-500 mt-1">{a.id}：{a.account}，密码：<span className="font-mono">{a.password}</span></div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-2">
          {rules.map((r) => {
            const RIcon = r.icon;
            const activeNow = active === r.code;
            return (
              <button
                key={r.code}
                onClick={() => setActive(r.code)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  activeNow
                    ? 'border-indigo-500 bg-indigo-50 shadow ring-2 ring-indigo-100'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white ${r.levelColor}`}>
                  <RIcon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-500">{r.code}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${r.levelColor}`}>{r.level}</span>
                  </div>
                  <div className={`mt-0.5 truncate text-sm font-semibold ${activeNow ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {r.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl text-white ${r.levelColor}`}>
                <Icon size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">{r.code}</span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold text-white ${r.levelColor}`}>{r.level}</span>
                </div>
                <h2 className="mt-1 text-2xl font-bold text-slate-800">{r.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.desc}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1.5">触发条件（伪代码）</div>
                <code className="block rounded bg-slate-900 p-3 font-mono text-xs text-emerald-300 whitespace-pre-wrap">
                  {r.trigger}
                </code>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1.5">系统动作</div>
                <div className="rounded bg-white p-3 border border-slate-200 text-slate-700">{r.action}</div>
                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1">阈值说明</div>
                  <div className="rounded bg-white p-3 border border-slate-200 text-slate-700 text-xs">{r.threshold}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 mb-2">
                  <AlertTriangle size={15} /> 场景示例
                </div>
                <div className="rounded-lg bg-white p-3 text-sm text-slate-700 border border-indigo-100">
                  {r.example.name}
                </div>
                <div className={`mt-2 flex items-center gap-1.5 rounded-lg p-3 text-sm font-medium border ${
                  r.example.resultType === 'blocked' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  r.example.resultType === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  {r.example.resultType === 'blocked' ? <XCircle size={16} /> :
                   r.example.resultType === 'warn' ? <AlertTriangle size={16} /> :
                   <CheckCircle2 size={16} />}
                  {r.example.result}
                </div>
              </div>
              <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 mb-2">
                  <CheckCircle2 size={15} /> 修复/解除方案
                </div>
                <ol className="space-y-2">
                  {r.remediation.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={20} className="text-violet-600" /> 卫健补贴标准（公开透明）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">签约包</th>
                    <th className="px-4 py-2 text-right">居民支付</th>
                    <th className="px-4 py-2 text-right">卫健补贴</th>
                    <th className="px-4 py-2 text-right">合计</th>
                    <th className="px-4 py-2 text-left">补贴占比</th>
                  </tr>
                </thead>
                <tbody>
                  {subsidyStandard.map((s) => (
                    <tr key={s.package} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.package}</td>
                      <td className="px-4 py-3 text-right text-slate-600">¥{s.price - s.subsidy}</td>
                      <td className="px-4 py-3 text-right font-semibold text-violet-700">¥{s.subsidy}</td>
                      <td className="px-4 py-3 text-right text-slate-700">¥{s.price}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${Math.round(s.subsidy / s.price * 100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-violet-600">{Math.round(s.subsidy / s.price * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4 text-xs text-blue-900">
              <div className="font-semibold mb-1">📖 统计口径参考</div>
              签约覆盖率 = 已签约居民数 / 辖区常住居民总数 × 100%<br />
              已签约居民指在统计时点有有效签约记录（状态 = active/approved）的居民，同一居民多包只计一次。<br />
              常住居民指在辖区居住满6个月以上、已录入居民档案的人员。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
