import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import {
  Users2,
  Send,
  MessageSquare,
  FileCheck,
  Mail,
  GraduationCap
} from 'lucide-react';

export default function StudentMentor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const loadMentorData = () => {
    apiRequest('/student/mentor')
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMentorData();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await apiRequest('/student/mentor/chat', {
        method: 'POST',
        body: JSON.stringify({ text: newMessage.trim() }),
      });
      setNewMessage('');
      toast.success('Message sent');
      loadMentorData();
    } catch (err) {
      toast.error(err.message || 'Failed to deliver message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    );
  }

  const { mentor, interventions = [], feedbacks = [], chat = [] } = data || {
    mentor: null,
    interventions: [],
    feedbacks: [],
    chat: [],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My mentor"
        subtitle="Direct guidance, intervention plans, and private check-ins with your assigned mentor."
      />

      {mentor ? (
        <>
          {/* Mentor Profile Bar */}
          <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-base flex items-center justify-center shrink-0">
                {mentor.name.charAt(0)}
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Assigned mentor</span>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{mentor.name}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>{mentor.department}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Mail className="w-3 h-3" />
                    {mentor.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs">
                <span className="text-slate-500 block">Feedback notes</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {feedbacks.length} recorded
                </span>
              </div>
              <div className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs">
                <span className="text-slate-500 block">Active plans</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {interventions.length} registered
                </span>
              </div>
            </div>
          </div>

          {/* Mentor Feedback & Reviews Section */}
          <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Mentor feedback notes &amp; reviews</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {feedbacks.length} {feedbacks.length === 1 ? 'note' : 'notes'}
              </span>
            </div>

            {feedbacks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No feedback notes recorded yet. When your mentor provides academic or performance reviews, they will appear here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {feedbacks.map((f, i) => (
                  <div
                    key={f.id || i}
                    className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {f.subject_code || 'General'}
                        </span>
                        {f.semester && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Sem {f.semester}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {f.feedback || f.feedback_text}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Given by <strong className="font-medium text-slate-600 dark:text-slate-300">{f.mentor_name || mentor.name}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Interventions / Action Plan */}
            <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-slate-500" />
                  <span>Support interventions</span>
                </h2>

                <div className="space-y-2.5">
                  {interventions.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">
                      No active interventions assigned. Your academic profile is currently in good standing.
                    </p>
                  ) : (
                    interventions.map((intv) => (
                      <div
                        key={intv.id}
                        className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                            {intv.type}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${
                              intv.status === 'done'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : intv.status === 'in progress'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {intv.status}
                          </span>
                        </div>
                        {intv.notes && (
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {intv.notes}
                          </p>
                        )}
                        <span className="text-[11px] text-slate-400 block pt-1 border-t border-slate-100 dark:border-slate-800">
                          Updated: {new Date(intv.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 1-on-1 Dialogue Box */}
            <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-[460px]">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <span>Private mentor messages</span>
                </h2>
                <span className="text-xs text-slate-400">Direct &amp; confidential</span>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {chat.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 text-center px-4">
                    <MessageSquare className="w-6 h-6 text-slate-300 dark:text-slate-700 mb-2" />
                    <span>No messages yet. Send a note to your mentor to connect.</span>
                  </div>
                ) : (
                  chat.map((m) => {
                    const isMe = m.sender_id !== mentor.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-md px-3 py-2 text-xs leading-relaxed ${
                            isMe
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.text}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 px-1 font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <label htmlFor="mentor-chat-input" className="sr-only">
                  Message to mentor
                </label>
                <input
                  id="mentor-chat-input"
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message to your mentor..."
                  className="flex-1 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium focus-visible:ring-2 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Users2}
          title="No mentor assigned yet"
          description="Your academic administrator has not linked a mentor to your account yet. An assignment will appear here as soon as it is processed."
        />
      )}
    </div>
  );
}
