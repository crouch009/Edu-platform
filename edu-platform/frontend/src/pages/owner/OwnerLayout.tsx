import { ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { api, clearTokens } from '../../lib/api';

export function OwnerLayout({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [branding, setBranding] = useState<{ siteName: string | null; logoUrl: string | null }>({ siteName: null, logoUrl: null });

  useEffect(() => {
    api.get('/platform-settings').then(res => setBranding(res.data)).catch(() => {});
  }, []);

  function handleLogout() {
    clearTokens();
    setUser(null);
    navigate('/login');
  }

  const logoSrc = branding.logoUrl ? `${api.defaults.baseURL?.replace('/api', '')}${branding.logoUrl}` : null;

  return (
    <div className="min-h-screen">
      <div className="bg-navy text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {logoSrc && <img src={logoSrc} alt="" className="h-8 w-8 rounded object-cover" />}
          <div className="font-bold">{branding.siteName || 'لوحة المالك'}</div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>{user?.name}</span>
          <button onClick={handleLogout} className="border border-white px-3 py-1 rounded-lg">
            تسجيل الخروج
          </button>
        </div>
      </div>
      <div className="flex">
        <nav className="w-52 bg-white border-l min-h-[calc(100vh-64px)] p-4 flex flex-col gap-2 text-sm">
          <Link to="/owner/dashboard" className="px-3 py-2 rounded-lg hover:bg-gray-100">اللوحة الرئيسية</Link>
          <Link to="/owner/users" className="px-3 py-2 rounded-lg hover:bg-gray-100">المستخدمون</Link>
          <Link to="/owner/students" className="px-3 py-2 rounded-lg hover:bg-gray-100">الطلاب</Link>
          <div className="border-t my-2"></div>
          <Link to="/teacher/curricula" className="px-3 py-2 rounded-lg hover:bg-gray-100">المناهج</Link>
          <Link to="/teacher/questions" className="px-3 py-2 rounded-lg hover:bg-gray-100">بنك الأسئلة</Link>
          <Link to="/teacher/exams" className="px-3 py-2 rounded-lg hover:bg-gray-100">الامتحانات</Link>
          <div className="border-t my-2"></div>
          <Link to="/owner/analytics" className="px-3 py-2 rounded-lg hover:bg-gray-100">تحليلات الأداء</Link>
          <Link to="/owner/audit-log" className="px-3 py-2 rounded-lg hover:bg-gray-100">سجل النشاط</Link>
          <Link to="/owner/settings" className="px-3 py-2 rounded-lg hover:bg-gray-100">الإعدادات</Link>
        </nav>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
