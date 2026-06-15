import { useEffect } from 'react';
import { useData, type RenewalReminder } from '../store/data';
import { Bell, Calendar, AlertTriangle, CheckCircle2, RefreshCw, User as UserIcon } from 'lucide-react';

export default function RenewalReminder() {
  const { renewalReminders, loadRenewal, residents, loadMaster } = useData();

  useEffect(() => {
    loadMaster();
    loadRenewal();
  }, []);

  const urgent = renewalReminders.filter((r: RenewalReminder) => r.urgent);
  const normal = renewalReminders.filter((r: RenewalReminder) => !r.urgent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bell size={24} className="text-amber-600" /> 续约提醒
          </h1>
          <p className="text-sm text-slate-500 mt-1">到期前提醒，续约审批过程完整留痕</p>
        </div>
        <button
          onClick={loadRenewal}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          <RefreshCw size={15} /> 刷新
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500 text-white"><AlertTriangle size={24} /></div>
            <div>
              <div className="text-sm text-rose-600">7天内到期</div>
              <div className="text-3xl font-bold text-rose-700">{urgent.length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white"><Calendar size={24} /></div>
            <div>
              <div className="text-sm text-amber-600">即将到期</div>
              <div className="text-3xl font-bold text-amber-700">{normal.length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white"><CheckCircle2 size={24} /></div>
            <div>
              <div className="text-sm text-emerald-600">本月续约提醒总数</div>
              <div className="text-3xl font-bold text-emerald-700">{renewalReminders.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">续约提醒列表（按剩余天数排序）</div>
        {renewalReminders.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            🎉 暂无即将到期的签约，居民签约全部在有效期内
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">居民</th>
                <th className="px-4 py-2 text-left">签约包</th>
                <th className="px-4 py-2 text-left">所属团队</th>
                <th className="px-4 py-2 text-left">签约期</th>
                <th className="px-4 py-2 text-left">到期时间</th>
                <th className="px-4 py-2 text-left">剩余天数</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {renewalReminders.map((r: RenewalReminder) => (
                <tr key={r.contract.id} className={`border-t border-slate-100 ${r.urgent ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700"><UserIcon size={14} /></div>
                      <div>
                        <div className="font-medium text-slate-800">{r.resident?.name || r.contract.residentId}</div>
                        <div className="text-xs text-slate-500">{r.resident?.community} · {r.resident?.age}岁</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${r.package?.type === 'free' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {r.package?.type === 'free' ? '免费' : '付费'}
                    </div>
                    <div className="mt-1 font-medium text-slate-700">{r.package?.name}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.team?.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.contract.startDate} <br />→ {r.contract.endDate}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{r.contract.endDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${r.urgent ? 'bg-rose-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                      {r.urgent ? <AlertTriangle size={11} /> : <Calendar size={11} />} 剩 {r.daysLeft} 天
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                      发起续约
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
