import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INDICATORS, TOTAL_MAX_SCORE, type Project } from '@/data/indicators';
import { calcFinalScore, countEvaluated } from '@/lib/scoring';
import { makeDemoProject, isDemo } from '@/lib/demo';
import { GATES, MEASURE_APP, VERDICT_HE, type Verdict } from '@/lib/plans';
import { usePlans, type PlanRow } from '@/lib/usePlans';
import TopBar from '@/components/TopBar';
import IsoGate, { VERDICT_COLOR } from '@/components/IsoGate';
import Rich from '@/components/Rich';
import NewProjectModal, { type NewProjectData } from '@/components/NewProjectModal';
import type { AppProps } from '@/App';
import type { MenuItem } from '@/components/AIMenu';

const hhmm = (t: number) => new Date(t).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
const TONE: Record<Verdict, string> = { pass: 'tone-solution', evidence: 'tone-warn', fail: 'tone-problem' };

export default function HomeView({ projects, setProjects, saved }: AppProps) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [hover, setHover] = useState<PlanRow | null>(null);
  const { rows, targets, live, ready } = usePlans();

  const create = (data: NewProjectData) => {
    const p: Project = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString(), indicators: {} };
    setProjects(prev => [...prev, p]);
    setModalOpen(false);
    navigate(`/project/${p.id}`);
  };
  const openDemo = () => {
    const existing = projects.find(isDemo);
    if (existing) return navigate(`/project/${existing.id}`);
    const demo = makeDemoProject();
    setProjects(prev => [...prev, demo]);
    navigate(`/project/${demo.id}`);
  };

  const menuItems: MenuItem[] = [
    { label: 'בדיקה ידנית חדשה', hint: 'לתוכנית שעוד לא במערכת', onSelect: () => setModalOpen(true) },
    { label: 'בדיקה לדוגמה', hint: 'אשדוד, ניקוד להמחשה', onSelect: openDemo },
  ];

  const upcoming = rows.filter(r => r.gate !== 'after');
  const n = (v: Verdict) => upcoming.filter(r => r.r.verdict === v).length;
  const nearest = [...upcoming].filter(r => r.r.verdict !== 'pass').sort((a, b) => a.r.need - b.r.need)[0];

  return (
    <div className="app-shell">
      <TopBar
        tabs={[{ label: 'בית', to: '/', current: true }, { label: 'תוכניות בעיר', to: '/plans', current: false }, ...projects.slice(-2).map(p => ({ label: p.name, to: `/project/${p.id}`, current: false }))]}
        menuItems={menuItems}
        status={saved.at ? `נשמר ${hhmm(saved.at)}` : ''}
      />

      <main className="home">
        {/* ── טור ימין: השאלה, התשובה במספרים, ומה עושים ── */}
        <section className="home-text">
          <p className="lbl rise"><b style={{ color: '#1A1A18' }}>עיריית אשדוד</b> <span className="latin">Ashdod Municipality</span> · בקרת תוכניות התחדשות עירונית</p>
          <h1 className="home-title rise" style={{ animationDelay: '60ms' }}>שער היעדים</h1>
          <Rich as="p" className="home-insight rise">{'**האם התוכנית עומדת ביעד, לפני שמאשרים?**'}</Rich>
          <p className="home-explain rise" style={{ animationDelay: '120ms' }}>
            כל תוכנית התחדשות נבדקת מול יעד השלב שלה: <b>אישור תב"ע</b> או <b>אישור תוכנית בינוי</b>.
            <br />
            התשובה אומרת גם <b>מה לדרוש מהיזם</b> לפני האישור.
          </p>
          <div className="home-cta rise" style={{ animationDelay: '160ms' }}>
            <button className="press btn btn-solid" onClick={() => navigate('/plans')}>לוח התוכניות בעיר</button>
            <button className="press btn" onClick={() => setModalOpen(true)}>בדיקה ידנית של תוכנית</button>
          </div>

          <div className="home-tones rise" style={{ animationDelay: '200ms' }} aria-live="polite">
            {(['pass', 'evidence', 'fail'] as Verdict[]).map(v => (
              <button key={v} className={`tone ${TONE[v]} tone-btn`} onClick={() => navigate(`/plans?v=${v}`)}>
                <span className="tone-num"><bdi className="num" style={{ color: VERDICT_COLOR[v] }}>{ready ? n(v) : '–'}</bdi></span>
                <h4>{VERDICT_HE[v].label}</h4>
                <p>{v === 'pass' ? 'אפשר לאשר.' : v === 'evidence' ? 'לדרוש מסמכים.' : 'לדרוש שינוי תכנוני.'}</p>
              </button>
            ))}
          </div>
          {nearest && (
            <Rich as="p" className="home-near">{`==הכי קרובה ליעד: ${nearest.plan.title}==, חסרות לה **${nearest.r.need}** נקודות ל${GATES[nearest.gate].label}.`}</Rich>
          )}

          {/* שתי אפליקציות, שתי שאלות */}
          <div className="two-apps card">
            <div>
              <span className="lbl">כאן</span>
              <h3>שער היעדים</h3>
              <Rich as="p">{'שואל **"לאשר עכשיו?"** משווה כל תוכנית ליעד של השלב, ואומר מה לדרוש.'}</Rich>
            </div>
            <a href={MEASURE_APP} target="_blank" rel="noreferrer" className="two-apps-other">
              <span className="lbl">אפליקציה אחות</span>
              <h3>מכשיר המדידה</h3>
              <Rich as="p">{'שואל **"כמה התוכנית שווה?"** קורא את מסמכי התוכנית ומנקד כל מדד, עם ציטוט.'}</Rich>
              <span className="src">shchuna360.vercel.app ←</span>
            </a>
          </div>

          <div className="home-projects card">
            <div className="home-projects-head">
              <h2 className="panel-title">בדיקות ידניות</h2>
              <span className="lbl">לתוכנית שעוד לא במערכת · בדפדפן הזה</span>
            </div>
            {projects.length === 0 ? (
              <div className="empty">
                <Rich as="p">{`**אין עדיין בדיקות ידניות.** אפשר לנקד ${INDICATORS.length} מדדים ביד, או לפתוח `}</Rich>
                <p><button className="press btn" style={{ marginTop: 6 }} onClick={openDemo}>בדיקה לדוגמה</button></p>
              </div>
            ) : (
              <ul className="scroll-in proj-list">
                {[...projects].reverse().map(p => {
                  const s = calcFinalScore(p);
                  return (
                    <li key={p.id}>
                      <button className="proj-row" onClick={() => navigate(`/project/${p.id}`)}>
                        <span className="proj-name"><b>{p.name}</b> <span className="src">{p.city}{isDemo(p) ? ' · לדוגמה' : ''}</span></span>
                        <span className="proj-bar" aria-hidden="true"><span style={{ width: `${(s / TOTAL_MAX_SCORE) * 100}%` }} /></span>
                        <span className="proj-score"><bdi className="num">{s}</bdi><span className="src">/{TOTAL_MAX_SCORE}</span></span>
                        <span className="src proj-n"><bdi className="num" style={{ fontWeight: 500 }}>{countEvaluated(p)}/{INDICATORS.length}</bdi> מדדים</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ── טור שמאל: מוקד אחד. העיר מול זכוכית היעד ── */}
        <section className="home-visual">
          <figure className="card blueprint home-iso">
            <div className="home-iso-svg">
              {ready ? <IsoGate rows={rows} targets={targets} onHover={setHover} onSelect={id => navigate(`/plans?p=${id}`)} /> : <div className="empty"><p>טוען את התוכניות...</p></div>}
            </div>
            <figcaption aria-live="polite">
              {hover ? (
                <Rich>{`**${hover.plan.title}** · ${GATES[hover.gate].label} · **${hover.r.points}** נקודות מול יעד **${hover.r.target}** · ${VERDICT_HE[hover.r.verdict].label}`}</Rich>
              ) : (
                <Rich>{`**${rows.length}** תוכניות התחדשות באשדוד, בשורה לכל שער. **גובה** המבנה הוא הנקודות שהוכחו. **הזכוכית הצהובה** היא היעד. מבנה שעובר אותה עומד ביעד.`}</Rich>
              )}
            </figcaption>
          </figure>
          <div className="iso-legend">
            {(['pass', 'evidence', 'fail'] as Verdict[]).map(v => (
              <span key={v}><i style={{ background: VERDICT_COLOR[v] }} />{VERDICT_HE[v].label}</span>
            ))}
            <span><i className="lg-dash" />התקרה אם יוצגו כל הראיות</span>
            <span className="src">{live === 'live' ? 'נתונים חיים' : live === 'loading' ? 'מתחבר...' : 'תמונה שמורה'}</span>
          </div>
          <footer className="home-foot">
            <p className="src">הניקוד: <b>שכונה 360°</b>, גרסה <bdi>2.0</bdi>, ינואר <bdi>2025</bdi>, המועצה הישראלית לבנייה ירוקה ומשרד הבינוי והשיכון. היעד: דרגת <b>ארד</b>, <bdi>55</bdi> מתוך <bdi>120</bdi>, וניתן לשינוי.</p>
            <p className="haiku">שער אבן פתוח / קו היעד מעל הגגות / עוד קומה חסרה</p>
          </footer>
        </section>
      </main>

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={create} />
    </div>
  );
}
