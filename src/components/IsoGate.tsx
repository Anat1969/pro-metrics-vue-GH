import React, { useState } from 'react';
import { GATES, GATE_ORDER, type Gate, type Verdict } from '@/lib/plans';
import type { PlanRow } from '@/lib/usePlans';

/**
 * העיר כשלוש שורות של מבנים, שורה לכל שער אישור. גובה המבנה = הנקודות שהוכחו.
 * מסגרת מקווקוות = התקרה אם יוצגו כל הראיות. זכוכית צהובה = היעד של השער.
 * מבנה שעובר את הזכוכית עומד ביעד. הטלה איזומטרית ב-SVG.
 */
const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);
const K = 1.15; // פיקסלים לנקודה
const W = 16, D = 16, STEP = 26, ROW = 74;
const iso = (x: number, y: number, z: number): [number, number] => [(x - y) * C30, (x + y) * S30 - z * K];
const poly = (pts: [number, number][]) => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
export const VERDICT_COLOR: Record<Verdict, string> = { pass: '#1D7A55', evidence: '#BA7517', fail: '#A32D2D' };
const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); const c = (v: number) => Math.round(v * k); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };

function Box({ x, y, z0, z1, color }: { x: number; y: number; z0: number; z1: number; color: string }) {
  if (z1 <= z0) return null;
  const px = [iso(x + W, y, z0), iso(x + W, y + D, z0), iso(x + W, y + D, z1), iso(x + W, y, z1)];
  const py = [iso(x, y + D, z0), iso(x + W, y + D, z0), iso(x + W, y + D, z1), iso(x, y + D, z1)];
  const top = [iso(x, y, z1), iso(x + W, y, z1), iso(x + W, y + D, z1), iso(x, y + D, z1)];
  return (
    <>
      <polygon points={poly(px)} fill={shade(color, .78)} stroke="#fff" strokeWidth=".5" />
      <polygon points={poly(py)} fill={shade(color, .62)} stroke="#fff" strokeWidth=".5" />
      <polygon points={poly(top)} fill={color} stroke="#fff" strokeWidth=".5" />
    </>
  );
}

export default function IsoGate({ rows, targets, onSelect, onHover }: { rows: PlanRow[]; targets: Record<Gate, number>; onSelect?: (id: string) => void; onHover?: (r: PlanRow | null) => void }) {
  const [hover, setHoverId] = useState<string | null>(null);
  const setHover = (id: string | null) => { setHoverId(id); onHover?.(rows.find(r => r.plan.id === id) ?? null); };
  const byGate = GATE_ORDER.map(g => ({ g, list: rows.filter(r => r.gate === g).sort((a, b) => b.r.points - a.r.points) }));
  const maxLen = Math.max(1, ...byGate.map(x => x.list.length));
  const len = maxLen * STEP;
  
  // גבולות התצוגה
  const top = Math.max(60, ...rows.map(r => Math.min(120, r.r.ceiling)), ...Object.values(targets));
  const corners = [iso(-110, 0, 0), iso(len + 50, 0, 0), iso(-110, ROW * 2 + D + 10, 0), iso(len + 50, ROW * 2 + D + 10, 0), iso(0, 0, top + 6), iso(len, 0, top + 6)];
  const minX = Math.min(...corners.map(c => c[0])) - 10, maxX = Math.max(...corners.map(c => c[0])) + 10;
  const minY = Math.min(...corners.map(c => c[1])) - 10, maxY = Math.max(...corners.map(c => c[1])) + 10;

  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="img" aria-label="תוכניות ההתחדשות מול יעד השער: גובה המבנה הוא הנקודות שהוכחו"
      style={{ width: '100%', height: '100%', direction: 'ltr', display: 'block' }}>
      {/* קרקע */}
      <polygon points={poly([iso(-40, -10, 0), iso(len + 10, -10, 0), iso(len + 10, ROW * 2 + D + 10, 0), iso(-40, ROW * 2 + D + 10, 0)])} fill="#F6F7F8" stroke="#E3E2DE" />
      {byGate.map(({ g, list }, gi) => {
        const y = gi * ROW;
        const t = targets[g];
        const [lx, ly] = iso(-16, y + D + 4, 0);
        return (
          <g key={g}>
            <polygon points={poly([iso(-6, y - 6, 0), iso(len + 4, y - 6, 0), iso(len + 4, y + D + 6, 0), iso(-6, y + D + 6, 0)])} fill="#fff" stroke="#E3E2DE" />
            <text x={lx - 4} y={ly + 4} textAnchor="end" fontSize="12" fontWeight="600" fill="#1A1A18">{GATES[g].short}</text>
            {/* חלק המבנים שמתחת ליעד */}
            {list.map((r, i) => (
              <g key={r.plan.id} className="tower" style={{ animationDelay: `${(gi * maxLen + i) * 30}ms`, opacity: hover && hover !== r.plan.id ? .45 : 1, cursor: 'pointer' }}
                onMouseEnter={() => setHover(r.plan.id)} onMouseLeave={() => setHover(null)} onClick={() => onSelect?.(r.plan.id)}>
                <Box x={i * STEP} y={y} z0={0} z1={Math.min(r.r.points, t)} color={VERDICT_COLOR[r.r.verdict]} />
              </g>
            ))}
            {/* זכוכית היעד */}
            <polygon points={poly([iso(-6, y - 6, t), iso(len + 4, y - 6, t), iso(len + 4, y + D + 6, t), iso(-6, y + D + 6, t)])}
              fill="#FFE45C" fillOpacity=".28" stroke="#E8C400" strokeWidth="1" pointerEvents="none" />
            {(() => { const [tx, ty] = iso(len + 8, y + D, t); return (
              <g pointerEvents="none">
                <text x={tx} y={ty} fontSize="11" fontWeight="600" fill="#8A6D00" fontFamily="IBM Plex Mono">{t}</text>
                <text x={tx + 20} y={ty} fontSize="10" fill="#8A6D00" textAnchor="start">יעד</text>
              </g>); })()}
            {/* מה שמעל היעד, והתקרה המקווקוות */}
            {list.map((r, i) => {
              const x = i * STEP;
              const ceil = Math.min(120, r.r.ceiling);
              return (
                <g key={r.plan.id + 'u'} style={{ opacity: hover && hover !== r.plan.id ? .45 : 1, cursor: 'pointer' }} pointerEvents="visiblePainted"
                  onMouseEnter={() => setHover(r.plan.id)} onMouseLeave={() => setHover(null)} onClick={() => onSelect?.(r.plan.id)}>
                  <Box x={x} y={y} z0={t} z1={r.r.points} color={VERDICT_COLOR[r.r.verdict]} />
                  {ceil > r.r.points && (
                    <polyline points={poly([iso(x, y + D, r.r.points), iso(x, y + D, ceil), iso(x + W, y + D, ceil), iso(x + W, y, ceil), iso(x + W, y, r.r.points)])}
                      fill="none" stroke={VERDICT_COLOR[r.r.verdict]} strokeOpacity=".55" strokeDasharray="2 2" />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
