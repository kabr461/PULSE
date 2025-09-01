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
type RetentionEntry = {
  clientId: string;
  startDate: string;
  currentProgram: string;
  billingCycle: 'Weekly' | 'Bi-Weekly' | 'Monthly';
  attendanceRate: number | null;
  missedSessions: number | null;
  paymentStatus: 'OK' | 'Late' | 'Failed';
  checkinCompletion: number | null;
  trainerNotes: string;
  lastReviewDate: string;
  retentionStatus: 'Green' | 'Yellow' | 'Red';
};

type ChurnEntry = {
  clientId: string;
  joinDate: string;
  cancelDate: string;
  durationWeeks: number | null;
  initialSource: 'Ad' | 'Walk-in' | 'Referral';
  cancelReason: string;
  churnType: 'Voluntary' | 'Involuntary' | 'Soft Churn';
  interviewDone: 'Yes' | 'No';
  attemptedSave: 'Yes' | 'No';
  escalated: 'Yes' | 'No';
  lastCoachContact: string;
  ownerAssigned: string;
};

// add these three to your LTVEntry definition
type LTVEntry = {
  clientId: string;
  startDate: string;
  spendToDate: number | null;
  monthlyPayment: number | null;
  monthsRetained: number | null;
  avgMonthlyRevenue: number | null;
  ltv: number | null;
  projectedLtv: number | null;
  upsellsCompleted: number | null;
  renewalsCount: number | null;
  originalOfferType: string;
  // new coach‐assigned fields:
  visualProgress: number | null;
  checkinResponses: number | null;
  goalTracking: number | null;
};


type UpsellEntry = {
  clientId: string;
  tenureWeeks: number | null;
  goalProgress: number | null;
  sessionUtilization: number | null;
  currentPlan: string;
  nextOfferOption: string;
  lastOfferDate: string;
  upsellStatus: 'Not Offered' | 'Declined' | 'Upgraded';
  assignedCloser: string;
  targetDate: string;
  isReady: 'Yes' | 'Not Yet' | 'Already Pitched';
  nextStepDate: string;
  salesNotes: string;
  retentionScore: 'Green' | 'Yellow' | 'Red';
  referralGiven: 'Yes' | 'No';
};

type TrainerReviewEntry = {
  clientId: string;
  trainerId: string;
  startDate: string;
  weeksInProgram: number | null;
  currentPlan: string;
  sessionUtilization: number | null;
  checkinsMissed: number | null;
  lateNoShows: number | null;
  retentionStatus: 'Green' | 'Yellow' | 'Red';
  reviewDate: string;
  sessionNotes: string;
  energyScore: '1' | '2' | '3' | '4' | '5';
  concerns: string;
  needsEscalation: 'Yes' | 'No';
  escalated: 'Yes' | 'No';
  actionTaken: 'Check-in' | 'Email' | 'Call' | 'Sent to Manager';
  followUpDate: string;
  upgradeTarget: string;
  lastOfferDate: string;
  upsellStatus: 'Not Offered' | 'Declined' | 'Upgraded';
  nextStepDate: string;
  assignedRep: string;
  notesContext: string;
};

///////////////////////
// Dropdown Options  //
///////////////////////
const programOptions = [
  '6WC', 'Free Trial', 'ClassPass', '12-Week Foundation', '16-Week Transformation',
  '24-Week Signature', 'Annual Plan', 'Hybrid', 'Semi-Private', '1-on-1', 'Team Coaching', 'Group Coaching'
];
const billingCycles = ['Weekly', 'Bi-Weekly', 'Monthly'] as const;
const paymentStatuses = ['OK', 'Late', 'Failed'] as const;
const retentionStatuses = ['Green', 'Yellow', 'Red'] as const;
const initialSources = ['Ad', 'Walk-in', 'Referral'] as const;
const churnTypes = ['Voluntary', 'Involuntary', 'Soft Churn'] as const;
const yesNo = ['Yes', 'No'] as const;
const offerTypes = [
  {
    label: "Low-Ticket / Front-End Offers",
    options: [
      "6WC (6-Week Challenge)",
      "Free Trial / 7-Day Pass",
      "ClassPass",
      "Low-Ticket Paid Trial",
      "Paid Assessment / Initial Consult",
      "Event / Pop-Up Offer",
    ],
  },
  {
    label: "Core Programs",
    options: [
      "12-Week Foundation",
      "16-Week Transformation",
      "24-Week Signature Program",
      "Yearly Program / Annual Plan",
      "Hybrid Program",
      "Semi-Private Coaching",
      "1-on-1 Personal Training",
      "Team Coaching / Bootcamp",
      "Group Coaching",
    ],
  },
  {
    label: "Specialty or Legacy Offers",
    options: [
      "Founding Member Rate",
      "Referral Discount Offer",
      "Legacy Client",
      "Staff Discount Offer",
      "Content CTA Opt-In",
    ],
  },
];
const nextOffers = ['24W Elite', 'Hybrid', 'Nutrition Add-on'];
const upsellStatuses = ['Not Offered', 'Declined', 'Upgraded'] as const;
const energyScores = ['1', '2', '3', '4', '5'] as const;
const actionOptions = ['Check-in', 'Email', 'Call', 'Sent to Manager'];
const weekOptions = ['2025-06-01 to 06-07', '2025-06-08 to 06-14'];

