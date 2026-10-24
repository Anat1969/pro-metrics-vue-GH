import { describe, it, expect } from 'vitest';
import { INDICATORS } from '@/data/indicators';
import { PRACTICES } from '@/data/practices';
import { suggestScore, suggestStatus, recommendations, dataFromChecks, buildDemoProject, levelsFor } from '@/lib/autoscore';
import { calcFinalScore } from '@/lib/scoring';

describe('practices', () => {
  it('covers every indicator with at least one check', () => {
    INDICATORS.forEach(ind => {
      expect(PRACTICES[ind.id], ind.id).toBeDefined();
      expect(PRACTICES[ind.id].checks.length, ind.id).toBeGreaterThan(0);
    });
  });
});

describe('autoscore', () => {
  const ind = INDICATORS.find(i => i.id === 'b03')!; // 6 checks, max 7

  it('suggests a score proportional to the checks met', () => {
    expect(suggestScore(ind, [false, false, false, false, false, false])).toBe(0);
    expect(suggestScore(ind, [true, true, true, false, false, false])).toBe(4);
    expect(suggestScore(ind, [true, true, true, true, true, true])).toBe(ind.maxScore);
  });

  it('derives status from checklist progress', () => {
    expect(suggestStatus(ind, [false, false, false, false, false, false])).toBe('not_started');
    expect(suggestStatus(ind, [true, false, false, false, false, false])).toBe('in_progress');
    expect(suggestStatus(ind, Array(6).fill(true))).toBe('completed');
  });

  it('records history when the checklist changes the score', () => {
    const d = dataFromChecks(ind, undefined, Array(6).fill(true));
    expect(d.score).toBe(7);
    expect(d.history).toHaveLength(1);
    expect(d.history[0].oldScore).toBe(0);
  });

  it('ranks recommendations by points per effort and projects a reachable score', () => {
    const demo = buildDemoProject();
    const recs = recommendations(demo);
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1].priority).toBeGreaterThanOrEqual(recs[i].priority);
    const max = INDICATORS.reduce((s, i) => s + i.maxScore, 0);
    expect(calcFinalScore(demo) + recs.reduce((s, r) => s + r.gap, 0)).toBeLessThanOrEqual(max);
  });

  it('maps scores to 0..1 levels for the 3D twin', () => {
    const lv = levelsFor(buildDemoProject());
    Object.values(lv).forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); });
    expect(levelsFor(null).a01).toBe(1);
  });
});
