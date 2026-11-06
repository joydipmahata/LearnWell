import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Database,
  Calculator,
  Compass,
  FileCheck2,
  MessageSquareCheck,
  Clock,
  Shield,
  Activity,
  Users
} from 'lucide-react';

export default function LandingPage() {
  const steps = [
    {
      step: '01',
      title: 'Academic data tracking',
      desc: 'Attendance percentage, 30-day velocity, assessment checkpoint scores, and coursework submission punctuality.',
      icon: Database,
    },
    {
      step: '02',
      title: 'Transparent risk formula',
      desc: 'A 0–100 weighted score: attendance level (30%), attendance trend (20%), marks level (25%), marks trend (15%), and missed submissions (10%). Demographic data is never collected or factored in.',
      icon: Calculator,
    },
    {
      step: '03',
      title: 'Plain-language reasons',
      desc: 'Risk bands (Low risk <40, Moderate 40–69, High ≥70) state the top 2–3 drivers with concrete numbers so mentors know exactly what went wrong.',
      icon: Compass,
    },
    {
      step: '04',
      title: 'Targeted mentor actions',
      desc: 'Mentors select focused interventions: attendance counselling, remedial tutoring, study plans, or wellbeing referrals.',
      icon: FileCheck2,
    },
    {
      step: '05',
      title: 'Direct student dialogue',
      desc: 'Private notes and 1-on-1 check-ins keep students informed without public callouts or disciplinary stigmas.',
      icon: MessageSquareCheck,
    },
    {
      step: '06',
      title: 'Automatic 14-day flag expiry',
      desc: 'Flags are short-term support triggers, never permanent records. They expire automatically in 14 days or clear when attendance and grades recover.',
      icon: Clock,
    },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 max-w-3xl mx-auto leading-tight">
          Early intervention and mentoring for college student success
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          LearnWell tracks attendance drops and grade trends, explains why a student needs support in plain language, and helps faculty mentors step in before difficulties compound.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm focus-visible:ring-2 shadow-xs"
          >
            <span>Sign in to portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm focus-visible:ring-2"
          >
            How LearnWell works
          </a>
        </div>

        {/* 3 Core Principles */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2.5 mb-2 text-indigo-600 dark:text-indigo-400 font-medium text-sm">
              <Shield className="w-4 h-4" />
              <span>Non-punitive support</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Zero demographic data is used in scoring. Flags exist only to connect students with support and expire automatically after 14 days.
            </p>
          </div>

          <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2.5 mb-2 text-teal-600 dark:text-teal-400 font-medium text-sm">
              <Activity className="w-4 h-4" />
              <span>Specific explanations</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              No black-box scores. Every flagged student shows the exact numbers: velocity changes, missed assignments, and course attendance.
            </p>
          </div>

          <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2.5 mb-2 text-indigo-600 dark:text-indigo-400 font-medium text-sm">
              <Users className="w-4 h-4" />
              <span>Working desk for mentors</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Mentors see who needs attention today, filter cohorts by risk or course, log action plans, and message students directly.
            </p>
          </div>
        </div>
      </section>

      {/* "How LearnWell works" Flowchart Section */}
      <section id="how-it-works" className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-200 dark:border-slate-800">
        <div className="mb-10 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            How LearnWell works
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            From classroom attendance and test records to early mentor action and academic recovery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.step}
                className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 text-slate-400 dark:text-slate-500">
                    <span className="font-mono text-xs font-semibold">{st.step}</span>
                    <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                    {st.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fairness & Verification Note */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center border-t border-slate-200 dark:border-slate-800">
        <div className="p-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left sm:text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Built for institutional transparency
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            LearnWell is calibrated for college departments to maintain fair, accountable mentorship. Test with pre-seeded demo accounts for students, faculty mentors, and academic administrators.
          </p>
          <div className="mt-5 flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium"
            >
              <span>Explore demo accounts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
