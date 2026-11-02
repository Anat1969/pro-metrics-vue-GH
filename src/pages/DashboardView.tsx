import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { INDICATORS, CHAPTERS, TOPICS, CHAPTER_HEX, CHAPTER_META, TOTAL_MAX_SCORE, STATUS_LABELS, type IndicatorData, type Project } from '@/data/indicators';
import { calcFinalScore, achievableMax, countEvaluated, chapterEarnedScore, chapterMaxScore, chapterPctOfMax, matchesHebrew } from '@/lib/scoring';
import { isDemo } from '@/lib/demo';
import TopBar from '@/components/TopBar';
import Rose from '@/components/Rose';
import Selector from '@/components/Selector';
import IndicatorPanel from '@/components/IndicatorPanel';
import EvaluationPanel from '@/components/EvaluationPanel';
import Timeline from '@/components/Timeline';
import NewProjectModal, { type NewProjectData } from '@/components/NewProjectModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AppProps } from '@/App';
import type { MenuItem } from '@/components/AIMenu';

type Sort = 'booklet' | 'open' | 'score_desc' | 'status' | 'recent';
const SORTS: { v: Sort; label: string }[] = [
  { v: 'booklet', label: 'סדר החוברת' },
  { v: 'open', label: 'נקודות פתוחות' },
  { v: 'score_desc', label: 'ניקוד, מהגבוה' },
  { v: 'status', label: 'סטטוס' },
  { v: 'recent', label: 'עודכן לאחרונה' },
];
type Pane = 'rose' | 'list' | 'detail';
const hhmm = (t: number) => new Date(t).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

// דוח Word נטען רק כשמבקשים אותו, כדי שהדף ייטען מהר.
const downloadReport = (p: Project) => import('@/lib/export').then(m => m.downloadReport(p));

