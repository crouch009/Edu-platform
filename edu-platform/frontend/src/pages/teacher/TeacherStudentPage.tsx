import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { TeacherLayout } from './TeacherLayout';
import { StudentGradesView } from '../../components/StudentGradesView';
import { StudentLoginCredentialsForm } from '../../components/StudentLoginCredentialsForm';

interface ReportRow {
  id: string;
  title: string;
  status: 'draft' | 'published';
  createdAt: string;
  files: { id: string; fileType: string }[];
}

interface StudentDetail {
  id: string;
  name: string;
  grade: string | null;
  className: string | null;
  loginEmail: string | null;
  parent: { name: string; email: string } | null;
  reports: ReportRow[];
}

export function TeacherStudentPage() {
  const { studentId } = useParams();
  const [student, setStudent] = useState<StudentDetail | null>(null);

  function load() {
    api.get(`/students/${studentId}`).then(res => setStudent(res.data));
  }
  useEffect(load, [studentId]);

  if (!student) return <TeacherLayout><p className="text-gray-400">جارٍ التحميل...</p></TeacherLayout>;

  return (
    <TeacherLayout>
      <Link to="/teacher/dashboard" className="text-navy text-sm mb-4 inline-block">← رجوع لطلابي</Link>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-xl font-bold text-navy">{student.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {student.grade || '—'} {student.className ? `· ${student.className}` : ''}
        </p>
        <p className="text-sm text-gray-500">
          ولي الأمر: {student.parent ? `${student.parent.name} (${student.parent.email})` : 'غير مرتبط'}
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">التقارير</h2>
        <Link to={`/teacher/students/${student.id}/reports/new`}
          className="bg-accent text-white px-4 py-2 rounded-lg font-semibold text-sm">
          + تقرير جديد
        </Link>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {student.reports.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400">لا يوجد تقارير بعد</div>
        )}
        {student.reports.map(r => (
          <Link key={r.id} to={`/teacher/reports/${r.id}`}
            className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center hover:shadow-md transition">
            <div>
              <div className="font-semibold">{r.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(r.createdAt).toLocaleDateString('ar-EG')} · {r.files.length} ملف مرفق
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {r.status === 'published' ? 'منشور' : 'مسودة'}
            </span>
          </Link>
        ))}
      </div>

      <h2 className="font-bold text-lg mb-4">الدرجات</h2>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <StudentGradesView studentId={student.id} />
      </div>

      <StudentLoginCredentialsForm studentId={student.id} currentEmail={student.loginEmail} />
    </TeacherLayout>
  );
}
