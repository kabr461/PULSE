'use client';

import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

const PRIMARY = "#3B2F6D";
const ACCENT = "#F28C38";

///////////////////////
// Type Definitions  //
///////////////////////
type AdminEntry = {
  date: string;
  staff: string;
  role: 'Admin' | 'Setter' | 'Closer';
  platform: string;
  leadSource: string;
  leadsContacted: number | null;
  consultsBooked: number | null;
  showedUp: number | null;
  noShows: number | null;
  closes: number | null;
  responseTime: number | null;
  notes: string;
};

type WeeklyEntry = {
  week: string;
  staffNotes: string;
};

type SourceEntry = {
  leadSource: string;
  adSpend: number | null;
};

type StaffPerfEntry = {
  staff: string;
  week: string;
  role: 'Admin' | 'Setter' | 'Closer';
  bookings: number | null;
  closes: number | null;
  noShowRate: number | null;
  notes: string;
};

type QAEntry = {
  date: string;
  staff: string;
  issue: string;
  fix: string;
  loomSent: 'Yes' | 'No';
  followUpOwner: string;
  notes: string;
};

type ExecEntry = {
  source: string;
  totalSpend: number | null;
  clientsClosed: number | null;
  cac: number | null;
  ltv: number | null;
  roas: number | null;
  notes: string;
};

///////////////////////
// Dropdown Options  //
///////////////////////
const staffList = ['Alice', 'Bob', 'Charlie', 'Dana'];
const roles = ['Admin', 'Setter', 'Closer'] as const;
const platforms = ['GHL', 'Lead Owl', 'Calendly', 'Other'];
const leadSources = ['FB', 'IG', 'GMB', 'Bark', 'Email', 'Walk-in', 'Kijiji'];
const weekOptions = ['2025-06-01 to 06-07', '2025-06-08 to 06-14'];
const loomOptions = ['Yes', 'No'];

const tabs = [
  'Daily Input',
  'Weekly Summary',
  'Source Perf',
  'Staff Perf',
  'VA QA',
  'CAC & ROAS'
];

//////////////////////////
// Tooltip Label Component
//////////////////////////
function LabelWithTooltip({
  label,
  tooltip,
  children
}: {
  label: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block relative overflow-visible">
      <div className="flex items-center">
        <span className="font-teko text-lg" style={{ color: PRIMARY }}>{label}</span>
        <span className="ml-1 group relative inline-block">
          <Eye className="w-4 h-4 text-gray-400" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-40 text-xs bg-gray-700 text-white rounded px-2 py-1 z-10 whitespace-normal">
            {tooltip}
          </div>
        </span>
      </div>
      {children}
    </label>
  );
}

