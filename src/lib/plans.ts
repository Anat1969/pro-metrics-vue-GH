import { INDICATORS } from '@/data/indicators';
import { STAGE_OF, NEEDS, type StageKey } from '@/data/stages';

/**
 * תוכניות בעיר: הנתונים של "מה נבנה סביבי" והמדידות של מכשיר המדידה (Shchuna360-GH),
 * מאותו פרויקט Supabase עירוני (ASHDODMAP). כאן רק קוראים. לא כותבים לשם.
 */
export const SUPABASE_URL = 'https://cbhexpybdggwzyakgagd.supabase.co';
const KEY = 'sb_publishable_1KSwG6rqTzBSHmI2RxX6Fw_EEcuKzk3'; // מפתח ציבורי לקריאה (RLS), כמו ב-Shchuna360-GH
export const MEASURE_APP = 'https://shchuna360.vercel.app';
export const MA_NIVNE = 'https://ashdod-ma-nivne.vercel.app';
const SCALE = 120;

export interface Evidence { score: number | null; confidence: string; note: string }
export interface Plan {
  id: string; title: string; kind: string; renewal_track: string | null; status: string;
  plan_number: string | null; quarter_id: string | null; units_existing: number | null; units_planned: number | null; developer?: string | null;
}
export interface PlanScore { plan_project_id: string; stage: number; method: string; measured_at: string; metrics: Record<string, Evidence>; sources?: string[]; model?: string | null; rubric_version?: string | null }
export interface PlanDoc { project_id: string; caption: string | null }
export type Geo = Record<string, { center: [number, number]; polygons: number[][][][] }>;
export interface Snapshot { quarters: { id: string; name: string }[]; plans: Plan[]; scores: PlanScore[]; docs?: PlanDoc[]; geo?: Geo; taken_at: string }

/** geojson של "מה נבנה סביבי" (Polygon, MultiPolygon, GeometryCollection) לרשימת מצולעים. */
type G = { type: string; coordinates?: unknown; geometries?: G[] };
export function toPolygons(fc: { features?: { geometry: G }[] } | null): number[][][][] {
  const out: number[][][][] = [];
  const walk = (g: G) => {
    if (g.type === 'Polygon') out.push(g.coordinates as number[][][]);
    else if (g.type === 'MultiPolygon') out.push(...(g.coordinates as number[][][][]));
    else if (g.type === 'GeometryCollection') g.geometries?.forEach(walk);
  };
  fc?.features?.forEach(f => f.geometry && walk(f.geometry));
  return out;
}

export const STATUS_HE: Record<string, string> = { planning: 'בתכנון', approved: 'מאושרת', permit: 'בהיתר', construction: 'בביצוע', done: 'הושלמה' };
export const TRACK_HE: Record<string, string> = { pinui_binui: 'פינוי־בינוי', other: 'אחר' };

/* ── שערי האישור ── */
export type Gate = 'taba' | 'binui' | 'after';
export const GATES: Record<Gate, { label: string; short: string; question: string; when: string }> = {
  taba: { label: 'אישור תב"ע', short: 'תב"ע', question: 'לאשר את התוכנית המפורטת?', when: 'תוכניות בתכנון' },
  binui: { label: 'אישור תוכנית בינוי', short: 'תוכנית בינוי', question: 'לאשר את תוכנית הבינוי והעיצוב?', when: 'תוכניות מאושרות, לפני היתר' },
  after: { label: 'בדיעבד', short: 'בדיעבד', question: 'מה אפשר עוד לדרוש בהיתר ובביצוע?', when: 'בהיתר או בביצוע' },
};
export const GATE_ORDER: Gate[] = ['taba', 'binui', 'after'];
/** השער הבא של התוכנית, לפי הסטטוס שלה ב"מה נבנה סביבי". */
export const gateOf = (status: string): Gate => (status === 'planning' ? 'taba' : status === 'approved' ? 'binui' : 'after');

/** דרגות שכונה 360° (מתוך 120), כמו במכשיר המדידה. */
export const GRADES = [
  { points: 85, label: 'פלטינום' }, { points: 75, label: 'זהב' }, { points: 65, label: 'כסף' }, { points: 55, label: 'ארד' },
];
export const gradeOf = (pts: number) => GRADES.find(g => pts >= g.points)?.label ?? 'מתחת לסף';

