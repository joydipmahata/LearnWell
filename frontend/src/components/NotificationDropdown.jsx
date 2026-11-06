import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import {
  Bell,
  Clock,
  BookOpen,
  Calendar,
  ShieldAlert,
  GraduationCap,
  CheckCheck,
  ChevronRight,
  AlertCircle
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

export default function NotificationDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await apiRequest('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications');
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 30 seconds for background deadline triggers or updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside and Escape key handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.read) {
      handleMarkAsRead(n.id);
    }
    if (n.link) {
      setIsOpen(false);
      navigate(n.link);
    }
  };

  if (!user) return null;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 transition-colors"
        aria-label={`Notifications (${unreadCount} unread)`}
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden flex flex-col"
          role="region"
          aria-label="Notification panel"
        >
          {/* Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  Caught up
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {error && (
              <div className="p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
                <p className="text-[11px] mt-0.5 text-slate-400">
                  {filter === 'unread' ? 'You are all caught up with deadlines and classes.' : 'Activity alerts and reminders will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.slice(0, 10).map((n) => {
                const visual = getNotificationVisual(n.type);
                const Icon = visual.icon;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 text-left transition-colors cursor-pointer group flex items-start gap-2.5 ${
                      !n.read
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-md border shrink-0 mt-0.5 ${visual.bg}`}
                      title={visual.badge}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-400 uppercase tracking-wider text-[9px]">
                          {n.type}
                        </span>

                        <div className="flex items-center gap-2">
                          {!n.read && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                              title="Mark read"
                            >
                              Mark read
                            </button>
                          )}
                          {n.link && (
                            <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 group-hover:underline">
                              <span>Open</span>
                              <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {user.role === 'Student' && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
              <Link
                to="/student/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <span>View all notifications</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
