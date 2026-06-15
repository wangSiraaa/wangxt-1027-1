import { useEffect, useMemo, useState } from 'react';
import { useData, type Package, type Resident, type Team, type Doctor, type Validation } from '../store/data';
import { Package as PackageIcon, CheckCircle2, XCircle, AlertTriangle, Info, Stethoscope, Users as UsersIcon, Star, User as UserIcon, Shield, Send } from 'lucide-react';

const chronicOptions = ['高血压', '糖尿病', '冠心病', '慢阻肺', '脑卒中', '恶性肿瘤', '精神疾病', '老年病'];

export default function ResidentSelect() {
  const { packages, residents, teams, loadMaster, validate, createContract, loadContracts } = useData();
  const [residentId, setResidentId] = useState('RES001');
  const [packageId, setPackageId] = useState('PKG001');
  const [teamId, setTeamId] = useState('TEAM001');
  const [doctorId, setDoctorId] = useState<string | undefined>();
  const [chronicTags, setChronicTags] = useState<string[]>([]);
  const [renewal, setRenewal] = useState(false);
  const [validations, setValidations] = useState<Validation[] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [summary, setSummary] = useState('');
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMaster();
  }, []);

  const resident = useMemo(() => residents.find((r) => r.id === residentId), [residentId, residents]);
  const pkg = useMemo(() => packages.find((p) => p.id === packageId), [packageId, packages]);
  const team = useMemo(() => teams.find((t) => t.id === teamId), [teamId, teams]);
  const availableDoctors: Doctor[] = useMemo(() => {
    if (!team) return [];
    const list = team.doctors || [];
    return list;
  }, [team]);

  useEffect(() => {
    if (resident && pkg && resident.community) {
      const communityTeams = teams.filter((t) => t.community === resident.community);
      if (communityTeams.length && !communityTeams.some((t) => t.id === teamId)) {
        setTeamId(communityTeams[0].id);
      }
    }
  }, [resident, teams]);

  useEffect(() => {
    setDoctorId(undefined);
  }, [teamId]);

  useEffect(() => {
    if (!resident || !pkg) {
      setValidations(null);
      return;
    }
    const t = setTimeout(async () => {
      const data: any = { residentId, packageId, teamId, chronicTags };
      if (doctorId) data.doctorId = doctorId;
      const r = await validate(data);
      setValidations(r.validations);
      setBlocked(r.blocked);
      setSummary(r.summary);
    }, 150);
    return () => clearTimeout(t);
  }, [residentId, packageId, teamId, doctorId, chronicTags]);

  const toggleTag = (t: string) => {
    setChronicTags((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]));
  };

  const doSubmit = async () => {
    if (!resident || !pkg || !team || blocked) return;
    setLoading(true); setSubmitResult(null);
    const data: any = { residentId, packageId, teamId, chronicTags, renewalIntention: renewal };
    if (doctorId) data.doctorId = doctorId;
    const r = await createContract(data);
    setSubmitResult(r);
    setLoading(false);
    loadContracts();
  };

  const demoCases = [
    { label: '场景1：欠费居民选慢病包（拦截）', residentId: 'RES003', packageId: 'PKG002', teamId: 'TEAM001', doctorId: 'DOC001' },
    { label: '场景2：慢病包无责任医生（拦截）', residentId: 'RES002', packageId: 'PKG002', teamId: 'TEAM001', doctorId: '' },
    { label: '场景3：正常签约（免费基础包）', residentId: 'RES001', packageId: 'PKG001', teamId: 'TEAM001', doctorId: '' },
    { label: '场景4：慢病包正常签约', residentId: 'RES002', packageId: 'PKG002', teamId: 'TEAM001', doctorId: 'DOC001' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <PackageIcon size={24} className="text-blue-600" /> 居民选包签约
          </h1>
          <p className="text-sm text-slate-500 mt-1">选择签约居民、签约包、医生团队，实时查看规则校验结果</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 mb-3 font-semibold text-amber-800">
          <Star size={18} /> 快速演示场景（点击切换）
        </div>
        <div className="flex flex-wrap gap-2">
          {demoCases.map((c) => (
            <button
              key={c.label}
              onClick={() => {
                setResidentId(c.residentId);
                setPackageId(c.packageId);
                setTeamId(c.teamId);
                setDoctorId(c.doctorId || undefined);
              }}
              className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-800 hover:bg-amber-100 transition-colors"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
              <UserIcon size={18} className="text-blue-500" /> 1. 选择签约居民
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 block">
                <span className="text-xs text-slate-500">居民</span>
                <select
                  value={residentId}
                  onChange={(e) => setResidentId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.idCard.slice(-6)} · {r.community} · {r.age}岁
                      {r.hasArrears ? ' · 欠费' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {resident && (
                <div className="sm:col-span-2 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm">
                  <div><span className="text-slate-500">姓名：</span><span className="font-medium">{resident.name}</span></div>
                  <div><span className="text-slate-500">性别/年龄：</span><span>{resident.gender === 'male' ? '男' : '女'}，{resident.age}岁</span></div>
                  <div><span className="text-slate-500">电话：</span><span>{resident.phone}</span></div>
                  <div><span className="text-slate-500">社区：</span><span>{resident.community}</span></div>
                  <div className="col-span-2">
                    <span className="text-slate-500">地址：</span>{resident.address}
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">慢病标签：</span>
                    {resident.chronicTags.length ? (
                      resident.chronicTags.map((t) => (
                        <span key={t} className="ml-1 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700">{t}</span>
                      ))
                    ) : <span className="text-slate-400 text-xs">无</span>}
                  </div>
                  <div className="col-span-2">
                    {resident.hasArrears ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                        <Shield size={12} /> 欠费限制 · ¥{resident.arrearsAmount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={12} /> 信用良好 · 无欠费
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
              <PackageIcon size={18} className="text-blue-500" /> 2. 选择签约包
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {packages.map((p) => {
                const active = packageId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPackageId(p.id)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      active ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                          p.type === 'free' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {p.type === 'free' ? '免费' : '付费'} · {p.category === 'basic' ? '基础包' : '慢病包'}
                        </div>
                        <div className={`mt-2 text-lg font-bold ${active ? 'text-blue-700' : 'text-slate-800'}`}>{p.name}</div>
                        <p className="mt-1 text-xs text-slate-500">{p.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-slate-700">{p.price === 0 ? '免费' : `¥${p.price}`}</div>
                        {p.subsidyAmount > 0 && <div className="text-xs text-emerald-600">卫健补贴 ¥{p.subsidyAmount}</div>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.services.map((s) => (
                        <span key={s} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{s}</span>
                      ))}
                      {p.requiresDoctor && (
                        <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700 flex items-center gap-0.5">
                          <Stethoscope size={10} /> 必须绑定医生
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
              <UsersIcon size={18} className="text-emerald-500" /> 3. 分配团队与责任医生
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs text-slate-500">医生团队</span>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {teams.filter((t) => !resident || t.community === resident.community || true).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.community} · {t.currentCapacity}/{t.maxCapacity}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">责任医生（慢病包必填）</span>
                <select
                  value={doctorId || ''}
                  onChange={(e) => setDoctorId(e.target.value || undefined)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  disabled={!team}
                >
                  <option value="">不指定（基础包可选）</option>
                  {availableDoctors.map((d) => (
                    <option key={d.id} value={d.id} disabled={!d.isAvailable}>
                      {d.name}（{d.title}）{d.isAvailable ? '' : ' · 不可用'} · {d.currentPatients}/{d.maxPatients}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
              <Star size={18} className="text-rose-500" /> 4. 慢病标签与续约意向
            </h3>
            <div>
              <div className="text-xs text-slate-500 mb-2">慢病标签（可多选）</div>
              <div className="flex flex-wrap gap-2">
                {chronicOptions.map((t) => {
                  const checked = chronicTags.includes(t) || resident?.chronicTags.includes(t);
                  const preset = resident?.chronicTags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => !preset && toggleTag(t)}
                      disabled={preset}
                      className={`rounded-full px-3 py-1 text-xs border transition-all ${
                        preset
                          ? 'bg-slate-200 border-slate-300 text-slate-600 cursor-not-allowed'
                          : checked
                            ? 'bg-rose-500 border-rose-500 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
                      }`}
                    >
                      {t}{preset && ' · 既有'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div>
                <div className="font-semibold text-slate-700 text-sm">到期后是否续约？</div>
                <div className="text-xs text-slate-500">选择后签约到期前30天会自动提醒</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={renewal} onChange={(e) => setRenewal(e.target.checked)} className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-xl border p-5 shadow-sm ${blocked ? 'border-rose-300 bg-gradient-to-b from-rose-50' : (summary && !blocked ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50')}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 font-semibold">
                <Info size={18} className={blocked ? 'text-rose-600' : 'text-blue-600'} /> 规则校验结果
              </h3>
              {blocked ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500 px-2 py-1 text-xs font-bold text-white">
                  <XCircle size={12} /> 拦截
                </span>
              ) : summary ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-xs font-bold text-white">
                  <AlertTriangle size={12} /> 提示
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-xs font-bold text-white">
                  <CheckCircle2 size={12} /> 通过
                </span>
              )}
            </div>
            {summary && <div className="text-sm font-medium text-slate-700 mb-3">{summary}</div>}
            {validations && (
              <ul className="space-y-2 text-xs">
                {validations.map((v, i) => (
                  <li key={i} className={`flex items-start gap-2 rounded-md border p-2.5 ${
                    v.blocked ? 'border-rose-200 bg-white text-rose-700'
                      : !v.valid ? 'border-amber-200 bg-white text-amber-700'
                      : 'border-emerald-200 bg-white text-emerald-700'
                  }`}>
                    {v.blocked ? <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                      : !v.valid ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                      : <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />}
                    <div>
                      <div className="font-semibold">[{v.code}]</div>
                      <div className="mt-0.5 leading-snug">{v.message}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={doSubmit}
              disabled={blocked || loading || !resident || !pkg}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                blocked ? 'bg-slate-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg'
              }`}
            >
              <Send size={16} /> {loading ? '提交中...' : (blocked ? '存在拦截规则，无法提交' : '提交签约（等待审核）')}
            </button>
            {submitResult && (
              <div className={`mt-3 rounded-lg p-3 text-xs ${submitResult.code === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                <div className="font-semibold mb-1">{submitResult.message}</div>
                {submitResult.data?.contract && (
                  <div>签约单号：{submitResult.data.contract.id} · 状态：{submitResult.data.contract.status}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
