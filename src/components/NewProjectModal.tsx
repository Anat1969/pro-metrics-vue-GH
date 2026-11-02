import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const ROLES = ['אדריכל', 'מנהל פרויקט', 'מהנדס', 'מתכנן ערים', 'אחר'];

export interface NewProjectData { name: string; city: string; compound: string; lot: string; year: number; manager: string; role: string }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: NewProjectData) => void;
}

const EMPTY = { city: 'אשדוד', name: '', compound: '', lot: '', year: new Date().getFullYear(), manager: '', role: '' };

/** טופס אמיתי, עם autocomplete, כדי ש-Chrome ימלא את שם המנהל. */
export default function NewProjectModal({ open, onClose, onCreate }: Props) {
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: k === 'year' ? Number(e.target.value) : e.target.value }));
  const ready = f.name && f.city && f.manager && f.role;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    onCreate(f);
    setF(EMPTY);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle style={{ fontSize: 20, fontWeight: 600 }}>פרויקט חדש</DialogTitle>
          <DialogDescription>ארבעה שדות חובה, והפרויקט נפתח. אפשר לשנות אחר כך.</DialogDescription>
        </DialogHeader>
        <form className="np-form" onSubmit={submit} autoComplete="on">
          <label>עיר<input className="field" name="city" autoComplete="address-level2" value={f.city} onChange={set('city')} required /></label>
          <label>שכונה<input className="field" name="neighborhood" autoComplete="off" value={f.name} onChange={set('name')} placeholder="למשל: רובע טו״ב" required /></label>
          <label>מתחם<input className="field" name="compound" autoComplete="off" value={f.compound} onChange={set('compound')} placeholder="לא חובה" /></label>
          <label>מגרש<input className="field" name="lot" autoComplete="off" value={f.lot} onChange={set('lot')} placeholder="לא חובה" /></label>
          <label>שנה<input className="field num" name="year" type="number" value={f.year} onChange={set('year')} style={{ textAlign: 'right' }} /></label>
          <label>שם המנהל<input className="field" name="name" autoComplete="name" value={f.manager} onChange={set('manager')} required /></label>
          <label className="np-wide">תפקיד
            <select className="field" name="role" value={f.role} onChange={set('role')} required>
              <option value="" disabled>בחירת תפקיד</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <button type="submit" className="press btn btn-solid np-wide" disabled={!ready}>יצירת הפרויקט</button>
          {!ready && <p className="src np-wide">חסר: {[!f.city && 'עיר', !f.name && 'שכונה', !f.manager && 'שם המנהל', !f.role && 'תפקיד'].filter(Boolean).join(', ')}.</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
