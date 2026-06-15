import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-8xl font-black text-slate-200">404</div>
      <h2 className="mt-2 text-xl font-bold text-slate-700">页面不存在</h2>
      <p className="mt-1 text-sm text-slate-500">请检查地址是否正确，或返回首页。</p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        返回首页
      </Link>
    </div>
  );
}
