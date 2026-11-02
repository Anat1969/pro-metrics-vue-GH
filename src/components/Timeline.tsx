import React, { useState } from 'react';
import { type Project, type HistoryEntry, CHAPTERS, CHAPTER_HEX, INDICATORS } from '@/data/indicators';
import Selector from './Selector';

/** יומן השינויים: כל עדכון ציון, מהחדש לישן. */
export default function Timeline({ project, onSelect }: { project: Project; onSelect: (id: string) => void }) {
  const [chapters, setChapters] = useState<string[]>([]);
  const all: HistoryEntry[] = Object.values(project.indicators).flatMap(d => d.history);
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const chapterOf = (id: string) => INDICATORS.find(i => i.id === id)?.chapter ?? '';
  const list = chapters.length ? all.filter(h => chapters.includes(chapterOf(h.indicatorId))) : all;

  return (
    <div className="timeline">
      <div className="timeline-head">
        <h2 className="panel-title">יומן שינויים</h2>
        <span className="src">כל עדכון ציון, מהחדש לישן. <bdi>{list.length}</bdi> רשומות.</span>
      </div>
      <Selector label="פרק" options={CHAPTERS} value={chapters} onChange={setChapters} colorOf={c => CHAPTER_HEX[c]} />
      {list.length === 0 ? (
        <div className="empty"><p><b>היומן ריק.</b></p><p>כל ניקוד שתזינו למדד יירשם כאן, עם התאריך והשעה.</p></div>
      ) : (
        <ol className="scroll-in tl-list">
          {list.map((h, i) => {
            const ind = INDICATORS.find(x => x.id === h.indicatorId);
            const ch = chapterOf(h.indicatorId);
            const up = h.score >= h.oldScore;
            return (
              <li key={i}>
                <button className="tl-row" onClick={() => onSelect(h.indicatorId)}>
                  <span className="ops-dot" style={{ background: CHAPTER_HEX[ch] }} aria-hidden="true" />
                  <span className="tl-title">{h.indicatorTitle}{h.notes ? <span className="src"> · {h.notes}</span> : null}</span>
                  <bdi className="num" style={{ color: up ? '#1D7A55' : '#A32D2D' }}>{h.oldScore} → {h.score}<span className="src">/{ind?.maxScore}</span></bdi>
                  <span className="src tl-date">{new Date(h.timestamp).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
