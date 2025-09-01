// src/app/components/UniversalEventForm.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Show, useRole } from '@/lib/role';

type Json = Record<string, any>;

interface FormData {
  submission_uid: string;
  user_uid: string;
  submission_date: string;
  event_type: string;
  gym_id: string;               // <-- use gym_id (not gym_uid)
  lead_id?: string;
  [k: string]: any;
}

type GymRow = { id: string } & Record<string, any>;
type ProfileRow = { id: string; role: string; display_name: string; gym_id: string };
type ClientRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  profile_id: string | null;
  gym_id: string;
};

const GYM_LABEL_FIELDS = ['name', 'title', 'display_name'];

// events that should be tied to a specific client (no free-typed Lead ID)
const EVENTS_REQUIRING_CLIENT = [
  'BOOKING_CREATED',
  'SHOW_RECORDED',
  'SALE_RECORDED',
  'REFUND_ISSUED',
  'PAYMENT_FAILED',
  'DEPOSIT_ONLY',
  'TRIAL_STARTED',
  'TRIAL_CONVERTED',
  'RECURRING_PAYMENT',
  'CONVERSATION_STARTED',
  'REPLY_RECEIVED',
  'FOLLOW_UP_SET',
  'TRAINER_ENTRY',
];

export default function UniversalEventForm() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const { role } = useRole();

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  const [gyms, setGyms] = useState<GymRow[]>([]);
  const [trainers, setTrainers] = useState<ProfileRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileRow | null>(null);

  // form state
  const [formData, setFormData] = useState<FormData>({
    submission_uid: crypto.randomUUID(),
    user_uid: '',
    submission_date: new Date().toISOString(),
    event_type: 'LEAD_CREATED',
    gym_id: '', // will be populated
  });

  // ---------- helpers ----------
  const labelGym = (g: GymRow) => {
    for (const f of GYM_LABEL_FIELDS) if (g[f]) return String(g[f]);
    return g.id;
  };

  const handle = (k: string, v: any) => setFormData((fd) => ({ ...fd, [k]: v }));

  // show client dropdown (instead of free-text lead id) for these events
  const needsClient = useMemo(
    () => EVENTS_REQUIRING_CLIENT.includes(formData.event_type),
    [formData.event_type],
  );

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 2200);
  };

  const resetForm = () => {
    // Preserve gym & selected trainer; reset everything else
    const keepGym = formData.gym_id;
    const keepTrainer = formData.assigned_trainer_id || '';
    setFormData({
      submission_uid: crypto.randomUUID(),
      user_uid: session?.user?.id || '',
      submission_date: new Date().toISOString(),
      event_type: 'LEAD_CREATED',
      gym_id: keepGym,
      assigned_trainer_id: keepTrainer,
    });
    setClients([]);
  };

  // ---------- bootstrap: fetch my profile (to know gym_id & role) ----------
  useEffect(() => {
    (async () => {
      if (!session?.user?.id) return;
      setLoading(true);

      // my profile
      const { data: me, error: meErr } = await supabase
        .from('profiles')
        .select('id,role,display_name,gym_id')
        .eq('id', session.user.id)
        .single();

      if (meErr) {
        console.error('profiles/me error', meErr);
        setLoading(false);
        return;
      }

      setMyProfile(me as ProfileRow);
      handle('user_uid', session.user.id);

      // Admin: load all gyms. Everyone else: we only need their gym.
      if (role === 'admin') {
        const { data: gymsData, error: gErr } = await supabase.from('gyms').select('*'); // no brittle columns
        if (gErr) console.error('gyms list error', gErr);
        setGyms((gymsData as GymRow[]) || []);
        // if admin has a gym on their profile, preselect it
        if (me?.gym_id) handle('gym_id', me.gym_id);
      } else {
        if (me?.gym_id) {
          handle('gym_id', me.gym_id);
          // load trainers in my gym
          const { data: ts, error: tErr } = await supabase
            .from('profiles')
            .select('id,display_name,role,gym_id')
            .eq('gym_id', me.gym_id)
            .eq('role', 'trainer');
          if (tErr) console.error('profiles/trainers error', tErr);
          setTrainers((ts as ProfileRow[]) || []);
        }
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, role]);

  // When admin changes gym dropdown → fetch trainers for that gym
  useEffect(() => {
    (async () => {
      if (role !== 'admin') return;
      if (!formData.gym_id) return;
      const { data: ts, error: tErr } = await supabase
        .from('profiles')
        .select('id,display_name,role,gym_id')
        .eq('gym_id', formData.gym_id)
        .eq('role', 'trainer');
      if (tErr) console.error('profiles/trainers error', tErr);
      setTrainers((ts as ProfileRow[]) || []);
    })();
  }, [formData.gym_id, role, supabase]);

  // Load clients filtered by gym and (optionally) trainer/coach based on role
  useEffect(() => {
    (async () => {
      if (!needsClient) {
        setClients([]);
        return;
      }
      if (!formData.gym_id) return;

      let query = supabase
        .from('clients')
        .select('id,display_name,email,profile_id,gym_id')
        .eq('gym_id', formData.gym_id);

      // If a trainer is chosen, filter to that trainer
      if (formData.assigned_trainer_id) {
        query = query.eq('profile_id', formData.assigned_trainer_id);
      } else if (role === 'trainer' || role === 'coach') {
        // Trainers see only their own clients by default
        query = query.eq('profile_id', session!.user.id);
      }

      const { data, error } = await query.order('display_name', { ascending: true });
      if (error) {
        console.error('clients list error', error);
        setClients([]);
        return;
      }
      setClients((data as ClientRow[]) || []);
    })();
  }, [needsClient, formData.gym_id, formData.assigned_trainer_id, role, session?.user?.id, supabase]);

  // ---------- submission ----------
  const submitGymRecord = async (payload: Json) => {
    const { error } = await supabase.from('gym_records').insert([
      {
        gym_id: formData.gym_id,
        profile_id: session!.user.id,
        role,
        payload: {
          submission_uid: formData.submission_uid,
          event_type: formData.event_type,
          ...payload,
        },
      },
    ]);
    if (error) throw error;
  };

  const validateEmailPercents = () => {
    if (formData.event_type !== 'EMAIL_SUMMARY') return true;
    const percentFields = ['open_rate', 'click_rate', 'unsubscribe_rate', 'bounce_rate', 'conversion_rate'];
    for (const f of percentFields) {
      const v = Number(formData[f]);
      if (Number.isFinite(v) && (v < 0 || v > 100)) {
        alert(`${f.replace(/_/g, ' ')} must be between 0 and 100`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gym_id) return alert('No gym selected / detected.');
    if (!validateEmailPercents()) return;

    setSaving(true);
    try {
      // create client on LEAD_CREATED
      let leadId = formData.lead_id;

      if (formData.event_type === 'LEAD_CREATED') {
        if (!formData.client_name || !formData.client_email || !formData.client_age) {
          setSaving(false);
          return alert('Name, Email and Age are required.');
        }

        // Owner/Admin may choose a trainer; others can too. Save under that trainer.
        const trainerId = (formData.assigned_trainer_id as string | undefined) || session!.user.id;

        // Try insert with trainerId; if 23505 (unique constraint), retry with profile_id: null
        const makeInsert = async (profileId: string | null) =>
          supabase
            .from('clients')
            .insert([
              {
                gym_id: formData.gym_id,
                profile_id: profileId,
                display_name: formData.client_name,
                email: formData.client_email,
                age: formData.client_age,
                payload: {
                  lead_source: formData.lead_source || null,
                  lead_created_date: formData.lead_created_date || new Date().toISOString(),
                  assigned_trainer_id: formData.assigned_trainer_id || null,
                },
              },
            ])
            .select('id')
            .single();

        let ins = await makeInsert(trainerId);
        if (ins.error?.code === '23505') {
          ins = await makeInsert(null);
        }
        if (ins.error || !ins.data?.id) {
          console.error('client create', ins.error);
          setSaving(false);
          return alert(`Client creation failed${ins.error?.message ? `: ${ins.error.message}` : ''}`);
        }
        leadId = ins.data.id;
      } else if (needsClient) {
        // For booking/show/sale/etc. use the selected client from dropdown
        if (!formData.selected_client_id) {
          setSaving(false);
          return alert('Please select a client.');
        }
        leadId = formData.selected_client_id;
      }

      // -------------------- RAW ENTRIES INSERT --------------------
      // Put only base columns in table fields; everything else goes in payload
      const {
        submission_uid,
        submission_date,
        event_type,
        gym_id,
        lead_id: _ignore,
        ...restEventFields
      } = formData;

      const rawPayload: Json = {
        ...restEventFields,
        submission_uid,
        lead_id: leadId ?? null,
      };

      const { error } = await supabase.from('raw_entries').insert([
        {
          gym_id,
          profile_id: session!.user.id,
          role,
          lead_id: leadId ?? null,
          event_type,
          submission_date: submission_date || new Date().toISOString(),
          payload: rawPayload,
        },
      ]);
      if (error) throw error;
      // ------------------------------------------------------------

      // mirror to gym_records for “general submissions” feed
      await submitGymRecord({ raw_entry: { ...formData, lead_id: leadId } });

      // success UX
      showToast('Saved!');
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Submission failed');
    } finally {
      setSaving(false);
    }
  };

  // ---------- UI ----------
  if (loading) return <div className="text-gray-700">Loading…</div>;

  // common input class (adds inner padding)
  const ic = 'mt-1 w-full rounded border-gray-300 shadow-sm px-3 py-2 text-gray-700';

  // master dropdown lists (unchanged)
  const eventTypes = [
    'LEAD_CREATED',
    'BOOKING_CREATED',
    'SHOW_RECORDED',
    'SALE_RECORDED',
    'REFUND_ISSUED',
    'PAYMENT_FAILED',
    'DEPOSIT_ONLY',
    'AD_SPEND',
    'TRIAL_STARTED',
    'TRIAL_CONVERTED',
    'RECURRING_PAYMENT',
    'CONVERSATION_STARTED',
    'REPLY_RECEIVED',
    'FOLLOW_UP_SET',
    'TRAINER_ENTRY',
    'ADMIN_SUMMARY',
    'PHONE_SUMMARY',
    'DM_SUMMARY',
    'EMAIL_SUMMARY',
    'CONSULT_SUMMARY',
  ];

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
    'CRM Reactivation (Old Leads)',
  ];

  const channels = ['PHONE', 'DM', 'EMAIL', 'WEB', 'OTHER'];
  const objections = ['Price', 'Timing', 'Need More Info', 'Other'];
  const outcomes = ['No-show', 'Showed', 'Closed', 'Ghosted'];
  const upsells = ['NONE', 'MINOR', 'MAJOR'];
  const dmSources = [
    'Instagram Inbound',
    'Facebook Inbound',
    'TikTok / YouTube Inbound',
    'Email → DM CTA',
    'Typeform / Quiz Opt-In',
    'Cold IG or Facebook DM',
    'Follower Outreach',
    'Friend Add + Message',
    'LinkedIn Outreach',
    'Cold TikTok DMs',
    'CRM Re-Activation',
    'Past Client Check-In',
    'Ghosted Consult Follow-Up',
  ];
  const emailPlatforms = ['Mailchimp', 'Other'];
  const emailSources = ['Broadcast Campaign', 'Drip Campaign'];
  const objectionTrends = [
    'Too Expensive / No Budget',
    'Need to Think About It',
    'Need to Talk to Spouse',
    'Not the Right Time',
    'Lack of Self-Belief',
    'Tried Everything Before',
    'Already Working with Someone',
    'Wants to Do It On Their Own',
    'Schedule / Availability Conflict',
    'Not Interested / Just Looking',
    'Not Listed / Other',
  ];
  const paymentTypes = ['PIF', 'PP', 'DP'];
  const programTypes = ['ONE_ON_ONE', 'SEMI', '6WC', 'ONLINE'];
  const adPlatforms = ['Facebook', 'Google', 'TikTok', 'Instagram', 'Other'];

  return (
    <div className="relative">
      {/* Success toast (modern, minimal) */}
      {toast.show && (
        <div className="fixed right-6 bottom-6 z-50 rounded-xl bg-white px-5 py-3 shadow-2xl ring-1 ring-black/10">
          <div className="text-sm font-medium text-gray-800">✅ {toast.msg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow space-y-6">
        {/* Admin can pick a gym; owner’s gym is prefilled & hidden */}
        <div className="grid md:grid-cols-2 gap-4">
          {role === 'admin' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gym</label>
                <select
                  className={ic}
                  value={formData.gym_id}
                  onChange={(e) => handle('gym_id', e.target.value)}
                >
                  <option value="">Select gym</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {labelGym(g)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign Trainer</label>
                <select
                  className={ic}
                  value={formData.assigned_trainer_id || ''}
                  onChange={(e) => handle('assigned_trainer_id', e.target.value)}
                  disabled={!formData.gym_id}
                >
                  <option value="">Select Trainer</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.display_name} ({t.role})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gym</label>
                <input className={ic} value={myProfile?.gym_id || ''} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign Trainer</label>
                <select
                  className={ic}
                  value={formData.assigned_trainer_id || ''}
                  onChange={(e) => handle('assigned_trainer_id', e.target.value)}
                  disabled={!trainers.length}
                >
                  <option value="">Select Trainer</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.display_name} ({t.role})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Event selector & (when needed) client picker */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Event Type</label>
            <select className={ic} value={formData.event_type} onChange={(e) => handle('event_type', e.target.value)}>
              {eventTypes.map((et) => (
                <option key={et} value={et}>
                  {et.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {needsClient && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <select
                className={ic}
                value={formData.selected_client_id || ''}
                onChange={(e) => handle('selected_client_id', e.target.value)}
                disabled={!clients.length}
              >
                <option value="">{clients.length ? 'Select client' : 'No clients found'}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name || 'Unnamed'} {c.email ? `• ${c.email}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* LEAD_CREATED */}
        {formData.event_type === 'LEAD_CREATED' && (
          <Show allow={['front-desk', 'closer', 'owner', 'admin']}>
            <h3 className="text-lg font-semibold text-gray-700">New Lead → Create Client</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Client Name</label>
                <input className={ic} required value={formData.client_name || ''} onChange={(e) => handle('client_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Email</label>
                <input className={ic} required type="email" value={formData.client_email || ''} onChange={(e) => handle('client_email', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Age</label>
                <input className={ic} required type="number" min={0} value={formData.client_age || ''} onChange={(e) => handle('client_age', parseInt(e.target.value || '0', 10))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Lead Date</label>
                <input className={ic} required type="datetime-local" onChange={(e) => handle('lead_created_date', new Date(e.target.value).toISOString())} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Source</label>
                <select className={ic} required onChange={(e) => handle('lead_source', e.target.value)}>
                  <option value="">Select Source</option>
                  {leadSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Show>
        )}

        {/* BOOKING_CREATED */}
        {formData.event_type === 'BOOKING_CREATED' && (
          <Show allow={['front-desk', 'closer']}>
            <h3 className="text-lg font-semibold text-gray-700">Booking Created</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Consult Date</label>
                <input className={ic} type="datetime-local" required onChange={(e) => handle('consult_date', new Date(e.target.value).toISOString())} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Channel</label>
                <select className={ic} required onChange={(e) => handle('channel', e.target.value)}>
                  <option value="">Select Channel</option>
                  {['PHONE', 'DM', 'EMAIL', 'WEB', 'OTHER'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700">Objections</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {objections.map((o) => (
                    <label key={o} className="inline-flex items-center text-gray-700">
                      <input
                        type="checkbox"
                        className="mr-2"
                        value={o}
                        onChange={(e) => {
                          const prev = formData.objections || [];
                          handle(
                            'objections',
                            e.target.checked ? [...prev, o] : prev.filter((x: string) => x !== o),
                          );
                        }}
                      />
                      {o}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Show>
        )}

        {/* SHOW_RECORDED */}
        {formData.event_type === 'SHOW_RECORDED' && (
          <Show allow={['closer']}>
            <h3 className="text-lg font-semibold text-gray-700">Show Recorded</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Show Date</label>
                <input className={ic} type="datetime-local" required onChange={(e) => handle('show_date', new Date(e.target.value).toISOString())} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Outcome</label>
                <select className={ic} required onChange={(e) => handle('outcome', e.target.value)}>
                  <option value="">Select Outcome</option>
                  {outcomes.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Show>
        )}

        {/* SALE_RECORDED */}
        {formData.event_type === 'SALE_RECORDED' && (
          <Show allow={['closer']}>
            <h3 className="text-lg font-semibold text-gray-700">Sale Recorded</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Total Paid</label>
                <input className={ic} type="number" min={0} step="0.01" required onChange={(e) => handle('total_paid', parseFloat(e.target.value || '0'))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Deposit Amount</label>
                <input className={ic} type="number" min={0} step="0.01" onChange={(e) => handle('deposit_amount', parseFloat(e.target.value || '0'))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Close Date</label>
                <input className={ic} type="datetime-local" required onChange={(e) => handle('close_date', new Date(e.target.value).toISOString())} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Upsell Status</label>
                <select className={ic} onChange={(e) => handle('upsell_status', e.target.value)}>
                  <option value="">Select Upsell</option>
                  {upsells.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Payment Type</label>
                <select className={ic} required onChange={(e) => handle('payment_type', e.target.value)}>
                  <option value="">Select Payment Type</option>
                  {paymentTypes.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Show>
        )}

        {/* FINANCIAL / TRIAL / RECURRING */}
        {['REFUND_ISSUED', 'PAYMENT_FAILED', 'DEPOSIT_ONLY', 'AD_SPEND', 'TRIAL_STARTED', 'TRIAL_CONVERTED', 'RECURRING_PAYMENT'].includes(
          formData.event_type,
        ) && (
          <Show allow={['owner', 'admin']}>
            <h3 className="text-lg font-semibold text-gray-700">Financial / Event</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {['REFUND_ISSUED', 'PAYMENT_FAILED', 'DEPOSIT_ONLY', 'AD_SPEND', 'RECURRING_PAYMENT'].includes(formData.event_type) && (
                <div>
                  <label className="block text-sm text-gray-700">Amount</label>
                  <input className={ic} type="number" min={0} step="0.01" required onChange={(e) => handle('amount', parseFloat(e.target.value || '0'))} />
                </div>
              )}
              {formData.event_type === 'AD_SPEND' && (
                <div>
                  <label className="block text-sm text-gray-700">Ad Platform</label>
                  <select className={ic} required onChange={(e) => handle('ad_platform', e.target.value)}>
                    <option value="">Select Platform</option>
                    {adPlatforms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {['TRIAL_STARTED', 'TRIAL_CONVERTED'].includes(formData.event_type) && (
                <div>
                  <label className="block text-sm text-gray-700">
                    {formData.event_type === 'TRIAL_STARTED' ? 'Trial Start Date' : 'Trial Converted Date'}
                  </label>
                  <input
                    className={ic}
                    type="datetime-local"
                    required
                    onChange={(e) =>
                      handle(
                        formData.event_type === 'TRIAL_STARTED' ? 'trial_started_date' : 'trial_converted_date',
                        new Date(e.target.value).toISOString(),
                      )
                    }
                  />
                </div>
              )}
              {formData.event_type === 'RECURRING_PAYMENT' && (
                <div>
                  <label className="block text-sm text-gray-700">Recurring Amount</label>
                  <input className={ic} type="number" min={0} step="0.01" required onChange={(e) => handle('recurring_amount', parseFloat(e.target.value || '0'))} />
                </div>
              )}
            </div>
          </Show>
        )}

        {/* CONVERSATION */}
        {['CONVERSATION_STARTED', 'REPLY_RECEIVED'].includes(formData.event_type) && (
          <Show allow={['closer', 'front-desk', 'owner', 'admin']}>
            <h3 className="text-lg font-semibold text-gray-700">Conversation Log</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Conversation ID</label>
                <input className={ic} required onChange={(e) => handle('conversation_id', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Message Type</label>
                <select className={ic} required onChange={(e) => handle('message_type', e.target.value)}>
                  <option value="">Select</option>
                  <option value="START">START</option>
                  <option value="REPLY">REPLY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Timestamp</label>
                <input className={ic} type="datetime-local" required onChange={(e) => handle('message_timestamp', new Date(e.target.value).toISOString())} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Channel</label>
                <select className={ic} required onChange={(e) => handle('channel', e.target.value)}>
                  <option value="">Select Channel</option>
                  {channels.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Show>
        )}

        {/* FOLLOW_UP_SET */}
        {formData.event_type === 'FOLLOW_UP_SET' && (
          <Show allow={['closer', 'front-desk']}>
            <h3 className="text-lg font-semibold text-gray-700">Follow-Up Scheduled</h3>
            <div>
              <label className="block text-sm text-gray-700">Follow-Up Date</label>
              <input className={ic} type="datetime-local" required onChange={(e) => handle('follow_up_date', new Date(e.target.value).toISOString())} />
            </div>
          </Show>
        )}

        {/* TRAINER_ENTRY */}
        {formData.event_type === 'TRAINER_ENTRY' && (
          <Show allow={['trainer', 'coach']}>
            <h3 className="text-lg font-semibold text-gray-700">Trainer / Coach Entry</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700">Client Name</label>
                <input className={ic} required onChange={(e) => handle('client_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Program Type</label>
                <select className={ic} required onChange={(e) => handle('program_type', e.target.value)}>
                  <option value="">Select</option>
                  {programTypes.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Sessions Completed</label>
                <input className={ic} type="number" min={0} required onChange={(e) => handle('sessions_completed', parseInt(e.target.value || '0', 10))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Attendance Flags</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {['MISSED', 'NO_SHOW', 'LATE'].map((f) => (
                    <label key={f} className="inline-flex items-center text-gray-700">
                      <input
                        type="checkbox"
                        className="mr-2"
                        value={f}
                        onChange={(e) => {
                          const prev = formData.attendance_flags || [];
                          handle('attendance_flags', e.target.checked ? [...prev, f] : prev.filter((x: string) => x !== f));
                        }}
                      />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Mood Score (1–5)</label>
                <input className={ic} type="number" min={1} max={5} required onChange={(e) => handle('mood_score', parseInt(e.target.value || '1', 10))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Notes</label>
                <textarea className={ic} onChange={(e) => handle('notes', e.target.value)} />
              </div>
            </div>
          </Show>
        )}

        {/* ADMIN_SUMMARY (just period selectors – everything else is calculated) */}
        {formData.event_type === 'ADMIN_SUMMARY' && (
          <Show allow={['owner', 'admin']}>
            <h3 className="text-lg font-semibold text-gray-700">Admin Weekly Summary</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Period Start</label>
                <input className={ic} type="date" required onChange={(e) => handle('period_start', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Period End</label>
                <input className={ic} type="date" required onChange={(e) => handle('period_end', e.target.value)} />
              </div>
            </div>
          </Show>
        )}

        {/* PHONE / DM / EMAIL / CONSULT summaries – unchanged from your structure */}
        {/* --- PHONE_SUMMARY --- */}
        {formData.event_type === 'PHONE_SUMMARY' && (
          <Show allow={['closer', 'front-desk', 'owner', 'admin']}>
            <h3 className="text-lg font-semibold text-gray-700">Phone Setting Summary</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Setter Name</label>
                <input className={ic} required onChange={(e) => handle('rep_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Source</label>
                <select className={ic} required onChange={(e) => handle('phone_source', e.target.value)}>
                  <option value="">Select Source</option>
                  {leadSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {(
                [
                  ['total_dials', 'Total Dials'],
                  ['call_answered', 'Calls Answered'],
                  ['booked', 'Booked'],
                  ['showed_up', 'Showed Up'],
                  ['wrong_number', 'Wrong Number'],
                  ['already_bought', 'Already Bought'],
                  ['bad_fit', 'Bad Fit'],
                  ['hangup_hostile', 'Hang-up / Hostile'],
                  ['cb_requested', 'CB Requested'],
                  ['sales_closed', 'Sales / Closed'],
                ] as const
              ).map(([k, label]) => (
                <div key={k}>
                  <label className="block text-sm text-gray-700">{label}</label>
                  <input className={ic} type="number" min={0} required onChange={(e) => handle(k, parseInt(e.target.value || '0', 10))} />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700">Notes</label>
                <textarea className={ic} onChange={(e) => handle('phone_notes', e.target.value)} />
              </div>
            </div>
          </Show>
        )}

        {/* --- DM_SUMMARY --- */}
        {formData.event_type === 'DM_SUMMARY' && (
          <Show allow={['closer', 'front-desk', 'owner', 'admin']}>
            <h3 className="text-lg font-semibold text-gray-700">DM Setting Summary</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Setter Name</label>
                <input className={ic} required onChange={(e) => handle('dm_setter_name', e.target.value)} />
              </div>
              {dmSources.map((src) => {
                const key = src.replace(/\W/g, '_').toLowerCase();
                return (
                  <div key={key}>
                    <label className="block text-sm text-gray-700">{src}</label>
                    <input className={ic} type="number" min={0} required onChange={(e) => handle(key, parseInt(e.target.value || '0', 10))} />
                  </div>
                );
              })}
              {(
                [
                  ['texts_sent', 'Texts Sent'],
                  ['replies_received', 'Replies Received'],
                  ['booked', 'Booked'],
                  ['showed_up', 'Showed Up'],
                  ['opt_out', 'Opt-Out / DND'],
                  ['qnr', 'QNR'],
                  ['dead_lead', 'Dead Lead'],
                  ['sales_closed', 'Sales / Closed'],
                ] as const
              ).map(([k, label]) => (
                <div key={k}>
                  <label className="block text-sm text-gray-700">{label}</label>
                  <input className={ic} type="number" min={0} required onChange={(e) => handle(k, parseInt(e.target.value || '0', 10))} />
                </div>
              ))}
            </div>
          </Show>
        )}

        {/* --- EMAIL_SUMMARY --- */}
        {formData.event_type === 'EMAIL_SUMMARY' && (
          <Show allow={['owner', 'admin']}>
            <h3 className="text-lg font-semibold text-gray-700">Email Setting Summary</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700">Platform</label>
                <select className={ic} required onChange={(e) => handle('email_platform', e.target.value)}>
                  <option value="">Select Platform</option>
                  {emailPlatforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">Source</label>
                <select className={ic} required onChange={(e) => handle('email_source', e.target.value)}>
                  <option value="">Select Source</option>
                  {emailSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {(
                [
                  ['emails_sent', 'Emails Sent', 0, undefined],
                  ['open_rate', 'Open Rate (%)', 0, 100],
                  ['click_rate', 'Click Rate (%)', 0, 100],
                  ['unsubscribe_rate', 'Unsubscribe Rate (%)', 0, 100],
                  ['bounce_rate', 'Bounce Rate (%)', 0, 100],
                  ['spam_complaints', 'Spam Complaints', 0, undefined],
                  ['conversion_rate', 'Conversion Rate (%)', 0, 100],
                  ['revenue_generated', 'Revenue Generated ($)', 0, undefined],
                  ['new_subscribers', 'New Subscribers', 0, undefined],
                  ['engagement_score', 'Engagement Score (1–10)', 1, 10],
                  ['average_clicks_per_email', 'Average Clicks per Email', 0, undefined],
                  ['average_opens_per_email', 'Average Opens per Email', 0, undefined],
                  ['average_revenue_per_email', 'Average Revenue per Email ($)', 0, undefined],
                ] as const
              ).map(([k, label, min, max]) => (
                <div key={k}>
                  <label className="block text-sm text-gray-700">{label}</label>
                  <input
                    className={ic}
                    type="number"
                    min={min}
                    max={max}
                    step={max ? '1' : '0.01'}
                    required
                    onChange={(e) => handle(k, parseFloat(e.target.value || '0'))}
                  />
                </div>
              ))}
            </div>
          </Show>
        )}

        {/* --- CONSULT_SUMMARY --- */}
        {formData.event_type === 'CONSULT_SUMMARY' && (
          <Show allow={['owner', 'admin']}>
            <h3 className="text-lg font-semibold text-gray-700">Consult Outcomes Summary</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {(
                [
                  ['call_volume', 'Call Volume'],
                  ['consults_held', 'Consults Held (CH)'],
                  ['show_rate', 'Show Rate (%)', 0, 100],
                  ['no_shows', 'No-Shows (NS)'],
                  ['no_show_rate', 'No-Show Rate (%)', 0, 100],
                  ['qualified_leads', 'Qualified Leads (QL)'],
                  ['qualification_rate', 'Qualification Rate (%)', 0, 100],
                  ['unqualified_leads', 'Unqualified Leads (UQL)'],
                  ['unqualified_rate', 'Unqualified Rate (%)', 0, 100],
                  ['sales_closed', 'Sales Closed (SC)'],
                  ['close_rate', 'Close Rate (%)', 0, 100],
                  ['total_revenue', 'Total Revenue (TR)'],
                  ['avg_order_value', 'Avg Order Value (AOV)'],
                  ['follow_ups_set', 'Follow-Ups Set (FU)'],
                  ['follow_up_rate', 'Follow-Up Rate (%)', 0, 100],
                  ['ql_not_pitched_uql', 'QL / Not Pitched UQL'],
                ] as const
              ).map(([k, label, min, max]) => (
                <div key={k}>
                  <label className="block text-sm text-gray-700">{label}</label>
                  <input
                    className={ic}
                    type="number"
                    min={min ?? 0}
                    max={max}
                    step={max ? '1' : '0.01'}
                    required
                    onChange={(e) => handle(k, parseFloat(e.target.value || '0'))}
                  />
                </div>
              ))}

              {objectionTrends.map((o) => {
                const k = o.replace(/\W/g, '_').toLowerCase();
                return (
                  <div key={k}>
                    <label className="block text-sm text-gray-700">{o}</label>
                    <input className={ic} type="number" min={0} required onChange={(e) => handle(k, parseInt(e.target.value || '0', 10))} />
                  </div>
                );
              })}

              {paymentTypes.map((pt) => {
                const k = `count_${pt.toLowerCase()}`;
                return (
                  <div key={k}>
                    <label className="block text-sm text-gray-700">{pt}</label>
                    <input className={ic} type="number" min={0} required onChange={(e) => handle(k, parseInt(e.target.value || '0', 10))} />
                  </div>
                );
              })}
            </div>
          </Show>
        )}

        <div className="text-right">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-[#2F1B66] text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
