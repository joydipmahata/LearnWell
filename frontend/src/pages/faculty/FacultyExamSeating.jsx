import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import PageHeader from '../../components/common/PageHeader';
import FilterBar from '../../components/common/FilterBar';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import { Ticket, Search } from 'lucide-react';

export default function FacultyExamSeating() {
  const [seating, setSeating] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');

  const loadSeating = () => {
    setLoading(true);
    const q = new URLSearchParams({
      ...(searchTerm ? { search: searchTerm } : {}),
      ...(selectedRoom ? { room_no: selectedRoom } : {}),
    });
    apiRequest(`/exam-seating/lookup?${q}`)
      .then((res) => setSeating(res || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSeating();
  }, [searchTerm, selectedRoom]);

  const rooms = Array.from(new Set(seating.map((s) => s.room_no))).filter(Boolean);

  const activeChips = [];
  if (selectedRoom) {
    activeChips.push({ id: 'room', label: `Room ${selectedRoom}`, onRemove: () => setSelectedRoom('') });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam seating lookup"
        subtitle="Invigilation roster, candidate desk numbers, and examination hall allocations."
      />

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search candidate, roll, or subject..."
        filters={[
          {
            id: 'room',
            label: 'Hall',
            value: selectedRoom,
            onChange: setSelectedRoom,
            options: [
              { label: 'All lecture halls', value: '' },
              ...rooms.map((r) => ({ label: `Hall ${r}`, value: r })),
            ],
          },
        ]}
        activeChips={activeChips}
        onClearAll={() => {
          setSearchTerm('');
          setSelectedRoom('');
        }}
        extraActions={
          <span className="text-xs text-slate-500 font-mono">
            {seating.length} seating records
          </span>
        }
      />

      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : seating.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No seating records match your query"
            description="Try clearing search terms or selecting a different lecture hall."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2 px-3 font-semibold">Student</th>
                  <th scope="col" className="py-2 px-3 font-semibold">Roll no</th>
                  <th scope="col" className="py-2 px-3 font-semibold">Subject</th>
                  <th scope="col" className="py-2 px-3 text-center font-semibold">Hall</th>
                  <th scope="col" className="py-2 px-3 text-center font-semibold">Seat</th>
                  <th scope="col" className="py-2 px-3 text-right font-semibold">Date &amp; time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {seating.map((s, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{s.student_name}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{s.roll_no}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{s.subject}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">
                      {s.room_no}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                      {s.seat_no}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-slate-500 font-mono">
                      {s.exam_date} ({s.exam_time})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
