import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../../lib/StudentAuthContext';
import { clearStudentTokens } from '../../lib/studentApi';

export function StudentLayout({ children }: { children: ReactNode }) {
  const { student, setStudent } = useStudentAuth();
  const navigate = useNavigate();
  const isOwnerPreview = sessionStorage.getItem('studentImpersonationByOwner') === 'true';

  function handleLogout() {
    clearStudentTokens();
    setStudent(null);
    sessionStorage.removeItem('studentImpersonationByOwner');
    navigate('/student/login');
  }

  function handleReturnToOwner() {
    clearStudentTokens();
    setStudent(null);
    sessionStorage.removeItem('studentImpersonationByOwner');
    navigate('/owner/students');
  }

  return (
    <div className="min-h-screen">
      {isOwnerPreview && (
        <div className="bg-amber-400 text-amber-950 text-sm px-4 py-2 flex justify-between items-center">
          <span>وضع معاينة — تتصفح حساب هذا الطالب كمالك للمنصة</span>
          <button onClick={handleReturnToOwner} className="bg-amber-950 text-white px-3 py-1 rounded-lg text-xs font-semibold">
            العودة للوحة المالك
          </button>
        </div>
      )}
      <div className="bg-navy text-white px-6 py-4 flex justify-between items-center">
        <div className="font-bold">الامتحانات</div>
        <div className="flex items-center gap-4 text-sm">
          <span>{student?.name}</span>
          <button onClick={handleLogout} className="border border-white px-3 py-1 rounded-lg">
            تسجيل الخروج
          </button>
        </div>
      </div>
      <div className="max-w-3xl mx-auto p-6">{children}</div>
    </div>
  );
}
