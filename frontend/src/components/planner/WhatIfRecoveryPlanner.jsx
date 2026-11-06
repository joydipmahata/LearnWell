import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import RiskBadge from '../RiskBadge';
import { SlidersHorizontal, TrendingDown, TrendingUp, CheckCircle, Target, Sparkles, RefreshCcw } from 'lucide-react';

export default function WhatIfRecoveryPlanner({ studentId, initialAttendance = 68, initialMarks = 65 }) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [expectedMarks, setExpectedMarks] = useState(initialMarks);
  const [mentorSessions, setMentorSessions] = useState(2);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSimulation = async (att, mrk, ses) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await apiRequest('/risk/simulate', {
        method: 'POST',
        body: JSON.stringify({
          student_id: studentId,
          attendance_pct: Number(att),
          expected_marks: Number(mrk),
          mentor_sessions: Number(ses),
        }),
      });
      setSimulation(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation(attendance, expectedMarks, mentorSessions);
  }, [studentId, attendance, expectedMarks, mentorSessions]);

  const handleReset = () => {
    setAttendance(initialAttendance);
    setExpectedMarks(initialMarks);
    setMentorSessions(2);
  };

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 p-5 space-y-5 shadow-xs">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Can I Recover? What-If Academic Simulator</span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Live Engine
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust future performance levers to simulate your projected academic standing without altering records.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="self-start sm:self-auto inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-50"
        >
          <RefreshCcw className="w-3 h-3" />
          <span>Reset sliders</span>
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Slider 1: Future Attendance */}
        <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Future Attendance
            </label>
            <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {attendance}%
            </span>
          </div>
          <input
            type="range"
            min={45}
            max={100}
            step={1}
            value={attendance}
            onChange={(e) => setAttendance(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>45% (Critical)</span>
            <span>75% (Min)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Slider 2: Next Assessment Marks */}
        <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Expected Exam Marks
            </label>
            <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {expectedMarks}%
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={100}
            step={1}
            value={expectedMarks}
            onChange={(e) => setExpectedMarks(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>30% (Fail)</span>
            <span>60% (Pass)</span>
            <span>100% (High)</span>
          </div>
        </div>

        {/* Slider 3: Mentor Review Sessions */}
        <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mentor Check-ins
            </label>
            <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {mentorSessions} sessions
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={mentorSessions}
            onChange={(e) => setMentorSessions(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0</span>
            <span>2 (Recommended)</span>
            <span>5+</span>
          </div>
        </div>
      </div>

      {/* Real-Time Simulation Result */}
      {simulation && (
        <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            {/* Projected Band & Score */}
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Projected Risk Band
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <RiskBadge band={simulation.simulated.band} score={simulation.simulated.score} size="md" />
                  <span className="text-xs text-slate-500 font-mono">
                    ({simulation.simulated.score}/100)
                  </span>
                </div>
              </div>

              {/* Score change badge */}
              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Risk Score Impact
                </span>
                <span className={`text-sm font-black font-mono inline-flex items-center gap-1 ${
                  simulation.simulated.score_change < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : simulation.simulated.score_change > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500'
                }`}>
                  {simulation.simulated.score_change < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  {simulation.simulated.score_change > 0 ? `+${simulation.simulated.score_change}` : simulation.simulated.score_change} pts
                </span>
              </div>
            </div>

            {/* Target needed to recover */}
            <div className="sm:text-right max-w-sm">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block flex items-center sm:justify-end gap-1">
                <Target className="w-3 h-3 text-indigo-500" />
                Concrete Target
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 leading-snug">
                {simulation.concrete_target}
              </p>
            </div>
          </div>

          {/* Plain language explanation */}
          <div className="p-3 rounded-md bg-indigo-50/50 dark:bg-indigo-950/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span>{simulation.plain_language_explanation}</span>
          </div>
        </div>
      )}
    </div>
  );
}
