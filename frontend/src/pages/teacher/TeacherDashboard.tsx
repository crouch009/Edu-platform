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

  useEffect(() => {
    api.get('/students').then(res => setStudents(res.data));
  }, []);

  return (
    <TeacherLayout>
      <h1 className="text-2xl font-bold text-navy mb-6">طلابي</h1>

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
