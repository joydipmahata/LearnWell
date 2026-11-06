import React, { useState } from 'react';
import { apiRequest } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Phone, Mail, Shield, AlertCircle, X, Check, Lock } from 'lucide-react';

const EMAIL_REGEX = /^[\w.-]+@[\w.-]+\.\w+$/;
const PHONE_DIGITS_REGEX = /^\d{10}$/;

export default function EditContactModal({
  isOpen,
  onClose,
  student,
  isAdmin = false,
  onSuccess
}) {
  const toast = useToast();
  const [studentPhone, setStudentPhone] = useState(student?.student_phone || '');
  const [parentPhone, setParentPhone] = useState(student?.parent_phone || '');
  const [studentEmail, setStudentEmail] = useState(student?.student_email || student?.email || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Synchronize state when student prop changes
  React.useEffect(() => {
    if (student) {
      setStudentPhone(student.student_phone || '');
      setParentPhone(student.parent_phone || '');
      setStudentEmail(student.student_email || student.email || '');
      setErrors({});
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const validate = () => {
    const newErrors = {};

    // Validate Student Phone
    const cleanStuPhone = studentPhone.trim().replace(/[\s-]/g, '');
    if (!cleanStuPhone) {
      newErrors.studentPhone = 'Student phone number is required.';
    } else if (!PHONE_DIGITS_REGEX.test(cleanStuPhone)) {
      newErrors.studentPhone = 'Student phone must be exactly 10 digits.';
    }

    // Validate Email
    const cleanEmail = studentEmail.trim();
    if (!cleanEmail) {
      newErrors.studentEmail = 'Student email address is required.';
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      newErrors.studentEmail = 'Please enter a valid email address (e.g., student@domain.edu).';
    }

    // Validate Parent Phone (Admin only)
    if (isAdmin) {
      const cleanParPhone = parentPhone.trim().replace(/[\s-]/g, '');
      if (!cleanParPhone) {
        newErrors.parentPhone = 'Parent/guardian phone number is required.';
      } else if (!PHONE_DIGITS_REGEX.test(cleanParPhone)) {
        newErrors.parentPhone = 'Parent phone must be exactly 10 digits.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const cleanStuPhone = studentPhone.trim().replace(/[\s-]/g, '');
      const cleanParPhone = parentPhone.trim().replace(/[\s-]/g, '');
      const cleanEmail = studentEmail.trim();

      const payload = {
        student_phone: cleanStuPhone,
        student_email: cleanEmail,
      };

      if (isAdmin) {
        payload.parent_phone = cleanParPhone;
      }

      const res = await apiRequest(`/contacts/student/${student.id || student.student_id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      toast.success('Contact details updated successfully');
      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update contact details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 id="contact-modal-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isAdmin ? `Edit Contacts: ${student.name}` : 'Edit My Contact Details'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAdmin ? `Roll: ${student.roll_no || student.id}` : 'Keep your contact info current for academic notifications'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Student Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Student Mobile Phone (10 digits) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                maxLength={10}
                value={studentPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setStudentPhone(val);
                  if (errors.studentPhone) setErrors(prev => ({ ...prev, studentPhone: null }));
                }}
                placeholder="e.g. 9876543210"
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-md border ${
                  errors.studentPhone
                    ? 'border-rose-400 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                } text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
              />
            </div>
            {errors.studentPhone && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.studentPhone}</span>
              </p>
            )}
            <p className="mt-1 text-[10px] text-slate-400">Used for urgent SMS and emergency alerts.</p>
          </div>

          {/* Student Email */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Student Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => {
                  setStudentEmail(e.target.value);
                  if (errors.studentEmail) setErrors(prev => ({ ...prev, studentEmail: null }));
                }}
                placeholder="e.g. student@student.learnwell.edu"
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-md border ${
                  errors.studentEmail
                    ? 'border-rose-400 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                } text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
              />
            </div>
            {errors.studentEmail && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.studentEmail}</span>
              </p>
            )}
          </div>

          {/* Parent/Guardian Phone */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Parent / Guardian Phone (10 digits)
              </label>
              {!isAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Admin managed</span>
                </span>
              )}
            </div>

            <div className="relative">
              <Shield className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                maxLength={10}
                value={parentPhone}
                disabled={!isAdmin}
                onChange={(e) => {
                  if (isAdmin) {
                    const val = e.target.value.replace(/\D/g, '');
                    setParentPhone(val);
                    if (errors.parentPhone) setErrors(prev => ({ ...prev, parentPhone: null }));
                  }
                }}
                placeholder="e.g. 9123456780"
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-md border ${
                  !isAdmin
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed'
                    : errors.parentPhone
                    ? 'border-rose-400 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/30 text-slate-900 dark:text-slate-100'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                } focus:outline-none focus:ring-1 focus:ring-indigo-500`}
              />
            </div>
            {errors.parentPhone && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.parentPhone}</span>
              </p>
            )}
            {!isAdmin ? (
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 italic">
                Parent/guardian number is confidential. Visible only to you and your mentor. To change it, submit an official request to the Dean Academic / Admin office.
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-slate-400">
                Official guardian emergency contact number. Visible to mentors and admin only.
              </p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium focus-visible:ring-2 shadow-xs transition-colors"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save contacts</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
