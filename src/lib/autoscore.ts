import { INDICATORS, type Indicator, type IndicatorData, type IndicatorStatus, type Project } from '@/data/indicators';
import { PRACTICES } from '@/data/practices';
import { calcFinalScore } from '@/lib/scoring';

/** Score suggested by the share of practical checks met, rounded to the booklet's integer scale */
export function suggestScore(indicator: Indicator, checks: boolean[] | undefined): number {
  const total = PRACTICES[indicator.id]?.checks.length ?? 0;
  if (!total || !checks) return 0;
  const met = checks.filter(Boolean).length;
  return Math.round((met / total) * indicator.maxScore);
}

/** Status derived from checklist progress */
export function suggestStatus(indicator: Indicator, checks: boolean[] | undefined): IndicatorStatus {
  const total = PRACTICES[indicator.id]?.checks.length ?? 0;
  const met = checks?.filter(Boolean).length ?? 0;
  if (met === 0) return 'not_started';
  if (met >= total) return 'completed';
  return 'in_progress';
}

/** 0..1 fulfilment level of an indicator, used to drive the 3D twin */
export function indicatorLevel(project: Project | null, id: string): number {
  if (!project) return 1;
  const ind = INDICATORS.find(i => i.id === id);
  const d = project.indicators[id];
  if (!ind || !d || d.status === 'not_relevant' || ind.maxScore === 0) return 0;
  return Math.max(0, Math.min(1, d.score / ind.maxScore));
}

export function levelsFor(project: Project | null): Record<string, number> {
  const out: Record<string, number> = {};
  INDICATORS.forEach(i => { out[i.id] = indicatorLevel(project, i.id); });
  return out;
}

export interface Recommendation {
  indicator: Indicator;
  gap: number;
  effort: 1 | 2 | 3;
  priority: number;
  nextCheck: string | null;
}

/** Points left on the table, ranked by points-per-effort */
export function recommendations(project: Project): Recommendation[] {
  return INDICATORS
    .filter(ind => project.indicators[ind.id]?.status !== 'not_relevant')
    .map(ind => {
      const d = project.indicators[ind.id];
      const practice = PRACTICES[ind.id];
      const gap = ind.maxScore - (d?.score ?? 0);
      const nextIdx = practice.checks.findIndex((_, i) => !d?.checks?.[i]);
      return {
        indicator: ind,
        gap,
        effort: practice.effort,
        priority: gap / practice.effort,
        nextCheck: nextIdx >= 0 ? practice.checks[nextIdx] : null,
      };
    })
    .filter(r => r.gap > 0)
    .sort((a, b) => b.priority - a.priority || b.gap - a.gap);
}

/** Score the project would reach if the given recommendations were fully implemented */
export function projectedScore(project: Project, recs: Recommendation[]): number {
  return calcFinalScore(project) + recs.reduce((s, r) => s + r.gap, 0);
}

/** Build IndicatorData from a checklist, keeping history consistent with IndicatorModal */
export function dataFromChecks(indicator: Indicator, prev: IndicatorData | undefined, checks: boolean[], notes?: string): IndicatorData {
  const now = new Date().toISOString();
  const score = suggestScore(indicator, checks);
  const history = [...(prev?.history ?? [])];
  if (score !== (prev?.score ?? 0) || !prev) {
    history.push({
      score,
      notes: notes ?? prev?.notes ?? '',
      timestamp: now,
      indicatorId: indicator.id,
      indicatorTitle: indicator.titleHe,
      oldScore: prev?.score ?? 0,
    });
  }
  return {
    score,
    status: suggestStatus(indicator, checks),
    notes: notes ?? prev?.notes ?? '',
    lastUpdated: now,
    history,
    checks,
  };
}

/** Demo project: a realistic, partially evaluated neighborhood to explore the system instantly */
export function buildDemoProject(): Project {
  // deterministic pseudo-random so the demo looks the same every time
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const base = Date.now() - 1000 * 60 * 60 * 24 * 40;
  const project: Project = {
    id: crypto.randomUUID(),
    name: 'שכונת הדגמה — רובע הים',
    city: 'אשדוד',
    compound: 'מתחם 7',
    lot: '120',
    year: new Date().getFullYear(),
    manager: 'צוות תכנון',
    role: 'הדגמה',
    createdAt: new Date(base).toISOString(),
    indicators: {},
  };
  INDICATORS.forEach((ind, i) => {
    const n = PRACTICES[ind.id].checks.length;
    if (rnd() < 0.12) return; // some indicators not evaluated yet
    const checks = Array.from({ length: n }, () => rnd() < 0.62);
    const d = dataFromChecks(ind, undefined, checks, '');
    const ts = new Date(base + i * 1000 * 60 * 60 * 20).toISOString();
    d.lastUpdated = ts;
    d.history = d.history.map(h => ({ ...h, timestamp: ts }));
    project.indicators[ind.id] = d;
  });
  return project;
}
