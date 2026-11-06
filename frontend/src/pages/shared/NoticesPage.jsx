import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import {
  BellRing,
  PlusCircle,
  Pin,
  Trash2,
  Calendar,
  X
} from 'lucide-react';

export default function NoticesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const toast = useToast();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Admin New Notice Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeCategory, setNoticeCategory] = useState('Examinations');
  const [noticePinned, setNoticePinned] = useState(false);
  const [submittingNotice, setSubmittingNotice] = useState(false);

  // ConfirmDialog delete state
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }

  const loadNotices = () => {
    setLoading(true);
    apiRequest('/notices')
      .then((res) => setNotices(res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    setSubmittingNotice(true);
    try {
      await apiRequest('/admin/notices', {
        method: 'POST',
        body: JSON.stringify({
          title: noticeTitle.trim(),
          content: noticeContent.trim(),
          category: noticeCategory,
          pinned: noticePinned,
        }),
      });
      setShowAddModal(false);
      setNoticeTitle('');
      setNoticeContent('');
      setNoticePinned(false);
      toast.success('Notice published');
      loadNotices();
    } catch (err) {
      toast.error(err.message || 'Failed to publish notice');
    } finally {
      setSubmittingNotice(false);
    }
  };

  const confirmDeleteNotice = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/admin/notices/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Notice deleted');
      setDeleteTarget(null);
      loadNotices();
    } catch (err) {
      toast.error(err.message || 'Failed to delete notice');
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (selectedCategory === 'ALL') return true;
    return n.category === selectedCategory;
  });

  const categories = ['ALL', 'Examinations', 'Academic Policy', 'Academic Support', 'General'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional notices"
        subtitle="Official campus communications regarding academic policies, examination timetables, and schedules."
        actions={
          isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium focus-visible:ring-2 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Publish notice</span>
            </button>
          )
        }
      />

      {/* Category filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full border transition-colors shrink-0 ${
              selectedCategory === cat
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-medium'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {cat === 'ALL' ? 'All notices' : cat}
          </button>
        ))}
      </div>

      {/* Notices Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ) : filteredNotices.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="No notices found"
            description="There are currently no active announcements in this category."
          />
        ) : (
          filteredNotices.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 rounded-md border bg-white dark:bg-slate-900 transition-colors ${
                n.pinned
                  ? 'border-indigo-300 dark:border-indigo-800'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {n.pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <Pin className="w-3 h-3" />
                      <span>Pinned</span>
                    </span>
                  )}
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {n.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: n.id, title: n.title })}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      aria-label={`Delete notice ${n.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {n.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1.5 whitespace-pre-wrap">
                {n.content}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                Posted by: <span className="font-medium text-slate-600 dark:text-slate-300">{n.author_name}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Publish Notice (Admin) */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-none"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Publish institutional notice
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-3">
              <div>
                <label htmlFor="notice-title-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Headline
                </label>
                <input
                  id="notice-title-input"
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. End-Term Practical Examination Schedule"
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="notice-category-select" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    id="notice-category-select"
                    value={noticeCategory}
                    onChange={(e) => setNoticeCategory(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Examinations">Examinations</option>
                    <option value="Academic Policy">Academic Policy</option>
                    <option value="Academic Support">Academic Support</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={noticePinned}
                      onChange={(e) => setNoticePinned(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Pin to top of feed</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="notice-body-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Announcement details
                </label>
                <textarea
                  id="notice-body-input"
                  required
                  rows={4}
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Enter notice text and instructions for students or faculty..."
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNotice}
                  className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {submittingNotice ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmDialog: Delete Notice */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete notice"
        description={deleteTarget ? `Are you sure you want to permanently delete "${deleteTarget.title}"?` : ''}
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={confirmDeleteNotice}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
