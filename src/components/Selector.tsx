import React from 'react';

interface Props {
  label: string;
  options: readonly string[];
  value: string[]; // ריק = הכול
  onChange: (v: string[]) => void;
  colorOf?: (o: string) => string | undefined;
  countOf?: (o: string) => number;
}

/**
 * בורר אחיד (סעיף 2.8): "הכול" מאפס, כל לחיצה מחליפה, "+" מוסיף, "−" מסיר,
 * ולחיצה על הבחירה היחידה מחזירה ל"הכול".
 */
export default function Selector({ label, options, value, onChange, colorOf, countOf }: Props) {
  const all = value.length === 0;
  return (
    <div className="selector" role="group" aria-label={label}>
      <span className="lbl" style={{ marginInlineEnd: 4 }}>{label}</span>
      <button type="button" className="chip" aria-pressed={all} onClick={() => onChange([])}>הכול</button>
      {options.map(o => {
        const on = value.includes(o);
        const n = countOf?.(o);
        return (
          <span key={o} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <button type="button" className="chip" aria-pressed={on}
              style={on && colorOf?.(o) ? { background: colorOf(o), borderColor: colorOf(o), color: '#fff' } : undefined}
              onClick={() => onChange(on && value.length === 1 ? [] : [o])}>
              {o}{n !== undefined && <bdi className="num" style={{ fontSize: 11, marginRight: 6, fontWeight: 500, color: on ? '#fff' : '#8A8984' }}>{n}</bdi>}
            </button>
            {!all && !on && <button type="button" className="chip-add" title={`הוספת ${o}`} aria-label={`הוספת ${o}`} onClick={() => onChange([...value, o])}>+</button>}
            {on && value.length > 1 && <button type="button" className="chip-add" title={`הסרת ${o}`} aria-label={`הסרת ${o}`} onClick={() => onChange(value.filter(v => v !== o))}>−</button>}
          </span>
        );
      })}
    </div>
  );
}