export default function DashboardView({ projects, setProjects, saved }: AppProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const project = projects.find(p => p.id === id);

  // המצב נשמר בכתובת: מדד נבחר, תצוגה, פרקים ונושאים. "העתקת קישור" פותחת את אותו מצב.
  const selected = params.get('i');
  const view = params.get('v') === 'log' ? 'log' : 'map';
  const chapters = params.get('ch')?.split('|').filter(Boolean) ?? [];
  const topics = params.get('t')?.split('|').filter(Boolean) ?? [];
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('booklet');
  const [pane, setPane] = useState<Pane>(selected ? 'detail' : 'rose');
  const [newOpen, setNewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };
  const select = (iid: string | null) => { patch({ i: iid }); if (iid) setPane('detail'); };

  const visibleTopics = TOPICS.filter(t => !chapters.length || chapters.includes(INDICATORS.find(i => i.topic === t)!.chapter));
  const filtered = useMemo(() => {
    if (!project) return [];
    const q = search.trim();
    const num = /^\d+$/.test(q) ? parseInt(q, 10) : NaN;
    let list = INDICATORS.filter(i =>
      (!chapters.length || chapters.includes(i.chapter)) &&
      (!topics.length || topics.includes(i.topic)) &&
      (!q || INDICATORS.indexOf(i) + 1 === num || matchesHebrew(`${i.titleHe} ${i.topic} ${i.guidanceHe}`, q)));
    const d = (i: typeof INDICATORS[0]) => project.indicators[i.id];
    const order = { completed: 0, in_progress: 1, not_started: 2, not_relevant: 3 } as const;
    if (sort === 'open') list = [...list].sort((a, b) => (b.maxScore - (d(b)?.score ?? 0)) * (d(b)?.status === 'not_relevant' ? 0 : 1) - (a.maxScore - (d(a)?.score ?? 0)) * (d(a)?.status === 'not_relevant' ? 0 : 1));
    if (sort === 'score_desc') list = [...list].sort((a, b) => (d(b)?.score ?? 0) - (d(a)?.score ?? 0));
    if (sort === 'status') list = [...list].sort((a, b) => order[d(a)?.status ?? 'not_started'] - order[d(b)?.status ?? 'not_started']);
    if (sort === 'recent') list = [...list].sort((a, b) => (d(b)?.lastUpdated ?? '').localeCompare(d(a)?.lastUpdated ?? ''));
    return list;
  }, [project, chapters, topics, search, sort]);
  const highlight = useMemo(() => (chapters.length || topics.length || search.trim() ? new Set(filtered.map(i => i.id)) : null), [filtered, chapters.length, topics.length, search]);

  const savedLabel = saved.error ? 'לא נשמר. הדפדפן חוסם שמירה.' : saved.at ? `נשמר ${hhmm(saved.at)}` : 'נשמר אוטומטית';

  const menuItems: MenuItem[] = project ? [
    { label: 'ייצוא דוח Word', hint: 'לצירוף לתיק התכנון', onSelect: () => downloadReport(project) },
    { label: 'פרויקט חדש', onSelect: () => setNewOpen(true) },
    { label: 'מחיקת הפרויקט', hint: project.name, onSelect: () => setConfirmDelete(true) },
  ] : [];

  if (!project) {
    return (
      <div className="app-shell">
        <TopBar tabs={[{ label: 'בית', to: '/', current: false }]} menuItems={[]} />
        <main className="empty" style={{ placeSelf: 'center', textAlign: 'center' }}>
          <p><b>הפרויקט לא נמצא בדפדפן הזה.</b></p>
          <p>פרויקטים נשמרים בדפדפן שבו נוצרו. אפשר לפתוח פרויקט אחר או ליצור חדש.</p>
          <p><Link className="press btn btn-solid" to="/">לכל הפרויקטים</Link></p>
        </main>
      </div>
    );
  }

  const update = (iid: string, data: IndicatorData) =>
    setProjects(prev => prev.map(p => (p.id === project.id ? { ...p, indicators: { ...p.indicators, [iid]: data } } : p)));
  const create = (data: NewProjectData) => {
    const p: Project = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString(), indicators: {} };
    setProjects(prev => [...prev, p]);
    setNewOpen(false);
    navigate(`/project/${p.id}`);
  };

  const score = calcFinalScore(project);
  const max = achievableMax(project);
  const n = countEvaluated(project);
  const ind = selected ? INDICATORS.find(i => i.id === selected) : null;
  const base = `/project/${project.id}`;

  return (
    <div className="app-shell">
      <TopBar
        tabs={[
          { label: 'בית', to: '/', current: false },
          { label: 'שושנת המדדים', to: base, current: view === 'map' },
          { label: 'יומן שינויים', to: `${base}?v=log`, current: view === 'log' },
        ]}
        search={{ value: search, onChange: setSearch, placeholder: 'חיפוש מדד: שם, נושא או מספר' }}
        menuItems={menuItems}
        status={savedLabel}
      />

      <div className="dash">
        {/* ── כותרת הפרויקט ── */}
        <header className="dash-head">
          <div style={{ minWidth: 0 }}>
            <p className="crumbs"><Link to="/">פרויקטים</Link> › {project.city}</p>
            <h1 className="dash-title">{project.name}{isDemo(project) && <span className="demo-tag">לדוגמה, ניקוד להמחשה</span>}</h1>
            <p className="src">{[project.city, project.compound, project.lot, String(project.year), `${project.manager}, ${project.role}`].filter(Boolean).join(' · ')}</p>
          </div>
          <dl className="kpis">
            <div><dt className="lbl">ציון</dt><dd><bdi className="num kpi-big">{score}</bdi><span className="src"> / {TOTAL_MAX_SCORE}</span></dd></div>
            <div><dt className="lbl">מתוך האפשרי</dt><dd><bdi className="num kpi">{max ? Math.round((score / max) * 100) : 0}%</bdi></dd></div>
            <div><dt className="lbl">הוערכו</dt><dd><bdi className="num kpi">{n}/{INDICATORS.length}</bdi></dd></div>
            <div className="kpi-save"><dt className="lbl">שמירה</dt><dd className="src" aria-live="polite">{savedLabel}</dd></div>
          </dl>
          <button className="press btn" onClick={() => downloadReport(project)}>ייצוא דוח Word</button>
        </header>

        {/* נייד: לשונית אחת בכל פעם, במקום גלילה ארוכה */}
        <div className="panes-switch" role="tablist" aria-label="תצוגה">
          {([['rose', 'שושנה'], ['list', 'רשימה'], ['detail', ind ? 'המדד' : 'הערכה']] as [Pane, string][]).map(([k, l]) => (
            <button key={k} role="tab" className="chip" aria-pressed={pane === k} aria-selected={pane === k} onClick={() => setPane(k)}>{l}</button>
          ))}
        </div>

        <main className="dash-main" data-pane={pane}>
          {/* ── ימין: סינון ורשימה ── */}
          <section className="card dash-list" aria-label="רשימת המדדים">
            <div className="dash-filters">
              <Selector label="פרק" options={CHAPTERS} value={chapters} colorOf={c => CHAPTER_HEX[c]}
                countOf={c => INDICATORS.filter(i => i.chapter === c).length}
                onChange={v => patch({ ch: v.join('|') || null, t: null })} />
              <Selector label="נושא" options={visibleTopics} value={topics.filter(t => visibleTopics.includes(t as typeof TOPICS[number]))}
                onChange={v => patch({ t: v.join('|') || null })} />
              <div className="list-meta">
                <span className="src"><bdi className="num" style={{ color: '#1A1A18' }}>{filtered.length}</bdi> מדדים{highlight ? ' מסוננים' : ''}</span>
                <label className="src">מיון{' '}
                  <select className="field sort" value={sort} onChange={e => setSort(e.target.value as Sort)}>
                    {SORTS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="empty"><p><b>אין מדד שמתאים.</b></p><p>נסו מילה אחרת, או לחצו "הכול" כדי לאפס את הסינון.</p></div>
            ) : (
              <ul className="scroll-in ind-list">
                {filtered.map(i => {
                  const d = project.indicators[i.id];
                  const st = d?.status ?? 'not_started';
                  const s = d?.score ?? 0;
                  const c = CHAPTER_HEX[i.chapter];
                  return (
                    <li key={i.id}>
                      <button className="ind-row" aria-current={selected === i.id ? 'true' : undefined} onClick={() => select(i.id)}>
                        <bdi className="num ind-n" style={{ color: c }}>{String(INDICATORS.indexOf(i) + 1).padStart(2, '0')}</bdi>
                        <span className="ind-row-title">{i.titleHe}</span>
                        <span className="ind-row-bar" aria-hidden="true" title={STATUS_LABELS[st]}>
                          {Array.from({ length: i.maxScore }, (_, k) => (
                            <span key={k} style={{ background: st !== 'not_started' && st !== 'not_relevant' && k < s ? c : undefined }} className={st === 'not_relevant' ? 'nr' : ''} />
                          ))}
                        </span>
                        <bdi className="num ind-row-score">{st === 'not_started' ? '—' : st === 'not_relevant' ? 'לא רל׳' : `${s}/${i.maxScore}`}</bdi>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── מרכז: מוקד אחד ── */}
          <section className="dash-focus" aria-label={view === 'log' ? 'יומן שינויים' : 'שושנת המדדים'}>
            {view === 'log' ? (
              <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Timeline project={project} onSelect={select} />
              </div>
            ) : (
              <>
                <div className="rose-wrap">
                  <Rose project={project} selected={selected} highlight={highlight} onSelect={select} />
                </div>
                <p className="rose-legend src">
                  כל פלח הוא <b>מדד</b>. רוחב הפלח הוא <b>המשקל</b> שלו, והשטח הצבוע הוא <b>הציון</b>. פסים: לא רלוונטי.
                </p>
                <div className="chapter-strip">
                  {CHAPTERS.map(ch => {
                    const on = chapters.length === 1 && chapters[0] === ch;
                    return (
                      <button key={ch} className="press chapter-mini" aria-pressed={on} onClick={() => patch({ ch: on ? null : ch, t: null })}
                        style={{ borderTop: `3px solid ${CHAPTER_HEX[ch]}`, ...(on ? { background: '#fff', color: '#1A1A18', borderColor: CHAPTER_HEX[ch] } : {}) }}>
                        <span className="lbl" style={{ color: CHAPTER_HEX[ch] }}>{CHAPTER_META[ch].letter} · {ch}</span>
                        <span><bdi className="num" style={{ fontSize: 20 }}>{chapterEarnedScore(project, ch)}</bdi><span className="src"> / {chapterMaxScore(ch)}</span></span>
                        <span className="mini-bar"><span style={{ width: `${chapterPctOfMax(project, ch)}%`, background: CHAPTER_HEX[ch] }} /></span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── שמאל: פרטים בטור צד ── */}
          <aside className="card dash-aside scroll-in">
            {ind ? (
              <IndicatorPanel key={ind.id} indicator={ind} data={project.indicators[ind.id]} onChange={d => update(ind.id, d)} onNav={iid => select(iid)} savedLabel={savedLabel} />
            ) : (
              <EvaluationPanel project={project} onSelect={select} />
            )}
          </aside>
        </main>
      </div>

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={create} />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>למחוק את "{project.name}"?</AlertDialogTitle>
            <AlertDialogDescription>כל הניקוד, ההערות והיומן יימחקו מהדפדפן. אי אפשר לשחזר. כדאי לייצא דוח לפני.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="press">ביטול</AlertDialogCancel>
            <AlertDialogAction className="press" style={{ background: '#A32D2D', color: '#fff' }}
              onClick={() => { setProjects(prev => prev.filter(p => p.id !== project.id)); navigate('/'); }}>מחיקה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