const tabs = [
  'Retention Log',
  'Churn Tracker',
  'LTV Tracker',
  'Upsell Watchlist',
  'Trainer Review'
];

///////////////////////
// Main Component    //
///////////////////////
export default function RetentionLTVTracker() {
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // 1) Retention Log state
  const initialRetention: RetentionEntry = {
    clientId: '', startDate: '', currentProgram: '', billingCycle: 'Weekly',
    attendanceRate: null, missedSessions: null,
    paymentStatus: 'OK', checkinCompletion: null,
    trainerNotes: '', lastReviewDate: '', retentionStatus: 'Green'
  };
  const [retEntry, setRetEntry] = useState<RetentionEntry>(initialRetention);

  // 2) Churn Tracker state
  const initialChurn: ChurnEntry = {
    clientId: '', joinDate: '', cancelDate: '', durationWeeks: null,
    initialSource: 'Ad', cancelReason: '', churnType: 'Voluntary',
    interviewDone: 'No', attemptedSave: 'No', escalated: 'No',
    lastCoachContact: '', ownerAssigned: ''
  };
  const [churnEntry, setChurnEntry] = useState<ChurnEntry>(initialChurn);

  // 3) LTV Tracker state
// …with this:
// include the new fields, initialized to null
const initialLTV: LTVEntry = {
  clientId: "",
  startDate: "",
  spendToDate: null,
  monthlyPayment: null,
  monthsRetained: null,
  avgMonthlyRevenue: null,
  ltv: null,
  projectedLtv: null,
  upsellsCompleted: null,
  renewalsCount: null,
  originalOfferType: offerTypes[0].options[0],
  // new:
  visualProgress: null,
  checkinResponses: null,
  goalTracking: null,
};
const [ltvEntry, setLtvEntry] = useState<LTVEntry>(initialLTV);

  // 4) Upsell Watchlist state
  const initialUpsell: UpsellEntry = {
    clientId: '', tenureWeeks: null, goalProgress: null, sessionUtilization: null,
    currentPlan: '', nextOfferOption: nextOffers[0], lastOfferDate: '',
    upsellStatus: 'Not Offered', assignedCloser: '', targetDate: '',
    isReady: 'Not Yet', nextStepDate: '', salesNotes: '',
    retentionScore: 'Green', referralGiven: 'No'
  };
  const [upsellEntry, setUpsellEntry] = useState<UpsellEntry>(initialUpsell);

  // 5) Trainer Review Log state
  const initialReview: TrainerReviewEntry = {
    clientId: '', trainerId: '', startDate: '', weeksInProgram: null,
    currentPlan: '', sessionUtilization: null, checkinsMissed: null, lateNoShows: null,
    retentionStatus: 'Green', reviewDate: '', sessionNotes: '',
    energyScore: '3', concerns: '', needsEscalation: 'No', escalated: 'No',
    actionTaken: 'Check-in', followUpDate: '', upgradeTarget: '',
    lastOfferDate: '', upsellStatus: 'Not Offered', nextStepDate: '',
    assignedRep: '', notesContext: ''
  };
  const [reviewEntry, setReviewEntry] = useState<TrainerReviewEntry>(initialReview);

  // Generic submit
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

  // Panel renderer
  function renderPanel() {
    switch (activeTab) {
      // 1) Client Retention Log
      case 0:
        return (
          <form
            onSubmit={e => handleSubmit(e, retEntry, () => setRetEntry(initialRetention), 'Retention Log')}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
          >
            <LabelWithTooltip label="Client ID" tooltip="Enter unique client identifier">
              <input
                type="text"
                required
                value={retEntry.clientId}
                onChange={e => setRetEntry({ ...retEntry, clientId: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Start Date" tooltip="Client program start date">
              <input
                type="date"
                required
                value={retEntry.startDate}
                onChange={e => setRetEntry({ ...retEntry, startDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Current Program" tooltip="Select current fitness program">
              <select
                value={retEntry.currentProgram}
                onChange={e => setRetEntry({ ...retEntry, currentProgram: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {programOptions.map(p => <option key={p}>{p}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Billing Cycle" tooltip="Weekly / Bi-Weekly / Monthly">
              <select
                value={retEntry.billingCycle}
                onChange={e => setRetEntry({ ...retEntry, billingCycle: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {billingCycles.map(b => <option key={b}>{b}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Attendance Rate (%)" tooltip="Percentage attended">
              <input
                type="number"
                value={retEntry.attendanceRate ?? ''}
                onChange={e => setRetEntry({ ...retEntry, attendanceRate: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Missed Sessions" tooltip="Count in last 30 days">
              <input
                type="number"
                value={retEntry.missedSessions ?? ''}
                onChange={e => setRetEntry({ ...retEntry, missedSessions: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Payment Status" tooltip="OK / Late / Failed">
              <select
                value={retEntry.paymentStatus}
                onChange={e => setRetEntry({ ...retEntry, paymentStatus: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {paymentStatuses.map(s => <option key={s}>{s}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Check-in %" tooltip="Daily check-in completion %">
              <input
                type="number"
                value={retEntry.checkinCompletion ?? ''}
                onChange={e => setRetEntry({ ...retEntry, checkinCompletion: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <div className="md:col-span-2">
              <LabelWithTooltip label="Trainer Notes" tooltip="Enter any comments">
                <textarea
                  rows={3}
                  value={retEntry.trainerNotes}
                  onChange={e => setRetEntry({ ...retEntry, trainerNotes: e.target.value })}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                />
              </LabelWithTooltip>
            </div>

            <LabelWithTooltip label="Last Review Date" tooltip="Date of last review">
              <input
                type="date"
                value={retEntry.lastReviewDate}
                onChange={e => setRetEntry({ ...retEntry, lastReviewDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Retention Status" tooltip="Green / Yellow / Red">
              <select
                value={retEntry.retentionStatus}
                onChange={e => setRetEntry({ ...retEntry, retentionStatus: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {retentionStatuses.map(r => <option key={r}>{r}</option>)}
              </select>
            </LabelWithTooltip>

            <div className="md:col-span-2 text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Retention
              </button>
            </div>
          </form>
        );

      // 2) Churn Tracker
      case 1:
        return (
          <form
            onSubmit={e => handleSubmit(e, churnEntry, () => setChurnEntry(initialChurn), 'Churn Tracker')}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
          >
            <LabelWithTooltip label="Client ID" tooltip="Same ID as retention">
              <input
                type="text"
                required
                value={churnEntry.clientId}
                onChange={e => setChurnEntry({ ...churnEntry, clientId: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Join Date" tooltip="Original start date">
              <input
                type="date"
                required
                value={churnEntry.joinDate}
                onChange={e => setChurnEntry({ ...churnEntry, joinDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Cancel Date" tooltip="Date client canceled">
              <input
                type="date"
                value={churnEntry.cancelDate}
                onChange={e => setChurnEntry({ ...churnEntry, cancelDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Duration (weeks)" tooltip="Weeks between join & cancel">
              <input
                type="number"
                value={churnEntry.durationWeeks ?? ''}
                onChange={e => setChurnEntry({ ...churnEntry, durationWeeks: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Initial Source" tooltip="Ad / Walk-in / Referral">
              <select
                value={churnEntry.initialSource}
                onChange={e => setChurnEntry({ ...churnEntry, initialSource: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {initialSources.map(s => <option key={s}>{s}</option>)}
              </select>
            </LabelWithTooltip>

         <div className="md:col-span-2">
  <LabelWithTooltip label="Cancel Reason" tooltip="Why the client left">
    <select
      required
      value={churnEntry.cancelReason}
      onChange={e => setChurnEntry({ ...churnEntry, cancelReason: e.target.value })}
      className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
      style={{ color: PRIMARY, borderColor: ACCENT }}
    >
      <option value="">Select reason…</option>
      {[
        "Financial issues",
        "Moved cities",
        "Didn’t like trainer",
        "Got injured",
        "Job schedule changed",
        "Didn’t get results",
        "Just not feeling it anymore",
      ].map(reason => (
        <option key={reason} value={reason}>
          {reason}
        </option>
      ))}
    </select>
  </LabelWithTooltip>
</div>

            <LabelWithTooltip label="Churn Type" tooltip="Voluntary / Involuntary / Soft">
              <select
                value={churnEntry.churnType}
                onChange={e => setChurnEntry({ ...churnEntry, churnType: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {churnTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Interview Done?" tooltip="Exit interview done?">
              <select
                value={churnEntry.interviewDone}
                onChange={e => setChurnEntry({ ...churnEntry, interviewDone: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {yesNo.map(y => <option key={y}>{y}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Attempted Save?" tooltip="Did we try to retain?">
              <select
                value={churnEntry.attemptedSave}
                onChange={e => setChurnEntry({ ...churnEntry, attemptedSave: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {yesNo.map(y => <option key={y}>{y}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Escalated?" tooltip="Escalated to manager?">
              <select
                value={churnEntry.escalated}
                onChange={e => setChurnEntry({ ...churnEntry, escalated: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {yesNo.map(y => <option key={y}>{y}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Last Coach Contact" tooltip="Last time coach reached out">
              <input
                type="text"
                value={churnEntry.lastCoachContact}
                onChange={e => setChurnEntry({ ...churnEntry, lastCoachContact: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Owner ID" tooltip="Team member responsible">
              <input
                type="text"
                value={churnEntry.ownerAssigned}
                onChange={e => setChurnEntry({ ...churnEntry, ownerAssigned: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <div className="md:col-span-2 text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Churn
              </button>
            </div>
          </form>
        );

      // 3) LTV Tracker
      case 2:
        return (
          <form
            onSubmit={e => handleSubmit(e, ltvEntry, () => setLtvEntry(initialLTV), 'LTV Tracker')}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
          >
            <LabelWithTooltip label="Client ID" tooltip="Same unique ID">
              <input
                type="text"
                required
                value={ltvEntry.clientId}
                onChange={e => setLtvEntry({ ...ltvEntry, clientId: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Start Date" tooltip="Program start date again">
              <input
                type="date"
                required
                value={ltvEntry.startDate}
                onChange={e => setLtvEntry({ ...ltvEntry, startDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Spend To Date" tooltip="Total spend so far">
              <input
                type="number"
                value={ltvEntry.spendToDate ?? ''}
                onChange={e => setLtvEntry({ ...ltvEntry, spendToDate: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Monthly Payment" tooltip="Subscription amount">
              <input
                type="number"
                value={ltvEntry.monthlyPayment ?? ''}
                onChange={e => setLtvEntry({ ...ltvEntry, monthlyPayment: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Months Retained" tooltip="Count of months active">
              <input
                type="number"
                value={ltvEntry.monthsRetained ?? ''}
                onChange={e => setLtvEntry({ ...ltvEntry, monthsRetained: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Avg Monthly Rev" tooltip="spendToDate ÷ monthsRetained">
              <input
                type="number"
                value={ltvEntry.avgMonthlyRevenue ?? ''}
                onChange={e => setLtvEntry({ ...ltvEntry, avgMonthlyRevenue: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="LTV" tooltip="Calculated LTV">
              <input
                type="number"
                value={ltvEntry.ltv ?? ''}
                onChange={e => setLtvEntry({ ...ltvEntry, ltv: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Projected LTV" tooltip="Future projection">
              <input
                type="number"
                value={ltvEntry.projectedLtv ?? ''}
                onChange={e => setLtvEntry({ ...ltvEntry, projectedLtv: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Upsells Completed" tooltip="Number of upsells">
              <input
                type="number"
                value={ltvEntry.upsellsCompleted ?? ''}
                onChange={e => setLtvEntry({ ...ltvEntry, upsellsCompleted: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Renewals Count" tooltip="Times renewed">
              <input
                type="number"
                value={ltvEntry.renewalsCount ?? ''}
                onChange={e => setLtvEntry({ ...ltvEntry, renewalsCount: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

          <LabelWithTooltip label="Original Offer Type" tooltip="First program type">
  <select
    value={ltvEntry.originalOfferType}
    onChange={e => setLtvEntry({ ...ltvEntry, originalOfferType: e.target.value })}
    className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
    style={{ color: PRIMARY, borderColor: ACCENT }}
  >
    <option value="">Select…</option>
    {offerTypes.map(group => (
      <optgroup key={group.label} label={group.label}>
        {group.options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
</LabelWithTooltip>


            <div className="md:col-span-2 text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save LTV
              </button>
            </div>
          </form>
        );

      // 4) Upsell Watchlist
      case 3:
        return (
          <form
            onSubmit={e => handleSubmit(e, upsellEntry, () => setUpsellEntry(initialUpsell), 'Upsell Watchlist')}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
          >
            <LabelWithTooltip label="Client ID" tooltip="Same unique ID">
              <input
                type="text"
                required
                value={upsellEntry.clientId}
                onChange={e => setUpsellEntry({ ...upsellEntry, clientId: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Tenure (weeks)" tooltip="Weeks in program">
              <input
                type="number"
                value={upsellEntry.tenureWeeks ?? ''}
                onChange={e => setUpsellEntry({ ...upsellEntry, tenureWeeks: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

          {/* Coach‐assigned weekly % fields */}
<LabelWithTooltip
  label="Visual Progress (%)"
  tooltip="Coach assigns a % each week based on visual progress"
>
  <input
    type="number"
    value={ltvEntry.visualProgress ?? ""}
    onChange={e =>
      setLtvEntry({
        ...ltvEntry,
        visualProgress: e.target.value === "" ? null : +e.target.value,
      })
    }
    className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
    style={{ color: PRIMARY, borderColor: ACCENT }}
  />
</LabelWithTooltip>

<LabelWithTooltip
  label="Check-in Responses (%)"
  tooltip="Coach assigns a % each week based on check-in responses"
>
  <input
    type="number"
    value={ltvEntry.checkinResponses ?? ""}
    onChange={e =>
      setLtvEntry({
        ...ltvEntry,
        checkinResponses: e.target.value === "" ? null : +e.target.value,
      })
    }
    className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
    style={{ color: PRIMARY, borderColor: ACCENT }}
  />
</LabelWithTooltip>

<LabelWithTooltip
  label="Goal Tracking (%)"
  tooltip="Coach assigns a % each week based on goal tracking (e.g. scale loss, strength gains)"
>
  <input
    type="number"
    value={ltvEntry.goalTracking ?? ""}
    onChange={e =>
      setLtvEntry({
        ...ltvEntry,
        goalTracking: e.target.value === "" ? null : +e.target.value,
      })
    }
    className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
    style={{ color: PRIMARY, borderColor: ACCENT }}
  />
</LabelWithTooltip>


            <LabelWithTooltip label="Session Utilization (%)" tooltip="Used sessions %">
              <input
                type="number"
                value={upsellEntry.sessionUtilization ?? ''}
                onChange={e => setUpsellEntry({ ...upsellEntry, sessionUtilization: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Current Plan" tooltip="Program enrolled">
              <select
                value={upsellEntry.currentPlan}
                onChange={e => setUpsellEntry({ ...upsellEntry, currentPlan: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {programOptions.map(p => <option key={p}>{p}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Next Offer Option" tooltip="Proposed upsell">
              <select
                value={upsellEntry.nextOfferOption}
                onChange={e => setUpsellEntry({ ...upsellEntry, nextOfferOption: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {nextOffers.map(n => <option key={n}>{n}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Last Offer Date" tooltip="When last pitched">
              <input
                type="date"
                value={upsellEntry.lastOfferDate}
                onChange={e => setUpsellEntry({ ...upsellEntry, lastOfferDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Upsell Status" tooltip="Not Offered / Declined / Upgraded">
              <select
                value={upsellEntry.upsellStatus}
                onChange={e => setUpsellEntry({ ...upsellEntry, upsellStatus: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {upsellStatuses.map(u => <option key={u}>{u}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Assigned Closer" tooltip="Who handles upsell">
              <input
                type="text"
                value={upsellEntry.assignedCloser}
                onChange={e => setUpsellEntry({ ...upsellEntry, assignedCloser: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Target Date" tooltip="Date to close upsell"> 
              <input
                type="date"
                value={upsellEntry.targetDate}
                onChange={e => setUpsellEntry({ ...upsellEntry, targetDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Is Ready?" tooltip="Yes / Not Yet / Already Pitched">
              <select
                value={upsellEntry.isReady}
                onChange={e => setUpsellEntry({ ...upsellEntry, isReady: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {['Yes','Not Yet','Already Pitched'].map(o => <option key={o}>{o}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Next Step Date" tooltip="When to follow up">
              <input
                type="date"
                value={upsellEntry.nextStepDate}
                onChange={e => setUpsellEntry({ ...upsellEntry, nextStepDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <div className="md:col-span-2">
              <LabelWithTooltip label="Sales Notes" tooltip="Detailed notes">
                <textarea
                  rows={3}
                  value={upsellEntry.salesNotes}
                  onChange={e => setUpsellEntry({ ...upsellEntry, salesNotes: e.target.value })}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                />
              </LabelWithTooltip>
            </div>

            <LabelWithTooltip label="Retention Score" tooltip="Green / Yellow / Red">
              <select
                value={upsellEntry.retentionScore}
                onChange={e => setUpsellEntry({ ...upsellEntry, retentionScore: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {retentionStatuses.map(r => <option key={r}>{r}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Referral Given?" tooltip="Yes / No">
              <select
                value={upsellEntry.referralGiven}
                onChange={e => setUpsellEntry({ ...upsellEntry, referralGiven: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {yesNo.map(y => <option key={y}>{y}</option>)}
              </select>
            </LabelWithTooltip>

            <div className="md:col-span-2 text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Upsell
              </button>
            </div>
          </form>
        );

      // 5) Trainer Review Log
      case 4:
        return (
          <form
            onSubmit={e => handleSubmit(e, reviewEntry, () => setReviewEntry(initialReview), 'Trainer Review')}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
          >
            <LabelWithTooltip label="Client ID" tooltip="Same unique ID">
              <input
                type="text"
                required
                value={reviewEntry.clientId}
                onChange={e => setReviewEntry({ ...reviewEntry, clientId: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Trainer ID" tooltip="Who led sessions">
              <input
                type="text"
                required
                value={reviewEntry.trainerId}
                onChange={e => setReviewEntry({ ...reviewEntry, trainerId: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Start Date" tooltip="Program start">
              <input
                type="date"
                required
                value={reviewEntry.startDate}
                onChange={e => setReviewEntry({ ...reviewEntry, startDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Weeks In Program" tooltip="Total weeks enrolled">
              <input
                type="number"
                value={reviewEntry.weeksInProgram ?? ''}
                onChange={e => setReviewEntry({ ...reviewEntry, weeksInProgram: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Current Plan" tooltip="Active program">
              <select
                value={reviewEntry.currentPlan}
                onChange={e => setReviewEntry({ ...reviewEntry, currentPlan: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                <option value="">Select…</option>
                {programOptions.map(p => <option key={p}>{p}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Session Utilization (%)" tooltip="Attended sessions %">
              <input
                type="number"
                value={reviewEntry.sessionUtilization ?? ''}
                onChange={e => setReviewEntry({ ...reviewEntry, sessionUtilization: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Check-ins Missed" tooltip="Missed check-ins count">
              <input
                type="number"
                value={reviewEntry.checkinsMissed ?? ''}
                onChange={e => setReviewEntry({ ...reviewEntry, checkinsMissed: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Late/No-Shows" tooltip="Count of no-shows">
              <input
                type="number"
                value={reviewEntry.lateNoShows ?? ''}
                onChange={e => setReviewEntry({ ...reviewEntry, lateNoShows: e.target.value === '' ? null : +e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Retention Status" tooltip="Green / Yellow / Red">
              <select
                value={reviewEntry.retentionStatus}
                onChange={e => setReviewEntry({ ...reviewEntry, retentionStatus: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {retentionStatuses.map(r => <option key={r}>{r}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Review Date" tooltip="Date of this review">
              <input
                type="date"
                value={reviewEntry.reviewDate}
                onChange={e => setReviewEntry({ ...reviewEntry, reviewDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <div className="md:col-span-2">
              <LabelWithTooltip label="Session Notes" tooltip="Notes from session">
                <textarea
                  rows={3}
                  value={reviewEntry.sessionNotes}
                  onChange={e => setReviewEntry({ ...reviewEntry, sessionNotes: e.target.value })}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                />
              </LabelWithTooltip>
            </div>

            <LabelWithTooltip label="Energy Score" tooltip="1 (low) to 5 (high)">
              <select
                value={reviewEntry.energyScore}
                onChange={e => setReviewEntry({ ...reviewEntry, energyScore: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {energyScores.map(es => <option key={es}>{es}</option>)}
              </select>
            </LabelWithTooltip>

            <div className="md:col-span-2">
              <LabelWithTooltip label="Concerns" tooltip="Trainer concerns">
                <textarea
                  rows={2}
                  value={reviewEntry.concerns}
                  onChange={e => setReviewEntry({ ...reviewEntry, concerns: e.target.value })}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                />
              </LabelWithTooltip>
            </div>

            <LabelWithTooltip label="Needs Escalation?" tooltip="Yes / No">
              <select
                value={reviewEntry.needsEscalation}
                onChange={e => setReviewEntry({ ...reviewEntry, needsEscalation: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {yesNo.map(y => <option key={y}>{y}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Escalated?" tooltip="Already escalated?">
              <select
                value={reviewEntry.escalated}
                onChange={e => setReviewEntry({ ...reviewEntry, escalated: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {yesNo.map(y => <option key={y}>{y}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Action Taken" tooltip="Check-in / Email / Call / Sent to Manager">
              <select
                value={reviewEntry.actionTaken}
                onChange={e => setReviewEntry({ ...reviewEntry, actionTaken: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {actionOptions.map(a => <option key={a}>{a}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Follow-Up Date" tooltip="Next follow-up">
              <input
                type="date"
                value={reviewEntry.followUpDate}
                onChange={e => setReviewEntry({ ...reviewEntry, followUpDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Upgrade Target" tooltip="Next upsell goal">
              <input
                type="text"
                value={reviewEntry.upgradeTarget}
                onChange={e => setReviewEntry({ ...reviewEntry, upgradeTarget: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Last Offer Made" tooltip="Last upsell pitch date">
              <input
                type="date"
                value={reviewEntry.lastOfferDate}
                onChange={e => setReviewEntry({ ...reviewEntry, lastOfferDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Upsell Status" tooltip="Not Offered / Declined / Upgraded">
              <select
                value={reviewEntry.upsellStatus}
                onChange={e => setReviewEntry({ ...reviewEntry, upsellStatus: e.target.value as any })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              >
                {upsellStatuses.map(u => <option key={u}>{u}</option>)}
              </select>
            </LabelWithTooltip>

            <LabelWithTooltip label="Next Step Date" tooltip="Next planned action">
              <input
                type="date"
                value={reviewEntry.nextStepDate}
                onChange={e => setReviewEntry({ ...reviewEntry, nextStepDate: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <LabelWithTooltip label="Assigned Rep" tooltip="Sales rep assigned">
              <input
                type="text"
                value={reviewEntry.assignedRep}
                onChange={e => setReviewEntry({ ...reviewEntry, assignedRep: e.target.value })}
                className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                style={{ color: PRIMARY, borderColor: ACCENT }}
              />
            </LabelWithTooltip>

            <div className="md:col-span-2">
              <LabelWithTooltip label="Notes / Context" tooltip="Additional context">
                <textarea
                  rows={3}
                  value={reviewEntry.notesContext}
                  onChange={e => setReviewEntry({ ...reviewEntry, notesContext: e.target.value })}
                  className="mt-1 block w-full border rounded-lg p-2 font-lato text-sm"
                  style={{ color: PRIMARY, borderColor: ACCENT }}
                />
              </LabelWithTooltip>
            </div>

            <div className="md:col-span-2 text-right">
              <button
                type="submit"
                className="mt-4 px-4 py-2 rounded-lg font-teko text-lg hover:bg-[#FFE4B5] transition"
                style={{ backgroundColor: PRIMARY, color: ACCENT }}
              >
                Save Review
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8 font-lato">
      <h1 className="font-teko text-3xl mb-6" style={{ color: PRIMARY }}>
        Retention & LTV Tracker
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
