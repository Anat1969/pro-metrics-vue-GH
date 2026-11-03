import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { GATES, GATE_ORDER, GENERAL_GAPS, STAGE_HE, STATUS_HE, VERDICT_HE, sourceHe, developerLetter, type Gate } from './plans';
import type { PlanRow } from './usePlans';

/** דוח השער כקובץ Word לתיק הוועדה. אותו תוכן כמו הדוח שבמסך. */
const FONT = 'David';
const line = { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' } as const;
const borders = { top: line, bottom: line, left: line, right: line };

const p = (text: string, o: { bold?: boolean; size?: number; color?: string; before?: number; after?: number } = {}) =>
  new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { before: o.before ?? 0, after: o.after ?? 60 },
    children: [new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, color: o.color, rightToLeft: true })],
  });
const h = (text: string) => p(text, { bold: true, size: 26, before: 200, after: 80 });
const cell = (text: string, bold = false, width?: number) =>
  new TableCell({ borders, width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined, children: [p(text, { bold, size: 18, after: 0 })] });
const table = (head: string[], rows: string[][], widths?: number[]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, visuallyRightToLeft: true,
    rows: [new TableRow({ tableHeader: true, children: head.map((t, i) => cell(t, true, widths?.[i])) }), ...rows.map(r => new TableRow({ children: r.map((t, i) => cell(t, false, widths?.[i])) }))],
  });

const CHECK_HE = { ok: 'תקין', warn: 'לתשומת לב', fail: 'חסר' } as const;
const CONF_HE: Record<string, string> = { document: 'ציטוט במסמך', inferred: 'הוסק מנתונים', simulation: 'סימולציה', none: 'לא נמצאה ראיה', excluded: 'לא רלוונטי' };

export async function downloadGateReport(row: PlanRow, _targets: Record<Gate, number>) {
  const { plan, r, gate } = row;
  const total = r.rows.filter(x => !x.excluded).reduce((a, x) => a + x.max, 0);
  const nowReq = row.requests.filter(d => !d.future);
  const futReq = row.requests.filter(d => d.future);
  const children = [
    p(`עיריית אשדוד · שער היעדים · דוח ${GATES[gate].label} · ${new Date().toLocaleDateString('he-IL')}`, { size: 18, color: '777777' }),
    p(plan.title, { bold: true, size: 36, after: 40 }),
    p([plan.plan_number, row.quarter, STATUS_HE[plan.status], plan.units_planned ? `${plan.units_existing ?? '?'} ← ${plan.units_planned} יח"ד` : null].filter(Boolean).join(' · '), { size: 18, color: '555555' }),

    h('1. ההכרעה'),
    p(VERDICT_HE[r.verdict].label, { bold: true, size: 24 }),
    p(`${r.points} נקודות הוכחו מתוך 120, מול יעד ${r.target}. ${r.need ? `חסרות ${r.need}.` : 'היעד הושג.'} דרגה: ${r.grade}.`),
    p(r.verdict === 'fail' && r.nextStageCan ? 'היעד לא מושג בשלב הזה, ואפשרי רק בשלב הבא.' : VERDICT_HE[r.verdict].line),

    h('2. מה אפשר לדרוש בכל שלב'),
    table(['שלב', 'מקסימום לדרוש', 'הוכח', 'חסר בשלב', 'מה זה אומר'], [
      [`${GATES[gate].label} (עכשיו)`, String(r.now.max), String(r.now.proven), String(r.now.open), `${r.now.evidence.length} מסמכים, ${r.now.design.length} שיפורים`],
      ...(gate === 'taba' ? [[STAGE_HE.binui, String(total), '—', String(r.future.max), `עתידי: ${r.future.asks.length} מדדים, לרשום כתנאי`]] : []),
      [STAGE_HE.after, '—', '—', '—', `להתנות: ${r.conditions.length} מדדים עם דרישות ביצוע`],
    ], [22, 14, 10, 12, 42]),
    p('שיוך המדדים לשלבים הוא הצעה לאישור העירייה. בתב"ע אפשר לדרוש עד 94 נקודות, ובתוכנית בינוי עוד 26.', { size: 16, color: '777777', before: 40 }),

    h('3. בדיקות אוטומטיות, ואיך נבדקו'),
    table(['בדיקה', 'תוצאה', 'מצב', 'איך נבדק'], row.checks.map(c => [c.title, c.result, CHECK_HE[c.status], c.how]), [20, 34, 10, 36]),
    p(`מקור הניקוד: מכשיר המדידה, מודל ${row.ps?.model ?? '—'}, מחוון ${row.ps?.rubric_version ?? '—'}. נקראו: ${(row.ps?.sources ?? []).map(sourceHe).join(', ') || '—'}.`, { size: 16, color: '777777', before: 40 }),

    h('4. בקשת מסמכים מהיזם'),
    ...(nowReq.length ? [table(['מסמך', 'פותח את המדדים', 'עד נקודות'], nowReq.map(d => [d.doc, d.metrics.map(m => `${m.n}. ${m.title}`).join(' · '), String(d.gain)]), [30, 58, 12])] : [p('אין מסמכים חסרים לשלב הזה.')]),
    ...(futReq.length ? [p('לשלב הבא:', { bold: true, before: 80 }), ...futReq.map(d => p(`${d.doc}: ${d.metrics.map(m => m.title).join(', ')} (עד ${d.gain})`))] : []),

    h('5. כל 44 המדדים'),
    table(['#', 'מדד', 'שלב', 'ניקוד', 'איך נבדק', 'נימוק', 'מה חסר'], r.rows.map(m => [
      String(m.n), m.title, STAGE_HE[m.stage], m.excluded ? '—' : m.score == null ? `—/${m.max}` : `${m.score}/${m.max}`,
      CONF_HE[m.confidence] ?? m.confidence, m.note, m.score == null && !m.excluded ? m.need : '',
    ]), [4, 18, 9, 8, 12, 32, 17]),

    h('6. להתנות בהיתר ובביצוע (שלב ג\')'),
    ...r.conditions.map(c => p(`${c.n}. ${c.title}: ${c.stageC}`, { size: 18 })),

    h('נספח: מכתב ליזם'),
    ...developerLetter(plan, gate, r, row.requests).split('\n').map(t => p(t || ' ', { size: 20 })),

    h('7. מה חסר'),
    p('כדי שהבדיקה האוטומטית תהיה מלאה:', { bold: true }),
    ...(nowReq.length ? nowReq.slice(0, 6).map(d => p(`• ${d.doc}`)) : [p('אין.')]),
    p('מידע כללי שחסר:', { bold: true, before: 80 }),
    ...GENERAL_GAPS.map(g => p(`• ${g}`)),

    p('הניקוד: שכונה 360°, גרסה 2.0, ינואר 2025, המועצה הישראלית לבנייה ירוקה ומשרד הבינוי והשיכון. הכלי אינו מעניק הסמכה.', { size: 16, color: '777777', before: 200 }),
  ];
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 800, bottom: 800, left: 800, right: 800 } } }, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `gate-${plan.plan_number ?? plan.id}-${new Date().toISOString().slice(0, 10)}.docx`);
}

