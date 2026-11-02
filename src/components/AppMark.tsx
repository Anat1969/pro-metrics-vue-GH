import React from 'react';

/** אייקון האפליקציה: שושנת שלושה פרקים סביב מרכז, בלי טקסט. */
export default function AppMark({ size = 28 }: { size?: number }) {
  const petal = (a0: number, a1: number, r: number, color: string) => {
    const p = (a: number, rr: number) => `${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`;
    return <path d={`M${p(a0, 4)} L${p(a0, r)} A${r} ${r} 0 0 1 ${p(a1, r)} L${p(a1, 4)} A4 4 0 0 0 ${p(a0, 4)}Z`} fill={color} />;
  };
  const t = -Math.PI / 2;
  const g = 0.08;
  return (
    <svg viewBox="-16 -16 32 32" width={size} height={size} aria-hidden="true">
      <circle r="15" fill="none" stroke="#1A1A18" strokeWidth="1" />
      {petal(t + g, t + 2.4 - g, 13, '#B4532A')}
      {petal(t + 2.4 + g, t + 5.0 - g, 10, '#3C8C4A')}
      {petal(t + 5.0 + g, t + Math.PI * 2 - g, 7, '#2C5F9E')}
      <circle r="2" fill="#1A1A18" />
    </svg>
  );
}
