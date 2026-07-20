import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { TeacherLayout } from './TeacherLayout';

interface Grade { id: string; studentId: string; score: number; feedback: string | null; }
interface Assessment {
  id: string; title: string; type: string; maxScore: number; date: string;
  grades: Grade[];
}
interface StudentRow { id: string; name: string; }

const TYPE_LABEL: Record<string, string> = {
  exam: 'امتحان', quiz: 'اختبار قصير', homework: 'واجب', participation: 'مشاركة',
};

export function TeacherSubjectPage() {
  const { subjectId } = useParams();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'exam', maxScore: 100, date: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState('');
  const [openGradeEntry, setOpenGradeEntry] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function load() {
    api.get(`/subjects/${subjectId}/assessments`).then(res => setAssessments(res.data));
    api.get('/students').then(res => setStudents(res.data));
  }
  useEffect(load, [subjectId]);

  async function handleCreateAssessment(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/subjects/${subjectId}/assessments`, form);
      setShowForm(false);
      setForm({ title: '', type: 'exam', maxScore: 100, date: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  async function handleDeleteAssessment(id: string) {
    if (!confirm('حذف هذا التقييم وكل الدرجات المرتبطة به؟')) return;
    await api.delete(`/assessments/${id}`);
    load();
  }

  function openGrading(assessment: Assessment) {
    const initial: Record<string, string> = {};
    students.forEach(s => {
      const existing = assessment.grades.find(g => g.studentId === s.id);
      initial[s.id] = existing ? String(existing.score) : '';
    });
    setScores(initial);
    setOpenGradeEntry(assessment.id);
  }

  async function handleSubmitGrades(assessmentId: string) {
    setSaving(true);
    try {
      const grades = Object.entries(scores)
        .filter(([, v]) => v !== '')
        .map(([studentId, v]) => ({ studentId, score: Number(v) }));
      await api.post(`/assessments/${assessmentId}/grades`, { grades });
      setOpenGradeEntry(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء حفظ الدرجات');
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout>
      <Link to="/teacher/subjects" className="text-navy text-sm mb-4 inline-block">← رجوع للمواد</Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-navy">التقييمات</h1>
        <button onClick={() => setShowForm(v => !v)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold text-sm">
          + تقييم جديد
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateAssessment} className="bg-white rounded-xl shadow-sm p-5 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">عنوان التقييم</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="امتحان منتصف الفصل" />
          </div>
          <div>
            <label className="text-sm text-gray-600">النوع</label>
            <select className="w-full border rounded-lg px-3 py-2 mt-1" value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="exam">امتحان</option>
              <option value="quiz">اختبار قصير</option>
              <option value="homework">واجب</option>
              <option value="participation">مشاركة</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">الدرجة النهائية</label>
            <input type="number" min={1} className="w-full border rounded-lg px-3 py-2 mt-1" value={form.maxScore}
              onChange={e => setForm({ ...form, maxScore: Number(e.target.value) })} required />
          </div>
          <div>
            <label className="text-sm text-gray-600">التاريخ</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 mt-1" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}
          <div className="col-span-2">
            <button className="bg-navy text-white px-5 py-2 rounded-lg font-semibold">حفظ</button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {assessments.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">{a.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {TYPE_LABEL[a.type]} · من {a.maxScore} · {new Date(a.date).toLocaleDateString('ar-EG')} · {a.grades.length}/{students.length} تم رصدها
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openGrading(a)} className="bg-navy text-white text-xs px-3 py-2 rounded-lg font-semibold">
                  رصد الدرجات
                </button>
                <button onClick={() => handleDeleteAssessment(a.id)} className="text-xs border border-red-300 text-red-600 rounded-lg px-3 py-2">
                  حذف
                </button>
              </div>
            </div>

            {openGradeEntry === a.id && (
              <div className="mt-4 border-t pt-4">
                <div className="flex flex-col gap-2 mb-4">
                  {students.map(s => (
                    <div key={s.id} className="flex justify-between items-center gap-3">
                      <span className="text-sm flex-1">{s.name}</span>
                      <input
                        type="number" min={0} max={a.maxScore} step={0.5}
                        className="w-24 border rounded-lg px-2 py-1 text-sm"
                        value={scores[s.id] ?? ''}
                        onChange={e => setScores({ ...scores, [s.id]: e.target.value })}
                        placeholder={`من ${a.maxScore}`}
                      />
                    </div>
                  ))}
                  {students.length === 0 && <p className="text-sm text-gray-400">لا يوجد طلاب مرتبطون بحسابك</p>}
                </div>
                <div className="flex gap-2">
                  <button disabled={saving} onClick={() => handleSubmitGrades(a.id)}
                    className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
                    {saving ? 'جارٍ الحفظ...' : 'حفظ الدرجات'}
                  </button>
                  <button onClick={() => setOpenGradeEntry(null)} className="border px-4 py-2 rounded-lg text-sm">
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {assessments.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">لا يوجد تقييمات بعد</div>
        )}
      </div>
    </TeacherLayout>
  );
}
