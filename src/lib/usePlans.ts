import { useEffect, useMemo, useState } from 'react';
import {
  docRequests, evaluate, gateOf, loadChapterMin, loadLive, loadSnapshot, loadTargets, runChecks, saveChapterMin, saveTargets,
  type Check, type DocRequest, type Gate, type GateResult, type Plan, type PlanDoc, type PlanScore, type Snapshot,
} from './plans';

export interface PlanRow {
  plan: Plan; gate: Gate; quarter: string; r: GateResult; measuredAt: string | null;
  ps?: PlanScore; docs: PlanDoc[]; checks: Check[]; requests: DocRequest[];
}

/** התוכניות עם תוצאת השער של כל אחת. תמונה שמורה מיד, ורענון חי ברקע. */
export function usePlans() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [live, setLive] = useState<'loading' | 'live' | 'offline'>('loading');
  const [targets, setTargetsState] = useState(loadTargets);
  const [chapterMin, setChapterMinState] = useState(loadChapterMin);
  const setChapterMin = (v: number) => { setChapterMinState(v); saveChapterMin(v); };

  useEffect(() => {
    let alive = true;
    loadSnapshot().then(s0 => {
      if (!alive) return;
      setSnap(prev => prev ?? s0);
      loadLive().then(s => {
        if (!alive) return;
        if (!s.plans.length) { setLive('offline'); return; }
        // מסמכים: אם הקריאה החיה לא החזירה (הרשאה), נשארים עם הרשימה השמורה
        setSnap({ ...s, docs: s.docs?.length ? s.docs : s0.docs, geo: Object.fromEntries(Object.entries({ ...(s0.geo ?? {}), ...(s.geo ?? {}) }).map(([k, v]) => [k, v?.polygons?.length && v.center ? v : (s0.geo ?? {})[k] ?? v])) });
        setLive('live');
      }).catch(() => alive && setLive('offline'));
    });
    return () => { alive = false; };
  }, []);

  const setTargets = (t: Record<Gate, number>) => { setTargetsState(t); saveTargets(t); };

  const rows: PlanRow[] = useMemo(() => {
    if (!snap) return [];
    const q = Object.fromEntries(snap.quarters.map(x => [x.id, x.name]));
    return snap.plans.map(p => {
      const ps = snap.scores.find(s => s.plan_project_id === p.id);
      const gate = gateOf(p.status);
      const docs = (snap.docs ?? []).filter(d => d.project_id === p.id);
      const r = evaluate(ps, targets[gate], gate, chapterMin);
      return {
        plan: p, gate, quarter: (p.quarter_id && q[p.quarter_id]) || '', r, measuredAt: ps?.measured_at ?? null,
        ps, docs, checks: runChecks(p, gate, r, ps, docs), requests: docRequests(r),
      };
    });
  }, [snap, targets, chapterMin]);

  return { rows, live, takenAt: snap?.taken_at ?? null, targets, setTargets, chapterMin, setChapterMin, ready: !!snap, geo: snap?.geo ?? {} };
}
