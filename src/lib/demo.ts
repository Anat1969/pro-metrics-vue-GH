import { INDICATORS, type IndicatorData, type Project } from '@/data/indicators';

/**
 * פרויקט לדוגמה, כדי שהכלי יובן במבט גם לפני שמזינים נתונים.
 * הניקוד בו להמחשה בלבד, ולא הערכה של שכונה אמיתית. כך כתוב גם בממשק.
 */
const DEMO_FRACTIONS: Record<string, number> = {
  a01: 1, a02: .5, a03: 1, a04: .5, a06: .66, a08: .66, a09: .33, a10: .8, a11: 1, a12: .75, a13: .5, a14: .66, a15: .75,
  b01: .66, b02: 1, b03: .57, b04: .5, b06: .33, b07: .75, b08: .5, b10: .4, b11: 1, b13: .5, b14: .5, b15: .33, b17: 1,
  c01: .33, c02: .2, c03: .5, c04: 1, c07: 1,
};
const NOT_RELEVANT = new Set(['a05']);

export function makeDemoProject(): Project {
  const now = Date.now();
  const indicators: Record<string, IndicatorData> = {};
  INDICATORS.forEach((ind, i) => {
    const ts = new Date(now - (INDICATORS.length - i) * 3_600_000).toISOString();
    if (NOT_RELEVANT.has(ind.id)) {
      indicators[ind.id] = { score: 0, status: 'not_relevant', notes: 'אין זיהום ידוע באתר.', lastUpdated: ts, history: [] };
      return;
    }
    const f = DEMO_FRACTIONS[ind.id];
    if (f === undefined) return;
    const score = Math.round(ind.maxScore * f);
    indicators[ind.id] = {
      score,
      status: score === ind.maxScore ? 'completed' : 'in_progress',
      notes: '',
      lastUpdated: ts,
      history: [{ score, notes: '', timestamp: ts, indicatorId: ind.id, indicatorTitle: ind.titleHe, oldScore: 0 }],
    };
  });
  return {
    id: `demo-${now.toString(36)}`,
    name: 'שכונה לדוגמה',
    city: 'אשדוד',
    compound: 'מתחם לדוגמה',
    lot: '',
    year: new Date().getFullYear(),
    manager: 'צוות התכנון',
    role: 'אדריכל',
    createdAt: new Date(now).toISOString(),
    indicators,
  };
}

export const isDemo = (p: Project) => p.id.startsWith('demo-');
