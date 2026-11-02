import React from 'react';
import { CHAPTER_HEX, INDICATORS, type Project } from '@/data/indicators';
import { calcFinalScore, achievableMax, countEvaluated, opportunities, openPoints } from '@/lib/scoring';
import Rich from './Rich';

/** הערכה אוטומטית שמסבירה את עצמה: מה חושב בקוד, מה קבע איש המקצוע, ומה המגבלה. */
export default function EvaluationPanel({ project, onSelect }: { project: Project; onSelect: (id: string) => void }) {
  const score = calcFinalScore(project);
  const max = achievableMax(project);
  const pct = max ? Math.round((score / max) * 100) : 0;
  const n = countEvaluated(project);
  const open = openPoints(project);
  const ops = opportunities(project, 5);
  const top3 = ops.slice(0, 3).reduce((s, o) => s + o.open, 0);
  const nr = INDICATORS.filter(i => project.indicators[i.id]?.status === 'not_relevant').length;

  return (
    <article className="ind-panel" aria-label="הערכה אוטומטית">
      <span className="lbl">הערכה אוטומטית</span>
      <h2 className="ind-title"><bdi className="num">{pct}%</bdi> מהניקוד האפשרי</h2>
      <Rich as="p" className="ind-guidance">{`**${score}** נקודות מתוך **${max}** אפשריות. הוערכו **${n}** מתוך **${INDICATORS.length}** מדדים.`}</Rich>

      <div className="tone tone-problem">
        <Rich as="p">{`**${open}** נקודות עוד פתוחות.`}</Rich>
      </div>
      {ops.length > 0 && (
        <div className="tone tone-insight">
          <Rich as="p">{`==${ops.length >= 3 ? 'שלושה' : ops.length} מדדים מחזיקים ${top3} נקודות.== שם כדאי להתחיל.`}</Rich>
        </div>
      )}

      <div className="ind-block">
        <span className="lbl">הזדמנויות: הכי הרבה נקודות פתוחות</span>
        <ul className="ops">
          {ops.map(o => (
            <li key={o.id}>
              <button className="ops-row" onClick={() => onSelect(o.id)}>
                <span className="ops-dot" style={{ background: CHAPTER_HEX[o.chapter] }} aria-hidden="true" />
                <span className="ops-title">{o.title}</span>
                <bdi className="num ops-gain" style={{ color: '#1D7A55' }}>+{o.open}</bdi>
              </button>
            </li>
          ))}
          {ops.length === 0 && <li className="src">אין נקודות פתוחות. כל המדדים הרלוונטיים בניקוד מלא.</li>}
        </ul>
      </div>

      <details className="ind-block how">
        <summary className="lbl">איך זה חושב</summary>
        <p><b>בקוד:</b> הציון הוא סכום הניקוד. מדד "לא רלוונטי" ({nr}) יוצא גם מהמכנה.</p>
        <p><b>איש המקצוע:</b> קובע את הניקוד לכל מדד, לפי החוברת ולפי מסמכי התכנון.</p>
        <p><b>המגבלה:</b> הכלי לא קורא את התוכנית עצמה. הוא מסכם, מדרג ומראה פערים.</p>
      </details>
    </article>
  );
}
