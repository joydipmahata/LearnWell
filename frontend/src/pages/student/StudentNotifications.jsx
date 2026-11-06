import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import {
  Bell,
  Clock,
  BookOpen,
  Calendar,
  ShieldAlert,
  GraduationCap,
  CheckCheck,
  Check,
  Search,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

function getNotificationVisual(type) {
  switch (type) {
    case 'deadline':
      return {
        icon: Clock,
        bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-900',
        badge: 'Deadline'
      };
    case 'assignment':
      return {
        icon: BookOpen,
        bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-900',
        badge: 'Assignment'
      };
    case 'quiz':
      return {
        icon: GraduationCap,
        bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-900',
        badge: 'Quiz'
      };
    case 'timetable':
      return {
        icon: Calendar,
        bg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900',
        badge: 'Timetable'
      };
    case 'intervention':
      return {
        icon: ShieldAlert,
        bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-900',
        badge: 'Intervention'
      };
    case 'general':
    default:
      return {
        icon: Bell,
        bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        badge: 'General'
      };
  }
}

function formatFullTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StudentNotifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'deadline' | 'assignment' | 'quiz' | 'timetable' | 'intervention'
  const [searchTerm, setSearchTerm] = useState('');

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const filtered = notifications.filter((n) => {
    // Tab filter
    if (activeTab === 'unread' && n.read) return false;
    if (activeTab !== 'all' && activeTab !== 'unread' && n.type !== activeTab) return false;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(term);
      const matchMsg = n.message?.toLowerCase().includes(term);
      const matchType = n.type?.toLowerCase().includes(term);
      if (!matchTitle && !matchMsg && !matchType) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        subtitle="Stay updated with course deadlines, timetable changes, upcoming quizzes, and mentor communications."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadNotifications}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium focus-visible:ring-2 shadow-xs"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Tab Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {[
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'deadline', label: 'Deadlines' },
            { id: 'assignment', label: 'Assignments' },
            { id: 'quiz', label: 'Quizzes' },
            { id: 'timetable', label: 'Timetable' },
            { id: 'intervention', label: 'Interventions' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : error ? (
        <div className="p-4 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-sm flex items-center justify-between">
          <span>Failed to load notifications: {error}</span>
          <button
            type="button"
            onClick={loadNotifications}
            className="px-2.5 py-1 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={searchTerm ? 'No matching notifications' : 'No notifications in this view'}
          description={
            searchTerm
              ? `No alerts match "${searchTerm}". Try resetting your search filters.`
              : activeTab === 'unread'
              ? 'Great work! You have no unread notifications at the moment.'
              : 'There are currently no alerts or announcements in this category.'
          }
          actionLabel={searchTerm || activeTab !== 'all' ? 'Reset filters' : undefined}
          onAction={() => {
            setSearchTerm('');
            setActiveTab('all');
          }}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((n) => {
            const visual = getNotificationVisual(n.type);
            const Icon = visual.icon;

            return (
              <div
                key={n.id}
                className={`p-4 rounded-lg border transition-all ${
                  !n.read
                    ? 'border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2 rounded-md border shrink-0 ${visual.bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            New
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                          {n.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span title={formatFullTime(n.created_at)}>
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      {n.message}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="text-[11px] text-slate-400">
                        Notification ID: <span className="font-mono text-slate-500">{n.id}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!n.read ? (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(n.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-medium"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark read</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Read</span>
                          </span>
                        )}

                        {n.link && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!n.read) handleMarkAsRead(n.id);
                              navigate(n.link);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition-colors"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