///////////////////////
// Tracker Component //
///////////////////////
export default function AdminSalesTracker() {
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState('');

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // 1) Daily Input state
  const initialAdmin: AdminEntry = {
    date: '', staff: '', role: 'Setter',
    platform: '', leadSource: '',
    leadsContacted: null, consultsBooked: null,
    showedUp: null, noShows: null, closes: null,
    responseTime: null, notes: ''
  };
  const [admin, setAdmin] = useState<AdminEntry>(initialAdmin);
  const resetAdmin = () => setAdmin(initialAdmin);

  // 2) Weekly Summary state
  const initialWeekly: WeeklyEntry = { week: '', staffNotes: '' };
  const [weekly, setWeekly] = useState<WeeklyEntry>(initialWeekly);
  const resetWeekly = () => setWeekly(initialWeekly);

  // 3) Source Perf state
  const initialSource: SourceEntry = { leadSource: '', adSpend: null };
  const [sourcePerf, setSourcePerf] = useState<SourceEntry>(initialSource);
  const resetSource = () => setSourcePerf(initialSource);

  // 4) Staff Perf state
  const initialStaffPerf: StaffPerfEntry = {
    staff: '', week: '', role: 'Setter',
    bookings: null, closes: null, noShowRate: null, notes: ''
  };
  const [staffPerf, setStaffPerf] = useState<StaffPerfEntry>(initialStaffPerf);
  const resetStaffPerf = () => setStaffPerf(initialStaffPerf);

  // 5) VA QA state
  const initialQA: QAEntry = {
    date: '', staff: '', issue: '', fix: '',
    loomSent: 'No', followUpOwner: '', notes: ''
  };
  const [qa, setQA] = useState<QAEntry>(initialQA);
  const resetQA = () => setQA(initialQA);

  // 6) Exec Dashboard state
  const initialExec: ExecEntry = {
    source: '', totalSpend: null, clientsClosed: null,
    cac: null, ltv: null, roas: null, notes: ''
  };
  const [execEntry, setExecEntry] = useState<ExecEntry>(initialExec);
  const resetExec = () => setExecEntry(initialExec);

  // Generic submit handler
  function handleSubmit<T>(
    e: React.FormEvent,
    data: T,
    resetFn: () => void,
    label: string
  ) {
    e.preventDefault();
    console.log(label, data);
    resetFn();
    setToast(`${label} saved successfully`);
  }

  // Render the current tab’s form
  const renderPanel = () => {
    switch (activeTab) {
      // 1) Daily Input Log
      case 0:
        return (
          <form
            onSubmit={e => handleSubmit(e, admin, resetAdmin, 'Daily Input')}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
          >
            <div>
              <LabelWithTooltip label="Date" tooltip="PLACEHOLDER_DATE_TOOLTIP">
                <input
                  type="date"
                  required
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                  value={admin.date}
                  onChange={e => setAdmin({ ...admin, date: e.target.value })}
                />
              </LabelWithTooltip>
            </div>

            <div>
              <LabelWithTooltip label="Staff Member" tooltip="PLACEHOLDER_STAFF_TOOLTIP">
                <select
                  required
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                  value={admin.staff}
                  onChange={e => setAdmin({ ...admin, staff: e.target.value })}
                >
                  <option value="">Select…</option>
                  {staffList.map(s => <option key={s}>{s}</option>)}
                </select>
              </LabelWithTooltip>
            </div>

            <div>
              <LabelWithTooltip label="Role" tooltip="PLACEHOLDER_ROLE_TOOLTIP">
                <select
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                  value={admin.role}
                  onChange={e => setAdmin({ ...admin, role: e.target.value as any })}
                >
                  {roles.map(r => <option key={r}>{r}</option>)}
                </select>
              </LabelWithTooltip>
            </div>

            <div>
              <LabelWithTooltip label="Platform" tooltip="PLACEHOLDER_PLATFORM_TOOLTIP">
                <select
                  required
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                  value={admin.platform}
                  onChange={e => setAdmin({ ...admin, platform: e.target.value })}
                >
                  <option value="">Select…</option>
                  {platforms.map(p => <option key={p}>{p}</option>)}
                </select>
              </LabelWithTooltip>
            </div>

            <div>
              <LabelWithTooltip label="Lead Source" tooltip="PLACEHOLDER_LEAD_SOURCE_TOOLTIP">
                <select
                  required
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                  value={admin.leadSource}
                  onChange={e => setAdmin({ ...admin, leadSource: e.target.value })}
                >
                  <option value="">Select…</option>
                  {leadSources.map(l => <option key={l}>{l}</option>)}
                </select>
              </LabelWithTooltip>
            </div>

            {([
              ['Leads Contacted', 'leadsContacted'],
              ['Consults Booked', 'consultsBooked'],
              ['Showed Up', 'showedUp'],
              ['No-Shows', 'noShows'],
              ['Closes', 'closes'],
              ['Response Time (hrs)', 'responseTime']
            ] as const).map(([lbl, key]) => (
              <div key={key}>
                <LabelWithTooltip 
                  label={lbl} 
                  tooltip={`PLACEHOLDER_${key.toUpperCase()}_TOOLTIP`}
                >
                  <input
                    type="number"
                    className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                    style={{ color: PRIMARY, borderColor: ACCENT }}
                    value={admin[key] ?? ''}
                    onChange={e => setAdmin({
                      ...admin,
                      [key]: e.target.value === '' ? null : +e.target.value
                    })}
                  />
                </LabelWithTooltip>
              </div>
            ))}

            <div className="md:col-span-2">
              <LabelWithTooltip label="Notes" tooltip="PLACEHOLDER_NOTES_TOOLTIP">
                <textarea
                  rows={3}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                  value={admin.notes}
                  onChange={e => setAdmin({ ...admin, notes: e.target.value })}
                />
              </LabelWithTooltip>
            </div>

            <div className="md:col-span-2 text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Details
              </button>
            </div>
          </form>
        );

      // 2) Weekly Summary
      case 1:
        return (
          <form
            onSubmit={e => handleSubmit(e, weekly, resetWeekly, 'Weekly Summary')}
            className="space-y-6 overflow-visible"
          >
            <LabelWithTooltip label="Week Range" tooltip="PLACEHOLDER_WEEK_TOOLTIP">
              <select
                required
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={weekly.week}
                onChange={e => setWeekly({ ...weekly, week: e.target.value })}
              >
                <option value="">Select…</option>
                {weekOptions.map(w => <option key={w}>{w}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Staff Notes" tooltip="PLACEHOLDER_STAFFNOTES_TOOLTIP">
              <textarea
                rows={3}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={weekly.staffNotes}
                onChange={e => setWeekly({ ...weekly, staffNotes: e.target.value })}
              />
            </LabelWithTooltip>

            <div className="text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Details
              </button>
            </div>
          </form>
        );

      // 3) Source Performance
      case 2:
        return (
          <form
            onSubmit={e => handleSubmit(e, sourcePerf, resetSource, 'Source Perf')}
            className="space-y-6 overflow-visible"
          >
            <LabelWithTooltip label="Lead Source" tooltip="PLACEHOLDER_SOURCE_TOOLTIP">
              <select
                required
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={sourcePerf.leadSource}
                onChange={e => setSourcePerf({ ...sourcePerf, leadSource: e.target.value })}
              >
                <option value="">Select…</option>
                {leadSources.map(l => <option key={l}>{l}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="$ Ad Spend" tooltip="PLACEHOLDER_ADSPEND_TOOLTIP">
              <input
                type="number"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={sourcePerf.adSpend ?? ''}
                onChange={e => setSourcePerf({
                  ...sourcePerf,
                  adSpend: e.target.value === '' ? null : +e.target.value
                })}
              />
            </LabelWithTooltip>

            <div className="text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Details
              </button>
            </div>
          </form>
        );

      // 4) Staff Performance Tracker
      case 3:
        return (
          <form
            onSubmit={e => handleSubmit(e, staffPerf, resetStaffPerf, 'Staff Perf')}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
          >
            <LabelWithTooltip label="Staff" tooltip="PLACEHOLDER_STAFFPERF_STAFF">
              <select
                required
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={staffPerf.staff}
                onChange={e => setStaffPerf({ ...staffPerf, staff: e.target.value })}
              >
                <option value="">Select…</option>
                {staffList.map(s => <option key={s}>{s}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Week" tooltip="PLACEHOLDER_STAFFPERF_WEEK">
              <select
                required
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={staffPerf.week}
                onChange={e => setStaffPerf({ ...staffPerf, week: e.target.value })}
              >
                <option value="">Select…</option>
                {weekOptions.map(w => <option key={w}>{w}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Role" tooltip="PLACEHOLDER_STAFFPERF_ROLE">
              <select
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={staffPerf.role}
                onChange={e => setStaffPerf({ ...staffPerf, role: e.target.value as any })}
              >
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Bookings" tooltip="PLACEHOLDER_STAFFPERF_BOOKINGS">
              <input
                type="number"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={staffPerf.bookings ?? ''}
                onChange={e => setStaffPerf({
                  ...staffPerf,
                  bookings: e.target.value === '' ? null : +e.target.value
                })}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Closes" tooltip="PLACEHOLDER_STAFFPERF_CLOSES">
              <input
                type="number"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={staffPerf.closes ?? ''}
                onChange={e => setStaffPerf({
                  ...staffPerf,
                  closes: e.target.value === '' ? null : +e.target.value
                })}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="No-Show Rate (%)" tooltip="PLACEHOLDER_STAFFPERF_NOSHOW">
              <input
                type="number"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={staffPerf.noShowRate ?? ''}
                onChange={e => setStaffPerf({
                  ...staffPerf,
                  noShowRate: e.target.value === '' ? null : +e.target.value
                })}
              />
            </LabelWithTooltip>

            <div className="md:col-span-2">
              <LabelWithTooltip label="Notes" tooltip="PLACEHOLDER_STAFFPERF_NOTES">
                <textarea
                  rows={3}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                  value={staffPerf.notes}
                  onChange={e => setStaffPerf({ ...staffPerf, notes: e.target.value })}
                />
              </LabelWithTooltip>
            </div>

            <div className="md:col-span-2 text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Details
              </button>
            </div>
          </form>
        );

      // 5) VA QA Notes + Escalations
      case 4:
        return (
          <form
            onSubmit={e => handleSubmit(e, qa, resetQA, 'VA QA')}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
          >
            <LabelWithTooltip label="Date" tooltip="PLACEHOLDER_QA_DATE">
              <input
                type="date"
                required
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={qa.date}
                onChange={e => setQA({ ...qa, date: e.target.value })}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Staff" tooltip="PLACEHOLDER_QA_STAFF">
              <select
                required
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={qa.staff}
                onChange={e => setQA({ ...qa, staff: e.target.value })}
              >
                <option value="">Select…</option>
                {staffList.map(s => <option key={s}>{s}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Issue Spotted" tooltip="PLACEHOLDER_QA_ISSUE">
              <input
                type="text"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={qa.issue}
                onChange={e => setQA({ ...qa, issue: e.target.value })}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Fix Applied" tooltip="PLACEHOLDER_QA_FIX">
              <input
                type="text"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={qa.fix}
                onChange={e => setQA({ ...qa, fix: e.target.value })}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Loom Sent?" tooltip="PLACEHOLDER_QA_LOOM">
              <select
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={qa.loomSent}
                onChange={e => setQA({ ...qa, loomSent: e.target.value as any })}
              >
                {loomOptions.map(o => <option key={o}>{o}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Follow-Up Owner" tooltip="PLACEHOLDER_QA_OWNER">
              <input
                type="text"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={qa.followUpOwner}
                onChange={e => setQA({ ...qa, followUpOwner: e.target.value })}
              />
            </LabelWithTooltip>

            <div className="md:col-span-2">
              <LabelWithTooltip label="Notes" tooltip="PLACEHOLDER_QA_NOTES">
                <textarea
                  rows={3}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                  value={qa.notes}
                  onChange={e => setQA({ ...qa, notes: e.target.value })}
                />
              </LabelWithTooltip>
            </div>

            <div className="md:col-span-2 text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Details
              </button>
            </div>
          </form>
        );

      // 6) CAC & ROAS Executive Dashboard
      case 5:
        return (
          <form
            onSubmit={e => handleSubmit(e, execEntry, resetExec, 'CAC & ROAS')}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
          >
            <LabelWithTooltip label="Source" tooltip="PLACEHOLDER_EXEC_SOURCE">
              <select
                required
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={execEntry.source}
                onChange={e => setExecEntry({ ...execEntry, source: e.target.value })}
              >
                <option value="">Select…</option>
                {leadSources.map(l => <option key={l}>{l}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Total Spend" tooltip="PLACEHOLDER_EXEC_SPEND">
              <input
                type="number"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={execEntry.totalSpend ?? ''}
                onChange={e => setExecEntry({
                  ...execEntry,
                  totalSpend: e.target.value === '' ? null : +e.target.value
                })}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Clients Closed" tooltip="PLACEHOLDER_EXEC_CLOSED">
              <input
                type="number"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={execEntry.clientsClosed ?? ''}
                onChange={e => setExecEntry({
                  ...execEntry,
                  clientsClosed: e.target.value === '' ? null : +e.target.value
                })}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="CAC (Spend÷Closed)" tooltip="PLACEHOLDER_EXEC_CAC">
              <input
                type="number"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={execEntry.cac ?? ''}
                onChange={e => setExecEntry({
                  ...execEntry,
                  cac: e.target.value === '' ? null : +e.target.value
                })}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="LTV" tooltip="PLACEHOLDER_EXEC_LTV">
              <input
                type="number"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={execEntry.ltv ?? ''}
                onChange={e => setExecEntry({
                  ...execEntry,
                  ltv: e.target.value === '' ? null : +e.target.value
                })}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="ROAS" tooltip="PLACEHOLDER_EXEC_ROAS">
              <input
                type="number"
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
                value={execEntry.roas ?? ''}
                onChange={e => setExecEntry({
                  ...execEntry,
                  roas: e.target.value === '' ? null : +e.target.value
                })}
              />
            </LabelWithTooltip>

            <div className="md:col-span-2">
              <LabelWithTooltip label="Notes" tooltip="PLACEHOLDER_EXEC_NOTES">
                <textarea
                  rows={3}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                  value={execEntry.notes}
                  onChange={e => setExecEntry({ ...execEntry, notes: e.target.value })}
                />
              </LabelWithTooltip>
            </div>

            <div className="md:col-span-2 text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Details
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8 font-lato">
      <h1 className="font-teko text-3xl mb-6" style={{ color: PRIMARY }}>
        Sales & Admin KPI Data Entry
      </h1>
      {toast && (
        <div className="fixed top-5 right-5 bg-green-500 text-white px-5 py-3 rounded-lg shadow font-lato">
          {toast}
        </div>
      )}
      <nav className="bg-white rounded-lg p-3 flex space-x-6 shadow mb-6">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className="px-4 py-2 rounded-lg font-teko text-lg transition"
            style={{
              color: i === activeTab ? ACCENT : PRIMARY,
              backgroundColor: i === activeTab ? '#FFE4B5' : 'transparent',
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="bg-white rounded-2xl p-6 shadow max-w-2xl mx-auto overflow-visible">
        {renderPanel()}
      </div>
    </div>
  );
}
