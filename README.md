# שכונה 360°

**[shchuna-360.vercel.app](https://shchuna-360.vercel.app)** · הכתובת החיה
קישור למיזוג האחרון, בלי Vercel: [raw.githack](https://raw.githack.com/Anat1969/pro-metrics-vue-GH/main/app/index.html) (בפעם הראשונה: "Open the page").

כלי הערכה לתכנון שכונה בת־קיימא, של **עיריית אשדוד** (Ashdod Municipality).
**44** מדדים, **118** נקודות, ושושנה אחת שמראה במבט איפה השכונה חזקה ואיפה נשארו נקודות.

## מה יש בו
- **דף בית:** השכונה בתלת־ממד (הטלה איזומטרית ב-SVG). מבנה לכל מדד, גובהו לפי הציון.
- **לוח פרויקט במסך אחד:** רשימה ומסננים, שושנת 360°, ועריכת המדד בטור צד. שמירה אוטומטית.
- **הערכה אוטומטית שמסבירה את עצמה:** מה חושב בקוד, מה קבע איש המקצוע, והמגבלה.
- **הזדמנויות:** המדדים עם הכי הרבה נקודות פתוחות.
- **יומן שינויים** ו**דוח Word** לצירוף לתיק התכנון.
- התקנה מ-Chrome, נייד, RTL, הפחתת תנועה.

## הרצה
```
npm install
npm run dev          # פיתוח
npm run build        # Vercel
npm run build:github # app/ לקישור raw.githack
node tests/e2e.cjs http://127.0.0.1:4170/ <dir-with-ai-menu.js-and-ashdod-logo.png>
```

## מבנה
- `src/data/indicators.ts`: מקור הנתונים היחיד (מדדים, פרקים, צבעים).
- `src/lib/scoring.ts`: חישוב, הזדמנויות, חיפוש בעברית.
- `src/lib/rose.ts`: גאומטריית השושנה (רוחב לפי משקל, שטח לפי ציון).
- `src/components/Rose.tsx`, `IsoRose.tsx`: השושנה והתלת־ממד.
- `src/pages/HomeView.tsx`, `DashboardView.tsx`: שני הדפים. המצב נשמר בכתובת (`?i=`, `?ch=`, `?t=`, `?v=log`).
- הנתונים נשמרים ב-localStorage (`shchuna360_projects`), בדפדפן שבו נוצרו.
