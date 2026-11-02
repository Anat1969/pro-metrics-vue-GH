import { INDICATORS, TOTAL_MAX_SCORE, CHAPTERS, type Project } from '@/data/indicators';

/** גאומטריית השושנה: מעגל שלם הוא כל הניקוד, ורוחב כל פלח לפי משקל המדד. */
export interface Petal {
  id: string; index: number; title: string; chapter: string; topic: string;
  a0: number; a1: number; max: number; score: number; status: string; fill: number;
}

const GAP = 0.006; // רווח זוויתי בין פלחים
export const START = -Math.PI / 2; // מתחילים בצפון, ממשיכים עם כיוון השעון

export function petals(project: Project | null): Petal[] {
  let acc = 0;
  return INDICATORS.map((ind, index) => {
    const a0 = START + (acc / TOTAL_MAX_SCORE) * Math.PI * 2;
    acc += ind.maxScore;
    const a1 = START + (acc / TOTAL_MAX_SCORE) * Math.PI * 2;
    const d = project?.indicators[ind.id];
    const status = d?.status ?? 'not_started';
    const score = d?.score ?? 0;
    return {
      id: ind.id, index, title: ind.titleHe, chapter: ind.chapter, topic: ind.topic,
      a0: a0 + GAP, a1: a1 - GAP, max: ind.maxScore, score, status,
      fill: status === 'not_relevant' || status === 'not_started' ? 0 : score / ind.maxScore,
    };
  });
}

export function chapterArcs() {
  let acc = 0;
  return CHAPTERS.map(ch => {
    const max = INDICATORS.filter(i => i.chapter === ch).reduce((s, i) => s + i.maxScore, 0);
    const a0 = START + (acc / TOTAL_MAX_SCORE) * Math.PI * 2;
    acc += max;
    const a1 = START + (acc / TOTAL_MAX_SCORE) * Math.PI * 2;
    return { chapter: ch, a0, a1, max };
  });
}

export const pt = (a: number, r: number) => [Math.cos(a) * r, Math.sin(a) * r] as const;

/** פלח טבעת: מרדיוס פנימי לחיצוני. */
export function sector(a0: number, a1: number, r0: number, r1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = pt(a0, r1), [x1, y1] = pt(a1, r1), [x2, y2] = pt(a1, r0), [x3, y3] = pt(a0, r0);
  const f = (n: number) => n.toFixed(2);
  return `M${f(x0)} ${f(y0)}A${r1} ${r1} 0 ${large} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 ${large} 0 ${f(x3)} ${f(y3)}Z`;
}

/** רדיוס לפי שטח (כמו אצל נייטינגייל): השטח הצבוע יחסי לניקוד, לא הרדיוס. */
export const areaRadius = (f: number, r0: number, r1: number) => Math.sqrt(r0 * r0 + f * (r1 * r1 - r0 * r0));

/** הכהיה של צבע hex, לפאות הצד בתלת־ממד. */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
