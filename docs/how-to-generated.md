# How-To (Generated)

## Change Sidebar Items
- Edit likely files: search for **Sidebar.tsx** under `src/app/components`.
- Look for arrays of links or <Link> elements; add/remove entries, then check /dashboard and /kpi-dashboard.

## Change KPI Cards/Stats
- Search `KPI`, `StatCard`, or `Dashboard` in `src/app/components`.
- Edit titles/values; if values come from hooks, find `useEffect` or `supabase` calls in the same file.

## Add a New Page and Link It
1) Create `src/app/<new-page>/page.tsx`.
2) Add a <Link href="/<new-page>"> in Sidebar or relevant page.
3) Run `npm run gen:docs` — verify it appears in **Route Map** and **Flows**.

## Trace “What happens when I click X?”
- Go to **flows.md** → find your page → follow **Click** or **Navigate** lines to the target route → open that route’s page file → check **API** lines to see data writes/reads.

## Identify Unbuilt/Dead Links
- Open **gaps.md** → `Links/Pushes to Missing Routes` → create those pages or update the hrefs.
