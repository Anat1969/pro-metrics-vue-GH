import React, { useState } from 'react';
import { CHAPTER_HEX } from '@/data/indicators';
import { GATES, MA_NIVNE, MEASURE_APP, STATUS_HE, TRACK_HE, VERDICT_HE, type Ask } from '@/lib/plans';
import type { PlanRow } from '@/lib/usePlans';
import Rich from './Rich';

const TONE = { pass: 'tone-solution', evidence: 'tone-warn', fail: 'tone-problem' } as const;
const Icon = ({ d }: { d: string }) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>);

/** כמה דרישות ראשונות (מהשוות ביותר) מכסות את הפער. */
function coverCount(asks: Ask[], need: number) {
  let sum = 0;
  for (let i = 0; i < asks.length; i++) { sum += asks[i].gain; if (sum >= need) return { n: i + 1, sum }; }
  return { n: asks.length, sum };
}

/** החלטת השער: מה הוכח, מה חסר, ומה לדרוש מהיזם לפני האישור. */
export default function PlanPanel({ row, onClose, onPrev, onNext, pos }: { row: PlanRow; onClose: () => void; onPrev?: () => void; onNext?: () => void; pos: string }) {
  const { plan: p, r, gate } = row;
  const [copied, setCopied] = useState(false);
  const evidence = r.asks.filter(a => a.kind === 'evidence');
  const design = r.asks.filter(a => a.kind === 'design');
  const pool = r.verdict === 'fail' ? design.concat(evidence).sort((a, b) => b.gain - a.gain) : r.asks;
  const cover = r.need > 0 ? coverCount(pool, r.need) : null;

  const memo = () => {
    const lines = [
      `${p.title} (${p.plan_number ?? 'ללא מספר'}), ${GATES[gate].label}.`,
      `הוכחו ${r.points} נקודות מתוך יעד ${r.target} (שכונה 360°, גרסה 2.0). ${VERDICT_HE[r.verdict].label}.`,
      r.need > 0 ? `לפני האישור יש לדרוש: ${pool.slice(0, cover?.n ?? 3).map(a => `${a.kind === 'evidence' ? 'מסמך ל' : 'שיפור ב'}${a.title} (עד ${a.gain})`).join('; ')}.` : 'אין דרישות פתוחות ליעד הזה.',
    ];
    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };

  return (
    <article className="ind-panel" aria-label={`החלטת השער: ${p.title}`}>
      <div className="ind-ops">
        <span className="lbl">{GATES[gate].label} · {STATUS_HE[p.status] ?? p.status}</span>
        <span className="ind-ops-btns">
          <button className="press op" disabled={!onPrev} onClick={onPrev} title="התוכנית הקודמת" aria-label="התוכנית הקודמת"><Icon d="m9 6 6 6-6 6" /></button>
          <bdi className="num" style={{ fontSize: 12 }}>{pos}</bdi>
          <button className="press op" disabled={!onNext} onClick={onNext} title="התוכנית הבאה" aria-label="התוכנית הבאה"><Icon d="m15 6-6 6 6 6" /></button>
          <button className="press op" onClick={onClose} title="סגירה" aria-label="סגירה"><Icon d="M6 6l12 12M18 6 6 18" /></button>
        </span>
      </div>
      <h2 className="ind-title">{p.title}</h2>
      <p className="src">
        {[p.plan_number, row.quarter, p.renewal_track ? TRACK_HE[p.renewal_track] : null].filter(Boolean).join(' · ')}
        {p.units_planned ? <> · <bdi className="num" style={{ fontWeight: 500 }}>{p.units_existing ?? '?'} → {p.units_planned}</bdi> יח"ד</> : null}
      </p>

      <div className={`tone ${TONE[r.verdict]}`}>
        <h4>{VERDICT_HE[r.verdict].label}</h4>
        <Rich as="p">{`**${r.points}** נקודות הוכחו, מול יעד **${r.target}**.${r.need ? ` חסרות **${r.need}**.` : ''}`}</Rich>
        <p>{VERDICT_HE[r.verdict].line}</p>
      </div>
      <Rich as="p" className="src">{`נמדדו **${r.measured}** מדדים. **${r.unmeasured}** לא נמדדו, כי אין להם ראיה במסמכים. התקרה עם כל הראיות: **${r.ceiling}**. דרגה היום: ${r.grade}.`}</Rich>

      {cover && (
        <div className="tone tone-insight">
          <Rich as="p">{`==${cover.n} הדרישות הראשונות שוות עד ${cover.sum} נקודות==, ${cover.sum >= r.need ? 'והן מכסות את הפער' : 'ועדיין לא מכסות את הפער'}.`}</Rich>
        </div>
      )}

      <div className="ind-block">
        <span className="lbl">{r.need > 0 ? "מה לדרוש לפני האישור" : "מה עוד אפשר לשפר"}</span>
        <ul className="ops">
          {pool.slice(0, 6).map(a => (
            <li key={a.id} className="ask" title={a.note || undefined}>
              <span className="ops-dot" style={{ background: CHAPTER_HEX[a.chapter] }} aria-hidden="true" />
              <span className="ops-title"><b>{a.kind === 'evidence' ? 'מסמך:' : 'שיפור:'}</b> {a.title}</span>
              <bdi className="num ops-gain" style={{ color: '#1D7A55' }}>+{a.gain}</bdi>
            </li>
          ))}
        </ul>
        <p className="src">"מסמך": המדד לא נמדד, כי התוכנית לא מתייחסת אליו. "שיפור": נמדד, ויש בו נקודות פתוחות. ריחוף מציג את הנימוק.</p>
      </div>

      <div className="ind-block">
        <div className="plan-links">
          <button className="press btn btn-solid" onClick={memo}>{copied ? 'הועתק' : 'העתקת נוסח לפרוטוקול'}</button>
          <a className="press btn" href={`${MEASURE_APP}/plans/${p.id}`} target="_blank" rel="noreferrer">המדידה המלאה, עם ציטוטים</a>
          <a className="press btn" href={`${MA_NIVNE}/p/${p.id}`} target="_blank" rel="noreferrer">דף התוכנית ב"מה נבנה סביבי"</a>
        </div>
        <p className="src">המדידה: מכשיר המדידה שכונה 360°{row.measuredAt ? `, ${new Date(row.measuredAt).toLocaleDateString('he-IL')}` : ''}. כאן רק משווים ליעד.</p>
      </div>
    </article>
  );
}
