import { INDICATORS, CHAPTERS, STATUS_LABELS, TOTAL_MAX_SCORE, type Project } from '@/data/indicators';
import { calcFinalScore, chapterEarnedScore, chapterMaxScore } from './scoring';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel, SectionType } from 'docx';
import { saveAs } from 'file-saver';

export function generateReport(project: Project): string {
  const now = new Date().toLocaleDateString('he-IL');
  const score = calcFinalScore(project);

  let report = `שכונה 360° — דוח הערכה\n`;
  report += `========================\n`;
  report += `פרויקט: ${project.name} | עיר: ${project.city} | שנה: ${project.year}\n`;
  report += `מנהל: ${project.manager} | תפקיד: ${project.role}\n`;
  report += `תאריך ייצוא: ${now}\n\n`;
  report += `ציון כולל: ${score}/${TOTAL_MAX_SCORE}\n\n`;
  report += `ניקוד לפי פרק:\n`;

  CHAPTERS.forEach(ch => {
    const earned = chapterEarnedScore(project, ch);
    const max = chapterMaxScore(ch);
    report += `- ${ch}: ${earned}/${max}\n`;
  });

  report += `\nפירוט מדדים:\n`;
  report += `-------------------\n`;

  INDICATORS.forEach((ind, i) => {
    const d = project.indicators[ind.id];
    if (!d || d.status === 'not_started') return;
    report += `${String(i + 1).padStart(2, '0')}. ${ind.titleHe} — ציון: ${d.score}/${ind.maxScore} | סטטוס: ${STATUS_LABELS[d.status]}\n`;
    if (d.notes) report += `    הערות: ${d.notes}\n`;
  });

  return report;
}

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
} as const;

const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 1 },
  bottom: { style: BorderStyle.SINGLE, size: 1 },
  left: { style: BorderStyle.SINGLE, size: 1 },
  right: { style: BorderStyle.SINGLE, size: 1 },
} as const;

// Compact paragraph helper for RTL
function rtlPara(text: string, opts: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; font?: string } = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: opts.align ?? AlignmentType.RIGHT,
    spacing: { before: 0, after: 0, line: 220 },
    children: [new TextRun({
      text,
      font: opts.font ?? 'David',
      size: opts.size ?? 16,
      bold: opts.bold ?? false,
      color: opts.color,
      rightToLeft: true,
    })],
  });
}

function makeInfoRow(label: string, value: string) {
  return new TableRow({
    children: [
      new TableCell({
        borders: noBorder,
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [rtlPara(label, { bold: true, size: 18 })],
      }),
      new TableCell({
        borders: noBorder,
        width: { size: 75, type: WidthType.PERCENTAGE },
        children: [rtlPara(value, { size: 18 })],
      }),
    ],
  });
}

