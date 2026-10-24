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
