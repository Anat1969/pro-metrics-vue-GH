import React from 'react';
import { GATES, GATE_ORDER, VERDICT_HE, type Gate } from '@/lib/plans';
import type { PlanRow } from '@/lib/usePlans';
import { VERDICT_COLOR } from './IsoGate';

/** סדרות קטנות לכל שער: פס מלא = הוכח, פס מקווקו = התקרה עם ראיות, קו צהוב = היעד. */
export default function GateBars({ rows, targets, selected, onSelect }: { rows: PlanRow[]; targets: Record<Gate, number>; selected?: string | null; onSelect: (id: string) => void }) {
  const pct = (v: number) => `${Math.min(100, (v / 120) * 100)}%`;
  return (
    <div className="gatebars">
      {GATE_ORDER.map(g => {
        const list = rows.filter(r => r.gate === g).sort((a, b) => b.r.points - a.r.points);
        if (!list.length) return null;
        const pass = list.filter(r => r.r.verdict === 'pass').length;
        return (
          <section key={g} className="gb-group">
            <header className="gb-head">
              <h3>{GATES[g].label}</h3>
              <span className="src">{GATES[g].when} · <bdi className="num" style={{ color: '#1A1A18' }}>{list.length}</bdi> תוכניות · <bdi className="num" style={{ color: '#1A1A18' }}>{pass}</bdi> עומדות ביעד</span>
            </header>
            <ul>
              {list.map(r => (
                <li key={r.plan.id}>
                  <button className="gb-row" aria-current={selected === r.plan.id ? 'true' : undefined} onClick={() => onSelect(r.plan.id)}
                    title={`${VERDICT_HE[r.r.verdict].label}: ${r.r.points} מתוך יעד ${r.r.target}`}>
                    <span className="gb-title">{r.plan.title}</span>
                    <span className="gb-track" aria-hidden="true">
                      <span className="gb-ceil" style={{ width: pct(r.r.ceiling), borderColor: VERDICT_COLOR[r.r.verdict] }} />
                      <span className="gb-fill" style={{ width: pct(r.r.points), background: VERDICT_COLOR[r.r.verdict] }} />
                      <span className="gb-target" style={{ right: pct(targets[g]) }} />
                    </span>
                    <bdi className="num gb-val" style={{ color: VERDICT_COLOR[r.r.verdict] }}>{r.r.points}</bdi>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="src gb-legend">
        <span className="lg lg-fill" /> הוכח במסמכים
        <span className="lg lg-ceil" /> התקרה אם יוצגו כל הראיות
        <span className="lg lg-target" /> יעד השער · ציר: <bdi className="num" style={{ fontWeight: 500 }}>0–120</bdi> נקודות
      </p>
    </div>
  );
}
