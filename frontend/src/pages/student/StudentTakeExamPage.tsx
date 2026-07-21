import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentApi } from '../../lib/studentApi';
import { StudentLayout } from './StudentLayout';

interface Question {
  id: string;
  type: 'mcq' | 'truefalse' | 'short';
  text: string;
  options: string[] | null;
}
interface ExamDetail {
  id: string;
  title: string;
  duration: number;
  questions: Question[];
}

export function StudentTakeExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number>(0);
  const endTimeRef = useRef<number>(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    studentApi.get(`/student/exams/${examId}`).then(res => {
      setExam(res.data);
      endTimeRef.current = Date.now() + res.data.duration * 60 * 1000;
    });
  }, [examId]);

  useEffect(() => {
    if (!exam) return;
    const interval = setInterval(() => {
      const left = Math.max(0, endTimeRef.current - Date.now());
      setRemaining(left);
      if (left <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        clearInterval(interval);
        handleSubmit(true);
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam]);

  function setAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(auto = false) {
    if (submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      };
      await studentApi.post(`/student/exams/${examId}/submit`, payload);
      navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء التسليم');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  if (!exam) return <StudentLayout><p className="text-gray-400">جارٍ التحميل...</p></StudentLayout>;

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <StudentLayout>
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#F4F5F7] py-2 z-10">
        <h1 className="text-xl font-bold text-navy">{exam.title}</h1>
        <div className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {exam.questions.map((q, i) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="font-semibold mb-3">{i + 1}. {q.text}</div>
            {(q.type === 'mcq' || q.type === 'truefalse') && q.options ? (
              q.options.map(opt => (
                <label key={opt} className="flex items-center gap-2 border rounded-lg p-2 mb-2 cursor-pointer">
                  <input
                    type="radio" name={`q_${q.id}`} value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))
            ) : (
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
                value={answers[q.id] || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                placeholder="اكتب إجابتك هنا"
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm my-3">{error}</p>}

      <button
        onClick={() => handleSubmit(false)}
        disabled={submitting}
        className="bg-navy text-white px-6 py-3 rounded-lg font-semibold mt-4 disabled:opacity-60"
      >
        {submitting ? 'جارٍ التسليم...' : 'تسليم الامتحان'}
      </button>
    </StudentLayout>
  );
}
