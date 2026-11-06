import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import FilterBar from '../../components/common/FilterBar';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import {
  Users2,
  UserPlus,
  Download,
  Copy,
  Check,
  Phone,
  Edit3,
  X
} from 'lucide-react';
import EditContactModal from '../../components/EditContactModal';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();

  // Modals
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddFaculty, setShowAddFaculty] = useState(false);

  // New Student Form
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentBranch, setStudentBranch] = useState('CSE');
  const [studentSection, setStudentSection] = useState('A');
  const [studentSemester, setStudentSemester] = useState(4);
  const [submittingStudent, setSubmittingStudent] = useState(false);

  // Edit Contact Target for Admin
  const [editContactTarget, setEditContactTarget] = useState(null);

  // New Faculty Form
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyDept, setFacultyDept] = useState('Computer Science & Engineering');
  const [submittingFaculty, setSubmittingFaculty] = useState(false);

  // Once-Shown Credentials Result Modal
  const [credentialsNotice, setCredentialsNotice] = useState(null);
  const [copied, setCopied] = useState(false);

  // ConfirmDialog states
  const [pinResetTarget, setPinResetTarget] = useState(null); // { id, name }
  const [deactivateTarget, setDeactivateTarget] = useState(null); // { id, isCurrentlyActive }

  const loadUsers = () => {
    setLoading(true);
    const q = new URLSearchParams({
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(searchTerm ? { search: searchTerm } : {}),
    });
    apiRequest(`/admin/users?${q}`)
      .then((res) => setUsers(res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter, searchTerm]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (studentPhone.trim() && !/^\d{10}$/.test(studentPhone.trim().replace(/\D/g, ''))) {
      toast.error('Student phone must be 10 digits.');
      return;
    }
    if (parentPhone.trim() && !/^\d{10}$/.test(parentPhone.trim().replace(/\D/g, ''))) {
      toast.error('Parent phone must be 10 digits.');
      return;
    }

    setSubmittingStudent(true);
    try {
      const res = await apiRequest('/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          name: studentName.trim(),
          email: studentEmail.trim(),
          branch: studentBranch,
          section: studentSection,
          semester: Number(studentSemester),
          student_phone: studentPhone.trim() ? studentPhone.trim().replace(/\D/g, '') : null,
          parent_phone: parentPhone.trim() ? parentPhone.trim().replace(/\D/g, '') : null,
        }),
      });
      setShowAddStudent(false);
      setStudentName('');
      setStudentEmail('');
      setStudentPhone('');
      setParentPhone('');
      setCredentialsNotice({
        title: 'New student account created',
        userId: res.user.id,
        name: res.user.name,
        pin: res.plain_pin,
        note: 'This 6-digit PIN is generated once. Please securely deliver it to the student.',
      });
      toast.success('Student account created');
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to create student');
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setSubmittingFaculty(true);
    try {
      const res = await apiRequest('/admin/faculty', {
        method: 'POST',
        body: JSON.stringify({
          name: facultyName.trim(),
          email: facultyEmail.trim(),
          department: facultyDept,
        }),
      });
      setShowAddFaculty(false);
      setFacultyName('');
      setFacultyEmail('');
      setCredentialsNotice({
        title: 'New faculty mentor account created',
        userId: res.user.id,
        name: res.user.name,
        pin: res.plain_pin,
        note: 'This 6-digit PIN is generated once. Please deliver it to the faculty mentor.',
      });
      toast.success('Faculty account created');
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to create faculty');
    } finally {
      setSubmittingFaculty(false);
    }
  };

  const confirmResetPin = async () => {
    if (!pinResetTarget) return;
    try {
      const res = await apiRequest(`/admin/users/${pinResetTarget.id}/reset-pin`, {
        method: 'POST',
      });
      setPinResetTarget(null);
      setCredentialsNotice({
        title: 'Security PIN reset',
        userId: res.user_id,
        name: pinResetTarget.name,
        pin: res.new_pin,
        note: 'This newly generated PIN is shown once. The previous PIN is invalidated.',
      });
      toast.success('PIN successfully reset');
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to reset PIN');
    }
  };

  const confirmToggleActive = async () => {
    if (!deactivateTarget) return;
    try {
      if (deactivateTarget.isCurrentlyActive) {
        await apiRequest(`/admin/users/${deactivateTarget.id}`, { method: 'DELETE' });
        toast.success(`User ${deactivateTarget.id} deactivated`);
      } else {
        await apiRequest(`/admin/users/${deactivateTarget.id}/restore`, { method: 'PATCH' });
        toast.success(`User ${deactivateTarget.id} restored`);
      }
      setDeactivateTarget(null);
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const copyCredentials = () => {
    if (!credentialsNotice) return;
    const txt = `LearnWell Credentials:\nUser ID: ${credentialsNotice.userId}\nPIN: ${credentialsNotice.pin}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    toast.success('Credentials copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const exportUsersCSV = () => {
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Branch / Dept', 'Section', 'Semester', 'Active'];
    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${u.name}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${u.department || u.branch || ''}"`,
      `"${u.section || ''}"`,
      u.semester || '',
      u.is_active ? 'Active' : 'Inactive',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'learnwell_users.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User directory"
        subtitle="Manage student enrollments, faculty mentors, security credentials, and account statuses."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportUsersCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddStudent(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium focus-visible:ring-2 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add student</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddFaculty(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add faculty</span>
            </button>
          </div>
        }
      />

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, ID, or email..."
        filters={[
          {
            id: 'role',
            label: 'Role',
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { label: 'All roles', value: '' },
              { label: 'Students', value: 'Student' },
              { label: 'Faculty', value: 'Faculty' },
              { label: 'Admins', value: 'Admin' },
            ],
          },
        ]}
        activeChips={roleFilter ? [{ id: 'rf', label: `Role: ${roleFilter}`, onRemove: () => setRoleFilter('') }] : []}
        onClearAll={() => {
          setSearchTerm('');
          setRoleFilter('');
        }}
        extraActions={
          <span className="text-xs text-slate-500 font-mono">
            {users.length} registered users
          </span>
        }
      />

      {/* Users Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="No users match the search criteria"
            description="Adjust your search terms or role filters to view accounts."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2.5 px-3 font-semibold">User ID</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Name &amp; email</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Role</th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">Department / branch</th>
                  <th scope="col" className="py-2.5 px-3 text-center font-semibold">Status</th>
                  <th scope="col" className="py-2.5 px-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-medium text-xs text-slate-900 dark:text-slate-100">
                      {u.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{u.name}</div>
                      <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                      {u.role === 'Student' && (u.student_phone || u.parent_phone) && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          {u.student_phone && <span>Ph: {u.student_phone}</span>}
                          {u.parent_phone && <span className="text-slate-400">• Par: {u.parent_phone}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          u.role === 'Admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300'
                            : u.role === 'Faculty'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300'
                            : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                      {u.department || `${u.branch || 'CSE'} Sem ${u.semester || 4} (${u.section || 'A'})`}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {u.role === 'Student' && (
                          <button
                            type="button"
                            onClick={() => setEditContactTarget(u)}
                            className="px-2 py-1 rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1"
                            title="Edit student and parent phone numbers"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Contacts</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPinResetTarget({ id: u.id, name: u.name })}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                        >
                          Reset PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeactivateTarget({ id: u.id, isCurrentlyActive: u.is_active })}
                          className={`px-2 py-1 rounded border text-[11px] font-medium ${
                            u.is_active
                              ? 'border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                              : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Restore'}
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

      {/* Modal: Add Student */}
      {showAddStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-none"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Enroll new student
              </h2>
              <button
                type="button"
                onClick={() => setShowAddStudent(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label htmlFor="add-student-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full name
                </label>
                <input
                  id="add-student-name"
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Aarav Mehta"
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="add-student-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Institutional email
                </label>
                <input
                  id="add-student-email"
                  type="email"
                  required
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="aarav@college.edu"
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="add-student-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Student phone (10 digits)
                  </label>
                  <input
                    id="add-student-phone"
                    type="tel"
                    maxLength={10}
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9876543210"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="add-parent-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Parent phone (10 digits)
                  </label>
                  <input
                    id="add-parent-phone"
                    type="tel"
                    maxLength={10}
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9123456780"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="add-student-branch" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Branch
                  </label>
                  <select
                    id="add-student-branch"
                    value={studentBranch}
                    onChange={(e) => setStudentBranch(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="add-student-section" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <select
                    id="add-student-section"
                    value={studentSection}
                    onChange={(e) => setStudentSection(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="add-student-sem" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Semester
                  </label>
                  <select
                    id="add-student-sem"
                    value={studentSemester}
                    onChange={(e) => setStudentSemester(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStudent}
                  className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {submittingStudent ? 'Enrolling...' : 'Create student account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Faculty */}
      {showAddFaculty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-none"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Onboard faculty mentor
              </h2>
              <button
                type="button"
                onClick={() => setShowAddFaculty(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFaculty} className="space-y-3">
              <div>
                <label htmlFor="add-faculty-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full name
                </label>
                <input
                  id="add-faculty-name"
                  type="text"
                  required
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="add-faculty-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Institutional email
                </label>
                <input
                  id="add-faculty-email"
                  type="email"
                  required
                  value={facultyEmail}
                  onChange={(e) => setFacultyEmail(e.target.value)}
                  placeholder="rajesh.kumar@college.edu"
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="add-faculty-dept" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  id="add-faculty-dept"
                  value={facultyDept}
                  onChange={(e) => setFacultyDept(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Computer Science & Engineering">Computer Science &amp; Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics &amp; Communication</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddFaculty(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFaculty}
                  className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                >
                  {submittingFaculty ? 'Onboarding...' : 'Create faculty account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Result Modal */}
      {credentialsNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-none"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {credentialsNotice.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{credentialsNotice.note}</p>
            </div>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-xs space-y-1">
              <div>
                <span className="text-slate-500">User ID: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{credentialsNotice.userId}</span>
              </div>
              <div>
                <span className="text-slate-500">Name: </span>
                <span className="text-slate-800 dark:text-slate-200">{credentialsNotice.name}</span>
              </div>
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Security PIN: </span>
                  <span className="font-bold text-sm tracking-wider text-indigo-600 dark:text-indigo-400">
                    {credentialsNotice.pin}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[11px] font-sans hover:bg-white dark:hover:bg-slate-700"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCredentialsNotice(null)}
              className="w-full py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ConfirmDialog: Reset PIN */}
      <ConfirmDialog
        isOpen={!!pinResetTarget}
        title="Reset security PIN"
        description={
          pinResetTarget
            ? `Are you sure you want to invalidate and re-generate the 6-digit security PIN for ${pinResetTarget.name} (${pinResetTarget.id})?`
            : ''
        }
        confirmLabel="Reset PIN"
        isDestructive={true}
        onConfirm={confirmResetPin}
        onCancel={() => setPinResetTarget(null)}
      />

      {/* ConfirmDialog: Deactivate / Restore */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title={deactivateTarget?.isCurrentlyActive ? 'Deactivate user' : 'Restore user'}
        description={
          deactivateTarget?.isCurrentlyActive
            ? `Are you sure you want to deactivate user ${deactivateTarget.id}? They will be unable to sign in until restored.`
            : `Restore login access for user ${deactivateTarget?.id}?`
        }
        confirmLabel={deactivateTarget?.isCurrentlyActive ? 'Deactivate' : 'Restore'}
        isDestructive={deactivateTarget?.isCurrentlyActive}
        onConfirm={confirmToggleActive}
        onCancel={() => setDeactivateTarget(null)}
      />
      {/* Edit Contacts Modal */}
      <EditContactModal
        isOpen={!!editContactTarget}
        onClose={() => setEditContactTarget(null)}
        student={editContactTarget}
        isAdmin={true}
        onSuccess={() => {
          loadUsers();
        }}
      />
    </div>
  );
}
