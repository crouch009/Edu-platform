import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { ParentLayout } from './ParentLayout';
import { StudentGradesView } from '../../components/StudentGradesView';

interface StudentRow {
  id: string;
  name: string;
  grade: string | null;
  className: string | null;
  teacher: { name: string } | null;
  reports: { id: string; title: string; createdAt: string }[];
}

export function ParentDashboard() {
  const [students, setStudents] = useState<StudentRow[]>([]);

  useEffect(() => {
    api.get('/students').then(res => setStudents(res.data));
  }, []);

  return (
    <ParentLayout>
      <h1 className="text-2xl font-bold text-navy mb-6">أبنائي</h1>

      {students.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
          لا يوجد طلاب مرتبطون بحسابك بعد.
        </div>
      )}

      <div className="flex flex-col gap-5">
        {students.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="font-bold text-navy">{s.name}</div>
            <div className="text-sm text-gray-500 mt-1">
              {s.grade || '—'} {s.className ? `· ${s.className}` : ''} · المعلم: {s.teacher?.name || '—'}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {s.reports.length === 0 && <p className="text-sm text-gray-400">لا يوجد تقارير منشورة بعد</p>}
              {s.reports.map(r => (
                <Link key={r.id} to={`/parent/reports/${r.id}`}
                  className="flex justify-between items-center border rounded-lg p-3 hover:bg-gray-50 transition">
                  <span className="text-sm font-medium">{r.title}</span>
                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('ar-EG')}</span>
                </Link>
              ))}
            </div>

            <div className="mt-5 pt-5 border-t">
              <h3 className="font-bold text-sm mb-3">الدرجات</h3>
              <StudentGradesView studentId={s.id} />
            </div>
          </div>
        ))}
      </div>
    </ParentLayout>
  );
}