export async function downloadReport(project: Project) {
  const now = new Date().toLocaleDateString('he-IL');
  const score = calcFinalScore(project);

  // Project info - inline text instead of table for compactness
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      makeInfoRow('פרויקט:', project.name),
      makeInfoRow('עיר:', project.city),
      makeInfoRow('שנה:', String(project.year)),
      makeInfoRow('מנהל:', `${project.manager} | ${project.role}`),
      makeInfoRow('תאריך:', now),
    ],
  });

  // Chapter scores
  const chapterRows = CHAPTERS.map(ch => {
    const earned = chapterEarnedScore(project, ch);
    const max = chapterMaxScore(ch);
    return new TableRow({
      height: { value: 280, rule: 'atLeast' as any },
      children: [
        new TableCell({ borders: thinBorder, width: { size: 55, type: WidthType.PERCENTAGE }, children: [rtlPara(ch, { size: 16 })] }),
        new TableCell({ borders: thinBorder, width: { size: 22, type: WidthType.PERCENTAGE }, children: [rtlPara(`${earned}`, { bold: true, size: 16, align: AlignmentType.CENTER })] }),
        new TableCell({ borders: thinBorder, width: { size: 23, type: WidthType.PERCENTAGE }, children: [rtlPara(`${max}`, { size: 16, align: AlignmentType.CENTER })] }),
      ],
    });
  });

  const chapterTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: 280, rule: 'atLeast' as any },
        children: [
          new TableCell({ borders: thinBorder, shading: { fill: '2A9D8F' }, width: { size: 55, type: WidthType.PERCENTAGE }, children: [rtlPara('פרק', { bold: true, size: 16, color: 'FFFFFF' })] }),
          new TableCell({ borders: thinBorder, shading: { fill: '2A9D8F' }, width: { size: 22, type: WidthType.PERCENTAGE }, children: [rtlPara('ציון', { bold: true, size: 16, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
          new TableCell({ borders: thinBorder, shading: { fill: '2A9D8F' }, width: { size: 23, type: WidthType.PERCENTAGE }, children: [rtlPara('מקסימום', { bold: true, size: 16, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
        ],
      }),
      ...chapterRows,
    ],
  });

  // Indicators table - compact, 5 columns (no notes to fit one page)
  const indicatorRows = INDICATORS.map((ind, i) => {
    const d = project.indicators[ind.id];
    const s = d?.score ?? 0;
    const status = d ? STATUS_LABELS[d.status] : STATUS_LABELS['not_started'];
    return new TableRow({
      height: { value: 240, rule: 'atLeast' as any },
      children: [
        new TableCell({ borders: thinBorder, width: { size: 6, type: WidthType.PERCENTAGE }, children: [rtlPara(String(i + 1), { size: 14, align: AlignmentType.CENTER })] }),
        new TableCell({ borders: thinBorder, width: { size: 38, type: WidthType.PERCENTAGE }, children: [rtlPara(ind.titleHe, { size: 14 })] }),
        new TableCell({ borders: thinBorder, width: { size: 22, type: WidthType.PERCENTAGE }, children: [rtlPara(ind.topic, { size: 13 })] }),
        new TableCell({ borders: thinBorder, width: { size: 14, type: WidthType.PERCENTAGE }, children: [rtlPara(`${s}/${ind.maxScore}`, { bold: true, size: 14, align: AlignmentType.CENTER })] }),
        new TableCell({ borders: thinBorder, width: { size: 20, type: WidthType.PERCENTAGE }, children: [rtlPara(status, { size: 13, align: AlignmentType.CENTER })] }),
      ],
    });
  });

  const indicatorsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: 280, rule: 'atLeast' as any },
        children: [
          new TableCell({ borders: thinBorder, shading: { fill: '264653' }, width: { size: 6, type: WidthType.PERCENTAGE }, children: [rtlPara('#', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
          new TableCell({ borders: thinBorder, shading: { fill: '264653' }, width: { size: 38, type: WidthType.PERCENTAGE }, children: [rtlPara('מדד', { bold: true, size: 14, color: 'FFFFFF' })] }),
          new TableCell({ borders: thinBorder, shading: { fill: '264653' }, width: { size: 22, type: WidthType.PERCENTAGE }, children: [rtlPara('נושא', { bold: true, size: 14, color: 'FFFFFF' })] }),
          new TableCell({ borders: thinBorder, shading: { fill: '264653' }, width: { size: 14, type: WidthType.PERCENTAGE }, children: [rtlPara('ציון', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
          new TableCell({ borders: thinBorder, shading: { fill: '264653' }, width: { size: 20, type: WidthType.PERCENTAGE }, children: [rtlPara('סטטוס', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
        ],
      }),
      ...indicatorRows,
    ],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 400, bottom: 400, left: 500, right: 500 },
          size: { width: 11906, height: 16838 }, // A4
        },
        
        type: SectionType.CONTINUOUS,
      },
      children: [
        // Title
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: 'שכונה 360° — דוח הערכה', font: 'David', size: 32, bold: true, rightToLeft: true })],
        }),
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: `ציון כולל: ${score}/${TOTAL_MAX_SCORE}`, font: 'David', size: 26, bold: true, color: '2A9D8F', rightToLeft: true })],
        }),

        // Project details heading
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 80, after: 40 },
          children: [new TextRun({ text: 'פרטי הפרויקט', font: 'David', size: 22, bold: true, rightToLeft: true })],
        }),
        infoTable,

        // Chapter scores heading
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 120, after: 40 },
          children: [new TextRun({ text: 'ניקוד לפי פרק', font: 'David', size: 22, bold: true, rightToLeft: true })],
        }),
        chapterTable,

        // Indicators heading
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 120, after: 40 },
          children: [new TextRun({ text: 'פירוט כל המדדים (1-44)', font: 'David', size: 22, bold: true, rightToLeft: true })],
        }),
        indicatorsTable,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const date = new Date().toISOString().split('T')[0];
  saveAs(blob, `shchuna360-${project.name}-${date}.docx`);
}