/** המכתב ליזם בלבד, כקובץ Word לשליחה. */
export async function downloadLetter(row: PlanRow) {
  const text = developerLetter(row.plan, row.gate, row.r, row.requests);
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1100, bottom: 1100, left: 1100, right: 1100 } } }, children: text.split('\n').map(t => p(t || ' ', { size: 22 })) }] });
  saveAs(await Packer.toBlob(doc), `letter-${row.plan.plan_number ?? row.plan.id}.docx`.replace(/\//g, '-'));
}

/** דוח ועדה מרוכז: כל התוכניות בשער אחד (או בכולם), בטבלה אחת ובשורת דרישות לכל תוכנית. */
export async function downloadBatch(rows: PlanRow[], gate: Gate | null) {
  const gates = gate ? [gate] : GATE_ORDER;
  const children: (Paragraph | Table)[] = [
    p(`עיריית אשדוד · שער היעדים · דוח ועדה מרוכז · ${new Date().toLocaleDateString('he-IL')}`, { size: 18, color: '777777' }),
    p(gate ? GATES[gate].label : 'כל השערים', { bold: true, size: 34 }),
  ];
  for (const g of gates) {
    const list = rows.filter(r => r.gate === g).sort((a, b) => b.r.points - a.r.points);
    if (!list.length) continue;
    children.push(h(`${GATES[g].label} · ${list.length} תוכניות`));
    children.push(table(['תוכנית', 'הכרעה', 'מקסימום בשלב', 'הוכח', 'חסר בשלב', 'עתידי', 'דרישות עיקריות'], list.map(r => [
      `${r.plan.title} ${r.plan.plan_number ? `(${r.plan.plan_number})` : ''}`, VERDICT_HE[r.r.verdict].label, String(r.r.now.max), String(r.r.points), String(r.r.now.open), String(r.r.future.max),
      r.requests.filter(d => !d.future).slice(0, 3).map(d => d.doc).join('; '),
    ]), [20, 11, 9, 7, 8, 7, 38]));
  }
  children.push(h('מידע כללי שחסר'), ...GENERAL_GAPS.map(gp => p(`• ${gp}`)));
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 800, bottom: 800, left: 700, right: 700 } } }, children }] });
  saveAs(await Packer.toBlob(doc), `committee-${gate ?? 'all'}-${new Date().toISOString().slice(0, 10)}.docx`);
}
