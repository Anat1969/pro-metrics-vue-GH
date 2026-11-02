import React, { useState } from 'react';
import { CHAPTER_HEX, type Project } from '@/data/indicators';
import { petals, shade } from '@/lib/rose';

/**
 * השכונה כטבעת של 44 מבנים בהטלה איזומטרית (SVG, לא CSS 3D).
 * גובה כל מבנה הוא הציון של המדד, ורוחבו לפי משקל המדד.
 */
const R0 = 92, R1 = 160, H = 54;
const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);
const iso = (x: number, y: number, z: number) => [(x - y) * C30, (x + y) * S30 - z] as const;
const poly = (pts: (readonly [number, number])[]) => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

export default function IsoRose({ project, onSelect }: { project: Project; onSelect?: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const list = petals(project);
  const steps = 6;

  const towers = list.map(p => {
    const arc = (r: number, z: number) => Array.from({ length: steps + 1 }, (_, i) => {
      const a = p.a0 + ((p.a1 - p.a0) * i) / steps;
      return iso(Math.cos(a) * r, Math.sin(a) * r, z);
    });
    const h = p.status === 'not_started' || p.status === 'not_relevant' ? 1.5 : 4 + p.fill * H;
    const mid = (p.a0 + p.a1) / 2;
    const depth = Math.cos(mid) + Math.sin(mid); // גדול יותר = קרוב יותר לצופה
    const color = p.status === 'not_started' || p.status === 'not_relevant' ? '#D6D5D0' : CHAPTER_HEX[p.chapter];
    const faces: { pts: string; fill: string }[] = [];
    const visible = (nx: number, ny: number) => nx + ny > 0; // הצופה בכיוון (1,1,1)
    // קיר פנימי
    if (visible(-Math.cos(mid), -Math.sin(mid))) faces.push({ pts: poly([...arc(R0, 0), ...arc(R0, h).reverse()]), fill: shade(color, .62) });
    // קירות צד
    const side = (a: number, nx: number, ny: number) => {
      if (!visible(nx, ny)) return;
      const c = Math.cos(a), s = Math.sin(a);
      faces.push({ pts: poly([iso(c * R0, s * R0, 0), iso(c * R1, s * R1, 0), iso(c * R1, s * R1, h), iso(c * R0, s * R0, h)]), fill: shade(color, .72) });
    };
    side(p.a0, Math.sin(p.a0), -Math.cos(p.a0));
    side(p.a1, -Math.sin(p.a1), Math.cos(p.a1));
    // קיר חיצוני
    if (visible(Math.cos(mid), Math.sin(mid))) faces.push({ pts: poly([...arc(R1, 0), ...arc(R1, h).reverse()]), fill: shade(color, .82) });
    // גג
    faces.push({ pts: poly([...arc(R1, h), ...arc(R0, h).reverse()]), fill: color });
    return { p, depth, faces };
  }).sort((a, b) => a.depth - b.depth);

  const ground = (r: number) => poly(Array.from({ length: 73 }, (_, i) => { const a = (i / 72) * Math.PI * 2; return iso(Math.cos(a) * r, Math.sin(a) * r, 0); }));
  const focus = list.find(p => p.id === hover);

  return (
    <svg viewBox="-205 -140 410 260" role="img" aria-label="השכונה בתלת־ממד: גובה כל מבנה הוא הציון של המדד"
      style={{ width: '100%', height: '100%', direction: 'ltr', display: 'block' }}>
      <polygon points={ground(R1 + 26)} fill="#F6F7F8" stroke="#E3E2DE" />
      <polygon points={ground(R1 + 6)} fill="none" stroke="#E3E2DE" strokeDasharray="3 4" />
      <polygon points={ground(R0 - 8)} fill="#fff" stroke="#E3E2DE" />
      {towers.map(({ p, faces }, i) => (
        <g key={p.id} className="tower" style={{ animationDelay: `${i * 18}ms`, cursor: onSelect ? 'pointer' : 'default', opacity: hover && hover !== p.id ? .55 : 1 }}
          onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} onClick={() => onSelect?.(p.id)}>
          {faces.map((f, k) => <polygon key={k} points={f.pts} fill={f.fill} stroke="#fff" strokeWidth=".5" strokeLinejoin="round" />)}
        </g>
      ))}
      {focus && (
        <g pointerEvents="none">
          <rect x={-150} y={92} width={300} height={24} fill="#fff" stroke="#E3E2DE" />
          <text x={0} y={108} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1A1A18" style={{ direction: 'rtl' }}>
            {focus.title} · {focus.status === 'not_started' ? 'טרם הוערך' : `${focus.score}/${focus.max}`}
          </text>
        </g>
      )}
    </svg>
  );
}