/* ── יעדי העירייה לכל שער: ברירת מחדל ארד (55), וניתנים לשינוי ── */
const TKEY = 'shchuna360_gate_targets';
export const DEFAULT_TARGETS: Record<Gate, number> = { taba: 55, binui: 55, after: 55 };
export function loadTargets(): Record<Gate, number> {
  try { return { ...DEFAULT_TARGETS, ...JSON.parse(localStorage.getItem(TKEY) || '{}') }; } catch { return DEFAULT_TARGETS; }
}
export function saveTargets(t: Record<Gate, number>) { try { localStorage.setItem(TKEY, JSON.stringify(t)); } catch { /* שמירה לא זמינה */ } }

/* ── בדיקת שער ── */
export type Verdict = 'pass' | 'evidence' | 'fail';
export const VERDICT_HE: Record<Verdict, { label: string; line: string }> = {
  pass: { label: 'עומדת ביעד', line: 'הנקודות שהוכחו במסמכים כבר מגיעות ליעד.' },
  evidence: { label: 'תלויה בראיות', line: 'היעד אפשרי רק אם יוצגו מסמכים למדדים שלא נמדדו.' },
  fail: { label: 'לא עומדת ביעד', line: 'גם עם ניקוד מלא בכל מה שלא נמדד, היעד לא מושג. נדרש שינוי תכנוני.' },
};

export interface Ask { n: number; id: string; title: string; chapter: string; kind: 'evidence' | 'design'; gain: number; note: string; stage: StageKey; need: string }

export interface MetricRow {
  n: number; id: string; title: string; chapter: string; max: number; score: number | null; excluded: boolean;
  confidence: string; note: string; stage: StageKey; need: string; stageC: string; how: string;
}
export type CheckStatus = 'ok' | 'warn' | 'fail';
export interface Check { key: string; title: string; status: CheckStatus; result: string; how: string }
export interface DocRequest { doc: string; metrics: { n: number; title: string; gain: number }[]; gain: number; future: boolean }

export interface GateResult {
  proven: number; points: number; ceiling: number; target: number; need: number; verdict: Verdict; nextStageCan: boolean;
  measured: number; unmeasured: number; excluded: number; grade: string; asks: Ask[]; scores: Record<string, number | null>;
  /** מה אפשר לדרוש בשער הזה, מה חסר בתוכו, ומה עובר לשלבים הבאים */
  now: { max: number; proven: number; open: number; evidence: Ask[]; design: Ask[] };
  future: { max: number; asks: Ask[] };
  conditions: MetricRow[];
  rows: MetricRow[];
  chapters: ChapterStat[]; chapterMin: number;
}

const isExcluded = (e?: Evidence) => !!e && e.score == null && /לא רלוונטי/.test(e.note || '');
const HOW: Record<string, string> = {
  document: 'נמצא במסמכי התוכנית, עם ציטוט מפורש.',
  inferred: 'הוסק מנתונים במסמכים (חישוב או מסקנה), בלי ציטוט ישיר.',
  simulation: 'חושב בסימולציית הצללה מתוך מודל הבינוי.',
  none: 'נבדק במסמכים ולא נמצאה ראיה.',
};
export const STAGE_HE: Record<StageKey | 'after', string> = { taba: 'תב"ע', binui: 'תוכנית בינוי', after: 'היתר וביצוע' };

/** האם מדד שייך לשער (נדרש בו או לפניו). */
const inGate = (st: StageKey, gate: Gate) => gate !== 'taba' || st === 'taba';

/** מינימום לכל פרק, באחוזים מהניקוד של הפרק (0 = כבוי). קביעת העירייה, ברירת מחדל כבוי. */
const CKEY = 'shchuna360_chapter_min';
export function loadChapterMin(): number { try { return Number(localStorage.getItem(CKEY) || 0); } catch { return 0; } }
export function saveChapterMin(v: number) { try { localStorage.setItem(CKEY, String(v)); } catch { /* לא זמין */ } }
export interface ChapterStat { chapter: string; max: number; proven: number; openNow: number; pct: number; ok: boolean; reachable: boolean }

