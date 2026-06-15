import { useEffect, useState } from 'react';
import { useData, type Service, type Followup } from '../store/data';
import api from '../api/client';
import { ClipboardList, RefreshCw, Calendar, Stethoscope, MapPin, CheckCircle2, Clock, FileText } from 'lucide-react';

export default function ServiceLedger() {
  const [tab, setTab] = useState<'service' | 'followup' | 'referral'>('service');
  const [services, setServices] = useState<Service[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const { loadMaster } = useData();

  useEffect(() => {
    loadMaster();
    refresh();
  }, [tab]);

  const refresh = async () => {
    if (tab === 'service') {
      const r = await api.get<Service[]>('/biz/services');
      setServices(r.data || []);
    } else if (tab === 'followup') {
      const r = await api.get<Followup[]>('/biz/followups');
      setFollowups(r.data || []);
    } else {
      const r = await api.get('/biz/referrals');
      setReferrals(r.data || []);
    }
  };

  const completeFollowup = async (id: string) => {
    await api.post(`/biz/followups/${id}/complete`, { result: '随访完成，居民状态良好' });
    refresh();
  };

  const addService = async () => {
    if (followups.length === 0) return;
    const f = followups[0];
    const demo = {
      contractId: f.contractId,
      residentId: f.residentId,
      doctorId: f.doctorId,
      serviceType: f.type === 'home' ? '上门随访服务' : (f.type === 'clinic' ? '门诊诊疗' : '电话咨询'),
      serviceDate: new Date().toISOString().slice(0, 10),
      serviceContent: '血压、血糖监测，用药指导，健康宣教',
      duration: 30,
      location: f.type === 'home' ? '居民家中' : '社区卫生服务中心',
      result: '正常',
      notes: '系统自动生成演示记录',
    };
    await api.post('/biz/services', demo);
    refresh();
  };

  const typeMap: Record<string, { label: string; color: string }> = {
    home: { label: '上门随访', color: 'bg-emerald-100 text-emerald-700' },
    clinic: { label: '门诊就诊', color: 'bg-sky-100 text-sky-700' },
    phone: { label: '电话随访', color: 'bg-violet-100 text-violet-700' },
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    scheduled: { label: '待执行', color: 'bg-amber-100 text-amber-700' },
    completed: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: '已取消', color: 'bg-slate-100 text-slate-600' },
    pending: { label: '待接受', color: 'bg-amber-100 text-amber-700' },
    accepted: { label: '已接收', color: 'bg-sky-100 text-sky-700' },
    rejected: { label: '已拒绝', color: 'bg-rose-100 text-rose-700' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList size={24} className="text-sky-600" /> 服务台账
          </h1>
          <p className="text-sm text-slate-500 mt-1">上门随访、门诊记录、转诊过程全记录</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addService}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
          >
            + 新增演示记录
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            <RefreshCw size={15} /> 刷新
          </button>
        </div>
      </div>

      <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {([
          ['service', '服务记录', FileText],
          ['followup', '随访安排', Calendar],
          ['referral', '转诊记录', ClipboardList],
        ] as const).map(([k, l, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-all ${
              tab === k ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {tab === 'service' && (
          services.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              暂无服务记录，点击"新增演示记录"生成示例
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">服务时间</th>
                  <th className="px-4 py-2 text-left">类型</th>
                  <th className="px-4 py-2 text-left">居民</th>
                  <th className="px-4 py-2 text-left">医生</th>
                  <th className="px-4 py-2 text-left">地点</th>
                  <th className="px-4 py-2 text-left">服务内容</th>
                  <th className="px-4 py-2 text-left">结果</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{s.serviceDate}{s.duration && <span className="ml-1 text-xs text-slate-400">({s.duration}分钟)</span>}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{s.serviceType}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{s.resident?.name || s.residentId}</td>
                    <td className="px-4 py-3 text-slate-600">{s.doctor?.name || s.doctorId}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.location || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{s.serviceContent}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${s.result ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {s.result || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'followup' && (
          followups.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              暂无随访安排，签约审批通过后自动生成随访计划
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">计划时间</th>
                  <th className="px-4 py-2 text-left">方式</th>
                  <th className="px-4 py-2 text-left">居民</th>
                  <th className="px-4 py-2 text-left">责任医生</th>
                  <th className="px-4 py-2 text-left">备注</th>
                  <th className="px-4 py-2 text-left">状态</th>
                  <th className="px-4 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {followups.slice(0, 30).map((f) => (
                  <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-700">{f.planDate}</div>
                      <div className="text-xs text-slate-400">{f.planTime}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${typeMap[f.type]?.color || ''}`}>
                        {typeMap[f.type]?.label || f.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{f.resident?.name || f.residentId}</td>
                    <td className="px-4 py-3 text-slate-600 flex items-center gap-1">
                      <Stethoscope size={12} /> {f.doctor?.name || f.doctorId}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{f.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${statusMap[f.status]?.color || ''}`}>
                        {statusMap[f.status]?.label || f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.status === 'scheduled' && (
                        <button
                          onClick={() => completeFollowup(f.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={12} /> 完成
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'referral' && (
          referrals.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              暂无转诊记录
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">申请时间</th>
                  <th className="px-4 py-2 text-left">居民</th>
                  <th className="px-4 py-2 text-left">转出医生</th>
                  <th className="px-4 py-2 text-left">转诊原因</th>
                  <th className="px-4 py-2 text-left">去向</th>
                  <th className="px-4 py-2 text-left">状态</th>
                  <th className="px-4 py-2 text-left">处理结果</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{r.referralDate}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{r.resident?.name || r.residentId}</td>
                    <td className="px-4 py-3 text-slate-600">{r.fromDoctor?.name || r.fromDoctorId}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{r.reason}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.toDoctor?.name || r.toHospital || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${statusMap[r.status]?.color || ''}`}>
                        {statusMap[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{r.outcome || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
