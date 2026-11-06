import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import FilterBar from '../../components/common/FilterBar';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import {
  CalendarClock,
  PlusCircle,
  MapPin,
  Clock,
  User,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminTimetable() {
  const toast = useToast();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  // Modals & form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Slot Form
  const [formDay, setFormDay] = useState('Monday');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formSubject, setFormSubject] = useState('CS401');
  const [formFaculty, setFormFaculty] = useState('LW-FAC-0001');
  const [formClassroom, setFormClassroom] = useState('LH-101');
  const [formSection, setFormSection] = useState('A');
  const [formSemester, setFormSemester] = useState(4);
  const [formConflictError, setFormConflictError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        ...(dayFilter ? { day: dayFilter } : {}),
        ...(sectionFilter ? { section: sectionFilter } : {}),
      });
      const data = await apiRequest(`/timetable?${q}`);
      setSlots(data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load timetable slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [dayFilter, sectionFilter]);

  const openCreateModal = () => {
    setEditingSlot(null);
    setFormDay('Monday');
    setFormStart('09:00');
    setFormEnd('10:00');
    setFormSubject('CS401');
    setFormFaculty('LW-FAC-0001');
    setFormClassroom('LH-101');
    setFormSection('A');
    setFormSemester(4);
    setFormConflictError('');
    setShowAddModal(true);
  };

  const openEditModal = (slot) => {
    setEditingSlot(slot);
    setFormDay(slot.day);
    setFormStart(slot.start_time);
    setFormEnd(slot.end_time);
    setFormSubject(slot.subject_code);
    setFormFaculty(slot.faculty_id);
    setFormClassroom(slot.classroom);
    setFormSection(slot.section);
    setFormSemester(slot.semester || 4);
    setFormConflictError('');
    setShowAddModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    setFormConflictError('');
    setSubmitting(true);

    const payload = {
      day: formDay,
      start_time: formStart,
      end_time: formEnd,
      subject_code: formSubject,
      faculty_id: formFaculty,
      classroom: formClassroom,
      section: formSection,
      semester: Number(formSemester),
    };

    try {
      if (editingSlot) {
        await apiRequest(`/timetable/${editingSlot.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Timetable slot updated & affected students/teachers notified');
      } else {
        await apiRequest('/timetable', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Timetable slot created successfully');
      }
      setShowAddModal(false);
      loadSlots();
    } catch (err) {
      setFormConflictError(err.message || 'Conflict detected');
      toast.error(err.message || 'Failed to save timetable slot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(`/timetable/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Slot removed from timetable');
      setDeleteTarget(null);
      loadSlots();
    } catch (err) {
      toast.error(err.message || 'Failed to delete slot');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Timetable Management"
        subtitle="Schedule classroom lectures and laboratory sessions with automated faculty and venue conflict prevention."
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium focus-visible:ring-2 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add class slot</span>
          </button>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        filters={[
          {
            id: 'day',
            label: 'Day',
            value: dayFilter,
            onChange: setDayFilter,
            options: [
              { label: 'All Days', value: '' },
              ...DAYS.map(d => ({ label: d, value: d }))
            ]
          },
          {
            id: 'section',
            label: 'Section',
            value: sectionFilter,
            onChange: setSectionFilter,
            options: [
              { label: 'All Sections', value: '' },
              { label: 'Section A', value: 'A' },
              { label: 'Section B', value: 'B' }
            ]
          }
        ]}
      />

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-500">
            Error loading timetable: {error}
          </div>
        ) : slots.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No timetable slots found"
            description="No scheduled slots match the selected filters. Use 'Add class slot' to create one."
            actionLabel="Create slot"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Day &amp; Time</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Course &amp; Section</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Classroom</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Faculty / Mentor</th>
                  <th scope="col" className="py-2.5 px-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {slots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{s.day}</div>
                      <span className="font-mono text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {s.start_time} - {s.end_time}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {s.subject_code} • {s.subject_name}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Sem {s.semester} (Section {s.section})
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {s.classroom}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{s.faculty_name}</div>
                      <span className="font-mono text-[11px] text-slate-400">{s.faculty_id}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit slot"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="p-1 rounded text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Timetable Slot */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{editingSlot ? 'Edit Timetable Slot' : 'Create Class Slot'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formConflictError && (
              <div className="m-4 p-3 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Schedule Conflict Detected</span>
                  <span>{formConflictError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSlot} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <select
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Time (24h)
                  </label>
                  <input
                    type="time"
                    required
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End Time (24h)
                  </label>
                  <input
                    type="time"
                    required
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subject Code
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="CS401">CS401 Algorithms</option>
                    <option value="CS402">CS402 Operating Systems</option>
                    <option value="CS403">CS403 DBMS</option>
                    <option value="CS404">CS404 Computer Networks</option>
                    <option value="CS405">CS405 Automata Theory</option>
                    <option value="CS406">CS406 Web Lab</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Classroom / Lab
                  </label>
                  <select
                    value={formClassroom}
                    onChange={(e) => setFormClassroom(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="LH-101">LH-101 (Academic Complex)</option>
                    <option value="LH-102">LH-102 (Academic Complex)</option>
                    <option value="LH-204">LH-204 (Block B)</option>
                    <option value="Lab-3">Lab-3 (CSE Department)</option>
                    <option value="Lab-4">Lab-4 (CSE Department)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Faculty Instructor
                </label>
                <select
                  value={formFaculty}
                  onChange={(e) => setFormFaculty(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="LW-FAC-0001">Prof. Sunita Rao (LW-FAC-0001)</option>
                  <option value="LW-FAC-0002">Dr. Rajesh Kulkarni (LW-FAC-0002)</option>
                  <option value="LW-FAC-0003">Prof. Anita Desai (LW-FAC-0003)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {submitting ? 'Checking conflicts...' : editingSlot ? 'Update slot' : 'Create slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove timetable slot"
        description={deleteTarget ? `Remove ${deleteTarget.subject_code} on ${deleteTarget.day} (${deleteTarget.start_time}-${deleteTarget.end_time}) from Section ${deleteTarget.section} timetable?` : ''}
        confirmLabel="Delete slot"
        isDestructive={true}
        onConfirm={handleDeleteSlot}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
