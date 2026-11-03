import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CHAPTER_HEX } from '@/data/indicators';
import { GATES, GENERAL_GAPS, MA_NIVNE, MEASURE_APP, STAGE_HE, STATUS_HE, TRACK_HE, VERDICT_HE, sourceHe, developerLetter } from '@/lib/plans';
import { usePlans } from '@/lib/usePlans';
import TopBar from '@/components/TopBar';
import Rich from '@/components/Rich';
import { VERDICT_COLOR } from '@/components/IsoGate';

const CHECK_HE = { ok: 'תקין', warn: 'לתשומת לב', fail: 'חסר' } as const;
const CHECK_COLOR = { ok: '#1D7A55', warn: '#BA7517', fail: '#A32D2D' } as const;
const CONF_HE: Record<string, string> = { document: 'ציטוט במסמך', inferred: 'הוסק מנתונים', simulation: 'סימולציה', none: 'לא נמצאה ראיה', excluded: 'לא רלוונטי' };
// דוח Word נטען רק כשמבקשים אותו
const downloadWord = (...a: Parameters<typeof import('@/lib/gateReport').downloadGateReport>) => import('@/lib/gateReport').then(m => m.downloadGateReport(...a));
const downloadLetter = (...a: Parameters<typeof import('@/lib/gateReport').downloadLetter>) => import('@/lib/gateReport').then(m => m.downloadLetter(...a));

