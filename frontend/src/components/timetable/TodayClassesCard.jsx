import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { Clock, MapPin, User, Calendar, ChevronRight, X } from 'lucide-react';

export default function TodayClassesCard({ role = 'Student' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');

  const loadSchedule = async () => {
    try {
      const res = await apiRequest('/timetable/today');
      setData(res);
      setSelectedDay(res.today || 'Monday');
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load timetable schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
    const timer = setInterval(loadSchedule, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
        <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span>Schedule offline: {error || 'No timetable available'}</span>
          <button type="button" onClick={loadSchedule} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { today, classes_today, current_slot, next_slot, countdown_minutes, weekly_schedule } = data;

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {role === 'Faculty' ? 'Your Teaching Schedule' : "Today's Classes"} ({today})
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowWeeklyModal(true)}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <span>View weekly timetable</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Faculty: "Your class right now" highlight card */}
      {role === 'Faculty' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Current Class */}
          <div className={`p-3.5 rounded-lg border ${
            current_slot
              ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Class Right Now
              </span>
              {current_slot ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white animate-pulse">
                  IN SESSION
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">No active lecture</span>
              )}
            </div>

            {current_slot ? (
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {current_slot.subject_code} • {current_slot.subject_name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    {current_slot.start_time} - {current_slot.end_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Room {current_slot.classroom} (Sec {current_slot.section})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You do not have a teaching lecture at this hour.
              </p>
            )}
          </div>

          {/* Next Class & Countdown */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Next Scheduled Class
              </span>
              {countdown_minutes !== null && countdown_minutes > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                  in {countdown_minutes}m
                </span>
              )}
            </div>

            {next_slot ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {next_slot.subject_code} • {next_slot.subject_name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {next_slot.start_time} - {next_slot.end_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Room {next_slot.classroom} (Sec {next_slot.section})
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No further classes scheduled for today.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Classes List */}
      <div>
        {classes_today.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No classes scheduled for {today}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {classes_today.map((slot) => {
              const isCurrent = current_slot && current_slot.id === slot.id;
              return (
                <div
                  key={slot.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isCurrent
                      ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-400/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {slot.start_time} - {slot.end_time}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white uppercase">
                        Current
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate" title={slot.subject_name}>
                    {slot.subject_code} • {slot.subject_name}
                  </h3>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {slot.classroom}
                    </span>
                    <span className="truncate max-w-[120px]" title={slot.faculty_name}>
                      {slot.faculty_name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Schedule Modal */}
      {showWeeklyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-4xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Full Weekly Class Timetable
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {role === 'Faculty' ? 'Faculty teaching matrix across academic days' : 'Weekly lecture & lab timetable for your class group'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWeeklyModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Day Selector Tabs */}
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex gap-1 overflow-x-auto bg-slate-50/50 dark:bg-slate-800/40">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    selectedDay === d
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Day Schedule Grid */}
            <div className="p-4 overflow-y-auto flex-1">
              {weekly_schedule.filter(s => s.day.toLowerCase() === selectedDay.toLowerCase()).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No classes scheduled for {selectedDay}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  {weekly_schedule
                    .filter(s => s.day.toLowerCase() === selectedDay.toLowerCase())
                    .map((s) => (
                      <div key={s.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                            {s.start_time} - {s.end_time}
                          </span>
                          <div>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {s.subject_code} • {s.subject_name}
                            </span>
                            <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
                              Sec {s.section}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {s.classroom}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {s.faculty_name}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
