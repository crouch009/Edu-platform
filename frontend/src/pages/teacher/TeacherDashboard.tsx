import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { TeacherLayout } from './TeacherLayout';

interface StudentRow {
  id: string;
  name: string;
  grade: string | null;
  className: string | null;
  parent: { name: string; email: string } | null;
  reports: { id: string; title: string; status: string }[];
}

export function TeacherDashboard() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [generatedCreds, setGeneratedCreds] = useState<{ studentId: string; name: string; email: string; password: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  function load() {
    api.get('/students').then(res => setStudents(res.data));
  }
  useEffect(load, []);

  async function handleGenerateCredentials() {
    if (!confirm('توليد بيانات دخول تلقائية لطلابك اللي ليس لديهم بيانات دخول بعد؟')) return;
    setGenerating(true);
    try {
      const { data } = await api.post('/students/generate-credentials');
      setGeneratedCreds(data);
    } finally {
      setGenerating(false);
    }
  }

  function downloadCredentialsCsv() {
    const header = 'الاسم,البريد الإلكتروني,كلمة المرور\n';
    const rows = generatedCreds.map(c => `${c.name},${c.email},${c.password}`).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-login-credentials.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <TeacherLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy">طلابي</h1>
        <button onClick={handleGenerateCredentials} disabled={generating}
          className="border border-navy text-navy px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-60">
          {generating ? 'جارٍ التوليد...' : 'توليد بيانات دخول لطلابي'}
        </button>
      </div>

      {generatedCreds.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">تم توليد {generatedCreds.length} حساب جديد</h3>
            <button onClick={downloadCredentialsCsv} className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold">
              تحميل CSV
            </button>
          </div>
          <p className="text-sm text-red-600 mb-3">احفظ كلمات المرور دي دلوقتي — مش هتقدر تشوفها تاني بعد كده.</p>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500"><th className="text-right py-1">الاسم</th><th className="text-right py-1">البريد</th><th className="text-right py-1">كلمة المرور</th></tr></thead>
            <tbody>
              {generatedCreds.map(c => (
                <tr key={c.studentId} className="border-t">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2" dir="ltr">{c.email}</td>
                  <td className="py-2 font-mono" dir="ltr">{c.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
          لا يوجد طلاب مرتبطون بحسابك بعد. تواصل مع مالك المنصة لربط الطلاب بك.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {students.map(s => (
          <Link key={s.id} to={`/teacher/students/${s.id}`}
            className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
            <div className="font-bold text-navy">{s.name}</div>
            <div className="text-sm text-gray-500 mt-1">
              {s.grade || '—'} {s.className ? `· ${s.className}` : ''}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              ولي الأمر: {s.parent?.name || 'غير مرتبط'}
            </div>
            <div className="text-xs text-accent mt-2 font-semibold">{s.reports.length} تقرير</div>
          </Link>
        ))}
      </div>
    </TeacherLayout>
  );
}
