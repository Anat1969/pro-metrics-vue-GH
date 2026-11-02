import React, { useState } from 'react';
import { CHAPTER_HEX, CHAPTER_META, TOTAL_MAX_SCORE, STATUS_LABELS, type Project } from '@/data/indicators';
import { calcFinalScore } from '@/lib/scoring';
import { petals, chapterArcs, sector, areaRadius, pt } from '@/lib/rose';

interface Props {
  project: Project;
  selected?: string | null;
  highlight?: Set<string> | null; // התאמות של סינון וחיפוש. השאר מעומעם.
  onSelect: (id: string) => void;
}

const R0 = 46, R1 = 170, RING = 184;

/** שושנת 360°: כל פלח הוא מדד, רוחבו לפי משקלו והשטח הצבוע לפי הציון. */
export default function Rose({ project, selected, highlight, onSelect }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const list = petals(project);
  const score = calcFinalScore(project);
  const focus = list.find(p => p.id === (hover ?? selected));

  return (
    <svg viewBox="-215 -215 430 430" role="img" aria-label={`שושנת המדדים: ${score} מתוך ${TOTAL_MAX_SCORE} נקודות`}
      style={{ width: '100%', height: '100%', direction: 'ltr', display: 'block' }}>
      <defs>
        <pattern id="nr-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#C9C8C3" strokeWidth="1.2" />
        </pattern>
        <filter id="lift" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity=".18" /></filter>
      </defs>

      {/* טבעות עזר: 25%, 50%, 75%, 100% מהניקוד של כל מדד */}
      {[.25, .5, .75, 1].map(f => (
        <circle key={f} r={areaRadius(f, R0, R1)} fill="none" stroke={f === 1 ? '#D9D8D3' : '#EDECE8'} strokeDasharray={f === 1 ? undefined : '2 3'} />
      ))}

      {/* קשת פרק סביב השושנה, עם שם */}
      {chapterArcs().map(a => {
        const mid = (a.a0 + a.a1) / 2;
        const [lx, ly] = pt(mid, RING + 16);
        return (
          <g key={a.chapter}>
            <path d={sector(a.a0 + .01, a.a1 - .01, RING - 3, RING)} fill={CHAPTER_HEX[a.chapter]} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600" fill={CHAPTER_HEX[a.chapter]} style={{ direction: 'rtl' }}>
              {CHAPTER_META[a.chapter].short}
            </text>
          </g>
        );
      })}

      {list.map(p => {
        const color = CHAPTER_HEX[p.chapter];
        const dim = highlight && !highlight.has(p.id);
        const isSel = p.id === selected;
        const isHover = p.id === hover;
        return (
          <g key={p.id}
            className="petal"
            style={{ cursor: 'pointer', opacity: dim ? .18 : 1, transition: 'opacity .2s' }}
            onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}
            onClick={() => onSelect(p.id)}
            role="button" tabIndex={0} aria-label={`${p.title}: ${p.score} מתוך ${p.max}`}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(p.id); } }}
            data-id={p.id}>
            {/* פלח מלא בהיר = הניקוד המרבי */}
            <path d={sector(p.a0, p.a1, R0, R1)} fill={p.status === 'not_relevant' ? 'url(#nr-hatch)' : color} fillOpacity={p.status === 'not_relevant' ? 1 : .09}
              stroke={isSel ? '#1A1A18' : isHover ? color : 'none'} strokeWidth={isSel ? 2 : 1} />
            {/* הניקוד שהושג */}
            {p.fill > 0 && (
              <path d={sector(p.a0, p.a1, R0, areaRadius(p.fill, R0, R1))} fill={color} fillOpacity={.55 + .45 * p.fill}
                className="petal-fill" style={{ animationDelay: `${p.index * 22}ms` }} filter={isSel || isHover ? 'url(#lift)' : undefined} />
            )}
          </g>
        );
      })}

      {/* מרכז: הציון, או המדד שבריחוף */}
      <circle r={R0 - 4} fill="#fff" stroke="#E3E2DE" />
      {focus ? (
        <g pointerEvents="none">
          <text y={-6} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="22" fontWeight="600" fill={CHAPTER_HEX[focus.chapter]}>
            {focus.status === 'not_started' ? '—' : `${focus.score}/${focus.max}`}
          </text>
          <text y={14} textAnchor="middle" fontSize="9" fill="#5F5E5A" style={{ direction: 'rtl' }}>{STATUS_LABELS[focus.status as keyof typeof STATUS_LABELS]}</text>
        </g>
      ) : (
        <g pointerEvents="none">
          <text y={-4} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="26" fontWeight="600" fill="#1A1A18">{score}</text>
          <text y={14} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="10" fill="#8A8984">/ {TOTAL_MAX_SCORE}</text>
        </g>
      )}
      {focus && (
        <text y={206} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1A1A18" style={{ direction: 'rtl' }} pointerEvents="none">
          {focus.title}
        </text>
      )}
    </svg>
  );
}
