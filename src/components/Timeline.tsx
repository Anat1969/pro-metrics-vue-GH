import React, { useState } from 'react';
import { type Project, type HistoryEntry, CHAPTERS, INDICATORS } from '@/data/indicators';

interface TimelineProps {
  project: Project;
}

const Timeline: React.FC<TimelineProps> = ({ project }) => {
  const [filterChapter, setFilterChapter] = useState('הכל');

  const allHistory: HistoryEntry[] = [];
  Object.values(project.indicators).forEach(d => {
    d.history.forEach(h => allHistory.push(h));
  });

  allHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filtered = filterChapter === 'הכל'
    ? allHistory
    : allHistory.filter(h => {
        const ind = INDICATORS.find(i => i.id === h.indicatorId);
        return ind?.chapter === filterChapter;
      });

  const pillClass = (active: boolean) => `pill ${active ? 'pill-active' : ''}`;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button className={pillClass(filterChapter === 'הכל')} onClick={() => setFilterChapter('הכל')}>הכל</button>
        {CHAPTERS.map(ch => (
          <button key={ch} className={pillClass(filterChapter === ch)} onClick={() => setFilterChapter(ch)}>{ch}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground surface-inset">
          <p>אין רשומות בטיימליין עדיין</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h, i) => {
            const ind = INDICATORS.find(ind => ind.id === h.indicatorId);
            const maxScore = ind?.maxScore ?? 0;
            return (
              <div
                key={i}
                className="card-elevated p-4 flex items-start gap-4 animate-slide-in-right"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <div className="flex-shrink-0 w-1 self-stretch rounded-full bg-primary" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{h.indicatorTitle}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono-label text-xs text-muted-foreground">{h.oldScore}/{maxScore}</span>
                    <span className="text-primary text-xs">←</span>
                    <span className="font-mono-label text-xs text-primary font-bold">{h.score}/{maxScore}</span>
                  </div>
                  {h.notes && <p className="text-xs text-muted-foreground mt-1.5">{h.notes}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono-label">
                  {new Date(h.timestamp).toLocaleString('he-IL')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Timeline;
