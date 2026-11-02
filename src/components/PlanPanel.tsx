import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CHAPTER_HEX } from '@/data/indicators';
import { GATES, MA_NIVNE, MEASURE_APP, STATUS_HE, TRACK_HE, VERDICT_HE, STAGE_HE, type Ask } from '@/lib/plans';
import type { PlanRow } from '@/lib/usePlans';
import Rich from './Rich';

const TONE = { pass: 'tone-solution', evidence: 'tone-warn', fail: 'tone-problem' } as const;
const CHECK_COLOR = { ok: '#1D7A55', warn: '#BA7517', fail: '#A32D2D' } as const;
const Icon = ({ d }: { d: string }) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>);

function AskList({ asks, max = 5 }: { asks: Ask[]; max?: number }) {
  return (
    <ul className="ops">
      {asks.slice(0, max).map(a => (
        <li key={a.id} className="ask" title={a.note || a.need}>
          <span className="ops-dot" style={{ background: CHAPTER_HEX[a.chapter] }} aria-hidden="true" />
          <span className="ops-title"><b>{a.kind === 'evidence' ? 'מסמך:' : 'שיפור:'}</b> {a.title}</span>
          <bdi className="num ops-gain" style={{ color: '#1D7A55' }}>+{a.gain}</bdi>
        </li>
      ))}
      {asks.length > max && <li className="src">ועוד {asks.length - max}, בדוח המלא.</li>}
    </ul>
  );
}

/** החלטת השער: כמה אפשר לדרוש בשלב, מה חסר בתוכו, מה עובר לשלבים הבאים. */
export default function PlanPanel({ row, onClose, onPrev, onNext, pos }: { row: PlanRow; onClose: () => void; onPrev?: () => void; onNext?: () => void; pos: string }) {
  const { plan: p, r, gate } = row;
  const [copied, setCopied] = useState(false);
  const nowAsks = [...r.now.evidence, ...r.now.design].sort((a, b) => b.gain - a.gain);
  const nextLabel = gate === 'taba' ? STAGE_HE.binui : STAGE_HE.after;
  const bad = row.checks.filter(c => c.status !== 'ok');

  const memo = () => {
    const lines = [
      `${p.title} (${p.plan_number ?? 'ללא מספר'}), ${GATES[gate].label}.`,
      `בשלב זה אפשר לדרוש עד ${r.now.max} נקודות. הוכחו ${r.points}, מול יעד ${r.target} (שכונה 360°, גרסה 2.0). ${VERDICT_HE[r.verdict].label}.`,
      nowAsks.length ? `לדרוש בשלב זה: ${nowAsks.slice(0, 5).map(a => `${a.kind === 'evidence' ? a.need : 'שיפור ב' + a.title} (עד ${a.gain})`).join('; ')}.` : 'אין דרישות פתוחות בשלב זה.',
      r.future.asks.length ? `להעביר ל${nextLabel}: ${r.future.asks.slice(0, 4).map(a => a.title).join('; ')} (עד ${r.future.max} נקודות).` : '',
      r.conditions.length ? `להתנות בהיתר ובביצוע: ${r.conditions.length} מדדים עם דרישות ביצוע (שלב ג').` : '',
    ].filter(Boolean);
    navigator.clipboard?.writeText(lines.join('\n')).catch(() => {});
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
        {[p.plan_number, row.quarter, p.kind === 'new_construction' ? 'בנייה חדשה' : p.renewal_track ? TRACK_HE[p.renewal_track] : null].filter(Boolean).join(' · ')}
        {p.units_planned ? <> · <bdi className="num" style={{ fontWeight: 500 }}>{p.units_existing ?? '?'} → {p.units_planned}</bdi> יח"ד</> : null}
      </p>

      <div className={`tone ${TONE[r.verdict]}`}>
        <h4>{VERDICT_HE[r.verdict].label}</h4>
        <Rich as="p">{`**${r.points}** נקודות הוכחו, מול יעד **${r.target}**.${r.need ? ` חסרות **${r.need}**.` : ''}`}</Rich>
        <p>{r.verdict === 'fail' && r.nextStageCan ? `גם עם כל מה שאפשר לדרוש בשלב הזה, היעד לא מושג. הוא אפשרי רק עם ${nextLabel}.` : VERDICT_HE[r.verdict].line}</p>
      </div>

      {/* שלושת השלבים: עכשיו, הבא, היתר וביצוע */}
      <div className="stages" aria-label="מה אפשר לדרוש בכל שלב">
        <div className="stage now">
          <span className="lbl">עכשיו: {GATES[gate].label}</span>
          <Rich>{`עד **${r.now.max}** נק'`}</Rich>
          <Rich>{`הוכחו **${r.now.proven}**`}</Rich>
          <Rich className="stage-open">{`חסרות **${r.now.open}**`}</Rich>
        </div>
        {gate === 'taba' && (
          <div className="stage">
            <span className="lbl">לשלב הבא: {STAGE_HE.binui}</span>
            <Rich>{`עוד **${r.future.max}** נק'`}</Rich>
            <span className="src">{r.future.asks.length} מדדים</span>
            <span />
          </div>
        )}
        <div className="stage">
          <span className="lbl">להתנות: היתר וביצוע</span>
          <Rich>{`**${r.conditions.length}** מדדים`}</Rich>
          <span className="src">דרישות שלב ג'</span>
          <span />
        </div>
      </div>

      <div className="ind-block">
        <span className="lbl">{r.now.open ? `לדרוש בתוך ה${GATES[gate].label}` : 'בשלב הזה אין דרישות פתוחות'}</span>
        <AskList asks={nowAsks} />
      </div>
      {gate === 'taba' && r.future.asks.length > 0 && (
        <div className="ind-block">
          <span className="lbl">לרשום כתנאי ל{STAGE_HE.binui}</span>
          <AskList asks={r.future.asks} max={3} />
        </div>
      )}

      <div className="ind-block">
        <span className="lbl">בדיקות אוטומטיות</span>
        <ul className="checks">
          {row.checks.map(c => (
            <li key={c.key} title={c.how}>
              <span className="ops-dot" style={{ background: CHECK_COLOR[c.status] }} aria-hidden="true" />
              <b>{c.title}:</b> {c.result}
            </li>
          ))}
        </ul>
        <p className="src">{bad.length ? `${bad.length} בדיקות דורשות תשומת לב.` : 'כל הבדיקות תקינות.'} ריחוף מסביר איך כל אחת נבדקה.</p>
      </div>

      <div className="ind-block">
        <div className="plan-links">
          <Link className="press btn btn-solid" to={`/report/${p.id}`}>הדוח המלא</Link>
          <button className="press btn" onClick={memo}>{copied ? 'הועתק' : 'נוסח לפרוטוקול'}</button>
          <a className="press btn" href={`${MEASURE_APP}/plans/${p.id}`} target="_blank" rel="noreferrer">המדידה, עם ציטוטים</a>
          <a className="press btn" href={`${MA_NIVNE}/p/${p.id}`} target="_blank" rel="noreferrer">דף התוכנית</a>
        </div>
      </div>
    </article>
  );
}
