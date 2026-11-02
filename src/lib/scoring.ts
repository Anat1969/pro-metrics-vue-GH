import { INDICATORS, TOTAL_MAX_SCORE, type Project } from '@/data/indicators';

/** Total score earned out of 120 */
export function calcFinalScore(project: Project): number {
  let total = 0;
  INDICATORS.forEach(ind => {
    const d = project.indicators[ind.id];
    if (!d || d.status === 'not_relevant') return;
    total += d.score;
  });
  return total;
}

/** Chapter score as percentage (0–100) */
export function calcChapterScore(project: Project, chapter: string): number {
  let earned = 0;
  let maxPossible = 0;

  INDICATORS.filter(ind => ind.chapter === chapter).forEach(ind => {
    const d = project.indicators[ind.id];
    if (!d || d.status === 'not_relevant') return;
    if (d.score === 0 && d.status === 'not_started') return;
    earned += d.score;
    maxPossible += ind.maxScore;
  });

  if (maxPossible === 0) return 0;
  return Math.round((earned / maxPossible) * 100);
}

/** Chapter max possible score */
export function chapterMaxScore(chapter: string): number {
  return INDICATORS
    .filter(ind => ind.chapter === chapter)
    .reduce((sum, ind) => sum + ind.maxScore, 0);
}

/** Chapter earned score */
export function chapterEarnedScore(project: Project, chapter: string): number {
  let earned = 0;
  INDICATORS.filter(ind => ind.chapter === chapter).forEach(ind => {
    const d = project.indicators[ind.id];
    if (!d || d.status === 'not_relevant') return;
    earned += d.score;
  });
  return earned;
}

export function countEvaluated(project: Project): number {
  return INDICATORS.filter(ind => {
    const d = project.indicators[ind.id];
    return d && d.status !== 'not_started';
  }).length;
}

export function getScoreColor(score: number, maxScore: number, status: string): string {
  if (status === 'not_started') return 'text-muted-foreground';
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct <= 0.3) return 'text-score-low';
  if (pct <= 0.6) return 'text-score-mid';
  return 'text-score-high';
}

export function getScoreDotColor(score: number, maxScore: number, status: string): string {
  if (status === 'not_started') return 'bg-muted-foreground';
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct <= 0.3) return 'bg-score-low';
  if (pct <= 0.6) return 'bg-score-mid';
  return 'bg-score-high';
}

/* ── הערכה אוטומטית שמסבירה את עצמה ── */

/** ניקוד מרבי אפשרי: כל המדדים, פחות מדדים שסומנו "לא רלוונטי". */
export function achievableMax(project: Project): number {
  return INDICATORS.reduce((sum, ind) => {
    const d = project.indicators[ind.id];
    return d?.status === 'not_relevant' ? sum : sum + ind.maxScore;
  }, 0);
}

/** אחוז הפרק מתוך הניקוד המרבי של כל הפרק (לא רק ממה שהוערך). */
export function chapterPctOfMax(project: Project, chapter: string): number {
  const max = chapterMaxScore(chapter);
  return max ? Math.round((chapterEarnedScore(project, chapter) / max) * 100) : 0;
}

export interface Opportunity { id: string; title: string; chapter: string; open: number; score: number; max: number; status: string }

/** הזדמנויות: המדדים שבהם נשארו הכי הרבה נקודות פתוחות. */
export function opportunities(project: Project, limit = 5): Opportunity[] {
  return INDICATORS
    .map(ind => {
      const d = project.indicators[ind.id];
      const status = d?.status ?? 'not_started';
      const score = d?.score ?? 0;
      return { id: ind.id, title: ind.titleHe, chapter: ind.chapter, open: ind.maxScore - score, score, max: ind.maxScore, status };
    })
    .filter(o => o.status !== 'not_relevant' && o.open > 0)
    .sort((a, b) => b.open - a.open || INDICATORS.findIndex(i => i.id === a.id) - INDICATORS.findIndex(i => i.id === b.id))
    .slice(0, limit);
}

export function openPoints(project: Project): number {
  return achievableMax(project) - calcFinalScore(project);
}

/* ── חיפוש בעברית: התאמה בתחילת מילה, אחרי אותיות שימוש ── */
const PREFIX = /^[הובכלמש]{0,2}/;
export function matchesHebrew(text: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const words = text.split(/[\s,.;:()"׳״'\-–—/]+/).filter(Boolean);
  return q.split(/\s+/).every(term =>
    words.some(w => {
      const stripped = w.replace(PREFIX, '');
      if (term.length <= 3) return w === term || stripped === term;
      return w.startsWith(term) || stripped.startsWith(term);
    }),
  );
}
