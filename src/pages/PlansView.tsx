import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { INDICATORS, CHAPTERS, CHAPTER_HEX, CHAPTER_META, type Project, type IndicatorData } from '@/data/indicators';
import { chapterEarnedScore, chapterMaxScore, chapterPctOfMax, matchesHebrew } from '@/lib/scoring';
import { GATES, GATE_ORDER, VERDICT_HE, MEASURE_APP, type Gate, type Verdict } from '@/lib/plans';
import { usePlans, type PlanRow } from '@/lib/usePlans';
import TopBar from '@/components/TopBar';
import Rose from '@/components/Rose';
import Selector from '@/components/Selector';
import GateBars from '@/components/GateBars';
import PlanPanel from '@/components/PlanPanel';
import { VERDICT_COLOR } from '@/components/IsoGate';
import Rich from '@/components/Rich';
import type { AppProps } from '@/App';

const VERDICTS: Verdict[] = ['pass', 'evidence', 'fail'];
const V_LABEL = Object.fromEntries(VERDICTS.map(v => [VERDICT_HE[v].label, v])) as Record<string, Verdict>;
const G_LABEL = Object.fromEntries(GATE_ORDER.map(g => [GATES[g].label, g])) as Record<string, Gate>;
type Pane = 'board' | 'list' | 'detail';

/** מדידת תוכנית כ"פרויקט", כדי לצייר לה את שושנת 360°. */
function asProject(row: PlanRow): Project {
  const indicators: Record<string, IndicatorData> = {};
  INDICATORS.forEach(ind => {
    const s = row.r.scores[ind.id];
    if (s == null) return;
    indicators[ind.id] = { score: s, status: s >= ind.maxScore ? 'completed' : 'in_progress', notes: '', lastUpdated: row.measuredAt ?? '', history: [] };
  });
  return { id: row.plan.id, name: row.plan.title, city: 'אשדוד', compound: '', lot: '', year: 0, manager: '', role: '', createdAt: '', indicators };
}