export function evaluate(ps: PlanScore | undefined, target: number, gate: Gate = 'binui', chapterMin = 0): GateResult {
  let got = 0, measured = 0, unmeasured = 0, excluded = 0;
  const asks: Ask[] = [];
  const rows: MetricRow[] = [];
  const scores: Record<string, number | null> = {};
  const now = { max: 0, proven: 0, open: 0, evidence: [] as Ask[], design: [] as Ask[] };
  const future = { max: 0, asks: [] as Ask[] };
  INDICATORS.forEach((ind, i) => {
    const n = i + 1;
    const e = ps?.metrics[String(n)];
    const st = STAGE_OF[n]?.stage ?? 'taba';
    const ex = isExcluded(e);
    const score = e && e.score != null ? Math.max(0, Math.min(e.score, ind.maxScore)) : null;
    const conf = ex ? 'excluded' : e?.confidence ?? 'none';
    rows.push({
      n, id: ind.id, title: ind.titleHe, chapter: ind.chapter, max: ind.maxScore, score, excluded: ex, confidence: conf,
      note: e?.note ?? '', stage: st, need: NEEDS[n] ?? '', stageC: STAGE_OF[n]?.stageC ?? '',
      how: ex ? 'סומן "לא רלוונטי לפרויקט" לפי תנאי הזכאות, ויצא מהחישוב.' : HOW[conf] ?? HOW.none,
    });
    if (ex) { excluded++; scores[ind.id] = null; return; }
    const here = inGate(st, gate);
    if (here) now.max += ind.maxScore;
    if (score != null) {
      got += score; measured++; scores[ind.id] = score;
      if (here) now.proven += score;
      if (score < ind.maxScore) {
        const a: Ask = { n, id: ind.id, title: ind.titleHe, chapter: ind.chapter, kind: 'design', gain: ind.maxScore - score, note: e?.note ?? '', stage: st, need: NEEDS[n] ?? '' };
        asks.push(a);
        if (here) { now.design.push(a); now.open += a.gain; } else { future.asks.push(a); future.max += a.gain; }
      }
    } else {
      unmeasured++; scores[ind.id] = null;
      const a: Ask = { n, id: ind.id, title: ind.titleHe, chapter: ind.chapter, kind: 'evidence', gain: ind.maxScore, note: e?.note ?? '', stage: st, need: NEEDS[n] ?? '' };
      asks.push(a);
      if (here) { now.evidence.push(a); now.open += a.gain; } else { future.asks.push(a); future.max += a.gain; }
    }
  });
  // כמו במכשיר המדידה: אחוז מעוגל, ואז נקודות מתוך 120. כך המספר זהה בשתי האפליקציות.
  const pct = Math.round((got / SCALE) * 100);
  const points = Math.round((pct / 100) * SCALE);
  const ceiling = points + now.open;
  // מינימום לפרק: גם תוכנית שעוברת את היעד הכולל לא "עומדת" אם פרק אחד מתחת למינימום
  const chapters: ChapterStat[] = [...new Set(rows.map(x => x.chapter))].map(ch => {
    const rs = rows.filter(x => x.chapter === ch && !x.excluded);
    const max = rs.reduce((a, x) => a + x.max, 0);
    const proven = rs.reduce((a, x) => a + (x.score ?? 0), 0);
    const openNow = rs.filter(x => inGate(x.stage, gate)).reduce((a, x) => a + (x.max - (x.score ?? 0)), 0);
    const pct = max ? Math.round((proven / max) * 100) : 0;
    return { chapter: ch, max, proven, openNow, pct, ok: pct >= chapterMin, reachable: max ? ((proven + openNow) / max) * 100 >= chapterMin : true };
  });
  const chOk = chapters.every(c => c.ok), chReach = chapters.every(c => c.reachable);
  const verdict: Verdict = points >= target && chOk ? 'pass' : ceiling >= target && chReach ? 'evidence' : 'fail';
  const by = (a: Ask, b: Ask) => b.gain - a.gain || a.n - b.n;
  asks.sort(by); now.evidence.sort(by); now.design.sort(by); future.asks.sort(by);
  return {
    proven: got, points, ceiling, target, need: Math.max(0, target - points), verdict, nextStageCan: ceiling + future.max >= target,
    measured, unmeasured, excluded, grade: gradeOf(points), asks, scores, now, future,
    conditions: rows.filter(r => r.stageC && !r.excluded), rows, chapters, chapterMin,
  };
}

