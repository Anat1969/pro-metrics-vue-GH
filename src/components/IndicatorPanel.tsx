import React from 'react';
import { INDICATORS, CHAPTER_HEX, STATUS_LABELS, type Indicator, type IndicatorData, type IndicatorStatus } from '@/data/indicators';

const STATUSES: IndicatorStatus[] = ['not_started', 'in_progress', 'completed', 'not_relevant'];

interface Props {
  indicator: Indicator;
  data: IndicatorData | undefined;
  onChange: (next: IndicatorData) => void;
  onNav: (id: string | null) => void;
  savedLabel: string;
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

/** עריכת מדד בטור צד, לא חלון מעל חלון. כל שינוי נשמר מיד. */
export default function IndicatorPanel({ indicator, data, onChange, onNav, savedLabel }: Props) {
  const idx = INDICATORS.findIndex(i => i.id === indicator.id);
  const prev = INDICATORS[idx - 1], next = INDICATORS[idx + 1];
  const status = data?.status ?? 'not_started';
  const score = data?.score ?? 0;
  const color = CHAPTER_HEX[indicator.chapter];

  const commit = (patch: Partial<IndicatorData>) => {
    const now = new Date().toISOString();
    const base: IndicatorData = data ?? { score: 0, status: 'not_started', notes: '', lastUpdated: now, history: [] };
    const merged = { ...base, ...patch, lastUpdated: now };
    let history = [...base.history];
    if (merged.score !== base.score) {
      const last = history[history.length - 1];
      // לחיצות רצופות על אותו מדד בתוך שתי דקות מתאחדות לרשומה אחת ביומן.
      if (last && Date.now() - new Date(last.timestamp).getTime() < 120_000) {
        history[history.length - 1] = { ...last, score: merged.score, notes: merged.notes, timestamp: now };
      } else {
        history = [...history, { score: merged.score, notes: merged.notes, timestamp: now, indicatorId: indicator.id, indicatorTitle: indicator.titleHe, oldScore: base.score }];
      }
    }
    onChange({ ...merged, history });
  };

  const setScore = (s: number) => {
    let st: IndicatorStatus = status;
    if (s === indicator.maxScore) st = 'completed';
    else if (status === 'completed' || status === 'not_started' || status === 'not_relevant') st = 'in_progress';
    commit({ score: s, status: st });
  };
  const setStatus = (st: IndicatorStatus) => {
    // אותה לוגיקה כמו בגרסה הקודמת: "הושלם" נותן ניקוד מלא, "טרם" ו"לא רלוונטי" מאפסים.
    const s = st === 'completed' ? indicator.maxScore : st === 'not_started' || st === 'not_relevant' ? 0 : score;
    commit({ status: st, score: s });
  };

  return (
    <article className="ind-panel" aria-label={`מדד ${idx + 1}: ${indicator.titleHe}`}>
      <div className="ind-ops">
        <span className="lbl" style={{ color }}>פרק {indicator.chapter} · {indicator.topic}</span>
        <span className="ind-ops-btns">
          <button className="press op" disabled={!prev} onClick={() => prev && onNav(prev.id)} title="המדד הקודם" aria-label="המדד הקודם"><Icon d="m9 6 6 6-6 6" /></button>
          <bdi className="num" style={{ fontSize: 12 }}>{idx + 1}/{INDICATORS.length}</bdi>
          <button className="press op" disabled={!next} onClick={() => next && onNav(next.id)} title="המדד הבא" aria-label="המדד הבא"><Icon d="m15 6-6 6 6 6" /></button>
          <button className="press op" onClick={() => onNav(null)} title="סגירה" aria-label="סגירה"><Icon d="M6 6l12 12M18 6 6 18" /></button>
        </span>
      </div>

      <h2 className="ind-title">{indicator.titleHe}</h2>
      <p className="ind-guidance">{indicator.guidanceHe}</p>
      <p className="src">חוברת המדדים, עמ' <bdi>{indicator.page}</bdi> · ניקוד מרבי <bdi>{indicator.maxScore}</bdi></p>

      <div className="ind-block">
        <div className="ind-block-head">
          <span className="lbl">ניקוד</span>
          <span className="ind-score" style={{ color: status === 'not_started' ? '#8A8984' : color }}>
            <bdi className="num">{status === 'not_started' ? '—' : score}</bdi><span className="src"> / {indicator.maxScore}</span>
          </span>
        </div>
        <div className="score-squares" role="group" aria-label="בחירת ניקוד">
          {Array.from({ length: indicator.maxScore + 1 }, (_, s) => (
            <button key={s} className="press sq" aria-pressed={status !== 'not_started' && status !== 'not_relevant' && score === s}
              disabled={status === 'not_relevant'}
              style={status !== 'not_started' && s > 0 && s <= score ? { background: color, color: '#fff', borderColor: color } : undefined}
              onClick={() => setScore(s)}>
              <bdi className="num">{s}</bdi>
            </button>
          ))}
        </div>
        <p className="src">לחיצה על מספר קובעת ניקוד. ניקוד מלא מסמן "הושלם".</p>
      </div>

      <div className="ind-block">
        <span className="lbl">סטטוס</span>
        <div className="selector" role="group" aria-label="סטטוס">
          {STATUSES.map(st => (
            <button key={st} className="chip" aria-pressed={status === st} onClick={() => setStatus(st)}>{STATUS_LABELS[st]}</button>
          ))}
        </div>
      </div>

      <label className="ind-block">
        <span className="ind-block-head"><span className="lbl">הערות והשלמות</span><span className="src">{savedLabel}</span></span>
        <textarea className="field ind-notes" value={data?.notes ?? ''} rows={3}
          placeholder="מה נבדק, באיזה מסמך, ומה חסר כדי לקבל ניקוד מלא"
          onChange={e => commit({ notes: e.target.value })} />
      </label>

      {data?.history?.length ? (
        <div className="ind-block">
          <span className="lbl">יומן המדד</span>
          <ul className="ind-hist">
            {[...data.history].reverse().slice(0, 3).map((h, i) => (
              <li key={i}><bdi className="num" style={{ fontWeight: 500 }}>{h.oldScore} → {h.score}</bdi> <span className="src">{new Date(h.timestamp).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</span></li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
