import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, Role } from '../store/auth';
import { Stethoscope, User, Shield, ShieldCheck } from 'lucide-react';

const roles: { key: Role; label: string; desc: string; icon: any; demo: string }[] = [
  { key: 'resident', label: '社区居民', desc: '选择签约包、查看服务记录', icon: User, demo: '110101198001011234' },
  { key: 'doctor', label: '医生团队', desc: '审核签约、配置随访、转团队', icon: Shield, demo: 'EMP001' },
  { key: 'admin', label: '卫健管理员', desc: '覆盖率统计、补贴核算、规则配置', icon: ShieldCheck, demo: 'admin' },
];

export default function Login() {
  const [role, setRole] = useState<Role>('admin');
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();

  const doLogin = async () => {
    setLoading(true); setErr('');
    try {
      const ok = await login(role, identifier, password);
      if (ok) {
        localStorage.setItem('contract-demo-role', role);
        nav('/');
      } else {
        setErr('登录失败，请检查账号密码');
      }
    } catch (e: any) {
      setErr(e.message || '登录异常');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (r: typeof roles[0]) => {
    setRole(r.key);
    setIdentifier(r.demo);
    setPassword('password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden grid md:grid-cols-2">
        <div className="p-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Stethoscope size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">社区家庭医生</h1>
                <p className="text-blue-100 text-sm">签约服务平台</p>
              </div>
            </div>
            <p className="mt-10 text-lg font-semibold leading-relaxed">
              让居民选包、团队审核、卫健统计，<br/>三方都能说得清规则
            </p>
            <ul className="mt-6 space-y-2 text-sm text-blue-100">
              <li>· 慢病包必须绑定责任医生</li>
              <li>· 签约期内不可重复签同类包</li>
              <li>· 欠费居民仅可选择免费基础包</li>
              <li>· 转团队与续约完整留痕审批</li>
            </ul>
          </div>
          <div className="text-xs text-blue-200 mt-10">演示账号密码：password</div>
        </div>
        <div className="p-10 flex flex-col">
          <h2 className="text-xl font-bold text-slate-800">欢迎登录</h2>
          <p className="text-sm text-slate-500 mt-1">请先选择您的身份</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {roles.map((r) => {
              const Icon = r.icon;
              const active = role === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => fillDemo(r)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    active ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <Icon size={22} className={active ? 'text-blue-600' : 'text-slate-400'} />
                  <div className={`mt-2 text-sm font-semibold ${active ? 'text-blue-700' : 'text-slate-700'}`}>{r.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs text-slate-500">账号</span>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="身份证号 / 工号 / admin"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">密码</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="请输入密码（演示：password）"
              />
            </label>
            {err && <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{err}</div>}
            <button
              onClick={doLogin}
              disabled={loading}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录平台'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
