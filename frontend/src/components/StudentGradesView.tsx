import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface GradeEntry {
  id: string; title: string; type: string; score: number; maxScore: number; feedback: string | null; date: string;
}
interface SubjectGrades {
  subjectId: string; subjectName: string; averagePercent: number; entries: GradeEntry[];
}
interface GradesSummary {
  subjects: SubjectGrades[];
  overallAveragePercent: number;
}

const TYPE_LABEL: Record<string, string> = {
  exam: 'امتحان', quiz: 'اختبار قصير', homework: 'واجب', participation: 'مشاركة',
};

function averageColor(percent: number) {
  if (percent >= 85) return 'text-green-700 bg-green-50';
  if (percent >= 60) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

export function StudentGradesView({ studentId }: { studentId: string }) {
  const [data, setData] = useState<GradesSummary | null>(null);

  useEffect(() => {
    api.get(`/students/${studentId}/grades`).then(res => setData(res.data));
  }, [studentId]);

  if (!data) return <p className="text-gray-400 text-sm">جارٍ التحميل...</p>;

  if (data.subjects.length === 0) {
    return <p className="text-gray-400 text-sm">لا يوجد درجات مرصودة بعد</p>;
  }

  return (
    <div>
      <div className={`inline-block px-4 py-2 rounded-lg font-bold mb-5 ${averageColor(data.overallAveragePercent)}`}>
        المعدل العام: {data.overallAveragePercent}%
      </div>

      <div className="flex flex-col gap-4">
        {data.subjects.map(subj => (
          <div key={subj.subjectId} className="border rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold">{subj.subjectName}</span>
              <span className={`text-sm px-2 py-1 rounded-full ${averageColor(subj.averagePercent)}`}>
                {subj.averagePercent}%
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {subj.entries.map(e => (
                <div key={e.id} className="flex justify-between items-center text-sm border-t pt-2">
                  <div>
                    <span className="font-medium">{e.title}</span>
                    <span className="text-gray-400 text-xs mr-2">
                      {TYPE_LABEL[e.type]} · {new Date(e.date).toLocaleDateString('ar-EG')}
                    </span>
                    {e.feedback && <div className="text-xs text-gray-500 mt-1">{e.feedback}</div>}
                  </div>
                  <span className="font-semibold">{e.score}/{e.maxScore}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
