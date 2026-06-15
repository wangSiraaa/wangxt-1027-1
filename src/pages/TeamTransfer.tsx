import { useEffect, useState } from 'react';
import { useData, type Contract } from '../store/data';
import api from '../api/client';
import { Users as UsersIcon, RefreshCw, ArrowLeftRight, FileCheck, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TeamTransfer() {
  const { loadMaster, teams, residents, contracts, loadContracts, approve } = useData();
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [showTransferModal, setShowTransferModal] = useState<Contract | null>(null);
  const [toTeamId, setToTeamId] = useState('');
  const [toDoctorId, setToDoctorId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [checks, setChecks] = useState({ capacity: false, scope: false, assignment: false, followup: false });
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadMaster();
    loadContracts();
  }, []);

  useEffect(() => {
    setActiveContracts(contracts.filter((c) => ['active', 'approved'].includes(c.status)));
  }, [contracts]);

  const targetTeamDoctors = teams.find((t) => t.id === toTeamId)?.doctors || [];

  const doTransfer = async () => {
    if (!showTransferModal) return;
    setLoading(true);
    const r = await approve({
      contractId: showTransferModal.id,
      action: 'transfer',
      opinion: reason || `居民转团队申请：从 ${showTransferModal.team?.name} 到 ${teams.find((t) => t.id === toTeamId)?.name}`,
      toTeamId,
      toDoctorId: toDoctorId || undefined,
      teamCapacityCheck: checks.capacity,
      doctorAssignmentCheck: checks.assignment,
      serviceScopeConfig: checks.scope,
      followupPlanConfig: checks.followup,
    });
    if (r.code === 0) {
      setShowTransferModal(null);
      setHistory([{ ...r, ts: new Date().toISOString() }, ...history].slice(0, 10));
      loadContracts();
    } else {
      alert(r.message);
    }
    setLoading(false);
  };

  const residentOfContract = (c: Contract) => residents.find((r) => r.id === c.residentId) || c.resident;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UsersIcon size={24} className="text-rose-600" /> 转团队审批
          </h1>
          <p className="text-sm text-slate-500 mt-1">跨团队转接审批流程完整留痕，保留审批过程</p>
        </div>
        <button
          onClick={() => { loadContracts(); }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            当前生效签约（可发起转团队）
          </div>
          {activeContracts.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              暂无生效签约，请先在居民选包页面创建并审批签约
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">居民</th>
                  <th className="px-4 py-2 text-left">签约包</th>
                  <th className="px-4 py-2 text-left">当前团队/医生</th>
                  <th className="px-4 py-2 text-left">签约期</th>
                  <th className="px-4 py-2 text-left">状态</th>
                  <th className="px-4 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {activeContracts.map((c) => {
                  const resident = residentOfContract(c);
                  return (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700"><UserIcon size={14} /></div>
                          <div>
                            <div className="font-medium text-slate-800">{resident?.name || c.residentId}</div>
                            <div className="text-xs text-slate-500">{resident?.community}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{c.package?.name}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{c.team?.name}</div>
                        <div className="text-xs text-slate-500">{c.doctor?.name || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {c.startDate}<br />→ {c.endDate}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-[11px] ${
                          c.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-sky-100 text-sky-700 border-sky-200'
                        }`}>
                          {c.status === 'active' ? '生效中' : '审批通过'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setShowTransferModal(c);
                            const residentCommunity = resident?.community;
                            const target = teams.find((t) => t.community === residentCommunity && t.id !== c.teamId);
                            setToTeamId(target?.id || teams[0]?.id || '');
                            setToDoctorId('');
                            setReason('');
                            setChecks({ capacity: false, scope: false, assignment: false, followup: false });
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                        >
                          <ArrowLeftRight size={12} /> 转团队
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-800 flex items-center gap-2">
              <FileCheck size={16} /> 转团队审批留痕
            </h3>
            {history.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">暂无转团队审批记录</div>
            ) : (
              <ul className="space-y-3">
                {history.map((h, i) => (
                  <li key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 size={12} /> {h.message}
                    </div>
                    <div className="mt-1 text-slate-600">签约单号：{h.data?.contract?.id}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            <div className="flex items-center gap-1 font-semibold mb-1.5">
              <AlertCircle size={14} /> 转团队审批规则
            </div>
            <ul className="space-y-1 text-amber-700">
              <li>· 目标团队容量不得超过 max_capacity</li>
              <li>· 慢病包必须重新分配目标团队责任医生</li>
              <li>· 服务范围必须覆盖居民所在社区</li>
              <li>· 上门随访计划需在目标团队重新配置</li>
              <li>· 审批过程完整记录审批人、时间、意见</li>
            </ul>
          </div>
        </div>
      </div>

      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !loading && setShowTransferModal(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4 text-white">
              <div className="flex items-center gap-2 text-lg font-bold">
                <ArrowLeftRight size={20} /> 转团队审批
              </div>
              <div className="text-xs text-rose-100 mt-0.5">完整留痕 · 容量校验 · 医生重配</div>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="text-slate-500">居民：</div><div className="text-slate-800 font-medium">{residentOfContract(showTransferModal)?.name || '-'}</div>
                  <div className="text-slate-500">当前签约包：</div><div className="text-slate-800">{showTransferModal.package?.name}</div>
                  <div className="text-slate-500">当前团队：</div><div className="text-slate-800">{showTransferModal.team?.name}</div>
                  <div className="text-slate-500">当前医生：</div><div className="text-slate-800">{showTransferModal.doctor?.name || '-'}</div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-slate-500">目标团队 *</span>
                  <select
                    value={toTeamId}
                    onChange={(e) => { setToTeamId(e.target.value); setToDoctorId(''); }}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">请选择</option>
                    {teams.filter((t) => t.id !== showTransferModal.teamId).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.community} · {t.currentCapacity}/{t.maxCapacity}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-500">
                    目标责任医生{showTransferModal.package?.requiresDoctor ? '（慢病包必填）' : ''}
                  </span>
                  <select
                    value={toDoctorId}
                    onChange={(e) => setToDoctorId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">暂不分配</option>
                    {targetTeamDoctors.filter((d: any) => d.isAvailable).map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}（{d.title}）· {d.currentPatients}/{d.maxPatients}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-500">转团队原因</span>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="如：居民搬家、医生调离、居民偏好等"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>

                <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-600 mb-2">审批核对项（请全部勾选）</div>
                  {[
                    { k: 'capacity', l: `目标团队容量阈值校验（${teams.find(t => t.id === toTeamId)?.currentCapacity || 0}/${teams.find(t => t.id === toTeamId)?.maxCapacity || 0}）` },
                    { k: 'scope', l: '目标团队服务范围覆盖居民所在社区' },
                    { k: 'assignment', l: '目标责任医生分配（慢病包必填）' },
                    { k: 'followup', l: '上门随访计划确认已配置或重新配置' },
                  ].map((i) => (
                    <label key={i.k} className="flex items-start gap-2 rounded p-2 hover:bg-slate-50 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(checks as any)[i.k]}
                        onChange={(e) => setChecks({ ...checks, [i.k]: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-slate-700">{i.l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setShowTransferModal(null)}
                disabled={loading}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={doTransfer}
                disabled={loading || !toTeamId || !Object.values(checks).every(Boolean)}
                className="flex-1 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <FileCheck size={15} /> {loading ? '审批中...' : '提交转团队审批'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
