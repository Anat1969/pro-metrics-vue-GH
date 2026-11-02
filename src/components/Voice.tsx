import React, { useEffect, useRef, useState } from 'react';

// הקלטה ותמלול לכל שדה כתיבה (כלל ענת, 02.11.2026), לפי templates/voice.js בסקיל, כרכיב React:
// התמלול נכנס לשדה תוך כדי דיבור ונשמר כמו הקלדה. בלי תמיכה בדפדפן: הכפתור מסביר איך להכתיב.
type Rec = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void;
  onresult: (e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void; onerror: (e: { error: string }) => void; onend: () => void };
const Ctor = typeof window !== 'undefined'
  ? ((window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition)
  : undefined;
let active: (() => void) | null = null;

export default function Voice({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState('');
  const rec = useRef<Rec | null>(null);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => () => rec.current?.stop(), []);

  const click = () => {
    if (!Ctor) { setNote('הדפדפן הזה לא מתמלל. אפשר ללחוץ על המיקרופון במקלדת של הטלפון ולהכתיב.'); return; }
    if (rec.current) { rec.current.stop(); return; }
    active?.();
    const r = new Ctor();
    r.lang = 'he-IL'; r.continuous = true; r.interimResults = true;
    const base = latest.current ? latest.current.replace(/\s*$/, ' ') : '';
    r.onresult = e => {
      let fin = '', mid = '';
      for (let i = 0; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (mid += e.results[i][0].transcript));
      onChange((base + fin + mid).replace(/\s+/g, ' ').trimStart());
    };
    r.onerror = e => setNote(e.error === 'not-allowed' ? 'אין הרשאה למיקרופון. אפשר לאשר בסרגל הכתובת של הדפדפן.' : 'התמלול נעצר. אפשר לנסות שוב.');
    r.onend = () => { rec.current = null; active = null; setOn(false); setNote(''); };
    rec.current = r; active = () => r.stop();
    try { r.start(); setOn(true); setNote('מקליטה ומתמללת. לחיצה נוספת עוצרת.'); } catch { rec.current = null; setNote('לא הצלחתי להפעיל הקלטה. אפשר לנסות שוב.'); }
  };

  return (
    <div className="voice">
      <button type="button" className="press voice-btn" aria-pressed={on} onClick={click} title="הקלטה ותמלול לעברית">
        <span className="voice-dot" aria-hidden="true" /><span>{on ? 'עצירה' : 'הקלטה'}</span>
      </button>
      <span className="src" aria-live="polite">{note || 'ההקלטה לא נשמרת, רק הטקסט.'}</span>
    </div>
  );
}
