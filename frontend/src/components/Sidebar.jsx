import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CalendarCheck2,
  GraduationCap,
  Users2,
  Ticket,
  Bell,
  BellRing,
  BookOpenCheck,
  UserCheck2,
  FileSpreadsheet,
  X,
  Calendar,
  Radio,
  FileQuestion,
  Clock
} from 'lucide-react';

export default function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [location.pathname]);

  if (!user) return null;

  const role = user.role;

  const getLinks = () => {
    if (role === 'Student') {
      return [
        { label: 'Overview', to: '/student/dashboard', icon: LayoutDashboard },
        { label: 'Calendar & Tasks', to: '/student/calendar', icon: Calendar },
        { label: 'Live Quiz', to: '/student/live-quiz', icon: Radio },
        { label: 'Question Bank', to: '/questions', icon: FileQuestion },
        { label: 'Attendance', to: '/student/attendance', icon: CalendarCheck2 },
        { label: 'Grades & Feedback', to: '/student/results', icon: GraduationCap },
        { label: 'My Mentor', to: '/student/mentor', icon: Users2 },
        { label: 'Exam Seating', to: '/student/exam-seating', icon: Ticket },
        { label: 'Notifications', to: '/student/notifications', icon: Bell },
        { label: 'Notices', to: '/notices', icon: BellRing },
      ];
    }
    if (role === 'Faculty') {
      return [
        { label: 'Overview', to: '/faculty/dashboard', icon: LayoutDashboard },
        { label: 'Mentorship desk', to: '/faculty/mentorship', icon: BookOpenCheck },
        { label: 'Live Quizzes', to: '/faculty/quizzes', icon: Radio },
        { label: 'Question Bank', to: '/questions', icon: FileQuestion },
        { label: 'Class attendance', to: '/faculty/attendance', icon: CalendarCheck2 },
        { label: 'Exam seating', to: '/faculty/exam-seating', icon: Ticket },
        { label: 'Notices', to: '/notices', icon: BellRing },
      ];
    }
    if (role === 'Admin') {
      return [
        { label: 'Overview', to: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Users', to: '/admin/users', icon: Users2 },
        { label: 'Class Timetable', to: '/admin/timetable', icon: Clock },
        { label: 'Question Bank', to: '/questions', icon: FileQuestion },
        { label: 'Mentor assignments', to: '/admin/mentor-assignments', icon: UserCheck2 },
        { label: 'Exam seating', to: '/admin/exam-seating', icon: FileSpreadsheet },
        { label: 'Notices', to: '/admin/notices', icon: BellRing },
      ];
    }
    return [];
  };

  const links = getLinks();

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Workspace
            </span>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {role} portal
            </div>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="space-y-1" aria-label="Sidebar navigation">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
        Signed in as <span className="font-mono text-slate-600 dark:text-slate-300">{user.id}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0 min-h-[calc(100vh-3.5rem)] p-4 transition-colors">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-slate-900/50 backdrop-blur-none"
          onClick={onCloseMobile}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 p-5 shadow-lg border-r border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
