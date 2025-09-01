# Flows (Auto-Inferred)

## /admin-sop/va-progress
- **Navigate:** router.replace → `/admin-sop/va-progress`  _(in src/app/admin-sop/va-progress/page.tsx:39)_

## /forgot-password
- **Submit form:** handler `handleSubmit`  _(in src/app/forgot-password/page.tsx:83)_
- **Click:** "Back to Sign&nbsp;In" → `/login`  _(in src/app/forgot-password/page.tsx:113)_

## /forms/kpi-form-admin
- **Submit form:** handler `e => handleSubmit(e, admin, resetAdmin, 'Daily Input')`  _(in src/app/forms/kpi-form-admin/page.tsx:192)_
- **Submit form:** handler `e => handleSubmit(e, weekly, resetWeekly, 'Weekly Summary')`  _(in src/app/forms/kpi-form-admin/page.tsx:321)_
- **Submit form:** handler `e => handleSubmit(e, sourcePerf, resetSource, 'Source Perf')`  _(in src/app/forms/kpi-form-admin/page.tsx:363)_
- **Submit form:** handler `e => handleSubmit(e, staffPerf, resetStaffPerf, 'Staff Perf')`  _(in src/app/forms/kpi-form-admin/page.tsx:408)_
- **Submit form:** handler `e => handleSubmit(e, qa, resetQA, 'VA QA')`  _(in src/app/forms/kpi-form-admin/page.tsx:515)_
- **Submit form:** handler `e => handleSubmit(e, execEntry, resetExec, 'CAC & ROAS')`  _(in src/app/forms/kpi-form-admin/page.tsx:611)_

## /forms/kpi-form-messaging
- **Submit form:** handler `e => handleSubmit(e, msgEntry, resetMsg, 'Daily Messaging')`  _(in src/app/forms/kpi-form-messaging/page.tsx:197)_
- **Submit form:** handler `e => handleSubmit(e, weekly, resetWeekly, 'Weekly Summary')`  _(in src/app/forms/kpi-form-messaging/page.tsx:291)_
- **Submit form:** handler `e => handleSubmit(e, platPerf, resetPlat, 'Platform Performance')`  _(in src/app/forms/kpi-form-messaging/page.tsx:326)_
- **Submit form:** handler `e => handleSubmit(e, setterPerf, resetSetter, 'Setter Performance')`  _(in src/app/forms/kpi-form-messaging/page.tsx:376)_
- **Submit form:** handler `e => handleSubmit(e, qaEntry, resetQA, 'VA QA')`  _(in src/app/forms/kpi-form-messaging/page.tsx:461)_

## /forms/retention-ltv-form
- **Submit form:** handler `e => handleSubmit(e, retEntry, () => setRetEntry(initialRetention), 'Retention Log')`  _(in src/app/forms/retention-ltv-form/page.tsx:291)_
- **Submit form:** handler `e => handleSubmit(e, churnEntry, () => setChurnEntry(initialChurn), 'Churn Tracker')`  _(in src/app/forms/retention-ltv-form/page.tsx:429)_
- **Submit form:** handler `e => handleSubmit(e, ltvEntry, () => setLtvEntry(initialLTV), 'LTV Tracker')`  _(in src/app/forms/retention-ltv-form/page.tsx:592)_
- **Submit form:** handler `e => handleSubmit(e, upsellEntry, () => setUpsellEntry(initialUpsell), 'Upsell Watchlist')`  _(in src/app/forms/retention-ltv-form/page.tsx:734)_
- **Submit form:** handler `e => handleSubmit(e, reviewEntry, () => setReviewEntry(initialReview), 'Trainer Review')`  _(in src/app/forms/retention-ltv-form/page.tsx:959)_

## /login
- **Navigate:** router.push → `/dashboard`  _(in src/app/login/page.tsx:37)_
- **Submit form:** handler `handleSubmit`  _(in src/app/login/page.tsx:66)_
- **Click:** "Forgot password?" → `/forgot-password`  _(in src/app/login/page.tsx:104)_

## /profile/admin
- **Calls:** fetch /api/admin/create-user  _(in src/app/profile/admin/page.tsx:113)_
- **Calls:** fetch /api/admin/create-user  _(in src/app/profile/admin/page.tsx:184)_
- **Calls:** fetch /api/admin/update-user  _(in src/app/profile/admin/page.tsx:195)_
- **Calls:** fetch /api/admin/update-user  _(in src/app/profile/admin/page.tsx:207)_
- **Navigate:** router.push → `/dashboard`  _(in src/app/profile/admin/page.tsx:229)_
- **Navigate:** router.push → `/profile/role-panel?from=admin&gymId=${g.id}`  _(in src/app/profile/admin/page.tsx:274)_
- **Submit form:** handler `onSubmit`  _(in src/app/profile/admin/page.tsx:587)_
- **Submit form:** handler `onSubmit`  _(in src/app/profile/admin/page.tsx:642)_

## /profile/admin-clients
- **Navigate:** router.push → `/dashboard`  _(in src/app/profile/admin-clients/page.tsx:56)_
- **Navigate:** router.push → `/profile/owner-clients?gymId=${g.id}`  _(in src/app/profile/admin-clients/page.tsx:84)_

## /reset-password
- **Navigate:** router.push → `/login`  _(in src/app/reset-password/page.tsx:38)_
- **Submit form:** handler `handleSubmit`  _(in src/app/reset-password/page.tsx:52)_
