// scripts/generate-docs.ts
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const POSIX = (p: string) => p.split(path.sep).join("/");

const EXCLUDES = new Set([
  "node_modules",".next","dist","build","out",".git",".vercel","coverage",".turbo",".cache"
]);

const APP_DIRS = ["app","pages","src/app","src/pages"].map(d => path.join(ROOT,d));
const COMPONENT_DIRS = ["components","src/components","src/app/components","app/components"].map(d => path.join(ROOT,d));
const DOCS = path.join(ROOT,"docs");

const exists = (p: string) => { try { fs.accessSync(p); return true; } catch { return false; } };

function walk(dir: string, acc: string[] = []) {
  if (!exists(dir)) return acc;
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (EXCLUDES.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?|mdx)$/.test(entry.name)) acc.push(p);
  }
  return acc;
}
const read = (p: string) => fs.readFileSync(p,"utf8");

// ---------- ROUTES ----------
function looksLikeApiRoute(rel: string) {
  const r = POSIX(rel);
  return /\/app\/api\/|\/pages\/api\//.test(r);
}
function toUrlFromAppRel(rel: string) {
  const posix = POSIX(rel);
  let p = posix.split("/app/")[1] || posix.split("/pages/")[1] || posix;
  p = p
    .replace(/(page|layout|route)\.(tsx|ts|js|jsx|mdx)$/i,"")
    .replace(/\/(page|layout|route)\.(tsx|ts|js|jsx|mdx)$/i,"/")
    .replace(/\/index\.(tsx|ts|js|jsx|mdx)$/i,"/");
  p = p.replace(/\[\.{3}.+?\]/g,"*").replace(/\[.+?\]/g,":param");
  p = p.replace(/\/\(.+?\)\//g,"/");
  p = "/" + p.replace(/^\/+/,"").replace(/\/+$/,"");
  return p === "//" ? "/" : p;
}
function buildRouteMapRaw() {
  const pages: {url:string, rel:string, abs:string}[] = [];
  for (const base of APP_DIRS.filter(exists)) {
    for (const fAbs of walk(base)) {
      const rel = POSIX(fAbs.replace(ROOT + path.sep,""));
      if (!/(^|\/)(page|layout)\.(tsx|ts|js|jsx|mdx)$/i.test(rel)) continue;
      if (looksLikeApiRoute(rel)) continue;
      const url = toUrlFromAppRel(rel);
      pages.push({url, rel, abs:fAbs});
    }
  }
  // de-dupe by url (prefer page.tsx over layout)
  const map = new Map<string, {url:string,rel:string,abs:string}>();
  for (const p of pages) {
    const isLayout = /\/layout\.(tsx|ts|js|jsx|mdx)$/i.test(p.rel);
    if (map.has(p.url)) {
      if (isLayout) continue; // keep existing page
    }
    map.set(p.url, p);
  }
  return [...map.values()];
}
function extractDefaultComponentName(src: string) {
  return (
    src.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/)?.[1] ||
    src.match(/export\s+default\s+([A-Z][A-Za-z0-9_]*)/)?.[1] ||
    "Anonymous"
  );
}
function collectImports(src: string) {
  return Array.from(src.matchAll(/from\s+["'](@\/components\/[^"']+|\.{1,2}\/[^"']+)["']/g)).map(m=>m[1]);
}
function buildRouteMapMD(routes: ReturnType<typeof buildRouteMapRaw>) {
  const rows: string[] = [];
  for (const r of routes) {
    const src = read(r.abs);
    const comp = extractDefaultComponentName(src);
    const imported = collectImports(src);
    rows.push(`- \`${r.url}\` → \`${r.rel}\`  • component: **${comp}**  • uses: ${imported.slice(0,5).map(i=>`\`${i}\``).join(", ")}`);
  }
  return `# Route Map\n\n${rows.sort().join("\n")}\n`;
}

// ---------- COMPONENTS ----------
function guessComponentName(rel: string, src: string) {
  return (
    src.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/)?.[1] ||
    src.match(/export\s+function\s+([A-Z][A-Za-z0-9_]*)/)?.[1] ||
    src.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*:\s*React\.(FC|FunctionComponent)[^=]*=\s*\(/)?.[1] ||
    path.basename(rel).replace(/\.(tsx?|jsx?)$/,"")
  );
}
function guessProps(src: string) {
  const props = new Set<string>();
  Array.from(src.matchAll(/\(\s*\{\s*([^}]+)\}\s*:\s*[A-Za-z0-9_<>|]+\s*\)/g)).forEach(m=>{
    m[1].split(",").forEach(k=>{
      const name = k.split(":")[0].split("=")[0].trim();
      if (name && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) props.add(name);
    });
  });
  Array.from(src.matchAll(/\bprops\.([a-zA-Z_][a-zA-Z0-9_]*)/g)).forEach(m=>props.add(m[1]));
  Array.from(src.matchAll(/(interface|type)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\{([\s\S]*?)\}/g)).forEach(m=>{
    Array.from(m[3].matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*[:?]/g)).forEach(mm=>props.add(mm[1]));
  });
  return Array.from(props);
}
function buildComponentIndexMD() {
  const rows: string[] = [];
  const bases = COMPONENT_DIRS.filter(exists);
  if (!bases.length) return "# Components\n\n_No component directories detected._\n";
  for (const base of bases) {
    for (const fAbs of walk(base)) {
      const rel = POSIX(fAbs.replace(ROOT + path.sep,""));
      const src = read(fAbs);
      const name = guessComponentName(rel, src);
      const props = guessProps(src);
      rows.push(`- **${name}**  (\`${rel}\`)  • props: ${props.slice(0,16).map(p=>`\`${p}\``).join(", ") || "_unknown_"} `);
    }
  }
  return `# Components\n\n${rows.sort().join("\n")}\n`;
}

// ---------- STATUS ----------
function buildStatusCSV() {
  const files = [...APP_DIRS, ...COMPONENT_DIRS].filter(exists).flatMap(d => walk(d));

  const hits: {file:string; line:number; text:string}[] = [];
  files.forEach(fAbs=>{
    const rel = POSIX(fAbs.replace(ROOT + path.sep,""));
    read(fAbs).split(/\r?\n/).forEach((line,i)=>{
      if (/TODO|FIXME|COMING SOON|TBD/i.test(line)) hits.push({file:rel,line:i+1,text:line.trim()});
    });
  });
  const header = "feature,status,file,line,note\n";
  const rows = hits.map(h=>{
    const status = /FIXME|TBD|COMING SOON/i.test(h.text) ? "In-Progress" : /TODO/i.test(h.text) ? "Todo" : "Done";
    const feature = h.text.replace(/\/\/\s*|\/\*|\*\/|#|<!--|-->/g,"").replace(/TODO:|FIXME:|TBD:|COMING SOON:?/i,"").trim().slice(0,140);
    return `"${feature.replace(/"/g,'""')}","${status}","${h.file}",${h.line},"${h.text.replace(/"/g,'""')}"`;
  });
  return header + rows.join("\n") + (rows.length ? "\n" : "");
}

// ---------- CHANGE GUIDES ----------
function buildChangeGuidesMD() {
  const parts: string[] = [];
  const logo = ["public/logo.png","public/logo.svg","src/assets/logo.svg","src/assets/logo.png"].map(p=>path.join(ROOT,p)).find(exists);
  if (logo) parts.push(`- **Logo:** \`${POSIX((logo as string).replace(ROOT + path.sep,""))}\` (replace file; update <Image> paths if needed)`);
  const tw = ["tailwind.config.js","tailwind.config.ts"].map(p=>path.join(ROOT,p)).find(exists);
  if (tw) parts.push(`- **Theme Colors:** \`${POSIX((tw as string).replace(ROOT + path.sep,""))}\` (edit theme.extend; rebuild)`);
  // find likely nav & KPI files
  const candidatesDirs = ["src/app","app","src/components","components"].map(d=>path.join(ROOT,d)).filter(exists);
  const listFrom = (re:RegExp) => {
    const out: string[] = [];
    for (const d of candidatesDirs) for (const f of walk(d)) {
      const rel = POSIX(f.replace(ROOT + path.sep,""));
      if (re.test(rel)) out.push(rel);
      if (out.length>=6) break;
    }
    return out;
  };
  const nav = listFrom(/(Nav|Navbar|Sidebar|Menu)\.(tsx?|jsx?)$/i);
  if (nav.length) parts.push(`- **Navigation items:** ${nav.map(f=>`\`${f}\``).join(", ")}`);
  const kpi = listFrom(/(KPI|Stat(Card)?|Dashboard)\.(tsx?|jsx?)$/i);
  if (kpi.length) parts.push(`- **KPI cards:** ${kpi.map(f=>`\`${f}\``).join(", ")}`);
  return `# Change Guides (Auto-Generated)\n\n${parts.length?parts.join("\n"):"- _No obvious targets detected._"}\n`;
}

// ---------- FLOWS (click paths, submits, pushes) ----------
type Flow = { fromUrl:string; type:"Link"|"Router"|"Form"|"API"; label?:string; to?:string; file:string; line:number; extra?:string };

function extractFlows(routes: ReturnType<typeof buildRouteMapRaw>) {
  const flows: Flow[] = [];
  const byFile = new Map<string,string>(); // rel -> url
  routes.forEach(r => byFile.set(POSIX(r.rel), r.url));

  function pushFlow(rel: string, line: number, flow: Omit<Flow,"fromUrl"|"file"|"line">) {
    const fromUrl = byFile.get(rel) || "(unknown)";
    flows.push({ fromUrl, file: rel, line, ...flow });
  }

  // scan each page file
  for (const r of routes) {
    const rel = POSIX(r.rel);
    const src = read(r.abs);

    // <Link href="/path">Text</Link>
    for (const m of src.matchAll(/<Link\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/Link>/g)) {
      const to = m[1].trim();
      const text = m[2].replace(/<[^>]+>/g,"").trim().replace(/\s+/g," ").slice(0,80);
      const before = src.slice(0, m.index || 0);
      const line = before.split(/\r?\n/).length;
      pushFlow(rel, line, { type:"Link", to, label: text || undefined });
    }

    // router.push("/x") / router.replace("/x")
    for (const m of src.matchAll(/router\.(push|replace)\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
      const to = m[2].trim();
      const before = src.slice(0, m.index || 0);
      const line = before.split(/\r?\n/).length;
      pushFlow(rel, line, { type:"Router", to, label: m[1] });
    }

    // <form onSubmit={...}>
    for (const m of src.matchAll(/<form[^>]*onSubmit=\{([^}]+)\}[^>]*>/g)) {
      const handler = m[1].trim();
      const before = src.slice(0, m.index || 0);
      const line = before.split(/\r?\n/).length;
      pushFlow(rel, line, { type:"Form", label: handler });
    }

    // API hints: fetch("/api/..."), axios.*, supabase.*
    for (const m of src.matchAll(/\bfetch\(\s*["'`]([^"'`]+)["'`]/g)) {
      const url = m[1]; const before = src.slice(0,m.index||0);
      const line = before.split(/\r?\n/).length;
      pushFlow(rel, line, { type:"API", extra:`fetch ${url}` });
    }
    for (const m of src.matchAll(/\baxios\.(get|post|put|delete)\(\s*["'`]([^"'`]+)["'`]/g)) {
      const method = m[1], url = m[2]; const before = src.slice(0,m.index||0);
      const line = before.split(/\r?\n/).length;
      pushFlow(rel, line, { type:"API", extra:`axios.${method} ${url}` });
    }
    for (const m of src.matchAll(/\bsupabase\.[a-z]+\(\s*["'`]([^"'`]+)["'`]/g)) {
      const tbl = m[1]; const before = src.slice(0,m.index||0);
      const line = before.split(/\r?\n/).length;
      pushFlow(rel, line, { type:"API", extra:`supabase ${tbl}` });
    }
  }
  return flows;
}

function buildFlowsMD(routes: ReturnType<typeof buildRouteMapRaw>) {
  const flows = extractFlows(routes);
  const byPage = new Map<string, Flow[]>();
  for (const f of flows) {
    const key = f.fromUrl;
    byPage.set(key, [...(byPage.get(key)||[]), f]);
  }
  const sections: string[] = ["# Flows (Auto-Inferred)\n"];
  for (const [url, arr] of [...byPage.entries()].sort()) {
    sections.push(`## ${url}`);
    if (!arr.length) { sections.push("- _No actions detected (no Links, router.push, forms, or API calls)._"); continue; }
    for (const f of arr.sort((a,b)=>a.line-b.line)) {
      if (f.type === "Link") sections.push(`- **Click:** "${f.label||"(link)"}" → \`${f.to}\`  _(in ${f.file}:${f.line})_`);
      else if (f.type === "Router") sections.push(`- **Navigate:** router.${f.label} → \`${f.to}\`  _(in ${f.file}:${f.line})_`);
      else if (f.type === "Form") sections.push(`- **Submit form:** handler \`${f.label}\`  _(in ${f.file}:${f.line})_`);
      else if (f.type === "API") sections.push(`- **Calls:** ${f.extra}  _(in ${f.file}:${f.line})_`);
    }
    sections.push("");
  }
  return sections.join("\n");
}

// ---------- GAPS (what’s referenced vs built) ----------
function buildGapsMD(routes: ReturnType<typeof buildRouteMapRaw>) {
  const routeSet = new Set(routes.map(r=>r.url));
  const flows = extractFlows(routes);
  const referenced = new Set<string>();
  for (const f of flows) {
    if (f.to && /^\/|^\./.test(f.to)) referenced.add(f.to.replace(/\?.*$/,""));
  }

  // normalize referenced to app-style paths only
  const missing: string[] = [];
  for (const r of referenced) {
    const simple = r.startsWith(".") ? r.replace(/^\./,"") : r;
    if (!routeSet.has(simple)) missing.push(r);
  }

  // detect very small page bodies or “coming soon”
  const weakPages: string[] = [];
  for (const p of routes) {
    const src = read(p.abs);
    const stripped = src.replace(/\s+/g," ");
    if (/coming soon|todo|tbd/i.test(stripped) || stripped.length < 120) {
      weakPages.push(`${p.url} → ${POSIX(p.rel)}`);
    }
  }

  // collect TODO/FIXME lines per page (summary)
  const todoMap = new Map<string, number>();
  for (const p of routes) {
    const cnt = (read(p.abs).match(/TODO|FIXME|TBD|COMING SOON/gi)||[]).length;
    if (cnt>0) todoMap.set(p.url, cnt);
  }

  let md = `# Gaps & Not-Built Areas (Auto-Inferred)\n\n`;
  if (missing.length) {
    md += `## Links/Pushes to Missing Routes\n`;
    md += missing.sort().map(m=>`- \`${m}\``).join("\n") + "\n\n";
  } else {
    md += `## Links/Pushes to Missing Routes\n- _None detected._\n\n`;
  }
  if (weakPages.length) {
    md += `## Thin or Placeholder Pages\n` + weakPages.map(w=>`- ${w}`).join("\n") + "\n\n";
  }
  if (todoMap.size) {
    md += `## Pages with TODO/FIXME\n` + [...todoMap.entries()].sort().map(([u,c])=>`- \`${u}\` — ${c} TODO/FIXME`).join("\n") + "\n";
  }
  return md;
}

// ---------- How-To (procedural) ----------
function buildHowToMD(routes: ReturnType<typeof buildRouteMapRaw>) {
  const hints: string[] = ["# How-To (Generated)\n"];
  hints.push(`## Change Sidebar Items\n- Edit likely files: search for **Sidebar.tsx** under \`src/app/components\`.\n- Look for arrays of links or <Link> elements; add/remove entries, then check /dashboard and /kpi-dashboard.\n`);
  hints.push(`## Change KPI Cards/Stats\n- Search \`KPI\`, \`StatCard\`, or \`Dashboard\` in \`src/app/components\`.\n- Edit titles/values; if values come from hooks, find \`useEffect\` or \`supabase\` calls in the same file.\n`);
  hints.push(`## Add a New Page and Link It\n1) Create \`src/app/<new-page>/page.tsx\`.\n2) Add a <Link href="/<new-page>"> in Sidebar or relevant page.\n3) Run \`npm run gen:docs\` — verify it appears in **Route Map** and **Flows**.\n`);
  hints.push(`## Trace “What happens when I click X?”\n- Go to **flows.md** → find your page → follow **Click** or **Navigate** lines to the target route → open that route’s page file → check **API** lines to see data writes/reads.\n`);
  hints.push(`## Identify Unbuilt/Dead Links\n- Open **gaps.md** → \`Links/Pushes to Missing Routes\` → create those pages or update the hrefs.\n`);
  return hints.join("\n");
}

// ---------- write files ----------
function ensureDocs() { if (!exists(DOCS)) fs.mkdirSync(DOCS); }
function writeDocs() {
  ensureDocs();
  const routes = buildRouteMapRaw();
  fs.writeFileSync(path.join(DOCS,"route-map.md"), buildRouteMapMD(routes));
  fs.writeFileSync(path.join(DOCS,"components.md"), buildComponentIndexMD());
  fs.writeFileSync(path.join(DOCS,"feature-status.csv"), buildStatusCSV());
  fs.writeFileSync(path.join(DOCS,"change-guides.md"), buildChangeGuidesMD());
  fs.writeFileSync(path.join(DOCS,"flows.md"), buildFlowsMD(routes));
  fs.writeFileSync(path.join(DOCS,"gaps.md"), buildGapsMD(routes));
  fs.writeFileSync(path.join(DOCS,"how-to-generated.md"), buildHowToMD(routes));
  console.log("Docs generated in /docs (route-map.md, components.md, feature-status.csv, change-guides.md, flows.md, gaps.md, how-to-generated.md)");
}
writeDocs();
