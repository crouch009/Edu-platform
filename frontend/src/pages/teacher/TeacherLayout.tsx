import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { clearTokens } from '../../lib/api';

export function TeacherLayout({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    clearTokens();
    setUser(null);
    navigate('/login');
  }

  return (
    <div className="min-h-screen">
      <div className="bg-navy text-white px-6 py-4 flex justify-between items-center">
        <Link to="/teacher/dashboard" className="font-bold">لوحة المعلم</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/teacher/subjects" className="hover:underline">موادي الدراسية</Link>
          <Link to="/teacher/settings" className="hover:underline">الإعدادات</Link>
          <span>{user?.name}</span>
          <button onClick={handleLogout} className="border border-white px-3 py-1 rounded-lg">
            تسجيل الخروج
          </button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-6">{children}</div>
    </div>
  );
}
