import React from 'react';
import { CHAPTERS, CHAPTER_HEX, type Project } from '@/data/indicators';
import { chapterEarnedScore, chapterMaxScore, calcChapterScore } from '@/lib/scoring';

interface CategoryScoreStripProps {
  project: Project;
}

const CategoryScoreStrip: React.FC<CategoryScoreStripProps> = ({ project }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {CHAPTERS.map(ch => {
        const earned = chapterEarnedScore(project, ch);
        const max = chapterMaxScore(ch);
        const pct = calcChapterScore(project, ch);
        return (
          <div key={ch} className="card-elevated p-6">
            <p className="text-sm font-semibold text-muted-foreground mb-3">{ch}</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-label text-3xl font-bold text-foreground">{earned}</span>
              <span className="text-base text-muted-foreground">/ {max}</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: CHAPTER_HEX[ch] }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono-label">{pct}%</p>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryScoreStrip;