/* ── בדיקות אוטומטיות, כל אחת עם "איך נבדק" ── */
const DOC_TYPES = [
  { key: 'hor', label: 'הוראות התוכנית', re: /הוראות/ },
  { key: 'tas', label: 'תשריט', re: /תשריט/ },
  { key: 'bin', label: 'נספח בינוי או תוכנית בינוי', re: /נספח בינוי|תוכנית בינוי|בינוי ופיתוח/ },
  { key: 'soc', label: 'נספח חברתי', re: /נספח חברתי|תסקיר חברתי/ },
];
const SRC_HE: Record<string, string> = { story: 'סיפור התוכנית ב"מה נבנה סביבי"', plan_models: 'מודל הבינוי', 'sun-metric38': 'סימולציית שמש' };
export const sourceHe = (s: string) => SRC_HE[s] ?? s;

export function runChecks(plan: Plan, gate: Gate, r: GateResult, ps: PlanScore | undefined, docs: PlanDoc[]): Check[] {
  const caps = docs.map(d => d.caption ?? '');
  const has = (re: RegExp) => caps.some(c => re.test(c));
  const checks: Check[] = [];
  const how1 = 'נבדק אוטומטית: חיפוש סוג המסמך ברשימת המסמכים של התוכנית ב"מה נבנה סביבי" (plan_media).';
  const required = gate === 'taba' ? ['hor', 'tas'] : ['hor', 'tas', 'bin'];
  const missing = DOC_TYPES.filter(t => required.includes(t.key) && !has(t.re)).map(t => t.label);
  checks.push({
    key: 'docs', title: `מסמכים נדרשים ל${GATES[gate].label}`, status: missing.length ? (missing.includes('הוראות התוכנית') ? 'fail' : 'warn') : 'ok',
    result: missing.length ? `חסר במערכת: ${missing.join(', ')}.` : `יש במערכת: ${DOC_TYPES.filter(t => required.includes(t.key)).map(t => t.label).join(', ')}.`,
    how: `${how1} הנדרש בשער: ${DOC_TYPES.filter(t => required.includes(t.key)).map(t => t.label).join(', ')}.`,
  });
  const src = ps?.sources ?? [];
  const notRead = caps.filter(c => c && !src.includes(c) && !/רקע/.test(c));
  checks.push({
    key: 'read', title: 'כל המסמכים נקראו במדידה', status: !ps ? 'fail' : notRead.length ? 'warn' : 'ok',
    result: !ps ? 'אין מדידה לתוכנית.' : notRead.length ? `לא נקראו: ${notRead.join(', ')}.` : 'כל המסמכים הנדרשים נקראו.',
    how: 'נבדק אוטומטית: השוואה בין רשימת המסמכים של התוכנית לבין רשימת המקורות שמכשיר המדידה רשם במדידה (sources). מסמכי רקע לא נדרשים.',
  });
  const nowCount = r.rows.filter(x => !x.excluded && inGate(x.stage, gate)).length;
  const nowMeasured = r.rows.filter(x => !x.excluded && inGate(x.stage, gate) && x.score != null).length;
  const cov = nowCount ? Math.round((nowMeasured / nowCount) * 100) : 0;
  checks.push({
    key: 'coverage', title: 'כיסוי המדידה בשלב', status: cov >= 75 ? 'ok' : cov >= 50 ? 'warn' : 'fail',
    result: `נמדדו ${nowMeasured} מתוך ${nowCount} המדדים של השלב (${cov}%).`,
    how: 'נבדק אוטומטית: ספירת המדדים שקיבלו ניקוד, מתוך המדדים ששייכים לשער. סף: 75% תקין, 50% אזהרה.',
  });
  const docPts = r.rows.filter(x => x.score != null && x.confidence === 'document').reduce((a, x) => a + (x.score ?? 0), 0);
  const share = r.proven ? Math.round((docPts / r.proven) * 100) : 0;
  checks.push({
    key: 'evidence', title: 'עוצמת הראיות', status: share >= 50 ? 'ok' : 'warn',
    result: `${share}% מהנקודות נשענות על ציטוט מפורש. השאר הוסק מנתונים או חושב בסימולציה.`,
    how: 'נבדק אוטומטית: סכום הנקודות לפי רמת הביטחון שמכשיר המדידה רשם לכל מדד (document, inferred, simulation). סף: 50%.',
  });
  const days = ps ? Math.round((Date.now() - new Date(ps.measured_at).getTime()) / 86_400_000) : null;
  checks.push({
    key: 'fresh', title: 'עדכניות המדידה', status: days == null ? 'fail' : days <= 90 ? 'ok' : 'warn',
    result: ps ? `נמדד ב-${new Date(ps.measured_at).toLocaleDateString('he-IL')}, מחוון גרסה ${ps.rubric_version ?? '?'}, מודל ${ps.model ?? '?'}.` : 'אין מדידה.',
    how: 'נבדק אוטומטית: תאריך המדידה האחרונה ב-shchuna_plan_scores. סף: 90 ימים.',
  });
  checks.push({
    key: 'target', title: `יעד ${GATES[gate].label}`, status: r.verdict === 'pass' ? 'ok' : r.verdict === 'evidence' ? 'warn' : 'fail',
    result: `${r.points} נקודות הוכחו. בשלב אפשר לדרוש עד ${r.now.max}. היעד ${r.target}. ${VERDICT_HE[r.verdict].label}.`,
    how: 'נבדק אוטומטית: הוכח מול היעד, ואז הוכח ועוד כל מה שפתוח בשלב מול היעד. מה שלא נמדד נחשב 0, כמו בדרגה הרשמית.',
  });
  if (r.chapterMin > 0) {
    const low = r.chapters.filter(c => !c.ok);
    checks.push({
      key: 'chapters', title: `מינימום ${r.chapterMin}% לכל פרק`, status: low.length ? (low.some(c => !c.reachable) ? 'fail' : 'warn') : 'ok',
      result: low.length ? `מתחת למינימום: ${low.map(c => `${c.chapter} ${c.pct}%`).join(', ')}.` : r.chapters.map(c => `${c.chapter} ${c.pct}%`).join(', ') + '.',
      how: 'נבדק אוטומטית: ניקוד שהוכח בכל פרק, מתוך הניקוד המרבי של הפרק בלי מדדים לא רלוונטיים. המינימום נקבע בלוח.',
    });
  }
  if (plan.units_existing == null || plan.units_planned == null) {
    checks.push({ key: 'units', title: 'נתוני יחידות דיור', status: 'warn', result: 'חסר מספר יח"ד קיים או מתוכנן ב"מה נבנה סביבי".', how: 'נבדק אוטומטית: שדות units_existing ו-units_planned בתוכנית.' });
  }
  return checks;
}

