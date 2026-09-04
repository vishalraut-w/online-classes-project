'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Exam {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  created_at: string;
  submissions_count?: number;
}

interface QuestionInput {
  id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export default function AdminExamsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Stats & List State
  const [exams, setExams] = useState<Exam[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [loadingExams, setLoadingExams] = useState(true);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [questions, setQuestions] = useState<QuestionInput[]>([
    {
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
      explanation: '',
    },
  ]);

  const fetchDashboardData = async () => {
    setLoadingExams(true);
    try {
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (examsError) throw examsError;

      const { count, error: subError } = await supabase
        .from('exam_submissions')
        .select('*', { count: 'exact', head: true });

      if (subError) throw subError;
      setTotalSubmissions(count || 0);

      const examsWithCounts = await Promise.all(
        (examsData || []).map(async (exam) => {
          const { count: examSubCount } = await supabase
            .from('exam_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', exam.id);

          return { ...exam, submissions_count: examSubCount || 0 };
        })
      );

      setExams(examsWithCounts);
    } catch (err: any) {
      console.error('Error fetching admin data:', err.message);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const resetForm = () => {
    setEditingExamId(null);
    setTitle('');
    setStartTime('');
    setEndTime('');
    setDurationMinutes(60);
    setQuestions([
      {
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        explanation: '',
      },
    ]);
  };

  const handleOpenCreateForm = () => {
    resetForm();
    setActiveTab('form');
  };

  const handleEditExam = async (exam: Exam) => {
    setEditingExamId(exam.id);
    setTitle(exam.title);
    
    const formatForInput = (iso: string) => new Date(iso).toISOString().slice(0, 16);
    setStartTime(formatForInput(exam.start_time));
    setEndTime(formatForInput(exam.end_time));
    setDurationMinutes(exam.duration_minutes);

    const { data: questionsData } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', exam.id);

    if (questionsData && questionsData.length > 0) {
      setQuestions(
        questionsData.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          explanation: q.explanation || '',
        }))
      );
    }

    setActiveTab('form');
  };

  // DELETE EXAM HANDLER
  const handleDeleteExam = async (examId: string, examTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${examTitle}"?\n\nThis action cannot be undone and will delete all associated questions and student submissions.`
    );

    if (!confirmed) return;

    setDeletingId(examId);
    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId);

      if (error) throw error;

      alert('Exam deleted successfully.');
      fetchDashboardData();
    } catch (err: any) {
      alert(`Failed to delete exam: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof QuestionInput, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let currentExamId = editingExamId;

      if (editingExamId) {
        const { error: updateError } = await supabase
          .from('exams')
          .update({
            title,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            duration_minutes: durationMinutes,
            results_released_at: new Date(endTime).toISOString(),
          })
          .eq('id', editingExamId);

        if (updateError) throw updateError;

        await supabase.from('exam_questions').delete().eq('exam_id', editingExamId);
      } else {
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .insert([
            {
              title,
              start_time: new Date(startTime).toISOString(),
              end_time: new Date(endTime).toISOString(),
              duration_minutes: durationMinutes,
              results_released_at: new Date(endTime).toISOString(),
            },
          ])
          .select()
          .single();

        if (examError) throw examError;
        currentExamId = examData.id;
      }

      const formattedQuestions = questions.map((q) => ({
        exam_id: currentExamId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        explanation: q.explanation,
      }));

      const { error: qError } = await supabase.from('exam_questions').insert(formattedQuestions);
      if (qError) throw qError;

      alert(editingExamId ? 'Exam updated successfully!' : 'Exam published successfully!');

      resetForm();
      setActiveTab('list');
      fetchDashboardData();
    } catch (err: any) {
      alert(`Error saving exam: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start)
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Upcoming
        </span>
      );
    if (now >= start && now <= end)
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
          ● Live Now
        </span>
      );
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Completed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exam Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Create exam papers, edit schedules, and track student submissions.</p>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'form') {
                setActiveTab('list');
                resetForm();
              } else {
                handleOpenCreateForm();
              }
            }}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all"
          >
            {activeTab === 'form' ? '← Back to List' : '+ Create Exam'}
          </button>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Exams</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{exams.length}</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Submissions</p>
            <p className="text-3xl font-extrabold text-indigo-600 mt-2">{totalSubmissions}</p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Exams</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">
              {exams.filter((e) => new Date() >= new Date(e.start_time) && new Date() <= new Date(e.end_time)).length}
            </p>
          </div>
        </div>

        {/* EXAM TABLE WITH EDIT & DELETE */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">All Scheduled Exams</h2>
            </div>

            {loadingExams ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading exams data...</div>
            ) : exams.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No exams found. Click "+ Create Exam" to build your first test paper.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Exam Title</th>
                      <th className="px-6 py-3.5">Schedule</th>
                      <th className="px-6 py-3.5">Duration</th>
                      <th className="px-6 py-3.5">Submissions</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{exam.title}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          <div>Start: {new Date(exam.start_time).toLocaleString()}</div>
                          <div>End: {new Date(exam.end_time).toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 font-medium">{exam.duration_minutes} mins</td>
                        <td className="px-6 py-4 font-bold text-indigo-600">{exam.submissions_count}</td>
                        <td className="px-6 py-4">{getStatusBadge(exam.start_time, exam.end_time)}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleEditExam(exam)}
                            className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id, exam.title)}
                            disabled={deletingId === exam.id}
                            className="inline-flex items-center px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-lg transition disabled:opacity-50"
                          >
                            {deletingId === exam.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CREATE / EDIT FORM */}
        {activeTab === 'form' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              {editingExamId ? 'Edit Exam & Questions' : 'Create New Exam Paper'}
            </h2>

            <form onSubmit={handleSaveExam} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6 bg-slate-50/80 rounded-xl border border-slate-200/60">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Exam Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                    placeholder="e.g. Mathematics Final Examination"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    End Time (Auto-Release Results)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Questions ({questions.length})</h3>
                </div>

                {questions.map((q, index) => (
                  <div key={index} className="p-6 border border-slate-200/80 rounded-2xl bg-white shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">
                        Question #{index + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(index)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                        >
                          Remove Question
                        </button>
                      )}
                    </div>

                    <textarea
                      required
                      rows={2}
                      value={q.question_text}
                      onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                      placeholder="Type question text..."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Option A"
                        value={q.option_a}
                        onChange={(e) => handleQuestionChange(index, 'option_a', e.target.value)}
                        className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Option B"
                        value={q.option_b}
                        onChange={(e) => handleQuestionChange(index, 'option_b', e.target.value)}
                        className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Option C"
                        value={q.option_c}
                        onChange={(e) => handleQuestionChange(index, 'option_c', e.target.value)}
                        className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Option D"
                        value={q.option_d}
                        onChange={(e) => handleQuestionChange(index, 'option_d', e.target.value)}
                        className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                          Correct Answer
                        </label>
                        <select
                          value={q.correct_option}
                          onChange={(e) => handleQuestionChange(index, 'correct_option', e.target.value as any)}
                          className="w-full px-4 py-2.5 border border-slate-300 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none font-medium"
                        >
                          <option value="A">Option A</option>
                          <option value="B">Option B</option>
                          <option value="C">Option C</option>
                          <option value="D">Option D</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                          Explanation (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Explanation for solution key"
                          value={q.explanation}
                          onChange={(e) => handleQuestionChange(index, 'explanation', e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition"
                >
                  + Add Another Question
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : editingExamId ? 'Update Exam' : 'Publish Exam'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}