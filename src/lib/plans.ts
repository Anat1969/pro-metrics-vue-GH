import { INDICATORS } from '@/data/indicators';

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
export interface PlanScore { plan_project_id: string; stage: number; method: string; measured_at: string; metrics: Record<string, Evidence> }
export interface Snapshot { quarters: { id: string; name: string }[]; plans: Plan[]; scores: PlanScore[]; taken_at: string }

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

export interface Ask { n: number; id: string; title: string; chapter: string; kind: 'evidence' | 'design'; gain: number; note: string }
export interface GateResult {
  proven: number; points: number; ceiling: number; target: number; need: number; verdict: Verdict;
  measured: number; unmeasured: number; excluded: number; grade: string; asks: Ask[]; scores: Record<string, number | null>;
}

const isExcluded = (e?: Evidence) => !!e && e.score == null && /לא רלוונטי/.test(e.note || '');

export function evaluate(ps: PlanScore | undefined, target: number): GateResult {
  let got = 0, open = 0, measured = 0, unmeasured = 0, excluded = 0;
  const asks: Ask[] = [];
  const scores: Record<string, number | null> = {};
  INDICATORS.forEach((ind, i) => {
    const n = i + 1;
    const e = ps?.metrics[String(n)];
    if (isExcluded(e)) { excluded++; scores[ind.id] = null; return; }
    if (e && e.score != null) {
      const s = Math.max(0, Math.min(e.score, ind.maxScore));
      got += s; measured++; scores[ind.id] = s;
      if (s < ind.maxScore) asks.push({ n, id: ind.id, title: ind.titleHe, chapter: ind.chapter, kind: 'design', gain: ind.maxScore - s, note: e.note });
    } else {
      open += ind.maxScore; unmeasured++; scores[ind.id] = null;
      asks.push({ n, id: ind.id, title: ind.titleHe, chapter: ind.chapter, kind: 'evidence', gain: ind.maxScore, note: e?.note ?? '' });
    }
  });
  // כמו במכשיר המדידה: אחוז מעוגל, ואז נקודות מתוך 120. כך המספר זהה בשתי האפליקציות.
  const pct = Math.round((got / SCALE) * 100);
  const points = Math.round((pct / 100) * SCALE);
  const ceiling = points + open;
  const verdict: Verdict = points >= target ? 'pass' : ceiling >= target ? 'evidence' : 'fail';
  asks.sort((a, b) => b.gain - a.gain || a.n - b.n);
  return { proven: got, points, ceiling, target, need: Math.max(0, target - points), verdict, measured, unmeasured, excluded, grade: gradeOf(points), asks, scores };
}

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
  return (await import('@/data/plans-snapshot.json')).default as Snapshot;
}

export async function loadLive(): Promise<Snapshot> {
  const [plans, scores, quarters] = await Promise.all([
    rest<Plan[]>('plan_projects?select=id,title,kind,renewal_track,status,plan_number,quarter_id,units_existing,units_planned,developer&published=eq.true&order=title'),
    rest<(PlanScore & { metrics: Record<string, Evidence> })[]>('shchuna_plan_scores?select=plan_project_id,stage,method,measured_at,metrics'),
    rest<{ id: string; name: string }[]>('quarters?select=id,name'),
  ]);
  return { plans, scores, quarters, taken_at: new Date().toISOString().slice(0, 10) };
}
