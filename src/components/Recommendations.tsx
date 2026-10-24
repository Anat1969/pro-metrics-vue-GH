import React, { useMemo } from 'react';
import { CHAPTER_HEX, TOTAL_MAX_SCORE, type Project } from '@/data/indicators';
import { EFFORT_LABELS } from '@/data/practices';
import { calcFinalScore } from '@/lib/scoring';
import { projectedScore, recommendations } from '@/lib/autoscore';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Zap, ArrowLeft } from 'lucide-react';

interface RecommendationsProps {
  project: Project;
  onOpen: (indicatorId: string) => void;
}

const EFFORT_STYLE: Record<1 | 2 | 3, string> = {
  1: 'bg-score-high/15 text-score-high',
  2: 'bg-score-mid/15 text-score-mid',
  3: 'bg-score-low/15 text-score-low',
};

const Recommendations: React.FC<RecommendationsProps> = ({ project, onOpen }) => {
  const recs = useMemo(() => recommendations(project), [project]);
  const score = calcFinalScore(project);
  const quickWins = recs.filter(r => r.effort === 1);
  const top5 = projectedScore(project, recs.slice(0, 5));
  const top10 = projectedScore(project, recs.slice(0, 10));
  const quick = projectedScore(project, quickWins);

  const scenarios = [
    { label: 'מצב נוכחי', value: score, icon: null },
    { label: `כל ה"מהירים" (${quickWins.length})`, value: quick, icon: Zap },
    { label: '5 ההמלצות הראשונות', value: top5, icon: TrendingUp },
    { label: '10 ההמלצות הראשונות', value: top10, icon: Sparkles },
  ];

  if (recs.length === 0) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="text-2xl font-bold mb-2">🏆 כל המדדים הרלוונטיים מוצו במלואם</p>
        <p className="text-muted-foreground">אין נקודות פתוחות להשגה</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* What-if scenarios */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map((s, i) => (
          <div key={i} className="card-elevated p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {s.icon && <s.icon className="w-4 h-4 text-primary" />}
              {s.label}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono-label text-3xl font-bold text-foreground">{s.value}</span>
              <span className="text-sm text-muted-foreground">/{TOTAL_MAX_SCORE}</span>
              {i > 0 && <span className="text-sm font-semibold text-score-high mr-2">+{s.value - score}</span>}
            </div>
            <div className="h-2 bg-muted rounded-full mt-3 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.value / TOTAL_MAX_SCORE) * 100}%`, background: 'var(--gradient-hero)' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Ranked list */}
      <div className="space-y-3">
        {recs.slice(0, 15).map((r, i) => (
          <div key={r.indicator.id} className="card-elevated p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 sm:w-14 shrink-0">
              <span className="font-mono-label text-2xl font-bold text-muted-foreground/60">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHAPTER_HEX[r.indicator.chapter] }} />
                <h4 className="font-bold text-foreground">{r.indicator.titleHe}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${EFFORT_STYLE[r.effort]}`}>{EFFORT_LABELS[r.effort]}</span>
              </div>
              {r.nextCheck && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground/80">הצעד הבא: </span>{r.nextCheck}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <div className="font-mono-label text-xl font-bold text-score-high">+{r.gap}</div>
                <div className="text-[11px] text-muted-foreground">נקודות פתוחות</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onOpen(r.indicator.id)} className="gap-1">
                לבדיקה <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        הדירוג מחושב אוטומטית: נקודות פתוחות ÷ מאמץ יישום משוער. הניקוד בפועל נקבע לפי ספי החוברת.
      </p>
    </div>
  );
};

export default Recommendations;