export default function PlansView({ projects, saved }: AppProps) {
  const [params, setParams] = useSearchParams();
  const { rows, live, takenAt, targets, setTargets, ready } = usePlans();
  const [search, setSearch] = useState('');
  const sel = params.get('p');
  const gates = params.get('g')?.split('|').filter(Boolean) as Gate[] ?? [];
  const verdicts = params.get('v')?.split('|').filter(Boolean) as Verdict[] ?? [];
  const [pane, setPane] = useState<Pane>(sel ? 'detail' : 'board');
  const patch = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };
  const select = (id: string | null) => { patch({ p: id }); if (id) setPane('detail'); };

  const filtered = useMemo(() => rows
    .filter(r => (!gates.length || gates.includes(r.gate)) && (!verdicts.length || verdicts.includes(r.r.verdict)) &&
      (!search.trim() || matchesHebrew(`${r.plan.title} ${r.quarter} ${r.plan.plan_number ?? ''}`, search) || (r.plan.plan_number ?? '').includes(search.trim())))
    .sort((a, b) => GATE_ORDER.indexOf(a.gate) - GATE_ORDER.indexOf(b.gate) || b.r.points - a.r.points), [rows, gates, verdicts, search]);
  const row = rows.find(r => r.plan.id === sel) ?? null;
  const idx = row ? filtered.findIndex(r => r.plan.id === row.plan.id) : -1;
  const count = (v: Verdict) => rows.filter(r => r.r.verdict === v).length;
  const upcoming = rows.filter(r => r.gate !== 'after');
  const upPass = upcoming.filter(r => r.r.verdict === 'pass').length;
  const upEvid = upcoming.filter(r => r.r.verdict === 'evidence').length;

  const dataLine = live === 'live' ? 'נתונים חיים מ"מה נבנה סביבי" וממכשיר המדידה' : live === 'loading' ? 'מתחבר לנתונים החיים...' : `אין חיבור. מוצגת תמונה שמורה מ-${takenAt ? new Date(takenAt).toLocaleDateString('he-IL') : ''}`;

  return (
    <div className="app-shell">
      <TopBar
        tabs={[{ label: 'בית', to: '/', current: false }, { label: 'תוכניות בעיר', to: '/plans', current: true }, ...projects.slice(-2).map(p => ({ label: p.name, to: `/project/${p.id}`, current: false }))]}
        search={{ value: search, onChange: setSearch, placeholder: 'חיפוש תוכנית: שם, רובע או מספר' }}
        menuItems={[{ label: 'איפוס היעדים', hint: 'ארד, 55 בכל שער', onSelect: () => setTargets({ taba: 55, binui: 55, after: 55 }) }]}
        status={saved.at ? 'נשמר' : ''}
      />
      <div className="dash">
        <header className="dash-head">
          <div style={{ minWidth: 0 }}>
            <p className="crumbs"><Link to="/">בית</Link> › תוכניות התחדשות עירונית</p>
            <h1 className="dash-title">האם התוכנית עומדת ביעד, לפני שמאשרים?</h1>
            <p className="src"><Rich>{`**${upPass}** מתוך **${upcoming.length}** תוכניות שלפני אישור עומדות ביעד. **${upEvid}** תלויות בראיות.`}</Rich> · {dataLine}</p>
          </div>
          <dl className="kpis">
            {VERDICTS.map(v => (
              <div key={v}><dt className="lbl">{VERDICT_HE[v].label}</dt><dd><bdi className="num kpi-big" style={{ color: VERDICT_COLOR[v] }}>{count(v)}</bdi></dd></div>
            ))}
          </dl>
          <a className="press btn" href={MEASURE_APP} target="_blank" rel="noreferrer">למכשיר המדידה</a>
        </header>

        <div className="panes-switch" role="tablist" aria-label="תצוגה">
          {([['board', 'לוח'], ['list', 'רשימה'], ['detail', row ? 'התוכנית' : 'איך מחליטים']] as [Pane, string][]).map(([k, l]) => (
            <button key={k} role="tab" className="chip" aria-pressed={pane === k} aria-selected={pane === k} onClick={() => setPane(k)}>{l}</button>
          ))}
        </div>

        <main className="dash-main" data-pane={pane === 'board' ? 'rose' : pane}>
          {/* ── ימין: יעדים, סינון ורשימה ── */}
          <section className="card dash-list" aria-label="רשימת התוכניות">
            <div className="dash-filters">
              <div className="targets" role="group" aria-label="יעדי העירייה">
                <span className="lbl">יעד לכל שער (מתוך 120)</span>
                {GATE_ORDER.map(g => (
                  <label key={g} className="target">
                    <span>{GATES[g].short}</span>
                    <button className="press op" aria-label={`הורדת היעד ב${GATES[g].short}`} onClick={() => setTargets({ ...targets, [g]: Math.max(0, targets[g] - 5) })}>−</button>
                    <bdi className="num">{targets[g]}</bdi>
                    <button className="press op" aria-label={`העלאת היעד ב${GATES[g].short}`} onClick={() => setTargets({ ...targets, [g]: Math.min(120, targets[g] + 5) })}>+</button>
                  </label>
                ))}
              </div>
              <Selector label="שער" options={GATE_ORDER.map(g => GATES[g].label)} value={gates.map(g => GATES[g].label)}
                countOf={o => rows.filter(r => r.gate === G_LABEL[o]).length}
                onChange={v => patch({ g: v.map(l => G_LABEL[l]).join('|') || null })} />
              <Selector label="מצב" options={VERDICTS.map(v => VERDICT_HE[v].label)} value={verdicts.map(v => VERDICT_HE[v].label)}
                colorOf={o => VERDICT_COLOR[V_LABEL[o]]} countOf={o => rows.filter(r => r.r.verdict === V_LABEL[o]).length}
                onChange={v => patch({ v: v.map(l => V_LABEL[l]).join('|') || null })} />
            </div>
            {!ready ? <div className="empty"><p>טוען את התוכניות...</p></div> : filtered.length === 0 ? (
              <div className="empty"><p><b>אין תוכנית שמתאימה.</b></p><p>אפשר לנקות את החיפוש, או ללחוץ "הכול" בסינון.</p></div>
            ) : (
              <ul className="scroll-in ind-list">
                {filtered.map(r => (
                  <li key={r.plan.id}>
                    <button className="ind-row plan-row" aria-current={sel === r.plan.id ? 'true' : undefined} onClick={() => select(r.plan.id)}>
                      <span className="ops-dot" style={{ background: VERDICT_COLOR[r.r.verdict] }} title={VERDICT_HE[r.r.verdict].label} />
                      <span className="ind-row-title">{r.plan.title}<span className="src"> · {GATES[r.gate].short}{r.quarter ? ` · ${r.quarter}` : ''}</span></span>
                      <bdi className="num ind-row-score" style={{ color: VERDICT_COLOR[r.r.verdict] }}>{r.r.points}/{r.r.target}</bdi>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── מרכז: הלוח, או השושנה של התוכנית ── */}
          <section className="dash-focus" aria-label={row ? `שושנת ${row.plan.title}` : 'לוח השערים'}>
            {row ? (
              <>
                <div className="rose-wrap"><Rose project={asProject(row)} onSelect={() => {}} /></div>
                <p className="rose-legend src">השושנה של <b>{row.plan.title}</b>: שטח צבוע הוא ניקוד שהוכח. פלח ריק הוא מדד שלא נמדד.</p>
                <div className="chapter-strip">
                  {CHAPTERS.map(ch => {
                    const pr = asProject(row);
                    return (
                      <div key={ch} className="card chapter-mini" style={{ borderTop: `3px solid ${CHAPTER_HEX[ch]}` }}>
                        <span className="lbl" style={{ color: CHAPTER_HEX[ch] }}>{CHAPTER_META[ch].letter} · {ch}</span>
                        <span><bdi className="num" style={{ fontSize: 20 }}>{chapterEarnedScore(pr, ch)}</bdi><span className="src"> / {chapterMaxScore(ch)}</span></span>
                        <span className="mini-bar"><span style={{ width: `${chapterPctOfMax(pr, ch)}%`, background: CHAPTER_HEX[ch] }} /></span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="card scroll-in" style={{ height: '100%', padding: '12px 14px' }}>
                <GateBars rows={filtered} targets={targets} selected={sel} onSelect={select} />
              </div>
            )}
          </section>

          {/* ── שמאל: ההחלטה ── */}
          <aside className="card dash-aside scroll-in">
            {row ? (
              <PlanPanel key={row.plan.id} row={row} pos={`${idx + 1}/${filtered.length}`} onClose={() => select(null)}
                onPrev={idx > 0 ? () => select(filtered[idx - 1].plan.id) : undefined}
                onNext={idx >= 0 && idx < filtered.length - 1 ? () => select(filtered[idx + 1].plan.id) : undefined} />
            ) : (
              <article className="ind-panel">
                <span className="lbl">איך מחליטים</span>
                <h2 className="ind-title">שלוש תשובות, לפי מה שהוכח</h2>
                <div className="tone tone-solution"><h4>עומדת ביעד</h4><p>הנקודות שהוכחו במסמכים מגיעות ליעד של השער.</p></div>
                <div className="tone tone-warn"><h4>תלויה בראיות</h4><p>היעד בהישג יד רק אם היזם יציג מסמכים למדדים שלא נמדדו.</p></div>
                <div className="tone tone-problem"><h4>לא עומדת ביעד</h4><p>גם עם ראיות מלאות היעד לא מושג. נדרש שינוי בתוכנית.</p></div>
                <div className="ind-block how">
                  <p><b>השער</b> נקבע לפי סטטוס התוכנית: בתכנון ← <b>אישור תב"ע</b>. מאושרת ← <b>אישור תוכנית בינוי</b>. בהיתר או בביצוע ← <b>בדיעבד</b>.</p>
                  <p><b>היעד</b> נקבע בעירייה. ברירת המחדל היא <b>ארד</b>, <bdi className="num">55</bdi> מתוך <bdi className="num">120</bdi>, הדרגה הנמוכה בשכונה 360°.</p>
                  <p><b>הניקוד</b> מגיע ממכשיר המדידה. מה שלא נמדד נחשב <bdi className="num">0</bdi>, כמו בדרגה הרשמית.</p>
                </div>
                <Rich as="p" className="src">{'בחירת תוכנית ברשימה או בלוח פותחת את ההחלטה, עם **מה לדרוש** ו**נוסח לפרוטוקול**.'}</Rich>
              </article>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}
