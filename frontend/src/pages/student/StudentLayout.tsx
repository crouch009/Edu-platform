import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../../lib/StudentAuthContext';
import { clearStudentTokens } from '../../lib/studentApi';

export function StudentLayout({ children }: { children: ReactNode }) {
  const { student, setStudent } = useStudentAuth();
  const navigate = useNavigate();

  function handleLogout() {
    clearStudentTokens();
    setStudent(null);
    navigate('/student/login');
  }

  return (
    <div className="min-h-screen">
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
