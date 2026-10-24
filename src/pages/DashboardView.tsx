import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { INDICATORS, TOTAL_MAX_SCORE, type Project, type IndicatorData } from '@/data/indicators';
import { calcFinalScore } from '@/lib/scoring';
import { downloadReport } from '@/lib/export';
import FilterBar, { type SortOption } from '@/components/FilterBar';
import CategoryScoreStrip from '@/components/CategoryScoreStrip';
import IndicatorCard from '@/components/IndicatorCard';
import IndicatorModal from '@/components/IndicatorModal';
import Timeline from '@/components/Timeline';
import Recommendations from '@/components/Recommendations';
import { levelsFor } from '@/lib/autoscore';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { ArrowRight, Download, FileText, Clock, Box, Building, Sparkles } from 'lucide-react';

const NeighborhoodScene = lazy(() => import('@/components/three/NeighborhoodScene'));
const ScoreCity = lazy(() => import('@/components/three/ScoreCity'));

type DashTab = 'indicators' | 'twin' | 'city' | 'recs' | 'timeline';

const SceneFallback = () => (
  <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
    <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
    טוען סצנה תלת-ממדית…
  </div>
);

interface DashboardViewProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

const DashboardView: React.FC<DashboardViewProps> = ({ projects, setProjects }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === id);

  const [sortBy, setSortBy] = useState<SortOption>('booklet');
  const [activeChapter, setActiveChapter] = useState('הכל');
  const [activeTopic, setActiveTopic] = useState('הכל');
  const [search, setSearch] = useState('');
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashTab>('indicators');
  const levels = useMemo(() => levelsFor(project ?? null), [project]);
  const openIndicator = useCallback((indId: string) => setSelectedIndicator(indId), []);

  const score = project ? calcFinalScore(project) : 0;
  const evaluated = project ? Object.values(project.indicators).filter(d => d.status !== 'not_started').length : 0;
  const totalIndicators = INDICATORS.length;
  const progressPct = Math.round((evaluated / totalIndicators) * 100);

  const filteredIndicators = useMemo(() => {
    if (!project) return [];
    let list = [...INDICATORS];

    if (activeChapter !== 'הכל') list = list.filter(i => i.chapter === activeChapter);
    if (activeTopic !== 'הכל') list = list.filter(i => i.topic === activeTopic);
    if (search) {
      const s = search.trim();
      const num = parseInt(s, 10);
      list = list.filter(i => {
        if (!isNaN(num) && parseInt(i.id.replace(/\D/g, ''), 10) === num) return true;
        return i.titleHe.includes(s) || i.topic.includes(s) || i.chapter.includes(s) || i.guidanceHe.includes(s);
      });
    }

    const getScore = (ind: typeof INDICATORS[0]) => project.indicators[ind.id]?.score ?? 0;
    const getStatus = (ind: typeof INDICATORS[0]) => project.indicators[ind.id]?.status ?? 'not_started';
    const getUpdated = (ind: typeof INDICATORS[0]) => project.indicators[ind.id]?.lastUpdated ?? '';

    switch (sortBy) {
      case 'booklet': list.sort((a, b) => INDICATORS.indexOf(a) - INDICATORS.indexOf(b)); break;
      case 'topic': list.sort((a, b) => a.topic.localeCompare(b.topic, 'he')); break;
      case 'chapter': list.sort((a, b) => a.chapter.localeCompare(b.chapter, 'he')); break;
      case 'status': {
        const order = { completed: 0, in_progress: 1, not_started: 2, not_relevant: 3 };
        list.sort((a, b) => (order[getStatus(a)] ?? 2) - (order[getStatus(b)] ?? 2));
        break;
      }
      case 'score_desc': list.sort((a, b) => getScore(b) - getScore(a)); break;
      case 'score_asc': list.sort((a, b) => getScore(a) - getScore(b)); break;
      case 'chronological': list.sort((a, b) => getUpdated(b).localeCompare(getUpdated(a))); break;
    }

    return list;
  }, [activeChapter, activeTopic, search, sortBy, project]);

  const handleSaveIndicator = (indicatorId: string, data: IndicatorData) => {
    if (!project) return;
    setProjects(prev =>
      prev.map(p =>
        p.id === project.id
          ? { ...p, indicators: { ...p.indicators, [indicatorId]: data } }
          : p
      )
    );
    setSelectedIndicator(null);
  };

  const selectedInd = selectedIndicator ? INDICATORS.find(i => i.id === selectedIndicator) : null;

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <p className="text-2xl text-muted-foreground mb-6">פרויקט לא נמצא</p>
          <Button onClick={() => navigate('/')} className="text-base">חזרה לפרויקטים</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ───── Header ───── */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 text-muted-foreground hover:text-foreground text-sm">
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">כל הפרויקטים</span>
            </Button>
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-px h-8 bg-border" />
              <div>
                <h2 className="text-base font-bold text-foreground leading-tight">{project.name}</h2>
                <p className="text-sm text-muted-foreground">{project.city} · {project.year}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Score pill with gradient border */}
            <div className="gradient-border flex items-baseline gap-1.5 rounded-xl px-4 py-2 bg-card">
              <span className="font-mono-label text-3xl font-bold text-primary">{score}</span>
              <span className="text-sm text-muted-foreground">/{TOTAL_MAX_SCORE}</span>
            </div>
            <Button
              onClick={() => { downloadReport(project); }}
              variant="outline"
              size="sm"
              className="gap-2 text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">ייצא דוח</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Progress bar with gradient */}
        <div className="h-1 bg-muted">
          <div
            className="h-full transition-all duration-700 ease-out rounded-l-full"
            style={{
              width: `${progressPct}%`,
              background: 'var(--gradient-hero)',
            }}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-10 space-y-10">
        {/* ───── Tabs ───── */}
        <nav className="flex gap-1.5 bg-muted/50 p-1.5 rounded-xl w-full sm:w-fit overflow-x-auto">
          {([
            { key: 'indicators', label: 'מדדים', icon: FileText, extra: `${evaluated}/${totalIndicators}` },
            { key: 'twin', label: 'תאום דיגיטלי 3D', icon: Box },
            { key: 'city', label: 'עיר הציונים 3D', icon: Building },
            { key: 'recs', label: 'המלצות חכמות', icon: Sparkles },
            { key: 'timeline', label: 'טיימליין', icon: Clock },
          ] as { key: DashTab; label: string; icon: React.ElementType; extra?: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === t.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.extra && <span className="font-mono-label text-xs text-muted-foreground">{t.extra}</span>}
            </button>
          ))}
        </nav>

        {activeTab === 'indicators' ? (
          <div className="space-y-10 animate-fade-in">
            {/* Empty state */}
            {evaluated === 0 && (
              <div className="gradient-border rounded-xl p-6 bg-accent text-center">
                <p className="text-base text-accent-foreground font-medium">
                  🚀 טרם הוערך אף מדד — לחץ על כל כרטיס להתחיל בהערכה
                </p>
              </div>
            )}

            {/* ───── Chapter Scores ───── */}
            <section className="section-frame">
              <div className="section-frame-header">
                <div>
                  <h3 className="section-title">סיכום לפי פרקים</h3>
                  <p className="section-rationale">תמונת מצב מהירה של ההתקדמות בכל אחד משלושת פרקי החוברת — תשתית, מרחב ומשאבים</p>
                </div>
              </div>
              <CategoryScoreStrip project={project} />
            </section>

            {/* ───── Filters ───── */}
            <section className="section-frame">
              <div className="section-frame-header">
                <div>
                  <h3 className="section-title">סינון וחיפוש</h3>
                  <p className="section-rationale">מצא מדד ספציפי לפי שם, מספר, נושא או פרק — או מיין לפי סטטוס וניקוד</p>
                </div>
              </div>
              <FilterBar
                sortBy={sortBy} onSortChange={setSortBy}
                activeChapter={activeChapter} onChapterChange={setActiveChapter}
                activeTopic={activeTopic} onTopicChange={setActiveTopic}
                search={search} onSearchChange={setSearch}
              />
            </section>

            {/* ───── Indicator Grid ───── */}
            <section className="section-frame">
              <div className="section-frame-header">
                <div>
                  <h3 className="section-title">
                    רשימת מדדים
                    <span className="text-sm font-normal text-muted-foreground mr-2">
                      ({filteredIndicators.length} תוצאות)
                    </span>
                  </h3>
                  <p className="section-rationale">כל 44 המדדים מהחוברת — לחץ על כרטיס כדי לעדכן ניקוד, סטטוס והערות</p>
                </div>
              </div>
              {filteredIndicators.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground surface-inset">
                  <p className="text-base">לא נמצאו מדדים לסינון הנבחר</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredIndicators.map((ind, i) => (
                    <div key={ind.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                      <IndicatorCard
                        indicator={ind}
                        data={project.indicators[ind.id]}
                        index={INDICATORS.indexOf(ind)}
                        onClick={() => setSelectedIndicator(ind.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'twin' ? (
          <div className="animate-fade-in space-y-5">
            <div className="section-frame">
              <div className="section-frame-header">
                <div>
                  <h3 className="section-title">תאום דיגיטלי של השכונה</h3>
                  <p className="section-rationale">
                    כל מדד מומחש באובייקט חי — עצים, אוטובוסים, פאנלים סולאריים, נגר, תאורה ועוד — שגדל ומשתנה לפי הניקוד.
                    מסלול השמש מחושב לאשדוד: בדקו צל בקיץ וזכויות שמש בחורף. לחצו על אובייקט כדי לפתוח את המדד.
                  </p>
                </div>
              </div>
            </div>
            <div className="h-[72vh] min-h-[480px] rounded-2xl overflow-hidden border border-border shadow-lg bg-muted">
              <Suspense fallback={<SceneFallback />}>
                <NeighborhoodScene levels={levels} highlightId={selectedIndicator} onSelect={openIndicator} />
              </Suspense>
            </div>
          </div>
        ) : activeTab === 'city' ? (
          <div className="animate-fade-in space-y-5">
            <div className="section-frame">
              <div className="section-frame-header">
                <div>
                  <h3 className="section-title">עיר הציונים</h3>
                  <p className="section-rationale">44 מגדלים, שלושה רבעים — גובה כל מגדל הוא הניקוד שהושג מול המקסימום. לחצו על מגדל לעדכון.</p>
                </div>
              </div>
            </div>
            <div className="h-[68vh] min-h-[440px] rounded-2xl overflow-hidden border border-border shadow-lg">
              <Suspense fallback={<SceneFallback />}>
                <ScoreCity project={project} onSelect={openIndicator} />
              </Suspense>
            </div>
          </div>
        ) : activeTab === 'recs' ? (
          <div className="animate-fade-in space-y-5">
            <div className="section-frame">
              <div className="section-frame-header">
                <div>
                  <h3 className="section-title">המלצות חכמות ותרחישי "מה אם"</h3>
                  <p className="section-rationale">ניתוח אוטומטי של הנקודות הפתוחות, מדורג לפי תמורה למאמץ — עם הצעד המעשי הבא לכל מדד</p>
                </div>
              </div>
            </div>
            <Recommendations project={project} onOpen={openIndicator} />
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="section-frame">
              <div className="section-frame-header">
                <div>
                  <h3 className="section-title">טיימליין שינויים</h3>
                  <p className="section-rationale">מעקב כרונולוגי אחר כל עדכון ציון — שקיפות מלאה על תהליך ההערכה</p>
                </div>
              </div>
            </div>
            <Timeline project={project} />
          </div>
        )}
      </main>

      {/* Mobile sticky export */}
      <div className="fixed bottom-4 left-4 right-4 sm:hidden z-50">
        <Button
          onClick={() => { downloadReport(project); }}
          className="w-full gap-2 shadow-lg text-base h-12"
          size="lg"
        >
          <Download className="w-5 h-5" />
          ייצא דוח
        </Button>
      </div>

      <IndicatorModal
        open={!!selectedIndicator}
        indicator={selectedInd ?? null}
        data={selectedIndicator ? project.indicators[selectedIndicator] : undefined}
        project={project}
        onClose={() => setSelectedIndicator(null)}
        onSave={handleSaveIndicator}
      />
    </div>
  );
};

export default DashboardView;
