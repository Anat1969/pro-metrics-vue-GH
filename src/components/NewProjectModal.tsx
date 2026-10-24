import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const ROLES = ['אדריכל', 'מנהל פרויקט', 'מהנדס', 'מתכנן ערים', 'אחר'];

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; city: string; compound: string; lot: string; year: number; manager: string; role: string }) => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ open, onClose, onCreate }) => {
  const [city, setCity] = useState('');
  const [name, setName] = useState('');
  const [compound, setCompound] = useState('');
  const [lot, setLot] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [manager, setManager] = useState('');
  const [role, setRole] = useState('');

  const handleSubmit = () => {
    if (!name || !city || !manager || !role) return;
    onCreate({ name, city, compound, lot, year, manager, role });
    setCity('');
    setName('');
    setCompound('');
    setLot('');
    setYear(new Date().getFullYear());
    setManager('');
    setRole('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">פרויקט חדש</DialogTitle>
          <DialogDescription className="text-muted-foreground">הזן את פרטי הפרויקט</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="city">עיר</Label>
            <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="למשל: חיפה" />
          </div>
          <div>
            <Label htmlFor="name">שכונה</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="למשל: שכונת הדר" />
          </div>
          <div>
            <Label htmlFor="compound">מתחם</Label>
            <Input id="compound" value={compound} onChange={e => setCompound(e.target.value)} placeholder="למשל: מתחם A" />
          </div>
          <div>
            <Label htmlFor="lot">מגרש</Label>
            <Input id="lot" value={lot} onChange={e => setLot(e.target.value)} placeholder="למשל: מגרש 12" />
          </div>
          <div>
            <Label htmlFor="year">שנה</Label>
            <Input id="year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="manager">שם המנהל</Label>
            <Input id="manager" value={manager} onChange={e => setManager(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="role">תפקיד</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="בחר תפקיד" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={!name || !city || !manager || !role}>
            צור פרויקט
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;
