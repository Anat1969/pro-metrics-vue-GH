import { useEffect, useMemo, useState } from 'react';
import { evaluate, gateOf, loadLive, loadSnapshot, loadTargets, saveTargets, type Gate, type GateResult, type Plan, type Snapshot } from './plans';

export interface PlanRow { plan: Plan; gate: Gate; quarter: string; r: GateResult; measuredAt: string | null }

/** התוכניות עם תוצאת השער של כל אחת. תמונה שמורה מיד, ורענון חי ברקע. */
export function usePlans() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [live, setLive] = useState<'loading' | 'live' | 'offline'>('loading');
  const [targets, setTargetsState] = useState(loadTargets);

  useEffect(() => {
    let alive = true;
    loadSnapshot().then(s => alive && setSnap(prev => prev ?? s));
    loadLive().then(s => { if (alive && s.plans.length) { setSnap(s); setLive('live'); } else if (alive) setLive('offline'); })
      .catch(() => alive && setLive('offline'));
    return () => { alive = false; };
  }, []);

  const setTargets = (t: Record<Gate, number>) => { setTargetsState(t); saveTargets(t); };

  const rows: PlanRow[] = useMemo(() => {
    if (!snap) return [];
    const q = Object.fromEntries(snap.quarters.map(x => [x.id, x.name]));
    return snap.plans
      .filter(p => p.kind === 'urban_renewal')
      .map(p => {
        const ps = snap.scores.find(s => s.plan_project_id === p.id);
        const gate = gateOf(p.status);
        return { plan: p, gate, quarter: (p.quarter_id && q[p.quarter_id]) || '', r: evaluate(ps, targets[gate]), measuredAt: ps?.measured_at ?? null };
      });
  }, [snap, targets]);

  return { rows, live, takenAt: snap?.taken_at ?? null, targets, setTargets, ready: !!snap };
}
