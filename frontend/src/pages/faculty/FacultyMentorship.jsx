import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import RiskBadge from '../../components/RiskBadge';
import PageHeader from '../../components/common/PageHeader';
import FilterBar from '../../components/common/FilterBar';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import {
  GraduationCap,
  CalendarCheck2,
  BookOpen,
  FileCheck2,
  Download,
  CheckCircle2,
  Info,
  MessageSquare,
  Activity
} from 'lucide-react';
import InterventionTracker from '../../components/interventions/InterventionTracker';

export default function FacultyMentorship() {
  const [subModule, setSubModule] = useState('results-risk'); // 'results-risk' | 'attendance-risk' | 'explorer' | 'assignments' | 'assistant'

  // Mentees and Subject options
  const [menteesList, setMenteesList] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Results At Risk state
  const [resultsAtRisk, setResultsAtRisk] = useState([]);
  const [resultsSemester, setResultsSemester] = useState('');
  const [resultsBranch, setResultsBranch] = useState('');
  const [resultsSection, setResultsSection] = useState('');
  const [resultsSubject, setResultsSubject] = useState('');
  const [resultsBand, setResultsBand] = useState('ALL');
  const [sgpaThreshold, setSgpaThreshold] = useState(6.5);
  const [resultsDecliningOnly, setResultsDecliningOnly] = useState(false);
  const [resultsSearch, setResultsSearch] = useState('');
  const [resultsSort, setResultsSort] = useState('sgpa_asc');

  // Attendance At Risk state
  const [attendanceAtRisk, setAttendanceAtRisk] = useState([]);
  const [attSemester, setAttSemester] = useState('');
  const [attBranch, setAttBranch] = useState('');
  const [attSection, setAttSection] = useState('');
  const [attSubject, setAttSubject] = useState('');
  const [attBand, setAttBand] = useState('ALL');
  const [attThreshold, setAttThreshold] = useState(75.0);
  const [attDecliningOnly, setAttDecliningOnly] = useState(false);
  const [attSearch, setAttSearch] = useState('');
  const [attSort, setAttSort] = useState('att_asc');

  // Results Explorer state
  const [selectedSemester, setSelectedSemester] = useState(4);
  const [explorerData, setExplorerData] = useState(null);
  const [explorerTab, setExplorerTab] = useState('sem-results');

  // Assignments Tracker state
  const [assignmentsData, setAssignmentsData] = useState(null);

  // Mentor Assistant state
  const [assistantOutput, setAssistantOutput] = useState(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantTargetStudent, setAssistantTargetStudent] = useState('');

  // Initial load
  useEffect(() => {
    apiRequest('/faculty/mentees')
      .then((res) => {
        const list = res || [];
        setMenteesList(list);
        if (list.length > 0 && !assistantTargetStudent) {
          setAssistantTargetStudent(list[0].student_id);
        }
      })
      .catch(() => {});

    apiRequest('/faculty/academic-insights/subjects')
      .then((res) => setAvailableSubjects(res || []))
      .catch(() => {});
  }, []);

  // Load results at risk
  useEffect(() => {
    if (subModule === 'results-risk') {
      setLoading(true);
      const q = new URLSearchParams({
        threshold: sgpaThreshold.toString(),
        declining_only: resultsDecliningOnly.toString(),
        sort: resultsSort,
        ...(resultsSemester ? { semester: resultsSemester } : {}),
        ...(resultsBranch ? { branch: resultsBranch } : {}),
        ...(resultsSection ? { section: resultsSection } : {}),
        ...(resultsSubject ? { subject: resultsSubject } : {}),
        ...(resultsBand !== 'ALL' ? { band: resultsBand } : {}),
        ...(resultsSearch ? { search: resultsSearch } : {}),
      });
      apiRequest(`/faculty/academic-insights/results-at-risk?${q}`)
        .then((res) => setResultsAtRisk(res || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [
    subModule,
    sgpaThreshold,
    resultsDecliningOnly,
    resultsSemester,
    resultsBranch,
    resultsSection,
    resultsSubject,
    resultsBand,
    resultsSearch,
    resultsSort,
  ]);

  // Load attendance at risk
  useEffect(() => {
    if (subModule === 'attendance-risk') {
      setLoading(true);
      const q = new URLSearchParams({
        threshold: attThreshold.toString(),
        declining_only: attDecliningOnly.toString(),
        sort: attSort,
        ...(attSemester ? { semester: attSemester } : {}),
        ...(attBranch ? { branch: attBranch } : {}),
        ...(attSection ? { section: attSection } : {}),
        ...(attSubject ? { subject: attSubject } : {}),
        ...(attBand !== 'ALL' ? { band: attBand } : {}),
        ...(attSearch ? { search: attSearch } : {}),
      });
      apiRequest(`/faculty/academic-insights/attendance-at-risk?${q}`)
        .then((res) => setAttendanceAtRisk(res || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [
    subModule,
    attThreshold,
    attDecliningOnly,
    attSemester,
    attBranch,
    attSection,
    attSubject,
    attBand,
    attSearch,
    attSort,
  ]);

  // Load results explorer
  useEffect(() => {
    if (subModule === 'explorer') {
      setLoading(true);
      apiRequest(`/faculty/academic-insights/results-explorer?semester=${selectedSemester}`)
        .then((res) => setExplorerData(res))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [subModule, selectedSemester]);

  // Load assignments
  useEffect(() => {
    if (subModule === 'assignments') {
      setLoading(true);
      apiRequest('/faculty/academic-insights/assignments-cohort')
        .then((res) => setAssignmentsData(res))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [subModule]);

  // Assistant triggers
  const triggerAssistant = async (type) => {
    setAssistantLoading(true);
    setAssistantOutput(null);
    try {
      let endpoint = '';
      if (type === 'pending-assignments') {
        endpoint = '/assistant/pending-assignments';
      } else if (type === 'student-attention') {
        endpoint = `/assistant/student-attention?student_id=${assistantTargetStudent}`;
      } else {
        endpoint = '/assistant/weekly-attention';
      }
      const data = await apiRequest(endpoint);
      setAssistantOutput(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setAssistantLoading(false);
    }
  };

  // CSV Exporters
  const exportResultsCSV = () => {
    const headers = ['Student ID', 'Name', 'Roll No', 'Branch', 'Section', 'Semester', 'Band', 'SGPA', 'SGPA Shift', 'Backlogs', 'Failed Checkpoints'];
    const rows = resultsAtRisk.map((r) => [
      `"${r.student_id}"`,
      `"${r.student_name}"`,
      `"${r.roll_no}"`,
      `"${r.branch}"`,
      `"${r.section}"`,
      r.semester,
      `"${r.band}"`,
      r.sgpa,
      r.sgpa_drop,
      r.backlogs,
      r.failed_count,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'results_at_risk.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceCSV = () => {
    const isSubjectSpecific = Boolean(attSubject);
    const headers = isSubjectSpecific
      ? ['Student ID', 'Name', 'Roll No', 'Branch', 'Section', 'Band', 'Subject', 'Held', 'Attended', 'Remaining', 'Subject Attendance %', 'Classes Needed for 75%', 'Overall Attendance %', 'Trend Delta %']
      : ['Student ID', 'Name', 'Roll No', 'Branch', 'Section', 'Band', 'Overall Attendance %', 'Trend Delta %', 'Subjects Below Threshold'];

    const rows = attendanceAtRisk.map((r) => {
      if (isSubjectSpecific) {
        return [
          `"${r.student_id}"`,
          `"${r.student_name}"`,
          `"${r.roll_no}"`,
          `"${r.branch}"`,
          `"${r.section}"`,
          `"${r.effective_band}"`,
          `"${r.subject_code || ''}"`,
          r.held ?? '',
          r.attended ?? '',
          r.remaining ?? '',
          r.subject_attendance ?? '',
          r.classes_needed_for_75 ?? '',
          r.overall_attendance,
          r.trend_delta,
        ];
      }
      return [
        `"${r.student_id}"`,
        `"${r.student_name}"`,
        `"${r.roll_no}"`,
        `"${r.branch}"`,
        `"${r.section}"`,
        `"${r.effective_band}"`,
        r.overall_attendance,
        r.trend_delta,
        `"${(r.subjects_below_threshold || []).join('; ')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'attendance_at_risk.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Active chips for Results
  const getResultsChips = () => {
    const chips = [];
    if (resultsSemester) chips.push({ id: 'sem', label: `Sem ${resultsSemester}`, onRemove: () => setResultsSemester('') });
    if (resultsBranch) chips.push({ id: 'br', label: `Branch: ${resultsBranch}`, onRemove: () => setResultsBranch('') });
    if (resultsSection) chips.push({ id: 'sec', label: `Section ${resultsSection}`, onRemove: () => setResultsSection('') });
    if (resultsSubject) chips.push({ id: 'sub', label: `Subject: ${resultsSubject}`, onRemove: () => setResultsSubject('') });
    if (resultsBand !== 'ALL') chips.push({ id: 'band', label: `Band: ${resultsBand}`, onRemove: () => setResultsBand('ALL') });
    if (sgpaThreshold !== 6.5) chips.push({ id: 'sgpa', label: `SGPA ≤ ${sgpaThreshold}`, onRemove: () => setSgpaThreshold(6.5) });
    if (resultsDecliningOnly) chips.push({ id: 'dec', label: 'Declining marks only', onRemove: () => setResultsDecliningOnly(false) });
    return chips;
  };

  const clearAllResultsFilters = () => {
    setResultsSemester('');
    setResultsBranch('');
    setResultsSection('');
    setResultsSubject('');
    setResultsBand('ALL');
    setSgpaThreshold(6.5);
    setResultsDecliningOnly(false);
    setResultsSearch('');
    setResultsSort('sgpa_asc');
  };

  // Active chips for Attendance
  const getAttChips = () => {
    const chips = [];
    if (attSemester) chips.push({ id: 'sem', label: `Sem ${attSemester}`, onRemove: () => setAttSemester('') });
    if (attBranch) chips.push({ id: 'br', label: `Branch: ${attBranch}`, onRemove: () => setAttBranch('') });
    if (attSection) chips.push({ id: 'sec', label: `Section ${attSection}`, onRemove: () => setAttSection('') });
    if (attSubject) chips.push({ id: 'sub', label: `Subject: ${attSubject}`, onRemove: () => setAttSubject('') });
    if (attBand !== 'ALL') chips.push({ id: 'band', label: `Band: ${attBand}`, onRemove: () => setAttBand('ALL') });
    if (attThreshold !== 75.0) chips.push({ id: 'thresh', label: `Att ≤ ${attThreshold}%`, onRemove: () => setAttThreshold(75.0) });
    if (attDecliningOnly) chips.push({ id: 'dec', label: 'Month drop only', onRemove: () => setAttDecliningOnly(false) });
    return chips;
  };

  const clearAllAttFilters = () => {
    setAttSemester('');
    setAttBranch('');
    setAttSection('');
    setAttSubject('');
    setAttBand('ALL');
    setAttThreshold(75.0);
    setAttDecliningOnly(false);
    setAttSearch('');
    setAttSort('att_asc');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentorship desk"
        subtitle="Cohort-wide academic filters, multi-semester results explorer, assignments tracker, and case notes."
      />

      {/* Sub-Module Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto text-xs sm:text-sm font-medium">
        {[
          { id: 'results-risk', label: 'Results at risk', icon: GraduationCap },
          { id: 'attendance-risk', label: 'Attendance at risk', icon: CalendarCheck2 },
          { id: 'explorer', label: 'Results explorer', icon: BookOpen },
          { id: 'assignments', label: 'Assignments tracker', icon: FileCheck2 },
          { id: 'interventions-tracker', label: 'Interventions tracker', icon: Activity },
          { id: 'assistant', label: 'Case assistant', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subModule === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubModule(tab.id)}
              className={`flex items-center gap-2 pb-2.5 px-2.5 shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. AT RISK: RESULTS */}
      {subModule === 'results-risk' && (
        <div className="space-y-4">
          <FilterBar
            searchValue={resultsSearch}
            onSearchChange={setResultsSearch}
            searchPlaceholder="Search candidate or roll..."
            filters={[
              {
                id: 'semester',
                label: 'Sem',
                value: resultsSemester,
                onChange: setResultsSemester,
                options: [
                  { label: 'All semesters', value: '' },
                  { label: 'Sem 1', value: '1' },
                  { label: 'Sem 2', value: '2' },
                  { label: 'Sem 3', value: '3' },
                  { label: 'Sem 4', value: '4' },
                ],
              },
              {
                id: 'branch',
                label: 'Branch',
                value: resultsBranch,
                onChange: setResultsBranch,
                options: [
                  { label: 'All branches', value: '' },
                  { label: 'CSE', value: 'CSE' },
                  { label: 'IT', value: 'IT' },
                ],
              },
              {
                id: 'section',
                label: 'Section',
                value: resultsSection,
                onChange: setResultsSection,
                options: [
                  { label: 'All sections', value: '' },
                  { label: 'Section A', value: 'A' },
                  { label: 'Section B', value: 'B' },
                ],
              },
              {
                id: 'subject',
                label: 'Subject',
                value: resultsSubject,
                onChange: setResultsSubject,
                options: [
                  { label: 'All subjects', value: '' },
                  ...availableSubjects.map((s) => ({ label: `${s.code}`, value: s.code })),
                ],
              },
              {
                id: 'band',
                label: 'Band',
                value: resultsBand,
                onChange: setResultsBand,
                options: [
                  { label: 'All bands', value: 'ALL' },
                  { label: 'Red band', value: 'RED' },
                  { label: 'Amber band', value: 'AMBER' },
                  { label: 'Green band', value: 'GREEN' },
                ],
              },
              {
                id: 'sort',
                label: 'Sort',
                value: resultsSort,
                onChange: setResultsSort,
                options: [
                  { label: 'Lowest SGPA first', value: 'sgpa_asc' },
                  { label: 'Highest SGPA first', value: 'sgpa_desc' },
                  { label: 'Biggest SGPA drop', value: 'drop_desc' },
                  { label: 'Student name (A-Z)', value: 'name' },
                ],
              },
            ]}
            activeChips={getResultsChips()}
            onClearAll={clearAllResultsFilters}
            extraActions={
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Threshold:</span>
                  <input
                    type="range"
                    min="5.0"
                    max="8.5"
                    step="0.1"
                    value={sgpaThreshold}
                    onChange={(e) => setSgpaThreshold(parseFloat(e.target.value))}
                    className="w-20 accent-indigo-600"
                  />
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    ≤{sgpaThreshold}
                  </span>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resultsDecliningOnly}
                    onChange={(e) => setResultsDecliningOnly(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Declining only</span>
                </label>

                <button
                  type="button"
                  onClick={exportResultsCSV}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            }
          />

          {/* Results Table */}
          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {resultsAtRisk.length} students flagged for assessment or SGPA risk
              </span>
              <span>SGPA threshold: {sgpaThreshold}</span>
            </div>

            {loading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : resultsAtRisk.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No students match the selected results threshold"
                description="Adjust the SGPA slider or change the filter criteria to broaden the scope."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="py-2 px-3 font-semibold">Student</th>
                      <th scope="col" className="py-2 px-3 font-semibold">Roll no</th>
                      <th scope="col" className="py-2 px-3 font-semibold">Class</th>
                      <th scope="col" className="py-2 px-3 text-center font-semibold">Risk band</th>
                      <th scope="col" className="py-2 px-3 text-center font-semibold">SGPA</th>
                      <th scope="col" className="py-2 px-3 text-center font-semibold">SGPA shift</th>
                      <th scope="col" className="py-2 px-3 text-center font-semibold">Backlogs</th>
                      <th scope="col" className="py-2 px-3 text-center font-semibold">Failed checks</th>
                      <th scope="col" className="py-2 px-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {resultsAtRisk.map((s) => (
                      <tr
                        key={s.student_id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{s.student_name}</div>
                          <span className="text-[11px] text-slate-400 font-mono">{s.student_id}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{s.roll_no}</td>
                        <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                          {s.branch} ({s.section})
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <RiskBadge band={s.band} score={s.risk_score} size="sm" showScore={false} />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                          {s.sgpa}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-xs">
                          <span className={s.sgpa_drop < 0 ? 'text-rose-700 dark:text-rose-400 font-medium' : 'text-emerald-700 dark:text-emerald-400 font-medium'}>
                            {s.sgpa_drop > 0 ? `+${s.sgpa_drop}` : s.sgpa_drop}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs">
                          {s.backlogs > 0 ? (
                            <span className="font-medium text-rose-700 dark:text-rose-400">{s.backlogs} backlog(s)</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs">
                          {s.failed_count > 0 ? (
                            <span className="text-xs px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 font-medium">
                              {s.failed_count} checkpoint(s)
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            to={`/faculty/students/${s.student_id}`}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                          >
                            Case file
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. AT RISK: ATTENDANCE */}
      {subModule === 'attendance-risk' && (
        <div className="space-y-4">
          <FilterBar
            searchValue={attSearch}
            onSearchChange={setAttSearch}
            searchPlaceholder="Search candidate or roll..."
            filters={[
              {
                id: 'semester',
                label: 'Sem',
                value: attSemester,
                onChange: setAttSemester,
                options: [
                  { label: 'All semesters', value: '' },
                  { label: 'Sem 1', value: '1' },
                  { label: 'Sem 2', value: '2' },
                  { label: 'Sem 3', value: '3' },
                  { label: 'Sem 4', value: '4' },
                ],
              },
              {
                id: 'branch',
                label: 'Branch',
                value: attBranch,
                onChange: setAttBranch,
                options: [
                  { label: 'All branches', value: '' },
                  { label: 'CSE', value: 'CSE' },
                  { label: 'IT', value: 'IT' },
                ],
              },
              {
                id: 'section',
                label: 'Section',
                value: attSection,
                onChange: setAttSection,
                options: [
                  { label: 'All sections', value: '' },
                  { label: 'Section A', value: 'A' },
                  { label: 'Section B', value: 'B' },
                ],
              },
              {
                id: 'subject',
                label: 'Subject',
                value: attSubject,
                onChange: setAttSubject,
                options: [
                  { label: 'All subjects (overall)', value: '' },
                  ...availableSubjects.map((s) => ({ label: `${s.code}`, value: s.code })),
                ],
              },
              {
                id: 'band',
                label: 'Band',
                value: attBand,
                onChange: setAttBand,
                options: [
                  { label: 'All bands', value: 'ALL' },
                  { label: 'Red band', value: 'RED' },
                  { label: 'Amber band', value: 'AMBER' },
                  { label: 'Green band', value: 'GREEN' },
                ],
              },
              {
                id: 'sort',
                label: 'Sort',
                value: attSort,
                onChange: setAttSort,
                options: [
                  { label: 'Lowest attendance first', value: 'att_asc' },
                  { label: 'Highest attendance first', value: 'att_desc' },
                  { label: 'Steepest 30-day drop', value: 'trend' },
                  { label: 'Student name (A-Z)', value: 'name' },
                ],
              },
            ]}
            activeChips={getAttChips()}
            onClearAll={clearAllAttFilters}
            extraActions={
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Threshold:</span>
                  <input
                    type="range"
                    min="55"
                    max="85"
                    value={attThreshold}
                    onChange={(e) => setAttThreshold(parseFloat(e.target.value))}
                    className="w-20 accent-teal-600"
                  />
                  <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
                    ≤{attThreshold}%
                  </span>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attDecliningOnly}
                    onChange={(e) => setAttDecliningOnly(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span>Dropping only</span>
                </label>

                <button
                  type="button"
                  onClick={exportAttendanceCSV}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            }
          />

          {/* Attendance Table */}
          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {attendanceAtRisk.length} students flagged for attendance deficit
              </span>
              <span>{attSubject ? `Filtering subject: ${attSubject}` : 'Aggregated cohort standing'}</span>
            </div>

            {loading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : attendanceAtRisk.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No students below attendance threshold"
                description="All mentees in this selection have attendance above the chosen threshold."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="py-2 px-3 font-semibold">Student</th>
                      <th scope="col" className="py-2 px-3 font-semibold">Roll no</th>
                      <th scope="col" className="py-2 px-3 text-center font-semibold">Risk band</th>
                      {attSubject ? (
                        <>
                          <th scope="col" className="py-2 px-3 text-center font-semibold">Held</th>
                          <th scope="col" className="py-2 px-3 text-center font-semibold">Attended</th>
                          <th scope="col" className="py-2 px-3 text-center font-semibold">Remaining</th>
                          <th scope="col" className="py-2 px-3 text-center font-semibold">Subject %</th>
                          <th scope="col" className="py-2 px-3 text-center font-semibold">Classes for 75%</th>
                        </>
                      ) : (
                        <>
                          <th scope="col" className="py-2 px-3 text-center font-semibold">Overall attendance</th>
                          <th scope="col" className="py-2 px-3 text-center font-semibold">30-day velocity</th>
                          <th scope="col" className="py-2 px-3 font-semibold">Subjects below threshold</th>
                        </>
                      )}
                      <th scope="col" className="py-2 px-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {attendanceAtRisk.map((s) => (
                      <tr
                        key={s.student_id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{s.student_name}</div>
                          <span className="text-[11px] text-slate-400 font-mono">{s.student_id}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{s.roll_no}</td>
                        <td className="py-2.5 px-3 text-center">
                          <RiskBadge band={s.effective_band} score={s.risk_score} size="sm" showScore={false} />
                        </td>
                        {attSubject ? (
                          <>
                            <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300">{s.held}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-xs font-medium text-slate-800 dark:text-slate-200">{s.attended}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-400">{s.remaining}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-xs font-medium">
                              <span className={s.subject_attendance >= 75.0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                                {s.subject_attendance}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-xs">
                              {s.classes_needed_for_75 > 0 ? (
                                <span className="text-xs px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 font-medium">
                                  +{s.classes_needed_for_75} needed
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-rose-700 dark:text-rose-400 text-xs">
                              {s.overall_attendance}%
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-xs">
                              <span className={s.trend_delta < 0 ? 'text-rose-700 dark:text-rose-400 font-medium' : 'text-emerald-700 dark:text-emerald-400 font-medium'}>
                                {s.trend_delta > 0 ? `+${s.trend_delta}%` : `${s.trend_delta}%`}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                              {s.subjects_below_threshold?.length > 0 ? s.subjects_below_threshold.join(', ') : 'Overall'}
                            </td>
                          </>
                        )}
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            to={`/faculty/students/${s.student_id}`}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                          >
                            Case file
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. RESULTS EXPLORER */}
      {subModule === 'explorer' && (
        <div className="space-y-4">
          <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Multi-semester cohort results
              </h2>
              <p className="text-xs text-slate-500">
                Switch between terms and evaluation layers to inspect grades and internal marks.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Semester:</span>
              {[1, 2, 3, 4].map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedSemester === sem
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
          </div>

          <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4 text-xs font-medium">
            {[
              { id: 'sem-results', label: 'Semester grades & backlogs' },
              { id: 'internal', label: 'Internal assessments' },
              { id: 'quizzes', label: 'Quizzes' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setExplorerTab(tab.id)}
                className={`pb-2 transition-colors ${
                  explorerTab === tab.id
                    ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {explorerData?.cohort_results ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Student</th>
                      <th scope="col" className="py-2.5 px-3 font-semibold">Roll no</th>
                      {explorerTab === 'sem-results' && (
                        <>
                          <th scope="col" className="py-2.5 px-3 text-center font-semibold">SGPA</th>
                          <th scope="col" className="py-2.5 px-3 text-center font-semibold">CGPA</th>
                          <th scope="col" className="py-2.5 px-3 text-center font-semibold">Backlogs</th>
                          <th scope="col" className="py-2.5 px-3 text-right font-semibold">Result</th>
                        </>
                      )}
                      {explorerTab === 'internal' && (
                        <>
                          <th scope="col" className="py-2.5 px-3 font-semibold">Internal checkpoints</th>
                          <th scope="col" className="py-2.5 px-3 text-right font-semibold">Count</th>
                        </>
                      )}
                      {explorerTab === 'quizzes' && (
                        <>
                          <th scope="col" className="py-2.5 px-3 font-semibold">Quiz marks</th>
                          <th scope="col" className="py-2.5 px-3 text-right font-semibold">Count</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {explorerData.cohort_results.map((r) => (
                      <tr
                        key={r.student_id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{r.student_name}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{r.roll_no}</td>
                        {explorerTab === 'sem-results' && (
                          <>
                            <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800 dark:text-slate-200">{r.sgpa}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">{r.cgpa}</td>
                            <td className="py-2.5 px-3 text-center text-xs">
                              {r.backlogs > 0 ? (
                                <span className="font-semibold text-rose-700 dark:text-rose-400">{r.backlogs}</span>
                              ) : (
                                '0'
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs">
                              <span className={r.backlogs === 0 ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-rose-700 dark:text-rose-400 font-medium'}>
                                {r.status}
                              </span>
                            </td>
                          </>
                        )}
                        {explorerTab === 'internal' && (
                          <>
                            <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                              {r.internal_exams?.map((e) => `${e.subject_code}: ${e.score_pct}%`).slice(0, 3).join(', ') || 'Checkpoints recorded'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs text-indigo-600 font-medium">
                              {r.internal_exams?.length || 0} exams
                            </td>
                          </>
                        )}
                        {explorerTab === 'quizzes' && (
                          <>
                            <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                              {r.quizzes?.map((q) => `${q.subject_code}: ${q.score}/${q.max_marks}`).slice(0, 3).join(', ') || 'Quizzes completed'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs text-teal-600 font-medium">
                              {r.quizzes?.length || 0} quizzes
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">Loading semester records...</div>
            )}
          </div>
        </div>
      )}

      {/* 4. ASSIGNMENTS TRACKER */}
      {subModule === 'assignments' && (
        <div className="space-y-4">
          {assignmentsData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-xs text-slate-500">Submitted on time</span>
                  <div className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                    {assignmentsData.cohort_summary.submitted}
                  </div>
                </div>
                <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-xs text-slate-500">Late submissions</span>
                  <div className="text-xl font-semibold text-amber-700 dark:text-amber-400 mt-1">
                    {assignmentsData.cohort_summary.late}
                  </div>
                </div>
                <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-xs text-slate-500">Missed / overdue</span>
                  <div className="text-xl font-semibold text-rose-700 dark:text-rose-400 mt-1">
                    {assignmentsData.cohort_summary.missed}
                  </div>
                </div>
                <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-xs text-slate-500">Pending upcoming</span>
                  <div className="text-xl font-semibold text-indigo-700 dark:text-indigo-400 mt-1">
                    {assignmentsData.cohort_summary.pending}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200">
                  Deliverable status across assigned mentees
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                      <tr>
                        <th scope="col" className="py-2 px-3 font-semibold">Student</th>
                        <th scope="col" className="py-2 px-3 text-center font-semibold">On time</th>
                        <th scope="col" className="py-2 px-3 text-center font-semibold">Late</th>
                        <th scope="col" className="py-2 px-3 text-center font-semibold">Missed</th>
                        <th scope="col" className="py-2 px-3 text-center font-semibold">Pending</th>
                        <th scope="col" className="py-2 px-3 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {assignmentsData.student_breakdown.map((s) => (
                        <tr
                          key={s.student_id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{s.student_name}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-xs text-emerald-700 dark:text-emerald-400">{s.submitted}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-xs text-amber-700 dark:text-amber-400">{s.late}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-xs text-rose-700 dark:text-rose-400 font-medium">{s.missed}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-500">{s.pending}</td>
                          <td className="py-2.5 px-3 text-right text-xs">
                            {s.missed > 0 ? (
                              <span className="text-rose-700 dark:text-rose-400 font-medium">Overdue</span>
                            ) : (
                              <span className="text-slate-500">Up to date</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. CASE ASSISTANT */}
      {subModule === 'assistant' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Mentor case notes assistant
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates verified, plain-language summaries directly from recorded attendance and assessment figures.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => triggerAssistant('weekly-attention')}
                disabled={assistantLoading}
                className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium focus-visible:ring-2 disabled:opacity-50"
              >
                Who needs attention this week?
              </button>

              <button
                type="button"
                onClick={() => triggerAssistant('pending-assignments')}
                disabled={assistantLoading}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-2 disabled:opacity-50"
              >
                Overdue assignments summary
              </button>

              <div className="flex items-center gap-1.5 p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
                <label htmlFor="assistant-student-select" className="sr-only">
                  Select mentee
                </label>
                <select
                  id="assistant-student-select"
                  value={assistantTargetStudent}
                  onChange={(e) => setAssistantTargetStudent(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 text-xs py-0.5 px-1 focus:outline-none"
                >
                  {menteesList.map((m) => (
                    <option key={m.student_id} value={m.student_id}>
                      {m.student_name} ({m.effective_band})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => triggerAssistant('student-attention')}
                  disabled={assistantLoading || !assistantTargetStudent}
                  className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium disabled:opacity-50"
                >
                  Analyze
                </button>
              </div>
            </div>
          </div>

          {assistantLoading && (
            <div className="p-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-500">
              Generating record summary from verified academic signals...
            </div>
          )}

          {assistantOutput && !assistantLoading && (
            <div className="p-4 sm:p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {assistantOutput.summary}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-500">
                <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>{assistantOutput.disclaimer}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. INTERVENTIONS TRACKER */}
      {subModule === 'interventions-tracker' && (
        <div className="space-y-4">
          <InterventionTracker mentees={menteesList} />
        </div>
      )}
    </div>
  );
}