/** הדוח המלא של שער אחד: הכרעה, שלבים, בדיקות אוטומטיות ואיך נבדקו, כל 44 המדדים, בקשות, ומה חסר. */
export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const { rows, ready, live, targets } = usePlans();
  const row = rows.find(r => r.plan.id === id);
  const [copied, setCopied] = useState(false);

  if (!ready) return <div className="app-shell"><TopBar menuItems={[]} /><main className="empty" style={{ placeSelf: 'center' }}><p>טוען את הדוח...</p></main></div>;
  if (!row) return (
    <div className="app-shell"><TopBar menuItems={[]} />
      <main className="empty" style={{ placeSelf: 'center', textAlign: 'center' }}>
        <p><b>התוכנית לא נמצאה.</b></p><p>ייתכן שהקישור ישן. כל התוכניות בלוח.</p>
        <p style={{ marginTop: 12 }}><Link className="press btn btn-solid" to="/plans">ללוח התוכניות</Link></p>
      </main>
    </div>
  );

  const { plan: p, r, gate } = row;
  const today = new Date().toLocaleDateString('he-IL');
  const nowReq = row.requests.filter(d => !d.future);
  const futReq = row.requests.filter(d => d.future);
  const planGaps = [
    ...(row.ps ? [] : ['אין מדידה לתוכנית במכשיר המדידה.']),
    ...(p.units_existing == null ? ['חסר מספר יחידות הדיור הקיימות.'] : []),
    ...(!row.docs.length ? ['אין מסמכים לתוכנית במערכת.'] : []),
  ];
  // מה צריך כדי שהבדיקה האוטומטית תהיה מלאה: מסמכים שאינם במערכת
  const askAnat = nowReq.slice(0, 6).map(d => d.doc);

  return (
    <div className="report-page">
      <div className="no-print"><TopBar tabs={[{ label: 'בית', to: '/', current: false }, { label: 'תוכניות בעיר', to: '/plans', current: false }, { label: 'דוח', to: `/report/${p.id}`, current: true }]} menuItems={[{ label: 'הדפסה או PDF', onSelect: () => window.print() }]} /></div>
      <main className="report">
        <header className="rp-head">
          <p className="crumbs no-print"><Link to="/plans">תוכניות בעיר</Link> › <Link to={`/plans?p=${p.id}`}>{p.title}</Link> › דוח</p>
          <p className="lbl">עיריית אשדוד · שער היעדים · דוח {GATES[gate].label} · <bdi>{today}</bdi></p>
          <h1>{p.title}</h1>
          <p className="src">
            {[p.plan_number, row.quarter, STATUS_HE[p.status], p.kind === 'new_construction' ? 'בנייה חדשה' : p.renewal_track ? TRACK_HE[p.renewal_track] : null, p.developer].filter(Boolean).join(' · ')}
            {p.units_planned ? <> · <bdi className="num">{p.units_existing ?? '?'} → {p.units_planned}</bdi> יח"ד</> : null}
          </p>
          <div className="rp-actions no-print">
            <button className="press btn btn-solid" onClick={() => downloadWord(row, targets)}>הורדת Word</button>
            <button className="press btn" onClick={() => window.print()}>הדפסה או PDF</button>
          </div>
        </header>

        <section className="rp-sec">
          <h2>1. ההכרעה</h2>
          <div className={`tone ${r.verdict === 'pass' ? 'tone-solution' : r.verdict === 'evidence' ? 'tone-warn' : 'tone-problem'}`}>
            <h4 style={{ color: VERDICT_COLOR[r.verdict] }}>{VERDICT_HE[r.verdict].label}</h4>
            <Rich as="p">{`**${r.points}** נקודות הוכחו מתוך **120**, מול יעד **${r.target}** ל${GATES[gate].label}. ${r.need ? `חסרות **${r.need}**.` : 'היעד הושג.'} דרגה היום: **${r.grade}**.`}</Rich>
            <p>{r.verdict === 'fail' && r.nextStageCan ? `היעד לא מושג בשלב הזה, ואפשרי רק עם ${gate === 'taba' ? STAGE_HE.binui : STAGE_HE.after}.` : VERDICT_HE[r.verdict].line}</p>
          </div>
        </section>

        <section className="rp-sec">
          <h2>2. מה אפשר לדרוש בכל שלב</h2>
          <table className="rp-table">
            <thead><tr><th>שלב</th><th>מקסימום שאפשר לדרוש</th><th>הוכח</th><th>חסר בתוך השלב</th><th>מה זה אומר</th></tr></thead>
            <tbody>
              <tr className="rp-now"><td><b>{GATES[gate].label}</b> (עכשיו)</td><td className="num">{r.now.max}</td><td className="num">{r.now.proven}</td><td className="num">{r.now.open}</td><td>לדרוש לפני האישור: {r.now.evidence.length} מסמכים, {r.now.design.length} שיפורים.</td></tr>
              {gate === 'taba' && <tr><td>{STAGE_HE.binui}</td><td className="num">{r.rows.filter(x => !x.excluded).reduce((a, x) => a + x.max, 0)}</td><td className="num">{r.rows.filter(x => x.stage === 'binui' && x.score != null).reduce((a, x) => a + (x.score ?? 0), 0)}</td><td className="num">{r.future.max}</td><td>עתידי: {r.future.asks.length} מדדים של פרטי תכנון, לרשום כתנאי.</td></tr>}
              <tr><td>{STAGE_HE.after}</td><td className="num">—</td><td className="num">—</td><td className="num">—</td><td>להתנות: {r.conditions.length} מדדים עם דרישות ביצוע (שלב ג'), בלי נקודות נוספות.</td></tr>
            </tbody>
          </table>
          <p className="src">שיוך המדדים לשלבים: הצעה לאישור העירייה, לפי נוסח הדרישות ולפי מה שאפשר היה למדוד מתוך 18 התב"עות בעיר. בכלל: בתב"ע עד 94 נקודות, ובתוכנית בינוי עוד 26, סך הכול 120. בתוכנית הזו יצאו מהחישוב {r.excluded} מדדים "לא רלוונטיים", ולכן המקסימום נמוך יותר. המקסימום בכל שלב מצטבר: הוא כולל את השלבים שלפניו.</p>
        </section>

        <section className="rp-sec">
          <h2>3. בדיקות אוטומטיות, ואיך כל אחת נבדקה</h2>
          <table className="rp-table">
            <thead><tr><th>בדיקה</th><th>תוצאה</th><th>מצב</th><th>איך נבדק</th></tr></thead>
            <tbody>
              {row.checks.map(c => (
                <tr key={c.key}><td><b>{c.title}</b></td><td>{c.result}</td><td style={{ color: CHECK_COLOR[c.status], fontWeight: 600 }}>{CHECK_HE[c.status]}</td><td className="src">{c.how}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="src">
            מקור הניקוד: מכשיר המדידה שכונה 360° (Shchuna360-GH), שיטה {row.ps?.method === 'auto' ? 'אוטומטית' : row.ps?.method ?? '—'}, מודל {row.ps?.model ?? '—'}, מחוון גרסה {row.ps?.rubric_version ?? '—'}.
            {' '}נקראו: {(row.ps?.sources ?? []).map(sourceHe).join(', ') || '—'}.
            {' '}הנתונים: {live === 'live' ? 'חיים מהמסד העירוני' : 'תמונה שמורה מ-02.11.2026'}.
          </p>
        </section>

        <section className="rp-sec">
          <h2>4. בקשת מסמכים מהיזם</h2>
          {nowReq.length ? (
            <table className="rp-table">
              <thead><tr><th>מסמך</th><th>פותח את המדדים</th><th>עד נקודות</th></tr></thead>
              <tbody>{nowReq.map(d => <tr key={d.doc}><td><b>{d.doc}</b></td><td>{d.metrics.map(m => `${m.n}. ${m.title}`).join(' · ')}</td><td className="num">{d.gain}</td></tr>)}</tbody>
            </table>
          ) : <p>אין מסמכים חסרים לשלב הזה.</p>}
          {futReq.length > 0 && (
            <>
              <h3>לשלב הבא ({gate === 'taba' ? STAGE_HE.binui : STAGE_HE.after})</h3>
              <ul className="rp-list">{futReq.map(d => <li key={d.doc}><b>{d.doc}</b>: {d.metrics.map(m => m.title).join(', ')} (עד <bdi className="num">{d.gain}</bdi>)</li>)}</ul>
            </>
          )}
        </section>

        <section className="rp-sub rp-letter-sec">
          <h3>מכתב ליזם, מוכן לשליחה</h3>
          <pre className="rp-letter">{developerLetter(p, gate, r, row.requests)}</pre>
          <div className="rp-actions no-print">
            <button className="press btn" onClick={() => { navigator.clipboard?.writeText(developerLetter(p, gate, r, row.requests)).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>{copied ? 'הועתק' : 'העתקת המכתב'}</button>
            <button className="press btn" onClick={() => downloadLetter(row)}>המכתב כ-Word</button>
          </div>
        </section>

        <section className="rp-sec">
          <h2>5. כל 44 המדדים</h2>
          <table className="rp-table rp-metrics">
            <thead><tr><th>#</th><th>מדד</th><th>שלב</th><th>ניקוד</th><th>איך נבדק</th><th>נימוק המדידה</th><th>מה חסר לבדיקה</th></tr></thead>
            <tbody>
              {r.rows.map(m => (
                <tr key={m.n} className={m.score == null && !m.excluded ? 'rp-open' : ''}>
                  <td className="num" style={{ color: CHAPTER_HEX[m.chapter] }}>{m.n}</td>
                  <td>{m.title}</td>
                  <td>{STAGE_HE[m.stage]}</td>
                  <td className="num">{m.excluded ? '—' : m.score == null ? `—/${m.max}` : `${m.score}/${m.max}`}</td>
                  <td>{CONF_HE[m.confidence] ?? m.confidence}<span className="src"> · {m.how}</span></td>
                  <td className="src">{m.note}</td>
                  <td className="src">{m.score == null && !m.excluded ? m.need : m.score != null && m.score < m.max ? 'נמדד, יש נקודות פתוחות' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rp-sec">
          <h2>6. להתנות בהיתר ובביצוע (דרישות שלב ג' בחוברת)</h2>
          <ul className="rp-list">
            {r.conditions.map(c => <li key={c.n}><b>{c.n}. {c.title}:</b> <span>{c.stageC}</span></li>)}
          </ul>
        </section>

        <section className="rp-sec">
          <h2>7. מה חסר</h2>
          <h3>כדי שהבדיקה האוטומטית תהיה מלאה, צריך מהיזם או מהעירייה</h3>
          <ul className="rp-list">
            {askAnat.length ? askAnat.map(d => <li key={d}>{d}</li>) : <li>אין: כל המסמכים של השלב נקראו.</li>}
            {row.checks.find(c => c.key === 'read' && c.status !== 'ok') && <li>מדידה מחדש שתקרא גם את: {row.checks.find(c => c.key === 'read')!.result.replace('לא נקראו: ', '')}</li>}
          </ul>
          <h3>מידע כללי שחסר</h3>
          <ul className="rp-list">{[...planGaps, ...GENERAL_GAPS].map(g => <li key={g}>{g}</li>)}</ul>
        </section>

        <footer className="rp-foot src">
          הניקוד: שכונה 360°, מדדים לתכנון ולפיתוח עירוני, גרסה 2.0, ינואר 2025, המועצה הישראלית לבנייה ירוקה ומשרד הבינוי והשיכון.
          {' '}המדידה: <a href={`${MEASURE_APP}/plans/${p.id}`}>מכשיר המדידה</a>. התוכנית: <a href={`${MA_NIVNE}/p/${p.id}`}>מה נבנה סביבי</a>.
          {' '}הכלי אינו מעניק הסמכה. הוא כלי עבודה לבדיקה מוקדמת ולדיון בוועדה.
        </footer>
      </main>
    </div>
  );
}