/** בקשת מסמכים מאוחדת: לכל מסמך, אילו מדדים הוא פותח ובכמה נקודות. */
export function docRequests(r: GateResult): DocRequest[] {
  const map = new Map<string, DocRequest>();
  const add = (a: Ask, futureFlag: boolean) => {
    if (a.kind !== 'evidence') return;
    const k = a.need || 'מסמך מתאים';
    const d = map.get(k) ?? { doc: k, metrics: [], gain: 0, future: futureFlag };
    d.metrics.push({ n: a.n, title: a.title, gain: a.gain }); d.gain += a.gain; d.future = d.future && futureFlag;
    map.set(k, d);
  };
  r.now.evidence.forEach(a => add(a, false));
  r.future.asks.forEach(a => add(a, true));
  return [...map.values()].sort((a, b) => Number(a.future) - Number(b.future) || b.gain - a.gain);
}

/** מידע כללי שחסר, ואינו תלוי בתוכנית אחת. */
export const GENERAL_GAPS = [
  'הגדרת השלבים א\', ב\' ו-ג\' לא אומתה מול החוברת עצמה: האתר nd360.org חסום בסביבת העבודה. שיוך המדדים לשלבים הוא הצעה לאישור העירייה.',
  'יעדי השערים נקבעו כברירת מחדל: ארד, 55 מתוך 120. העירייה צריכה לקבוע אותם.',
  'במערכת אין תוכניות בינוי ופיתוח מאושרות. רק לתוכנית אחת יש נספח בינוי.',
];

