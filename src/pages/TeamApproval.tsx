import { useEffect, useState } from 'react';
import { useData, type Contract, type Validation } from '../store/data';
import { FileCheck, XCircle, CheckCircle2, Users as UsersIcon, Stethoscope, Calendar, MapPin, Eye, AlertTriangle, CheckSquare } from 'lucide-react';

export default function TeamApproval() {
  const { contracts, loadContracts, loadMaster, teams, packages, residents, approve } = useData();
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'active' | 'rejected'>('pending');
  const [detail, setDetail] = useState<Contract | null>(null);
  const [opts, setOpts] = useState({
    teamCapacityCheck: false,
    doctorAssignmentCheck: false,
    serviceScopeConfig: false,
    followupPlanConfig: false,
  });
  const [opinion, setOpinion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMaster();
    loadContracts();
  }, []);

  const list = contracts.filter((c) => status === 'all' ? true : c.status === status);
  const counts: any = {};
  ['all', 'pending', 'approved', 'active', 'rejected'].forEach((s) => {
    counts[s] = s === 'all' ? contracts.length : contracts.filter((c: Contract) => c.status === s).length;
  });

  const doAction = async (action: 'approve' | 'reject') => {
    if (!detail) return;
    setLoading(true);
    const r = await approve({
      contractId: detail.id,
      action,
      opinion,
      ...opts,
    });
    if (r.code === 0) {
      setDetail(null);
      setOpinion('');
      setOpts({ teamCapacityCheck: false, doctorAssignmentCheck: false, serviceScopeConfig: false, followupPlanConfig: false });
      loadContracts();
    } else {
      alert(r.message || '操作失败');
    }
    setLoading(false);
  };

  const statusColor = (s: string): string => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      approved: 'bg-sky-100 text-sky-700 border-sky-200',
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rejected: 'bg-rose-100 text-rose-700 border-rose-200',
      expired: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return map[s] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const statusLabel = (s: string) => ({
    pending: '待审核', approved: '审批通过', active: '签约生效中',
    rejected: '审核驳回', expired: '已到期', terminated: '已终止',
  } as any)[s] || s;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck size={24} className="text-emerald-600" /> 医生团队审核
          </h1>
          <p className="text-sm text-slate-500 mt-1">审核签约申请：团队容量、责任医生、服务范围、上门随访安排</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'active', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              status === s ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
            }`}
          >
            {{ all: '全部', pending: '待审核', approved: '审批通过', active: '生效中', rejected: '已驳回' }[s]}
            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${status === s ? 'bg-white/20' : 'bg-slate-100'}`}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">签约申请列表</div>
          {list.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">暂无{status !== 'all' ? statusLabel(status) : ''}签约</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">居民</th>
                  <th className="px-4 py-2 text-left">签约包</th>
                  <th className="px-4 py-2 text-left">团队/医生</th>
                  <th className="px-4 py-2 text-left">签约期</th>
                  <th className="px-4 py-2 text-left">状态</th>
                  <th className="px-4 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c: Contract) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.resident?.name || c.residentId}</div>
                      <div className="text-xs text-slate-500">{c.resident?.community} · {c.resident?.age}岁</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.package?.name || c.packageId}</div>
                      <div className="text-xs text-slate-500">
                        {c.package?.type === 'free' ? '免费' : `¥${c.package?.price || 0}`} · v{c.version}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{c.team?.name || c.teamId}</div>
                      <div className="text-xs text-slate-500">{c.doctor?.name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {c.startDate}<br />→ {c.endDate}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md border px-2 py-1 text-[11px] ${statusColor(c.status)}`}>
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetail(c)}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Eye size={12} /> 审核
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="lg:col-span-2">
          {!detail ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white/50 p-10 text-center">
              <FileCheck size={40} className="mx-auto text-slate-300" />
              <div className="mt-3 text-sm text-slate-500">请从左侧选择签约进行审核</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-3">签约详情</h3>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-slate-500">签约单号</dt>
                  <dd className="font-medium text-slate-700">{detail.id}</dd>
                  <dt className="text-slate-500">居民</dt>
                  <dd className="font-medium text-slate-700">{detail.resident?.name}</dd>
                  <dt className="text-slate-500">签约包</dt>
                  <dd className="font-medium text-slate-700">{detail.package?.name}</dd>
                  <dt className="text-slate-500">签约类型</dt>
                  <dd>
                    <span className={`rounded px-1.5 py-0.5 text-xs ${detail.package?.type === 'free' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {detail.package?.type === 'free' ? '免费' : '付费'}
                    </span>
                    {detail.isTransfer && <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-700">转团队</span>}
                  </dd>
                  <dt className="text-slate-500">签约期</dt>
                  <dd className="text-slate-700">{detail.startDate} ~ {detail.endDate}</dd>
                  <dt className="text-slate-500">版本号</dt>
                  <dd className="text-slate-700">v{detail.version}</dd>
                  <dt className="text-slate-500">慢病标签</dt>
                  <dd className="text-slate-700">
                    {detail.chronicTags.length ? detail.chronicTags.join('、') : '无'}
                  </dd>
                </dl>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <div className="flex items-center gap-1 text-emerald-700 font-medium text-xs">
                      <UsersIcon size={13} /> 团队容量
                    </div>
                    <div className="mt-1 text-slate-700">{detail.team?.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {detail.team?.currentCapacity}/{detail.team?.maxCapacity}（
                      {detail.team && detail.team.maxCapacity ? ((detail.team.currentCapacity / detail.team.maxCapacity) * 100).toFixed(1) : 0}%）
                    </div>
                  </div>
                  <div className="rounded-lg bg-sky-50 p-3">
                    <div className="flex items-center gap-1 text-sky-700 font-medium text-xs">
                      <Stethoscope size={13} /> 责任医生
                    </div>
                    <div className="mt-1 text-slate-700">{detail.doctor?.name || '—'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {detail.doctor ? `${detail.doctor.title} · ${detail.doctor.currentPatients}/${detail.doctor.maxPatients}` : '未分配责任医生'}
                    </div>
                  </div>
                  <div className="col-span-2 rounded-lg bg-amber-50 p-3">
                    <div className="flex items-center gap-1 text-amber-700 font-medium text-xs">
                      <MapPin size={13} /> 服务范围
                    </div>
                    <div className="mt-1 text-slate-700 text-xs flex flex-wrap gap-1">
                      {detail.team?.serviceScope?.length ? detail.team.serviceScope.map((s) => (
                        <span key={s} className="rounded bg-white px-2 py-0.5 border border-amber-200">{s}</span>
                      )) : '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <CheckSquare size={16} /> 审核项
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { k: 'teamCapacityCheck', l: '团队容量是否在阈值以内', d: `当前 ${detail.team?.currentCapacity}/${detail.team?.maxCapacity}` },
                    { k: 'doctorAssignmentCheck', l: '责任医生已分配（慢病包必填）', d: detail.doctor?.name || '未分配' },
                    { k: 'serviceScopeConfig', l: '服务范围配置已核对', d: detail.team?.serviceScope?.join('、') || '—' },
                    { k: 'followupPlanConfig', l: '上门随访安排已配置', d: '签约通过后自动生成随访计划' },
                  ].map((i: any) => (
                    <label key={i.k} className="flex items-start gap-3 rounded-md border border-slate-200 p-2.5 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(opts as any)[i.k]}
                        onChange={(e) => setOpts({ ...opts, [i.k]: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-700">{i.l}</div>
                        <div className="text-xs text-slate-500">{i.d}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-xs text-slate-500">审核意见</label>
                  <textarea
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value)}
                    rows={3}
                    placeholder="请填写审核意见（可选）"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => doAction('approve')}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 size={15} /> {loading ? '处理中...' : '审核通过'}
                  </button>
                  <button
                    onClick={() => doAction('reject')}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <XCircle size={15} /> 驳回
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
