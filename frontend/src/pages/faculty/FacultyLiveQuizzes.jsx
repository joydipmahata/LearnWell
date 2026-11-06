import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import {
  Zap,
  PlusCircle,
  Play,
  Square,
  Award,
  X,
  Plus,
  Trash2
} from 'lucide-react';

export default function FacultyLiveQuizzes() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeQuizLive, setActiveQuizLive] = useState(null); // quiz object for live monitoring

  // Live state
  const [liveStats, setLiveStats] = useState(null);

  // Create Form
  const [quizTitle, setQuizTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('CS402');
  const [section, setSection] = useState('A');
  const [timeLimit, setTimeLimit] = useState(15);
  const [questions, setQuestions] = useState([
    {
      id: 'Q1',
      question: '',
      options: ['', '', '', ''],
      correct_option: 0
    }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/quizzes/list');
      setQuizzes(data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  // Poll live stats when a quiz is opened in live view
  useEffect(() => {
    let interval = null;
    if (activeQuizLive) {
      const fetchLive = async () => {
        try {
          const stats = await apiRequest(`/quizzes/${activeQuizLive.id}/live`);
          setLiveStats(stats);
        } catch (err) {
          // ignore polling errors
        }
      };
      fetchLive();
      interval = setInterval(fetchLive, 3000); // poll every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeQuizLive]);

  const handleStartQuiz = async (quizId) => {
    try {
      const res = await apiRequest(`/quizzes/${quizId}/start`, { method: 'POST' });
      toast.success(`Quiz started! PIN: ${res.pin}`);
      loadQuizzes();
      // Open live view
      const target = quizzes.find(q => q.id === quizId);
      if (target) {
        setActiveQuizLive({ ...target, status: 'active', pin: res.pin });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start quiz');
    }
  };

  const handleEndQuiz = async (quizId) => {
    try {
      await apiRequest(`/quizzes/${quizId}/end`, { method: 'POST' });
      toast.success('Live quiz ended. PIN deactivated.');
      loadQuizzes();
      if (activeQuizLive && activeQuizLive.id === quizId) {
        setActiveQuizLive(prev => ({ ...prev, status: 'ended', pin: null }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to end quiz');
    }
  };

  const addQuestionField = () => {
    setQuestions(prev => [
      ...prev,
      {
        id: `Q${prev.length + 1}`,
        question: '',
        options: ['', '', '', ''],
        correct_option: 0
      }
    ]);
  };

  const removeQuestionField = (index) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      const opts = [...updated[qIndex].options];
      opts[optIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: opts };
      return updated;
    });
  };

  const handleCreateQuizSubmit = async (e) => {
    e.preventDefault();
    if (!quizTitle.trim()) {
      toast.error('Quiz title is required.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        toast.error(`Question ${i + 1} text cannot be empty.`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!questions[i].options[j]?.trim()) {
          toast.error(`Question ${i + 1}, Option ${j + 1} cannot be empty.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await apiRequest('/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          title: quizTitle.trim(),
          subject_code: subjectCode,
          section: section,
          time_limit_minutes: Number(timeLimit),
          questions: questions
        }),
      });
      toast.success('Quiz created successfully');
      setShowCreateModal(false);
      setQuizTitle('');
      setQuestions([
        { id: 'Q1', question: '', options: ['', '', '', ''], correct_option: 0 }
      ]);
      loadQuizzes();
    } catch (err) {
      toast.error(err.message || 'Failed to create quiz');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Interactive Quizzes"
        subtitle="Create fast-paced in-class quizzes with 6-digit PIN verification, synchronized countdown timers, and live leaderboard metrics."
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium focus-visible:ring-2 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create new quiz</span>
          </button>
        }
      />

      {/* Main Quizzes List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : error ? (
        <div className="p-4 rounded bg-rose-50 text-rose-600 text-xs">{error}</div>
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No quizzes created yet"
          description="Create your first MCQ live quiz with custom time limit and PIN for today's classroom session."
          actionLabel="Create live quiz"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-3 shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {q.subject_code} • Sec {q.section}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    q.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse'
                      : q.status === 'ended'
                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {q.status}
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {q.title}
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  {q.questions?.length || 0} Questions • {q.time_limit_minutes} Mins time limit
                </p>

                {q.status === 'active' && q.pin && (
                  <div className="mt-3 p-2.5 rounded bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-center">
                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      Live Class PIN
                    </span>
                    <span className="font-mono text-2xl font-black text-indigo-700 dark:text-indigo-200 tracking-widest">
                      {q.pin}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {q.status === 'draft' ? (
                  <button
                    type="button"
                    onClick={() => handleStartQuiz(q.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start quiz</span>
                  </button>
                ) : q.status === 'active' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveQuizLive(q)}
                      className="px-2.5 py-1 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                    >
                      Live View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEndQuiz(q.id)}
                      className="px-2.5 py-1 rounded border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-50"
                    >
                      End quiz
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveQuizLive(q)}
                    className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50"
                  >
                    View results &amp; leaderboard
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Monitor / Results View Modal */}
      {activeQuizLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {activeQuizLive.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    activeQuizLive.status === 'active'
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {activeQuizLive.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {activeQuizLive.subject_code} • Section {activeQuizLive.section}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeQuizLive.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => handleEndQuiz(activeQuizLive.id)}
                    className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium inline-flex items-center gap-1"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>End quiz</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveQuizLive(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Metrics Header */}
            {activeQuizLive.status === 'active' && activeQuizLive.pin && (
              <div className="p-4 bg-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold opacity-90 block">
                    Show PIN in Class
                  </span>
                  <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest">
                    {activeQuizLive.pin}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="bg-white/10 px-3 py-1.5 rounded">
                    Joined: <span className="font-bold text-sm">{liveStats?.joined_count || 0}</span>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded">
                    Submitted: <span className="font-bold text-sm">{liveStats?.submitted_count || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Live Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Joined Students</span>
                  <span className="font-bold text-lg text-slate-800 dark:text-slate-200">{liveStats?.joined_count || 0}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Completed Attempts</span>
                  <span className="font-bold text-lg text-slate-800 dark:text-slate-200">{liveStats?.submitted_count || 0}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Class Average</span>
                  <span className="font-bold text-lg text-slate-800 dark:text-slate-200">{liveStats?.class_average_pct || 0}%</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-slate-400 block text-[10px] uppercase font-medium">Total Questions</span>
                  <span className="font-bold text-lg text-slate-800 dark:text-slate-200">{liveStats?.question_stats?.length || 0}</span>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Leaderboard</span>
                </h4>

                {!liveStats?.leaderboard || liveStats.leaderboard.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded">
                    Awaiting student submissions...
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Rank</th>
                          <th className="py-2 px-3">Student</th>
                          <th className="py-2 px-3 text-center">Score</th>
                          <th className="py-2 px-3 text-center">Percentage</th>
                          <th className="py-2 px-3 text-right">Time Taken</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {liveStats.leaderboard.map((sub, idx) => (
                          <tr key={sub.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold">{sub.student_name}</span>
                              <span className="text-[11px] text-slate-400 ml-2 font-mono">{sub.roll_no}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold">
                              {sub.score} / {sub.total_questions}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                sub.percentage >= 75
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {sub.percentage}%
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {sub.time_taken_seconds}s
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Per-question Accuracy Breakdown */}
              {liveStats?.question_stats && liveStats.question_stats.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                    Per-Question Class Accuracy
                  </h4>
                  <div className="space-y-2">
                    {liveStats.question_stats.map((qs, i) => (
                      <div key={qs.id} className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            Q{i + 1}. {qs.question}
                          </span>
                          <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            qs.accuracy_percentage >= 70
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            {qs.accuracy_percentage}% Accuracy
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${qs.accuracy_percentage >= 70 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${qs.accuracy_percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Quiz Form */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span>Create Live Classroom Quiz</span>
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuizSubmit} className="p-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quiz Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g. Operating Systems Semaphore Sprint"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <select
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="CS401">CS401 Algorithms</option>
                    <option value="CS402">CS402 Operating Systems</option>
                    <option value="CS403">CS403 DBMS</option>
                    <option value="CS404">CS404 Networks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Section</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Time Limit (Mins)</label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Questions Builder */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Questions ({questions.length})
                  </span>
                  <button
                    type="button"
                    onClick={addQuestionField}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                {questions.map((q, qIndex) => (
                  <div key={q.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Question {qIndex + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestionField(qIndex)}
                          className="text-rose-500 hover:text-rose-700 text-xs p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                      placeholder="Enter question statement..."
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                        Options (Mark radio for correct answer):
                      </span>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-for-${q.id}`}
                            checked={q.correct_option === optIndex}
                            onChange={() => handleQuestionChange(qIndex, 'correct_option', optIndex)}
                            className="text-indigo-600"
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                            className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save & Prepare Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
