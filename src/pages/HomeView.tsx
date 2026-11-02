import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INDICATORS, CHAPTERS, CHAPTER_HEX, CHAPTER_META, TOTAL_MAX_SCORE, type Project } from '@/data/indicators';
import { calcFinalScore, chapterEarnedScore, chapterMaxScore, countEvaluated } from '@/lib/scoring';
import { makeDemoProject, isDemo } from '@/lib/demo';
import TopBar from '@/components/TopBar';
import IsoRose from '@/components/IsoRose';
import Rich from '@/components/Rich';
import NewProjectModal, { type NewProjectData } from '@/components/NewProjectModal';
import type { AppProps } from '@/App';
import type { MenuItem } from '@/components/AIMenu';

const hhmm = (t: number) => new Date(t).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
const PAGES = INDICATORS.map(i => i.page);
const SPAN = Math.max(...PAGES) - Math.min(...PAGES);

export default function HomeView({ projects, setProjects, saved }: AppProps) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  // התצוגה בתלת־ממד: הפרויקט האחרון, או פרויקט לדוגמה כשאין עדיין.
  const preview = useMemo(() => {
    const sorted = [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted[0] ?? makeDemoProject();
  }, [projects]);
  const previewIsSaved = projects.some(p => p.id === preview.id);

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
    { label: 'פרויקט חדש', hint: 'שכונה, מתחם או מגרש', onSelect: () => setModalOpen(true) },
    { label: 'פרויקט לדוגמה', hint: 'אשדוד, ניקוד להמחשה', onSelect: openDemo },
  ];

  return (
    <div className="app-shell">
      <TopBar
        tabs={[{ label: 'בית', to: '/', current: true }, ...projects.slice(-3).map(p => ({ label: p.name, to: `/project/${p.id}`, current: false }))]}
        menuItems={menuItems}
        status={saved.at ? `נשמר ${hhmm(saved.at)}` : ''}
      />

      <main className="home">
        {/* ── טור ימין: מה זה, למה, ומה עושים ── */}
        <section className="home-text">
          <p className="lbl rise">כלי הערכה לתכנון שכונה בת־קיימא · <b style={{ color: '#1A1A18' }}>עיריית אשדוד</b> <span className="latin">Ashdod Municipality</span></p>
          <h1 className="home-title rise" style={{ animationDelay: '60ms' }}>שכונה <bdi className="num" style={{ fontWeight: 600 }}>360°</bdi></h1>
          <Rich as="p" className="home-insight rise">{`**${INDICATORS.length}** מדדים, **${TOTAL_MAX_SCORE}** נקודות, ומבט אחד על כל השכונה.`}</Rich>
          <p className="home-explain rise" style={{ animationDelay: '120ms' }}>
            מזינים ניקוד לכל מדד מהחוברת.
            <br />
            השושנה מראה מיד איפה השכונה חזקה, ואיפה נשארו נקודות.
          </p>
          <div className="home-cta rise" style={{ animationDelay: '160ms' }}>
            <button className="press btn btn-solid" onClick={() => setModalOpen(true)}>פרויקט חדש</button>
            <button className="press btn" onClick={openDemo}>פתיחת פרויקט לדוגמה</button>
          </div>

          <div className="home-tones rise" style={{ animationDelay: '200ms' }}>
            <div className="tone tone-problem"><h4>הבעיה</h4><Rich as="p">{`**${INDICATORS.length}** מדדים פזורים על פני **${SPAN}** עמודי חוברת. קשה לראות תמונה שלמה.`}</Rich></div>
            <div className="tone tone-solution"><h4>הפתרון</h4><Rich as="p">{'שושנה אחת: כל פלח הוא **מדד**, רוחבו לפי **משקלו**, והשטח הצבוע לפי **הציון**.'}</Rich></div>
            <div className="tone tone-insight"><h4>התובנה</h4><Rich as="p">{'==הנקודות הפתוחות הן תוכנית העבודה.== הכלי מדרג מה נשאר להשיג.'}</Rich></div>
          </div>

          <div className="home-projects card">
            <div className="home-projects-head">
              <h2 className="panel-title">הפרויקטים</h2>
              <span className="lbl">נשמרים בדפדפן הזה</span>
            </div>
            {projects.length === 0 ? (
              <div className="empty">
                <Rich as="p">{'**עוד אין פרויקטים.** שלושה צעדים, וזה עובד:'}</Rich>
                <ol className="steps">
                  <li><b>פרויקט חדש</b><span>עיר, שכונה ושם מנהל. חצי דקה.</span></li>
                  <li><b>ניקוד לכל מדד</b><span>לחיצה על מספר. השושנה מתמלאת מיד.</span></li>
                  <li><b>דוח Word</b><span>לצירוף לתיק התכנון ולוועדה.</span></li>
                </ol>
              </div>
            ) : (
              <ul className="scroll-in proj-list">
                {[...projects].reverse().map(p => {
                  const s = calcFinalScore(p);
                  const n = countEvaluated(p);
                  return (
                    <li key={p.id}>
                      <button className="proj-row" onClick={() => navigate(`/project/${p.id}`)}>
                        <span className="proj-name"><b>{p.name}</b> <span className="src">{p.city} · <bdi>{p.year}</bdi>{isDemo(p) ? ' · לדוגמה' : ''}</span></span>
                        <span className="proj-bar" aria-hidden="true"><span style={{ width: `${(s / TOTAL_MAX_SCORE) * 100}%` }} /></span>
                        <span className="proj-score"><bdi className="num">{s}</bdi><span className="src">/{TOTAL_MAX_SCORE}</span></span>
                        <span className="src proj-n"><bdi className="num" style={{ fontWeight: 500 }}>{n}/{INDICATORS.length}</bdi> מדדים</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ── טור שמאל: מוקד אחד, השכונה בתלת־ממד, ומקרא ── */}
        <section className="home-visual">
          <figure className="card blueprint home-iso">
            <div className="home-iso-svg">
              <IsoRose project={preview} onSelect={id => previewIsSaved ? navigate(`/project/${preview.id}?i=${id}`) : openDemo()} />
            </div>
            <figcaption>
              <Rich>{`**${preview.name}**, ${preview.city}${previewIsSaved && !isDemo(preview) ? '' : ' · ניקוד להמחשה'}`}</Rich>
              <Rich className="src">{' · מבנה לכל מדד. **גובה** הוא הציון, **רוחב** הוא משקל המדד. לחיצה פותחת את המדד.'}</Rich>
            </figcaption>
          </figure>

          <div className="home-chapters">
            {CHAPTERS.map(ch => {
              const n = INDICATORS.filter(i => i.chapter === ch).length;
              const earned = chapterEarnedScore(preview, ch);
              const max = chapterMaxScore(ch);
              return (
                <div key={ch} className="card chapter-card" style={{ borderTop: `3px solid ${CHAPTER_HEX[ch]}` }}>
                  <span className="lbl">פרק {CHAPTER_META[ch].letter} · {n} מדדים</span>
                  <h3 style={{ color: CHAPTER_HEX[ch] }}>{ch}</h3>
                  <p>{CHAPTER_META[ch].question}</p>
                  <p className="chapter-num"><bdi className="num">{earned}</bdi><span className="src"> / {max} נקודות</span></p>
                </div>
              );
            })}
          </div>

          <footer className="home-foot">
            <p className="src">בהשראת דיאגרמת השושנה של <b>פלורנס נייטינגייל</b> <span className="latin">Florence Nightingale</span>, <bdi>1858</bdi>: שטח הפלח מספר את הסיפור.</p>
            <p className="haiku">ארבעים וארבע / קורות אור סביב הכיכר / הצל עוד חסר</p>
          </footer>
        </section>
      </main>

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={create} />
    </div>
  );
}
