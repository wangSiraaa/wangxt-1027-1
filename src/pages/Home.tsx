import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { Users, FileCheck, BarChart3, Bell, ClipboardList, Users as Users2, BookOpen, AlertTriangle, CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { useData, type Contract, type RenewalReminder } from '../store/data';

const cards = [
  { to: '/resident-select', title: '居民选包签约', desc: '选择免费基础包或付费慢病包、慢病标签与续约意向', icon: Users, color: 'from-blue-500 to-blue-600' },
  { to: '/team-approval', title: '团队审核', desc: '责任医生、团队容量、服务范围、上门随访安排', icon: FileCheck, color: 'from-emerald-500 to-emerald-600' },
  { to: '/admin-stats', title: '管理员统计', desc: '覆盖率、补贴额度、欠费限制与统计口径', icon: BarChart3, color: 'from-violet-500 to-violet-600' },
  { to: '/renewal-reminder', title: '续约提醒', desc: '到期前提醒，续约审批过程留痕', icon: Bell, color: 'from-amber-500 to-amber-600' },
  { to: '/service-ledger', title: '服务台账', desc: '上门随访、门诊记录、转诊过程全记录', icon: ClipboardList, color: 'from-sky-500 to-sky-600' },
  { to: '/team-transfer', title: '转团队审批', desc: '跨团队转接审批流程与历史留痕', icon: Users2, color: 'from-rose-500 to-rose-600' },
  { to: '/rule-explain', title: '规则解释', desc: '三大拦截规则、统计口径、补贴标准一目了然', icon: BookOpen, color: 'from-indigo-500 to-indigo-600' },
];

export default function Home() {
  const nav = useNavigate();
  const { user, currentRole, login } = useAuth();
  const { overview, loadOverview, loadMaster, loadContracts, contracts, renewalReminders, loadRenewal } = useData();

  useEffect(() => {
    if (!user) {
      localStorage.setItem('contract-demo-role', 'admin');
      login('admin', 'admin', 'password');
    }
    loadMaster();
    loadOverview();
    loadContracts({ status: 'pending' });
    loadRenewal();
  }, []);

  const pending = contracts.filter((c: Contract) => c.status === 'pending').length;
  const active = overview?.contractSummary?.active ?? 0;
  const coverage = overview?.snapshot?.coverageRate ?? 0;
  const subsidy = overview?.snapshot?.totalSubsidy ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: '签约覆盖率', value: `${coverage}%`, sub: '当前有效签约/辖区常住居民', color: 'text-blue-600', icon: BarChart3 },
          { label: '有效签约数', value: String(active), sub: '审批通过并生效中', color: 'text-emerald-600', icon: CheckCircle2 },
          { label: '待审核签约', value: String(pending), sub: '等待医生团队审批', color: 'text-amber-600', icon: FileCheck },
          { label: '累计卫健补贴', value: `¥${subsidy}`, sub: '按慢病包补贴标准核算', color: 'text-violet-600', icon: Info },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">{s.label}</div>
                <div className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="mt-1 text-xs text-slate-400">{s.sub}</div>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.color.replace('text-', 'bg-') + '/10'}`}>
                <s.icon size={22} className={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">功能入口</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.to}
                onClick={() => nav(c.to)}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-white shadow-md`}>
                  <Icon size={22} />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">{c.title}</h3>
                  <ArrowRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{c.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-slate-800">
              <AlertTriangle size={18} className="text-amber-500" /> 核心业务规则（演示场景）
            </h3>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              { t: '重复签约拦截', d: '签约期内（pending/approved/active）不能重复签同类（basic 或 chronic）包，R003_BLOCK', c: 'bg-amber-50 border-amber-200 text-amber-800' },
              { t: '慢病包无责任医生拦截', d: '慢病包 requires_doctor=1，无医生或医生不可用时 R002_BLOCK', c: 'bg-rose-50 border-rose-200 text-rose-800' },
              { t: '欠费居民限制', d: 'has_arrears=1 或欠费超配置时仅允许免费基础包，R001_BLOCK', c: 'bg-red-50 border-red-200 text-red-800' },
              { t: '覆盖率重算', d: '按社区维度聚合，留存统计口径和团队利用率快照', c: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
            ].map((r, i) => (
              <li key={i} className={`rounded-lg border ${r.c} p-3`}>
                <div className="font-semibold">{r.t}</div>
                <div className="mt-1 text-xs opacity-90">{r.d}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-slate-800">
              <Bell size={18} className="text-amber-500" /> 即将到期续约提醒
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                {renewalReminders.length} 条
              </span>
            </h3>
          </div>
          {renewalReminders.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">暂无即将到期的签约</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {renewalReminders.slice(0, 5).map((r: RenewalReminder) => (
                <li key={r.contract.id} className={`flex items-center justify-between rounded-lg border p-3 ${r.urgent ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div>
                    <div className="font-medium text-slate-700">{r.resident?.name} · {r.package?.name}</div>
                    <div className="text-xs text-slate-500">到期 {r.contract.endDate} · {r.team?.name}</div>
                  </div>
                  <div className={`rounded-md px-2 py-1 text-xs font-semibold ${r.urgent ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                    剩 {r.daysLeft} 天
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
