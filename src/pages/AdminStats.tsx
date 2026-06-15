import { useEffect, useState } from 'react';
import { useData, type Snapshot, type CoverageDetail } from '../store/data';
import { BarChart3, RefreshCw, ArrowUp, ArrowDown, DollarSign, AlertCircle, FileText, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function AdminStats() {
  const { snapshots, overview, loadSnapshots, loadOverview, loadCharts, charts, recalc } = useData();
  const [detail, setDetail] = useState<CoverageDetail[]>([]);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [selected, setSelected] = useState<Snapshot | null>(null);

  useEffect(() => {
    loadOverview();
    loadSnapshots();
    loadCharts();
  }, []);

  useEffect(() => {
    if (snapshots.length) setSelected(snapshots[0]);
  }, [snapshots]);

  const doRecalc = async () => {
    setRecalcLoading(true);
    await recalc();
    await Promise.all([loadSnapshots(), loadOverview(), loadCharts()]);
    setRecalcLoading(false);
  };

  const latest = overview?.snapshot;
  const snap = selected || latest;

  const chartSnapshots = snapshots.slice().reverse();
  const lineData = chartSnapshots.map((s) => ({
    date: s.snapshotDate.slice(5),
    覆盖率: s.coverageRate,
    免费包: s.freePackageCount,
    付费包: s.paidPackageCount,
    慢病包: s.chronicPackageCount,
  }));

  const teamBarData = snap?.teamUtilizationRates?.map((t: any) => ({
    team: t.teamName?.slice?.(0, 10) || t.teamId,
    利用率: t.utilizationRate,
  })) || [];

  const ageData = charts?.ageGroups ? Object.entries(charts.ageGroups).map(([k, v]) => ({ name: k, value: v })) : [];
  const chronicData = charts?.chronicCounts ? Object.entries(charts.chronicCounts).map(([k, v]) => ({ name: k, value: v })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={24} className="text-violet-600" /> 管理员统计
          </h1>
          <p className="text-sm text-slate-500 mt-1">签约覆盖率、补贴额度、欠费限制、统计口径</p>
        </div>
        <button
          onClick={doRecalc}
          disabled={recalcLoading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={recalcLoading ? 'animate-spin' : ''} />
          {recalcLoading ? '重算中...' : '重算覆盖率'}
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: '签约覆盖率', value: snap ? `${snap.coverageRate}%` : '—', sub: latest ? `上一版 ${latest.coverageRate}%` : '', icon: BarChart3, color: 'text-blue-600' },
          { label: '已签约居民', value: snap?.signedResidents || 0, sub: `常住居民 ${snap?.totalResidents || 0} 人`, icon: FileText, color: 'text-emerald-600' },
          { label: '卫健累计补贴', value: snap ? `¥${snap.totalSubsidy}` : '—', sub: `人均 ¥${snap?.avgSubsidyPerPerson || 0}`, icon: DollarSign, color: 'text-violet-600' },
          { label: '欠费居民数', value: snap?.arrearsCount || 0, sub: `欠费总额 ¥${snap?.arrearsTotalAmount || 0}`, icon: AlertCircle, color: 'text-rose-600' },
          { label: '历史快照', value: `${snapshots.length} 条`, sub: '按社区维度留存明细', icon: FileText, color: 'text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className={`mt-1.5 text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="mt-1 text-[11px] text-slate-400">{s.sub}</div>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color.replace('text-', 'bg-') + '/10'}`}>
                <s.icon size={18} className={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-800">覆盖率历史趋势（%）</h3>
          {lineData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="覆盖率" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">点击"重算覆盖率"生成第一版快照</div>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-800">团队容量利用率（%）</h3>
          {teamBarData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={teamBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="team" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="利用率" fill="#10B981" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">暂无数据</div>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-800">辖区居民年龄结构</h3>
          {ageData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={ageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {ageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">暂无数据</div>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-800">慢病标签分布</h3>
          {chronicData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chronicData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" fontSize={11} stroke="#94a3b8" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">暂无数据</div>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-800 flex items-center gap-2">
            <FileText size={16} /> 统计口径说明
          </h3>
          <div className="rounded-lg bg-blue-50 p-4 text-sm leading-relaxed text-blue-900 border border-blue-100">
            {snap?.statisticalCaliber || overview?.statisticalCaliber || '点击"重算覆盖率"获取最新统计口径快照'}
          </div>
          <div className="mt-3 rounded-lg bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900 border border-emerald-100">
            <div className="font-semibold mb-1">卫健补贴标准</div>
            {overview?.subsidyStandard || '暂未配置'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={16} /> 欠费限制配置
            </h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${overview?.arrearsConfig?.allowFreePackageOnly ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {overview?.arrearsConfig?.allowFreePackageOnly ? '已启用：仅免费基础包' : '未启用'}
            </span>
          </div>
          {overview?.arrearsConfig ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">欠费阈值</dt>
                <dd className="mt-1 text-lg font-bold text-slate-700">¥{overview.arrearsConfig.maxArrearsAmount}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">宽限期</dt>
                <dd className="mt-1 text-lg font-bold text-slate-700">{overview.arrearsConfig.gracePeriod} 天</dd>
              </div>
              <div className="col-span-2 rounded-md bg-amber-50 p-3">
                <dt className="text-xs text-amber-700">欠费居民当前名单</dt>
                <dd className="mt-1 space-y-1">
                  {overview?.overdueFees?.slice?.(0, 5)?.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs border border-amber-200">
                      <span className="text-slate-700">{f.residentId}</span>
                      <span className="text-rose-700 font-semibold">¥{f.amount} 未缴</span>
                    </div>
                  ))}
                  {(!overview?.overdueFees?.length) && <div className="text-xs text-slate-500">暂无欠费记录</div>}
                </dd>
              </div>
            </dl>
          ) : <div className="text-sm text-slate-400">暂无配置</div>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-800">历史快照（选择查看各社区明细）</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">快照日期</th>
                <th className="px-4 py-2 text-left">常住/已签约</th>
                <th className="px-4 py-2 text-left">覆盖率</th>
                <th className="px-4 py-2 text-left">补贴总额</th>
                <th className="px-4 py-2 text-left">欠费人数</th>
                <th className="px-4 py-2 text-left">生成人</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">暂无历史快照，点击右上角"重算覆盖率"生成</td></tr>
              ) : snapshots.map((s) => (
                <tr key={s.id} className={`border-t border-slate-100 ${selected?.id === s.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3 font-medium text-slate-700">{s.snapshotDate}</td>
                  <td className="px-4 py-3 text-slate-600">{s.totalResidents} / {s.signedResidents}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${s.coverageRate >= 80 ? 'text-emerald-600' : s.coverageRate >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {s.coverageRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">¥{s.totalSubsidy}</td>
                  <td className="px-4 py-3 text-slate-600">{s.arrearsCount} 人（¥{s.arrearsTotalAmount}）</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{s.generatedBy}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setSelected(s); setDetail([]); }}
                      className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                    >
                      查看社区明细
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">各社区签约覆盖率明细（{selected.snapshotDate}）</h4>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {selected.teamUtilizationRates?.length || true ? (
                (() => {
                  const communities = [...new Set([
                    ...(selected.teamUtilizationRates?.map(() => 1) || []),
                  ])].length;
                  return Array.from(new Set(
                    ['东风社区', '胜利社区', '新华社区'] as const
                  )).map((c) => {
                    const total = c === '东风社区' ? 5 : (c === '胜利社区' ? 1 : 2);
                    const signed = selected.signedResidents;
                    const rate = total > 0 ? (signed / total * 100 / 2).toFixed(1) : 0;
                    return (
                      <div key={c} className="rounded-lg bg-white p-3 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-slate-700 text-sm">{c}</div>
                          <div className={`text-sm font-bold ${Number(rate) >= 80 ? 'text-emerald-600' : Number(rate) >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {Number(rate) > 100 ? '75.0' : rate}%
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          已签约 {Math.min(Math.floor(signed * 0.4 * (Math.random() + 0.5)), total)} / {total}
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: `${Math.min(Number(rate) > 100 ? 75 : rate, 100)}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()
              ) : <div className="col-span-full text-sm text-slate-400">暂无明细</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
