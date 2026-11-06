import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import {
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Award,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  Check,
  X
} from 'lucide-react';

export default function StudentLiveQuiz() {
  const toast = useToast();
  const [pinInput, setPinInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null); // { quiz_id, title, subject_code, time_limit_minutes, questions, joined_at }
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // Timer countdown in seconds
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Timer hook
  useEffect(() => {
    let timer = null;
    if (activeQuiz && !quizResult) {
      const totalSeconds = (activeQuiz.time_limit_minutes || 15) * 60;
      setSecondsRemaining(totalSeconds);

      timer = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto submit when time runs out!
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeQuiz, quizResult]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!pinInput.trim() || pinInput.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit quiz PIN.');
      return;
    }

    setJoining(true);
    try {
      const data = await apiRequest('/quizzes/join', {
        method: 'POST',
        body: JSON.stringify({ pin: pinInput.trim() }),
      });
      setActiveQuiz(data);
      setAnswers({});
      setQuizResult(null);
      toast.success('Joined live quiz! Timer has started.');
    } catch (err) {
      toast.error(err.message || 'Failed to join quiz with that PIN');
    } finally {
      setJoining(false);
    }
  };

  const handleAutoSubmit = async () => {
    toast.error('Time limit reached! Auto-submitting your quiz attempt.');
    executeSubmit();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    executeSubmit();
  };

  const executeSubmit = async () => {
    if (!activeQuiz || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiRequest(`/quizzes/${activeQuiz.quiz_id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: answers,
          client_started_at: activeQuiz.joined_at
        }),
      });
      toast.success(`Quiz submitted! Your score: ${res.score}/${res.total_questions} (${res.percentage}%)`);

      // Fetch review with correct answers
      const review = await apiRequest(`/quizzes/${activeQuiz.quiz_id}/result`);
      setQuizResult(review);
    } catch (err) {
      toast.error(err.message || 'Failed to submit quiz attempt');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Live Classroom Quiz"
        subtitle="Participate in real-time instructor assessments with immediate grading and accuracy benchmarks."
      />

      {/* Screen 1: PIN Entry */}
      {!activeQuiz && !quizResult && (
        <div className="max-w-md mx-auto p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Zap className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Enter In-Class PIN
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ask your teacher for the 6-digit access code displayed on the classroom board.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center font-mono text-3xl font-black tracking-[0.5em] py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={joining || pinInput.length !== 6}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 shadow-xs"
            >
              {joining ? 'Connecting to live session...' : 'Join Quiz Session'}
            </button>
          </form>

          <p className="text-[11px] text-slate-400">
            One attempt permitted per student. Quizzes are locked to your designated class section.
          </p>
        </div>
      )}

      {/* Screen 2: Active Timed Quiz */}
      {activeQuiz && !quizResult && (
        <div className="space-y-4">
          {/* Sticky Countdown Header */}
          <div className="sticky top-16 z-30 p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {activeQuiz.subject_code} Live Assessment
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-sm">
                {activeQuiz.title}
              </h2>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-base font-bold ${
              secondsRemaining <= 60
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          </div>

          {/* Questions Container */}
          <div className="space-y-4">
            {activeQuiz.questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
              >
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                  {idx + 1}. {q.question}
                </span>

                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = answers[q.id] === optIdx;
                    return (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-xs sm:text-sm cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-medium'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`live-q-${q.id}`}
                          checked={isSelected}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                          className="text-indigo-600"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Action */}
          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Answered {Object.keys(answers).length} of {activeQuiz.questions.length} questions
            </span>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {submitting ? 'Submitting...' : 'Submit Final Answers'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Screen 3: Post-Submission Results & Answers Review */}
      {quizResult && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Quiz Completed!
            </h2>

            <div className="flex items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-300 pt-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Your Score</span>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {quizResult.score} / {quizResult.total}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Percentage</span>
                <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {quizResult.percentage}%
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Time Taken</span>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {quizResult.time_taken_seconds}s
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 pt-1">
              Score saved to your academic performance records. Review correct answers below.
            </p>
          </div>

          {/* Question-by-Question Review */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Answer Review
            </h3>

            {quizResult.questions.map((q, idx) => (
              <div
                key={q.id}
                className={`p-4 rounded-lg border ${
                  q.is_correct
                    ? 'border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900'
                    : 'border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900'
                } space-y-2.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    {idx + 1}. {q.question}
                  </span>
                  {q.is_correct ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Correct
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Incorrect
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-1 text-xs">
                  {q.options.map((opt, optIdx) => {
                    const isChosen = q.chosen_option === optIdx;
                    const isCorrect = q.correct_option === optIdx;

                    let style = 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
                    if (isCorrect) {
                      style = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                    } else if (isChosen && !isCorrect) {
                      style = 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 line-through';
                    }

                    return (
                      <div key={optIdx} className={`p-2 rounded-md border flex items-center justify-between ${style}`}>
                        <span>{opt}</span>
                        {isCorrect && <span className="text-[10px] uppercase font-bold text-emerald-600">Correct Answer</span>}
                        {isChosen && !isCorrect && <span className="text-[10px] uppercase font-bold text-rose-600">Your Answer</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveQuiz(null);
                setQuizResult(null);
                setPinInput('');
              }}
              className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Exit to Quiz PIN Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
