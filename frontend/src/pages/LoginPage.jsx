import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import {
  GraduationCap,
  Users2,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';

export default function LoginPage() {
  const [roleTab, setRoleTab] = useState('Student'); // Student | Faculty | Admin
  const [userId, setUserId] = useState('LW-STU-0001');
  const [pin, setPin] = useState('123456');
  const [showPin, setShowPin] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [demoMode, setDemoMode] = useState(true);
  const [demoOpen, setDemoOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectUrl = new URLSearchParams(location.search).get('redirect');

  const navigateUser = (user) => {
    if (redirectUrl) {
      navigate(redirectUrl, { replace: true });
      return;
    }
    if (user.role === 'Student') {
      navigate('/student/dashboard');
    } else if (user.role === 'Faculty') {
      navigate('/faculty/dashboard');
    } else if (user.role === 'Admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    apiRequest('/auth/demo-accounts')
      .then((res) => {
        if (res.demo_mode) {
          setDemoAccounts(res.accounts || []);
          setDemoMode(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleTabChange = (role) => {
    setRoleTab(role);
    setError('');
    if (role === 'Student') {
      setUserId('LW-STU-0001');
    } else if (role === 'Faculty') {
      setUserId('LW-FAC-0001');
    } else {
      setUserId('LW-ADM-0001');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(userId.trim(), pin.trim());
      navigateUser(user);
    } catch (_err) {
      setError("That ID or PIN doesn't match. Please check and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (acc) => {
    setRoleTab(acc.role);
    setUserId(acc.id);
    setPin(acc.pin || '123456');
    setError('');
    setSubmitting(true);
    login(acc.id, acc.pin || '123456')
      .then((user) => {
        navigateUser(user);
      })
      .catch(() => {
        setError("That ID or PIN doesn't match.");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left column: Context & Institutional info */}
        <div className="lg:col-span-5 space-y-4 text-left">
          <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
            LearnWell Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Sign in to your account
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Access academic standing, mentor intervention plans, attendance calculators, and department notices.
          </p>

          <div className="pt-2 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Transparent scoring without demographic bias</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Automatic 14-day flag expiry for temporary flags</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Private 1-on-1 dialogue with assigned mentors</span>
            </div>
          </div>
        </div>

        {/* Right column: Form Card */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-slate-100 dark:bg-slate-800/60 mb-6">
            <button
              type="button"
              onClick={() => handleTabChange('Student')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                roleTab === 'Student'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('Faculty')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                roleTab === 'Faculty'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users2 className="w-4 h-4 shrink-0" />
              <span>Faculty</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('Admin')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                roleTab === 'Admin'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Admin</span>
            </button>
          </div>

          {error && (
            <div
              className="mb-4 p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs sm:text-sm text-rose-700 dark:text-rose-400"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="user-id"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {roleTab} ID
              </label>
              <input
                id="user-id"
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={
                  roleTab === 'Student'
                    ? 'LW-STU-0001'
                    : roleTab === 'Faculty'
                    ? 'LW-FAC-0001'
                    : 'LW-ADM-0001'
                }
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="user-pin"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                6-digit PIN
              </label>
              <div className="relative">
                <input
                  id="user-pin"
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tracking-widest focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              <span>{submitting ? 'Signing in...' : `Sign in as ${roleTab}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quiet Collapsible Demo Accounts Panel */}
          {demoMode && demoAccounts.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDemoOpen(!demoOpen)}
                className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1"
                aria-expanded={demoOpen}
              >
                <span className="font-medium">Demo accounts</span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span>{demoOpen ? 'Hide' : 'Show'} ({demoAccounts.length})</span>
                  {demoOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {demoOpen && (
                <div className="mt-2.5 space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleQuickLogin(acc)}
                      className="w-full text-left p-2 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{acc.name}</span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">({acc.id})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{acc.description}</p>
                      </div>
                      <span className="shrink-0 text-indigo-600 dark:text-indigo-400 font-medium text-xs">
                        Use
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