/* ── טעינה: קודם התמונה השמורה (מיידית), ואחר כך רענון חי מהשרת ── */
async function rest<T>(path: string): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as T;
  } finally { clearTimeout(t); }
}

export async function loadSnapshot(): Promise<Snapshot> {
  return (await import('@/data/plans-snapshot.json')).default as unknown as Snapshot;
}

export async function loadLive(): Promise<Snapshot> {
  const [plans, scores, quarters, docs, shapes] = await Promise.all([
    rest<Plan[]>('plan_projects?select=id,title,kind,renewal_track,status,plan_number,quarter_id,units_existing,units_planned,developer&published=eq.true&order=title'),
    rest<PlanScore[]>('shchuna_plan_scores?select=plan_project_id,stage,method,measured_at,metrics,sources,model,rubric_version'),
    rest<{ id: string; name: string }[]>('quarters?select=id,name'),
    rest<PlanDoc[]>('plan_media?select=project_id,caption&kind=eq.document&order=sort').catch(() => [] as PlanDoc[]),
    rest<{ id: string; center: [number, number]; geojson: Parameters<typeof toPolygons>[0] }[]>('plan_projects?select=id,center,geojson&published=eq.true').catch(() => []),
  ]);
  const geo: Geo = Object.fromEntries(shapes.map(x => [x.id, { center: x.center, polygons: toPolygons(x.geojson) }]));
  return { plans, scores, quarters, docs, geo, taken_at: new Date().toISOString().slice(0, 10) };
}

/** מכתב ליזם: בקשת מסמכים ושיפורים לקראת השער. נוסח רשמי, בלי שם אישי. */
export function developerLetter(plan: Plan, gate: Gate, r: GateResult, reqs: DocRequest[]): string {
  const now = reqs.filter(d => !d.future);
  const fut = reqs.filter(d => d.future);
  const design = r.now.design.slice(0, 5);
  const L: string[] = [
    `עיריית אשדוד · ${new Date().toLocaleDateString('he-IL')}`,
    '',
    'לכבוד: היזם ועורך התוכנית',
    `הנדון: ${plan.title}${plan.plan_number ? ` (${plan.plan_number})` : ''}: השלמות לקראת ${GATES[gate].label}`,
    '',
    `התוכנית נבדקה מול מדדי שכונה 360° (גרסה 2.0, ינואר 2025). בשלב זה אפשר לצבור עד ${r.now.max} נקודות. הוכחו במסמכים ${r.points} נקודות, מול יעד העירייה ${r.target}.`,
    '',
  ];
  if (now.length) {
    L.push('נבקש להשלים את המסמכים הבאים:');
    now.forEach((d, i) => L.push(`${i + 1}. ${d.doc}: למדדים ${d.metrics.map(m => m.title).join(', ')} (עד ${d.gain} נקודות).`));
    L.push('');
  }
  if (design.length) {
    L.push('בנוסף, נבקש לבחון שיפורים בתכנון:');
    design.forEach((a, i) => L.push(`${i + 1}. ${a.title}: יש פוטנציאל לעוד ${a.gain} נקודות.`));
    L.push('');
  }
  if (fut.length) L.push(`לשלב הבא (${gate === 'taba' ? 'תוכנית בינוי' : 'היתר וביצוע'}) יידרשו גם: ${fut.map(d => d.doc).join('; ')}.`, '');
  if (r.conditions.length) L.push(`בהיתר ובביצוע יידרשו דרישות שלב ג' ב-${r.conditions.length} מדדים, לפי החוברת.`, '');
  L.push('פירוט מלא, כולל אופן הבדיקה של כל מדד, מצורף בדוח השער.', '', 'בברכה,', 'מינהל ההנדסה, עיריית אשדוד');
  return L.join('\n');
}
