import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, LogOut, Menu, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout, theme, toggleTheme } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base text-slate-900 dark:text-slate-100 tracking-tight">
              LearnWell
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">{user.name}</span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{user.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {user.role}
                </span>
              </div>

              {/* Notifications Dropdown */}
              <NotificationDropdown />

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium focus-visible:ring-2"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
