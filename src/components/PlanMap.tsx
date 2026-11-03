import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VERDICT_HE, type Verdict, type Geo } from '@/lib/plans';
import type { PlanRow } from '@/lib/usePlans';
import { VERDICT_COLOR } from './IsoGate';

/**
 * מפת התוכניות: הקו הכחול של כל תוכנית (geojson מ"מה נבנה סביבי"), צבוע לפי ההכרעה.
 * הטלת Web Mercator ברמת זום 15, כדי שהאריחים של מפת הרקע יישבו בדיוק מתחת.
 * זום בגלגלת, גרירה, וכפתורי + / − / איפוס (כלל ענת).
 */
const Z = 15, TILE = 256, WORLD = TILE * 2 ** Z;
const px = (lon: number) => ((lon + 180) / 360) * WORLD;
const py = (lat: number) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * WORLD; };
const TILES = 'https://basemaps.cartocdn.com/light_all';

export default function PlanMap({ rows, geo, selected, onSelect }: { rows: PlanRow[]; geo: Geo; selected?: string | null; onSelect: (id: string) => void }) {
  const shapes = useMemo(() => rows.flatMap(r => {
    const g = geo[r.plan.id];
    if (!g || !g.center || !g.polygons?.length) return []; // בלי קו כחול: התוכנית לא מצוירת, ולא נופלת
    const d = g.polygons.map(poly => poly.map(ring => ring.map(([lo, la], i) => `${i ? 'L' : 'M'}${px(lo).toFixed(1)} ${py(la).toFixed(1)}`).join('') + 'Z').join('')).join('');
    return [{ row: r, d, cx: px(g.center[0]), cy: py(g.center[1]) }];
  }), [rows, geo]);

  // גבולות כל התוכניות, עם שוליים
  const home = useMemo(() => {
    const xs: number[] = [], ys: number[] = [];
    Object.values(geo).forEach(g => (g?.polygons ?? []).forEach(p => p.forEach(ring => ring.forEach(([lo, la]) => { xs.push(px(lo)); ys.push(py(la)); }))));
    if (!xs.length) return { x: 0, y: 0, w: 1, h: 1 };
    const pad = 60, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
    return { x: x0, y: y0, w: Math.max(...xs) + pad - x0, h: Math.max(...ys) + pad - y0 };
  }, [geo]);
  const [vb, setVb] = useState(home);
  useEffect(() => setVb(home), [home]); // הגבולות נטענים אחרי הרינדור הראשון
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; vb: typeof vb } | null>(null);
  const [hover, setHover] = useState<PlanRow | null>(null);
  const [box, setBox] = useState({ w: 600, h: 600 });
  useEffect(() => {
    const el = svg.current; if (!el) return;
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); if (r.width) setBox({ w: r.width, h: r.height }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const zoom = (k: number, cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2) => {
    const w = Math.min(home.w * 2, Math.max(home.w / 6, vb.w * k));
    const h = (w / vb.w) * vb.h;
    setVb({ x: cx - ((cx - vb.x) * w) / vb.w, y: cy - ((cy - vb.y) * h) / vb.h, w, h });
  };
  const toUser = (e: { clientX: number; clientY: number }) => {
    const r = svg.current!.getBoundingClientRect();
    const s = Math.max(vb.w / r.width, vb.h / r.height);
    const ox = (r.width * s - vb.w) / 2, oy = (r.height * s - vb.h) / 2;
    return { x: vb.x - ox + (e.clientX - r.left) * s, y: vb.y - oy + (e.clientY - r.top) * s, s };
  };

  // אריחי רקע בתחום התצוגה
  const tiles = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    const m = Math.max(vb.w, vb.h);
    for (let tx = Math.floor((vb.x - m / 2) / TILE); tx <= Math.floor((vb.x + vb.w + m / 2) / TILE); tx++)
      for (let ty = Math.floor((vb.y - m / 2) / TILE); ty <= Math.floor((vb.y + vb.h + m / 2) / TILE); ty++) out.push({ x: tx, y: ty });
    return out.slice(0, 80);
  }, [vb]);

  // תוויות בלי חפיפה: מהגדולה לקטנה, ומדלגים על תווית שחופפת לקודמת
  const scale = Math.max(vb.w / box.w, vb.h / box.h); // יחידות מפה לפיקסל מסך: גודל קבוע לתוויות ולקווים
  const labels = useMemo(() => {
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    return [...shapes].sort((a, b) => (b.row.plan.units_planned ?? 0) - (a.row.plan.units_planned ?? 0)).filter(s => {
      const name = s.row.plan.title.replace(/^מתחם |^פינוי-בינוי /, '');
      const w = name.length * 6.4 * scale, h = 15 * scale;
      const box = { x0: s.cx - w / 2, x1: s.cx + w / 2, y0: s.cy - h, y1: s.cy + h / 2 };
      if (placed.some(b => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1))) return false;
      placed.push(box); return true;
    }).map(s => s.row.plan.id);
  }, [shapes, scale]);

  // סרגל קנה מידה: מטרים לפיקסל בקו הרוחב של אשדוד
  const lat = 31.79, mPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / WORLD;
  const barM = 500, barPx = barM / mPerPx;

  return (
    <div className="map-wrap">
      <svg ref={svg} className="plan-map" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} role="img" aria-label="מפת התוכניות באשדוד, צבועות לפי ההכרעה"
        style={{ direction: 'ltr' }}
        onWheel={e => { const u = toUser(e); zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, u.x, u.y); }}
        onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, vb }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
        onPointerMove={e => {
          if (!drag.current) return;
          const r = svg.current!.getBoundingClientRect(); const s = Math.max(vb.w / r.width, vb.h / r.height);
          setVb({ ...drag.current.vb, x: drag.current.vb.x - (e.clientX - drag.current.x) * s, y: drag.current.vb.y - (e.clientY - drag.current.y) * s });
        }}
        onPointerUp={() => { drag.current = null; }}>
        <g className="map-tiles" aria-hidden="true">
          {tiles.map(t => <image key={`${t.x}-${t.y}`} href={`${TILES}/${Z}/${t.x}/${t.y}.png`} x={t.x * TILE} y={t.y * TILE} width={TILE} height={TILE}
            onError={e => { (e.currentTarget as SVGImageElement).style.display = 'none'; }} />)}
        </g>
        {shapes.map(s => {
          const c = VERDICT_COLOR[s.row.r.verdict as Verdict];
          const on = selected === s.row.plan.id, hv = hover?.plan.id === s.row.plan.id;
          return (
            <path key={s.row.plan.id} d={s.d} fill={c} fillOpacity={on ? .55 : hv ? .45 : .3} stroke={on ? '#1A1A18' : c}
              strokeWidth={(on ? 3 : 1.5) * scale} style={{ cursor: 'pointer' }} data-plan={s.row.plan.id}
              onMouseEnter={() => setHover(s.row)} onMouseLeave={() => setHover(null)} onClick={() => onSelect(s.row.plan.id)} />
          );
        })}
        {shapes.filter(s => labels.includes(s.row.plan.id) || s.row.plan.id === selected).map(s => (
          <g key={s.row.plan.id + 'l'} pointerEvents="none">
            <text x={s.cx} y={s.cy} textAnchor="middle" style={{ direction: 'rtl' }} fontSize={12 * scale} fontWeight="600" fill="#1A1A18" stroke="#fff" strokeWidth={3 * scale} paintOrder="stroke">
              {s.row.plan.title.replace(/^מתחם |^פינוי-בינוי /, '')}
            </text>
          </g>
        ))}
      </svg>
      <div className="map-ops">
        <button className="press op" onClick={() => zoom(1 / 1.4)} aria-label="התקרבות" title="התקרבות">+</button>
        <button className="press op" onClick={() => zoom(1.4)} aria-label="התרחקות" title="התרחקות">−</button>
        <button className="press op" onClick={() => setVb(home)} aria-label="איפוס המפה" title="איפוס">⟲</button>
      </div>
      <div className="map-legend">
        {(['pass', 'evidence', 'fail'] as Verdict[]).map(v => <span key={v}><i style={{ background: VERDICT_COLOR[v] }} />{VERDICT_HE[v].label}</span>)}
        <span className="map-scale"><i style={{ width: `${(barPx / vb.w) * 100}%` }} /><bdi className="num">{barM}</bdi> מ'</span>
      </div>
      <p className="map-caption src" aria-live="polite">
        {hover ? `${hover.plan.title} · ${hover.r.points} נקודות מול יעד ${hover.r.target} · ${VERDICT_HE[hover.r.verdict].label}` : 'הקו הכחול של כל תוכנית, מתוך GIS העירוני ב"מה נבנה סביבי". גלגלת לזום, גרירה להזזה.'}
        {' '}· רקע: © OpenStreetMap, © CARTO
      </p>
    </div>
  );
}
