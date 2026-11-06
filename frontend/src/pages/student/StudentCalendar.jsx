import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import {
  CalendarDays,
  Clock,
  BookOpen,
  HelpCircle,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function StudentCalendar() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('week'); // 'month' | 'week'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'assignment' | 'quiz' | 'class' | 'exam'
  const [selectedItem, setSelectedItem] = useState(null);

  // Verification Quiz Modal for Extra Assignments
  const [quizAssignment, setQuizAssignment] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/student/calendar');
      setItems(data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const openQuizModal = async (easnId) => {
    try {
      const data = await apiRequest(`/assignments/extra/${easnId}`);
      setQuizAssignment(data);
      setQuizAnswers({});
      setQuizResult(data.submission || null);
    } catch (err) {
      toast.error('Could not load verification quiz');
    }
  };

  const handleSubmitVerificationQuiz = async () => {
    if (!quizAssignment) return;
    setSubmittingQuiz(true);
    try {
      const res = await apiRequest(`/assignments/extra/${quizAssignment.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: quizAnswers }),
      });
      setQuizResult(res);
      toast.success(`Verification quiz submitted: ${res.status} (${res.score}/${res.total_questions})`);
      loadCalendar();
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    return true;
  });

  const getItemVisual = (type) => {
    switch (type) {
      case 'assignment':
        return {
          icon: BookOpen,
          bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-900',
          badge: 'Assignment'
        };
      case 'quiz':
        return {
          icon: HelpCircle,
          bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-900',
          badge: 'Quiz'
        };
      case 'class':
        return {
          icon: Clock,
          bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
          badge: 'Lecture'
        };
      case 'exam':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-900',
          badge: 'Exam'
        };
      default:
        return {
          icon: CalendarDays,
          bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          badge: 'Event'
        };
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Calendar"
        subtitle="Track upcoming assignment submissions, live classroom quizzes, and weekly lecture schedules."
        actions={
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'week' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Week view
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'month' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Month view
            </button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All activities' },
          { id: 'assignment', label: 'Assignments' },
          { id: 'quiz', label: 'Quizzes' },
          { id: 'class', label: 'Classes & Labs' },
          { id: 'exam', label: 'Examinations' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setTypeFilter(f.id)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
              typeFilter === f.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Calendar List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      ) : error ? (
        <div className="p-4 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 text-rose-600 text-xs">
          {error}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No calendar items found"
          description="There are no scheduled events matching the selected category."
          actionLabel="Show all"
          onAction={() => setTypeFilter('all')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const visual = getItemVisual(item.type);
            const Icon = visual.icon;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${visual.bg}`}>
                      {visual.badge}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {item.date || item.day || 'Weekly schedule'}
                    </span>
                  </div>

                  <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {item.details}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {item.status && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                      item.status.includes('Completed')
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : item.status === 'Not completed'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {item.status}
                    </span>
                  )}

                  {item.id.includes('EASN-') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const easnId = item.id.replace('CAL-EASN-', '');
                        openQuizModal(easnId);
                      }}
                      className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100"
                    >
                      {item.status && item.status.includes('Completed') ? 'Review quiz' : 'Take quiz'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedItem.title}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Scheduled Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItem.date || selectedItem.day}</span>
              </div>
              {selectedItem.time && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Time Window:</span>
                  <span className="font-mono">{selectedItem.time}</span>
                </div>
              )}
              {selectedItem.classroom && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Classroom:</span>
                  <span className="font-mono">{selectedItem.classroom}</span>
                </div>
              )}
              {selectedItem.faculty && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Faculty:</span>
                  <span>{selectedItem.faculty}</span>
                </div>
              )}
              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Details:</span>
                <p className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 leading-relaxed">
                  {selectedItem.details}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {selectedItem.id.includes('EASN-') && (
                <button
                  type="button"
                  onClick={() => {
                    const easnId = selectedItem.id.replace('CAL-EASN-', '');
                    setSelectedItem(null);
                    openQuizModal(easnId);
                  }}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                >
                  Open verification quiz
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Quiz Modal */}
      {quizAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Verification Quiz: {quizAssignment.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {quizAssignment.subject_code} • Due: {quizAssignment.due_date} • By: {quizAssignment.mentor_name}
                </p>
              </div>
              <button type="button" onClick={() => setQuizAssignment(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* If already submitted, display score and study suggestions */}
              {quizResult && (
                <div className={`p-4 rounded-lg border ${
                  quizResult.status === 'Completed on time'
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                    : 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Status: {quizResult.status}
                    </span>
                    <span className="font-mono text-sm font-bold">
                      Score: {quizResult.score} / {quizResult.total_questions || quizAssignment.questions.length} ({quizResult.percentage || 0}%)
                    </span>
                  </div>

                  {/* Rule-based study suggestions */}
                  {quizResult.study_suggestions && quizResult.study_suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span>Targeted Study Suggestions</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {quizResult.study_suggestions.map((s, idx) => (
                          <div key={idx} className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{s.title}</span>
                            <span className="text-[11px] text-slate-500">{s.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Questions */}
              <div className="space-y-4">
                {quizAssignment.questions.map((q, qIndex) => (
                  <div key={q.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-2">
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      {qIndex + 1}. {q.question}
                    </span>

                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, optIndex) => {
                        const isChosen = quizAnswers[q.id] === optIndex;
                        const isCorrect = q.correct_option !== undefined && q.correct_option === optIndex;
                        const isLocked = !!quizResult;

                        return (
                          <label
                            key={optIndex}
                            className={`flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-medium'
                                : isChosen
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`quiz-q-${q.id}`}
                              disabled={isLocked}
                              checked={isChosen || (quizResult?.answers && quizResult.answers[q.id] === optIndex)}
                              onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: optIndex }))}
                              className="text-indigo-600"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {quizResult ? 'Completed' : `Answered ${Object.keys(quizAnswers).length} of ${quizAssignment.questions.length}`}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuizAssignment(null)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
                {!quizResult && (
                  <button
                    type="button"
                    onClick={handleSubmitVerificationQuiz}
                    disabled={submittingQuiz || Object.keys(quizAnswers).length < quizAssignment.questions.length}
                    className="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                  >
                    {submittingQuiz ? 'Grading...' : 'Submit verification'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
