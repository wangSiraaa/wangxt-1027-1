import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home, UserPlus, FileCheck, BarChart3, Bell, ClipboardList, Users, BookOpen, LogOut, Stethoscope,
} from 'lucide-react';
import { useAuth } from '../store/auth';

const navItems = [
  { to: '/', label: '首页总览', icon: Home, key: 'home' },
  { to: '/resident-select', label: '居民选包签约', icon: UserPlus, key: 'resident', role: ['resident', 'doctor', 'admin'] },
  { to: '/team-approval', label: '团队审核', icon: FileCheck, key: 'approval', role: ['doctor', 'admin'] },
  { to: '/admin-stats', label: '管理员统计', icon: BarChart3, key: 'admin', role: ['admin'] },
  { to: '/renewal-reminder', label: '续约提醒', icon: Bell, key: 'renewal', role: ['doctor', 'admin'] },
  { to: '/service-ledger', label: '服务台账', icon: ClipboardList, key: 'service', role: ['doctor', 'admin', 'resident'] },
  { to: '/team-transfer', label: '转团队审批', icon: Users, key: 'transfer', role: ['doctor', 'admin'] },
  { to: '/rule-explain', label: '规则解释', icon: BookOpen, key: 'rule' },
];

export default function Layout() {
  const { user, currentRole, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    localStorage.removeItem('contract-demo-role');
    nav('/login');
  };

  const roleLabel = { resident: '社区居民', doctor: '医生团队', admin: '卫健管理员', '': '访客' }[currentRole || ''];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
              <Stethoscope size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">社区家庭医生签约服务平台</h1>
              <p className="text-[11px] text-blue-100">规则透明 · 流程可视 · 数据可信</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
                <span className="text-xs text-blue-100">{roleLabel}</span>
                <span className="font-medium">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="ml-1 flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-white/25"
                >
                  <LogOut size={14} /> 退出
                </button>
              </div>
            ) : (
              <button
                onClick={() => nav('/login')}
                className="rounded-md bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"
              >
                登录
              </button>
            )}
          </div>
        </div>
        <nav className="mx-auto max-w-[1600px] px-6 pb-2">
          <ul className="flex flex-wrap gap-1">
            {navItems.map((it) => {
              const visible = !it.role || !user || it.role.includes(currentRole as any);
              if (!visible) return null;
              const Icon = it.icon;
              return (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-t-md px-4 py-2 text-sm transition-all ${
                        isActive
                          ? 'bg-slate-50 font-semibold text-blue-700 shadow-[0_-2px_0_0_white]'
                          : 'text-white/85 hover:bg-white/10'
                      }`
                    }
                  >
                    <Icon size={16} />
                    {it.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        © 2026 社区家庭医生签约服务平台 · 让居民选包、团队审核、卫健统计都能说得清规则
      </footer>
    </div>
  );
}
