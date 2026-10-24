# שכונה 360 — מד ביצוע שכונתי

Neighborhood 360 Performance Dashboard — אפליקציית React בעברית (RTL) להערכת שכונות
לפי 44 מדדים ב־3 פרקים (חוברת "שכונה 360" גרסה 2.0).

## הרצה מקומית

```bash
npm install
npm run dev
```

בנייה לפרודקשן:

```bash
npm run build
```

## מה יש כאן

- `src/data/indicators.ts` — 44 המדדים: כותרת, הנחיה, פרק, נושא, ניקוד מקסימלי.
- `src/lib/scoring.ts` — חישוב הניקוד הכולל (0–120) וציוני הפרקים.
- `src/lib/export.ts` — ייצוא דוח Word (.docx) בעברית RTL.
- `src/pages/` — מנהל הפרויקטים ולוח המדדים.
- `src/components/` — כרטיסי מדדים, מודלים, טיימליין, פילטרים.

פרויקטים נשמרים מקומית בדפדפן (localStorage).
