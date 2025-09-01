'use client';

import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

const PRIMARY = "#3B2F6D";
const ACCENT = "#F28C38";

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
// Type Definitions  //
///////////////////////
type MsgEntry = {
  date: string;
  staff: string;
  platform: string;
  leadSource: string;
  totalMessages: number | null;
  replies: number | null;
  conversationsStarted: number | null;
  consultsBooked: number | null;
  followUpsSent: number | null;
  noResponse: number | null;
  notes: string;
};

type WeeklyMsgEntry = {
  week: string;
  staffNotes: string;
};

type PlatformPerfEntry = {
  platform: string;
  totalMessages: number | null;
  replies: number | null;
  bookings: number | null;
  noResponse: number | null;
  avgResponseTime: number | null;
};

type SetterPerfEntry = {
  staff: string;
  week: string;
  platform: string;
  messagesSent: number | null;
  replies: number | null;
  bookings: number | null;
  replyRate: number | null;
  bookRate: number | null;
  noShows: number | null;
  showRate: number | null;
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

///////////////////////
// Constants         //
///////////////////////
const staffList = ['Alice', 'Bob', 'Charlie', 'Dana'];
const msgPlatforms = ['Instagram', 'SMS', 'Skool', 'TikTok', 'WhatsApp'];
const leadSources = [
  'Facebook Ads (Lead Form)',
  'Instagram DM to Call',
  'Google Ads / SEO',
  'FBM/Kijiji',
  'Referral (Phone-Based)',
  'Walk-Ins (Follow-Up)',
  'QR Code Scan',
  'Inbound Calls (Missed / Callback)',
  'TikTok / YouTube / Other Organic',
  'CRM Reactivation (Old Leads)'
];
const weekOptions = ['2025-06-01 to 06-07', '2025-06-08 to 06-14'];
const loomOptions = ['Yes', 'No'];
const tabs = ['Daily Msg', 'Weekly Summary', 'Platform Perf', 'Setter Perf', 'VA QA'];

///////////////////////
// Toast Component   //
///////////////////////
function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="fixed top-5 right-5 bg-green-500 text-white px-5 py-3 rounded-lg shadow font-lato">
      {msg}
    </div>
  );
}

