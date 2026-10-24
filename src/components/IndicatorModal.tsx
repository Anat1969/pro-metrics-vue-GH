import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  type Indicator, type IndicatorData, type IndicatorStatus,
  CHAPTER_HEX, TOPIC_HEX, STATUS_LABELS,
} from '@/data/indicators';

interface IndicatorModalProps {
  open: boolean;
  indicator: Indicator | null;
  data: IndicatorData | undefined;
  onClose: () => void;
  onSave: (indicatorId: string, data: IndicatorData) => void;
}

const STATUSES: IndicatorStatus[] = ['not_started', 'in_progress', 'completed', 'not_relevant'];

const IndicatorModal: React.FC<IndicatorModalProps> = ({ open, indicator, data, onClose, onSave }) => {
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<IndicatorStatus>('not_started');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (data) {
      setScore(data.score);
      setStatus(data.status);
      setNotes(data.notes);
    } else {
      setScore(0);
      setStatus('not_started');
      setNotes('');
    }
  }, [data, indicator]);

  if (!indicator) return null;

  const handleSave = () => {
    const now = new Date().toISOString();
    const oldScore = data?.score ?? 0;
    const history = [...(data?.history ?? [])];
    
    if (score !== oldScore || !data) {
      history.push({
        score,
        notes,
        timestamp: now,
        indicatorId: indicator.id,
        indicatorTitle: indicator.titleHe,
        oldScore,
      });
    }

    onSave(indicator.id, {
      score,
      status,
      notes,
      lastUpdated: now,
      history,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-semibold leading-snug">{indicator.titleHe}</DialogTitle>
          <DialogDescription className="sr-only">פרטי מדד</DialogDescription>
        </DialogHeader>

        {/* Badges */}
        <div className="flex gap-2 mb-3">
          <span
            className="px-2.5 py-1 rounded-md text-xs font-medium"
            style={{ backgroundColor: CHAPTER_HEX[indicator.chapter] + '18', color: CHAPTER_HEX[indicator.chapter] }}
          >
            {indicator.chapter}
          </span>
          <span
            className="px-2.5 py-1 rounded-md text-xs font-medium border"
            style={{ borderColor: TOPIC_HEX[indicator.topic] + '60', color: TOPIC_HEX[indicator.topic] }}
          >
            {indicator.topic}
          </span>
        </div>

        {/* Guidance */}
        <div className="surface-inset mb-5">
          <p className="text-sm text-foreground/80 leading-relaxed">{indicator.guidanceHe}</p>
          <p className="text-[11px] text-muted-foreground mt-2 font-mono-label">
            עמוד {indicator.page} · ניקוד מירבי {indicator.maxScore}
          </p>
        </div>

        {/* Score slider */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">ניקוד</Label>
            <div className="flex items-baseline gap-1 bg-primary/8 border border-primary/15 rounded-lg px-3 py-1">
              <span className="font-mono-label text-xl font-bold text-primary">{score}</span>
              <span className="text-xs text-muted-foreground">/{indicator.maxScore}</span>
            </div>
          </div>
          <Slider
            value={[score]}
            onValueChange={([v]) => setScore(v)}
            min={0}
            max={indicator.maxScore}
            step={1}
            aria-label="ניקוד מדד"
          />
        </div>

        {/* Status */}
        <div className="space-y-2 mb-5">
          <Label className="text-sm font-medium">סטטוס</Label>
          <Select value={status} onValueChange={v => {
            const newStatus = v as IndicatorStatus;
            setStatus(newStatus);
            if (newStatus === 'completed') setScore(indicator.maxScore);
            if (newStatus === 'not_started') setScore(0);
            if (newStatus === 'not_relevant') setScore(0);
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2 mb-5">
          <Label htmlFor="notes" className="text-sm font-medium">הערות והשלמות</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="הערות והשלמות..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Last updated */}
        {data?.lastUpdated && (
          <p className="text-[11px] text-muted-foreground mb-4 font-mono-label">
            עודכן {new Date(data.lastUpdated).toLocaleString('he-IL')}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1 shadow-sm">שמור</Button>
          <Button onClick={onClose} variant="outline" className="flex-1">ביטול</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IndicatorModal;
