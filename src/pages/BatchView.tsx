import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GATES, GATE_ORDER, GENERAL_GAPS, VERDICT_HE, type Gate } from '@/lib/plans';
import { usePlans } from '@/lib/usePlans';
import TopBar from '@/components/TopBar';
import Rich from '@/components/Rich';
import { VERDICT_COLOR } from '@/components/IsoGate';

const downloadBatch = (...a: Parameters<typeof import('@/lib/gateReport').downloadBatch>) => import('@/lib/gateReport').then(m => m.downloadBatch(...a));

/** דוח ועדה מרוכז: כל התוכניות בשער, בטבלה אחת, עם הדרישות העיקריות לכל אחת. */
export default function BatchView() {
  const [params, setParams] = useSearchParams();
  const g = (params.get('g') as Gate) || null;
  const { rows, ready } = usePlans();
  const gates = g ? [g] : GATE_ORDER;

  return (
    <div className="report-page">
      <div className="no-print"><TopBar tabs={[{ label: 'בית', to: '/', current: false }, { label: 'תוכניות בעיר', to: '/plans', current: false }, { label: 'דוח ועדה', to: '/batch', current: true }]} menuItems={[{ label: 'הדפסה או PDF', onSelect: () => window.print() }]} /></div>
      <main className="report">
        <header className="rp-head">
          <p className="lbl">עיריית אשדוד · שער היעדים · דוח ועדה מרוכז · <bdi>{new Date().toLocaleDateString('he-IL')}</bdi></p>
          <h1>{g ? GATES[g].label : 'כל השערים'}</h1>
          <div className="selector no-print" role="group" aria-label="שער">
            <button className="chip" aria-pressed={!g} onClick={() => setParams({}, { replace: true })}>הכול</button>
            {GATE_ORDER.map(x => <button key={x} className="chip" aria-pressed={g === x} onClick={() => setParams({ g: x }, { replace: true })}>{GATES[x].label}</button>)}
          </div>
          <div className="rp-actions no-print">
            <button className="press btn btn-solid" onClick={() => downloadBatch(rows, g)} disabled={!ready}>הורדת Word</button>
            <button className="press btn" onClick={() => window.print()}>הדפסה או PDF</button>
          </div>
        </header>
        {!ready ? <p>טוען...</p> : gates.map(x => {
          const list = rows.filter(r => r.gate === x).sort((a, b) => b.r.points - a.r.points);
          if (!list.length) return null;
          const near = list.filter(r => r.r.verdict !== 'pass').sort((a, b) => a.r.need - b.r.need)[0];
          return (
            <section key={x} className="rp-sec">
              <h2>{GATES[x].label} · <bdi className="num">{list.length}</bdi> תוכניות</h2>
              {near && <Rich as="p">{`==הכי קרובה ליעד: ${near.plan.title}==, חסרות **${near.r.need}** נקודות. בשלב הזה אפשר לדרוש עד **${list[0].r.now.max}**.`}</Rich>}
              <table className="rp-table">
                <thead><tr><th>תוכנית</th><th>הכרעה</th><th>מקסימום בשלב</th><th>הוכח</th><th>חסר בשלב</th><th>עתידי</th><th>הדרישות העיקריות</th></tr></thead>
                <tbody>{list.map(r => (
                  <tr key={r.plan.id}>
                    <td><Link to={`/report/${r.plan.id}`}><b>{r.plan.title}</b></Link><span className="src"> {r.plan.plan_number}</span></td>
                    <td style={{ color: VERDICT_COLOR[r.r.verdict], fontWeight: 600 }}>{VERDICT_HE[r.r.verdict].label}</td>
                    <td className="num">{r.r.now.max}</td><td className="num">{r.r.points}</td><td className="num">{r.r.now.open}</td><td className="num">{r.r.future.max}</td>
                    <td className="src">{r.requests.filter(d => !d.future).slice(0, 3).map(d => d.doc).join(' · ')}</td>
                  </tr>
                ))}</tbody>
              </table>
            </section>
          );
        })}
        <section className="rp-sec"><h2>מידע כללי שחסר</h2><ul className="rp-list">{GENERAL_GAPS.map(x => <li key={x}>{x}</li>)}</ul></section>
        <footer className="rp-foot src">לכל תוכנית יש דוח מלא, עם כל 44 המדדים ואיך כל אחד נבדק: לחיצה על שם התוכנית.</footer>
      </main>
    </div>
  );
}