///////////////////////
// Main Component    //
///////////////////////
export default function MessagingSetterTracker() {
  // navigation & toast
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // 1) Daily Messaging state
  const initialMsg: MsgEntry = {
    date: '', staff: '', platform: '', leadSource: '',
    totalMessages: null, replies: null, conversationsStarted: null,
    consultsBooked: null, followUpsSent: null, noResponse: null, notes: ''
  };
  const [msgEntry, setMsgEntry] = useState<MsgEntry>(initialMsg);
  const resetMsg = () => setMsgEntry(initialMsg);

  // 2) Weekly Summary state
  const initialWeekly: WeeklyMsgEntry = { week: '', staffNotes: '' };
  const [weekly, setWeekly] = useState<WeeklyMsgEntry>(initialWeekly);
  const resetWeekly = () => setWeekly(initialWeekly);

  // 3) Platform Performance state
  const initialPlat: PlatformPerfEntry = {
    platform: '', totalMessages: null, replies: null,
    bookings: null, noResponse: null, avgResponseTime: null
  };
  const [platPerf, setPlatPerf] = useState<PlatformPerfEntry>(initialPlat);
  const resetPlat = () => setPlatPerf(initialPlat);

  // 4) Setter Performance state
  const initialSetter: SetterPerfEntry = {
    staff: '', week: '', platform: '',
    messagesSent: null, replies: null, bookings: null,
    replyRate: null, bookRate: null, noShows: null, showRate: null,
    notes: ''
  };
  const [setterPerf, setSetterPerf] = useState<SetterPerfEntry>(initialSetter);
  const resetSetter = () => setSetterPerf(initialSetter);

  // 5) VA QA state
  const initialQA: QAEntry = {
    date: '', staff: '', issue: '', fix: '',
    loomSent: 'No', followUpOwner: '', notes: ''
  };
  const [qaEntry, setQAEntry] = useState<QAEntry>(initialQA);
  const resetQA = () => setQAEntry(initialQA);

  // generic submit handler
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

  // render active tab
  const renderPanel = () => {
    switch (activeTab) {
      // 1) Daily Messaging Log
      case 0:
        return (
          <form onSubmit={e => handleSubmit(e, msgEntry, resetMsg, 'Daily Messaging')} className="space-y-4 overflow-visible">
            <LabelWithTooltip label="Date" tooltip="PLACEHOLDER_DATE_TOOLTIP">
              <input
                type="date"
                required
                value={msgEntry.date}
                onChange={e => setMsgEntry({ ...msgEntry, date: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>
            <LabelWithTooltip label="Staff Name" tooltip="PLACEHOLDER_STAFF_TOOLTIP">
              <select
                required
                value={msgEntry.staff}
                onChange={e => setMsgEntry({ ...msgEntry, staff: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {staffList.map(s => <option key={s}>{s}</option>)}
              </select>
            </LabelWithTooltip>
            <LabelWithTooltip label="Platform" tooltip="PLACEHOLDER_PLATFORM_TOOLTIP">
              <select
                required
                value={msgEntry.platform}
                onChange={e => setMsgEntry({ ...msgEntry, platform: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {msgPlatforms.map(p => <option key={p}>{p}</option>)}
              </select>
            </LabelWithTooltip>
            <LabelWithTooltip label="Lead Source" tooltip="PLACEHOLDER_LEAD_SOURCE_TOOLTIP">
              <select
                required
                value={msgEntry.leadSource}
                onChange={e => setMsgEntry({ ...msgEntry, leadSource: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {leadSources.map(l => <option key={l}>{l}</option>)}
              </select>
            </LabelWithTooltip>
            {([
              ['Total Messages Sent', 'totalMessages'],
              ['Replies', 'replies'],
              ['Conversations Started', 'conversationsStarted'],
              ['Consults Booked', 'consultsBooked'],
              ['Follow-Ups Sent', 'followUpsSent'],
              ['No Response', 'noResponse']
            ] as const).map(([lbl, key]) => (
              <LabelWithTooltip
                key={key}
                label={lbl}
                tooltip={`PLACEHOLDER_${key.toUpperCase()}_TOOLTIP`}
              >
                <input
                  type="number"
                  value={msgEntry[key] ?? ''}
                  onChange={e => setMsgEntry({
                    ...msgEntry,
                    [key]: e.target.value === '' ? null : +e.target.value
                  })}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                />
              </LabelWithTooltip>
            ))}
            <LabelWithTooltip label="Notes" tooltip="PLACEHOLDER_NOTES_TOOLTIP">
              <textarea
                rows={2}
                value={msgEntry.notes}
                onChange={e => setMsgEntry({ ...msgEntry, notes: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>
            <button
              type="submit"
              className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
              style={{ backgroundColor: PRIMARY, color: ACCENT }}
            >
              Save Details
            </button>
          </form>
        );

      // 2) Weekly Summary
      case 1:
        return (
          <form onSubmit={e => handleSubmit(e, weekly, resetWeekly, 'Weekly Summary')} className="space-y-4 overflow-visible">
            <LabelWithTooltip label="Week Range" tooltip="PLACEHOLDER_WEEK_TOOLTIP">
              <select
                required
                value={weekly.week}
                onChange={e => setWeekly({ ...weekly, week: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {weekOptions.map(w => <option key={w}>{w}</option>)}
              </select>
            </LabelWithTooltip>
            <LabelWithTooltip label="Staff Notes" tooltip="PLACEHOLDER_STAFFNOTES_TOOLTIP">
              <textarea
                rows={3}
                value={weekly.staffNotes}
                onChange={e => setWeekly({ ...weekly, staffNotes: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>
            <button
              type="submit"
              className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
              style={{ backgroundColor: PRIMARY, color: ACCENT }}
            >
              Save Details
            </button>
          </form>
        );

      // 3) Platform Performance Overview
      case 2:
        return (
          <form onSubmit={e => handleSubmit(e, platPerf, resetPlat, 'Platform Performance')} className="space-y-4 overflow-visible">
            <LabelWithTooltip label="Platform" tooltip="PLACEHOLDER_PLATFORM_PERF_TOOLTIP">
              <select
                required
                value={platPerf.platform}
                onChange={e => setPlatPerf({ ...platPerf, platform: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {msgPlatforms.map(p => <option key={p}>{p}</option>)}
              </select>
            </LabelWithTooltip>
            {([
              ['Total Messages', 'totalMessages'],
              ['Replies', 'replies'],
              ['Bookings', 'bookings'],
              ['No Response', 'noResponse'],
              ['Avg Response Time (hrs)', 'avgResponseTime']
            ] as const).map(([lbl, key]) => (
              <LabelWithTooltip
                key={key}
                label={lbl}
                tooltip={`PLACEHOLDER_${key.toUpperCase()}_TOOLTIP`}
              >
                <input
                  type="number"
                  value={platPerf[key] ?? ''}
                  onChange={e => setPlatPerf({
                    ...platPerf,
                    [key]: e.target.value === '' ? null : +e.target.value
                  })}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                />
              </LabelWithTooltip>
            ))}
            <button
              type="submit"
              className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
              style={{ backgroundColor: PRIMARY, color: ACCENT }}
            >
              Save Details
            </button>
          </form>
        );

      // 4) Setter Performance Tracker
      case 3:
        return (
          <form onSubmit={e => handleSubmit(e, setterPerf, resetSetter, 'Setter Performance')} className="space-y-4 overflow-visible">
            <LabelWithTooltip label="Staff" tooltip="PLACEHOLDER_SETTER_STAFF">
              <select
                required
                value={setterPerf.staff}
                onChange={e => setSetterPerf({ ...setterPerf, staff: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {staffList.map(s => <option key={s}>{s}</option>)}
              </select>
            </LabelWithTooltip>
            <LabelWithTooltip label="Week" tooltip="PLACEHOLDER_SETTER_WEEK">
              <select
                required
                value={setterPerf.week}
                onChange={e => setSetterPerf({ ...setterPerf, week: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {weekOptions.map(w => <option key={w}>{w}</option>)}
              </select>
            </LabelWithTooltip>
            <LabelWithTooltip label="Platform" tooltip="PLACEHOLDER_SETTER_PLATFORM">
              <select
                required
                value={setterPerf.platform}
                onChange={e => setSetterPerf({ ...setterPerf, platform: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {msgPlatforms.map(p => <option key={p}>{p}</option>)}
              </select>
            </LabelWithTooltip>
            {([
              ['Messages Sent', 'messagesSent'],
              ['Replies', 'replies'],
              ['Bookings', 'bookings'],
              ['Reply Rate (%)', 'replyRate'],
              ['Book Rate (%)', 'bookRate'],
              ['No Shows', 'noShows'],
              ['Show Rate (%)', 'showRate']
            ] as const).map(([lbl, key]) => (
              <LabelWithTooltip
                key={key}
                label={lbl}
                tooltip={`PLACEHOLDER_${key.toUpperCase()}_TOOLTIP`}
              >
                <input
                  type="number"
                  value={setterPerf[key] ?? ''}
                  onChange={e => setSetterPerf({
                    ...setterPerf,
                    [key]: e.target.value === '' ? null : +e.target.value
                  })}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                />
              </LabelWithTooltip>
            ))}
            <LabelWithTooltip label="Notes" tooltip="PLACEHOLDER_SETTER_NOTES">
              <textarea
                rows={2}
                value={setterPerf.notes}
                onChange={e => setSetterPerf({ ...setterPerf, notes: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>
            <button
              type="submit"
              className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
              style={{ backgroundColor: PRIMARY, color: ACCENT }}
            >
              Save Details
            </button>
          </form>
        );

      // 5) VA QA Notes + Escalations
      case 4:
        return (
          <form onSubmit={e => handleSubmit(e, qaEntry, resetQA, 'VA QA')} className="space-y-4 overflow-visible">
            <LabelWithTooltip label="Date" tooltip="PLACEHOLDER_QA_DATE">
              <input
                type="date"
                required
                value={qaEntry.date}
                onChange={e => setQAEntry({ ...qaEntry, date: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>
            <LabelWithTooltip label="Staff" tooltip="PLACEHOLDER_QA_STAFF">
              <select
                required
                value={qaEntry.staff}
                onChange={e => setQAEntry({ ...qaEntry, staff: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {staffList.map(s => <option key={s}>{s}</option>)}
              </select>
            </LabelWithTooltip>
            <LabelWithTooltip label="Issue Spotted" tooltip="PLACEHOLDER_QA_ISSUE">
              <input
                type="text"
                value={qaEntry.issue}
                onChange={e => setQAEntry({ ...qaEntry, issue: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>
            <LabelWithTooltip label="Fix Applied" tooltip="PLACEHOLDER_QA_FIX">
              <input
                type="text"
                value={qaEntry.fix}
                onChange={e => setQAEntry({ ...qaEntry, fix: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>
            <LabelWithTooltip label="Loom Sent?" tooltip="PLACEHOLDER_QA_LOOM">
              <select
                value={qaEntry.loomSent}
                onChange={e => setQAEntry({ ...qaEntry, loomSent: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {loomOptions.map(o => <option key={o}>{o}</option>)}
              </select>
            </LabelWithTooltip>
            <LabelWithTooltip label="Follow-Up Owner" tooltip="PLACEHOLDER_QA_OWNER">
              <input
                type="text"
                value={qaEntry.followUpOwner}
                onChange={e => setQAEntry({ ...qaEntry, followUpOwner: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>
            <LabelWithTooltip label="Notes" tooltip="PLACEHOLDER_QA_NOTES">
              <textarea
                rows={2}
                value={qaEntry.notes}
                onChange={e => setQAEntry({ ...qaEntry, notes: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>
            <button
              type="submit"
              className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
              style={{ backgroundColor: PRIMARY, color: ACCENT }}
            >
              Save Details
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8 font-lato">
      <h1 className="font-teko text-3xl mb-6" style={{ color: PRIMARY }}>
        Messaging & Setter KPI Tracker
      </h1>
      <Toast msg={toast} />
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
