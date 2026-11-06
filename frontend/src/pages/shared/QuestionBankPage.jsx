import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import FilterBar from '../../components/common/FilterBar';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import {
  HelpCircle,
  PlusCircle,
  Search,
  BookOpen,
  Calendar,
  Award,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  FileText
} from 'lucide-react';

const EXAM_TYPES = ['IA1', 'IA2', 'End-sem'];
const YEARS = [2026, 2025, 2024, 2023, 2022];
const SUBJECTS = [
  { code: 'CS401', name: 'Design & Analysis of Algorithms' },
  { code: 'CS402', name: 'Operating Systems' },
  { code: 'CS403', name: 'Database Management Systems' },
  { code: 'CS404', name: 'Computer Networks' },
  { code: 'CS405', name: 'Automata Theory' },
  { code: 'CS406', name: 'Full Stack Web Lab' },
];

export default function QuestionBankPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form
  const [formSubject, setFormSubject] = useState('CS401');
  const [formYear, setFormYear] = useState(2025);
  const [formSemester, setFormSemester] = useState(4);
  const [formExamType, setFormExamType] = useState('IA1');
  const [formUnit, setFormUnit] = useState('Unit 1');
  const [formTopic, setFormTopic] = useState('');
  const [formMarks, setFormMarks] = useState(10);
  const [formText, setFormText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isTeacherOrAdmin = user?.role === 'Admin' || user?.role === 'Faculty';

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        ...(subjectFilter ? { subject_code: subjectFilter } : {}),
        ...(yearFilter ? { year: yearFilter } : {}),
        ...(examTypeFilter ? { exam_type: examTypeFilter } : {}),
        ...(unitFilter ? { unit: unitFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
      });
      const data = await apiRequest(`/questions?${q}`);
      setQuestions(data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [subjectFilter, yearFilter, examTypeFilter, unitFilter, searchTerm]);

  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormSubject('CS401');
    setFormYear(2025);
    setFormSemester(4);
    setFormExamType('IA1');
    setFormUnit('Unit 1');
    setFormTopic('');
    setFormMarks(10);
    setFormText('');
    setShowAddModal(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setFormSubject(q.subject_code);
    setFormYear(q.year);
    setFormSemester(q.semester || 4);
    setFormExamType(q.exam_type);
    setFormUnit(q.unit);
    setFormTopic(q.topic);
    setFormMarks(q.marks);
    setFormText(q.question_text);
    setShowAddModal(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!formTopic.trim() || !formText.trim()) {
      toast.error('Topic and Question text are required.');
      return;
    }

    setSubmitting(true);
    const payload = {
      subject_code: formSubject,
      year: Number(formYear),
      semester: Number(formSemester),
      exam_type: formExamType,
      unit: formUnit.trim(),
      topic: formTopic.trim(),
      marks: Number(formMarks),
      question_text: formText.trim(),
    };

    try {
      if (editingQuestion) {
        await apiRequest(`/questions/${editingQuestion.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Question updated successfully');
      } else {
        await apiRequest('/questions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Question uploaded to question bank');
      }
      setShowAddModal(false);
      loadQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/questions/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Question deleted');
      setDeleteTarget(null);
      loadQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to delete question');
    }
  };

  const copyQuestionText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Question copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const canEditOrDelete = (q) => {
    if (user?.role === 'Admin') return true;
    if (user?.role === 'Faculty' && q.uploaded_by === user?.id) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Previous-Year Question Bank"
        subtitle="Search and review past examination questions, internal assessments, and end-semester blueprints."
        actions={
          isTeacherOrAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium focus-visible:ring-2 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Upload question</span>
            </button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search questions by keyword or topic..."
        filters={[
          {
            id: 'subject',
            label: 'Subject',
            value: subjectFilter,
            onChange: setSubjectFilter,
            options: [
              { label: 'All Subjects', value: '' },
              ...SUBJECTS.map(s => ({ label: `${s.code} - ${s.name}`, value: s.code }))
            ]
          },
          {
            id: 'year',
            label: 'Year',
            value: yearFilter,
            onChange: setYearFilter,
            options: [
              { label: 'All Years', value: '' },
              ...YEARS.map(y => ({ label: `${y}`, value: `${y}` }))
            ]
          },
          {
            id: 'examType',
            label: 'Exam Type',
            value: examTypeFilter,
            onChange: setExamTypeFilter,
            options: [
              { label: 'All Exams', value: '' },
              ...EXAM_TYPES.map(e => ({ label: e, value: e }))
            ]
          }
        ]}
      />

      {/* Questions List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      ) : error ? (
        <div className="p-4 rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 text-rose-600 text-xs">
          {error}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No questions found"
          description="There are no past questions matching the current search filters."
          actionLabel={isTeacherOrAdmin ? 'Upload question' : 'Reset filters'}
          onAction={isTeacherOrAdmin ? openCreateModal : () => {
            setSubjectFilter('');
            setYearFilter('');
            setExamTypeFilter('');
            setSearchTerm('');
          }}
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {q.subject_code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {q.exam_type} {q.year}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {q.unit} • {q.topic}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900 text-[11px]">
                    {q.marks} Marks
                  </span>
                  <button
                    type="button"
                    onClick={() => copyQuestionText(q.question_text, q.id)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Copy text"
                  >
                    {copiedId === q.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {canEditOrDelete(q) && (
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(q)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Edit question"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(q)}
                        className="p-1 rounded text-rose-400 hover:text-rose-600 dark:hover:text-rose-300"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                {q.question_text}
              </p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Subject: {q.subject_name}</span>
                <span>Uploaded by: {q.uploader_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create or Edit Question */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>{editingQuestion ? 'Edit Question' : 'Upload Past Exam Question'}</span>
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {SUBJECTS.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Type</label>
                  <select
                    value={formExamType}
                    onChange={(e) => setFormExamType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Unit / Module</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. Unit 2: Sorting"
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Marks</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    required
                    value={formMarks}
                    onChange={(e) => setFormMarks(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Topic / Conceptual Focus</label>
                <input
                  type="text"
                  required
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="e.g. QuickSort Partitioning & Asymptotic Complexity"
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Question Text</label>
                <textarea
                  rows={4}
                  required
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Type the full question statement..."
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingQuestion ? 'Update question' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Question"
        description={deleteTarget ? `Are you sure you want to remove question ${deleteTarget.id} (${deleteTarget.subject_code} ${deleteTarget.exam_type})?` : ''}
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDeleteQuestion}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
