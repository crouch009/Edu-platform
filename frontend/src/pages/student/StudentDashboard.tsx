import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentApi } from '../../lib/studentApi';
import { StudentLayout } from './StudentLayout';

interface ExamRow {
  id: string;
  title: string;
  duration: number;
  questionCount: number;
  completed: boolean;
  result: { score: number; total: number; percent: number } | null;
}

export function StudentDashboard() {
  const [exams, setExams] = useState<ExamRow[]>([]);

  useEffect(() => {
    studentApi.get('/student/exams').then(res => setExams(res.data));
  }, []);

  return (
    <StudentLayout>
      <h1 className="text-2xl font-bold text-navy mb-6">الامتحانات المتاحة</h1>
      <div className="flex flex-col gap-3">
        {exams.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">لا يوجد امتحانات متاحة حاليًا</div>
        )}
        {exams.map(e => (
          <div key={e.id} className="bg-white rounded-xl shadow-sm p-5 flex justify-between items-center">
            <div>
              <div className="font-bold">{e.title}</div>
              <div className="text-xs text-gray-500 mt-1">{e.questionCount} سؤال · {e.duration} دقيقة</div>
            </div>
            {e.completed && e.result ? (
              <span className={`text-sm px-3 py-1 rounded-full ${e.result.percent >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                تم الحل: {e.result.percent}%
              </span>
            ) : (
              <Link to={`/student/exams/${e.id}`} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold text-sm">
                بدء الامتحان
              </Link>
            )}
          </div>
        ))}
      </div>
    </StudentLayout>
  );
}
