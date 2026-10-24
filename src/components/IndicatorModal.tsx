import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  type Indicator, type IndicatorData, type IndicatorStatus, type Project,
  CHAPTER_HEX, TOPIC_HEX, STATUS_LABELS,
} from '@/data/indicators';
import { PRACTICES, EFFORT_LABELS, ZONE_LABELS } from '@/data/practices';
import { levelsFor, suggestScore, suggestStatus } from '@/lib/autoscore';
import { ClipboardCheck, Box, SlidersHorizontal, Wand2, FileCheck2, Lightbulb } from 'lucide-react';

const NeighborhoodScene = lazy(() => import('@/components/three/NeighborhoodScene'));

interface IndicatorModalProps {
  open: boolean;
  indicator: Indicator | null;
  data: IndicatorData | undefined;
  /** the project, so the 3D preview can show the whole neighborhood with this indicator's draft score */
  project?: Project;
  onClose: () => void;
  onSave: (indicatorId: string, data: IndicatorData) => void;
}

const STATUSES: IndicatorStatus[] = ['not_started', 'in_progress', 'completed', 'not_relevant'];
type Tab = 'assess' | 'practice' | 'twin';

const IndicatorModal: React.FC<IndicatorModalProps> = ({ open, indicator, data, project, onClose, onSave }) => {
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<IndicatorStatus>('not_started');
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState<boolean[]>([]);
  const [tab, setTab] = useState<Tab>('assess');

  const practice = indicator ? PRACTICES[indicator.id] : null;

  useEffect(() => {
    const n = practice?.checks.length ?? 0;
    if (data) {
      setScore(data.score);
      setStatus(data.status);
      setNotes(data.notes);
      setChecks(Array.from({ length: n }, (_, i) => !!data.checks?.[i]));
    } else {
      setScore(0);
      setStatus('not_started');
      setNotes('');
      setChecks(Array.from({ length: n }, () => false));
    }
  }, [data, indicator, practice]);

  useEffect(() => { if (open) setTab('assess'); }, [open, indicator]);

  // live levels: the rest of the project + this indicator's draft score
  const levels = useMemo(() => {
    const base = levelsFor(project ?? null);
    if (indicator) base[indicator.id] = status === 'not_relevant' ? 0 : score / indicator.maxScore;
    return base;
  }, [project, indicator, score, status]);

  if (!indicator || !practice) return null;

  const suggested = suggestScore(indicator, checks);
  const met = checks.filter(Boolean).length;

  const toggleCheck = (i: number) => {
    setChecks(prev => prev.map((c, k) => (k === i ? !c : c)));
  };

  const applySuggestion = () => {
    setScore(suggested);
    setStatus(suggestStatus(indicator, checks));
  };

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
      checks,
    });
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'assess', label: 'הערכה', icon: SlidersHorizontal },
    { key: 'practice', label: `בדיקה מעשית ${met}/${checks.length}`, icon: ClipboardCheck },
    { key: 'twin', label: 'הדמיה תלת-ממדית', icon: Box },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-card border-border max-h-[92vh] overflow-y-auto shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-semibold leading-snug">{indicator.titleHe}</DialogTitle>
          <DialogDescription className="sr-only">פרטי מדד</DialogDescription>
        </DialogHeader>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-1">
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
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
            מאמץ: {EFFORT_LABELS[practice.effort]}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-2 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'assess' && (
          <div className="animate-fade-in">
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
                <div className="flex items-center gap-2">
                  {suggested !== score && met > 0 && (
                    <button onClick={applySuggestion} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <Wand2 className="w-3.5 h-3.5" /> מוצע לפי הבדיקה: {suggested}
                    </button>
                  )}
                  <div className="flex items-baseline gap-1 bg-primary/8 border border-primary/15 rounded-lg px-3 py-1">
                    <span className="font-mono-label text-xl font-bold text-primary">{score}</span>
                    <span className="text-xs text-muted-foreground">/{indicator.maxScore}</span>
                  </div>
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
          </div>
        )}

        {tab === 'practice' && (
          <div className="animate-fade-in space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
              <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">איך מיישמים בפועל</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{practice.howTo}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">רשימת בדיקה</Label>
                <span className="text-xs text-muted-foreground font-mono-label">{met}/{checks.length} מתקיימים</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${checks.length ? (met / checks.length) * 100 : 0}%`, background: 'var(--gradient-hero)' }} />
              </div>
              <ul className="space-y-2">
                {practice.checks.map((c, i) => (
                  <li key={i}>
                    <label className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${checks[i] ? 'border-primary/40 bg-accent/60' : 'border-border hover:bg-muted/50'}`}>
                      <Checkbox checked={!!checks[i]} onCheckedChange={() => toggleCheck(i)} className="mt-0.5" />
                      <span className={`text-sm leading-relaxed ${checks[i] ? 'text-foreground' : 'text-foreground/80'}`}>{c}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-2"><FileCheck2 className="w-4 h-4" /> אסמכתאות לצרף</Label>
              <div className="flex flex-wrap gap-2">
                {practice.evidence.map(e => (
                  <span key={e} className="text-xs px-2.5 py-1 rounded-md bg-muted text-foreground/80">{e}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-4">
              <div>
                <p className="text-sm text-muted-foreground">ניקוד מוצע אוטומטית</p>
                <p className="font-mono-label text-2xl font-bold text-primary">{suggested}<span className="text-sm text-muted-foreground">/{indicator.maxScore}</span></p>
              </div>
              <Button onClick={applySuggestion} variant="secondary" className="gap-2">
                <Wand2 className="w-4 h-4" /> החל ניקוד וסטטוס מוצעים
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">הניקוד המוצע יחסי לשיעור הבדיקות שמתקיימות — יש לאמת מול ספי הניקוד בחוברת (עמ' {indicator.page}).</p>
          </div>
        )}

        {tab === 'twin' && (
          <div className="animate-fade-in space-y-3">
            <p className="text-sm text-muted-foreground">
              האזור <span className="font-semibold text-foreground">{ZONE_LABELS[practice.zone]}</span> בתאום הדיגיטלי מגיב בזמן אמת לניקוד — הזיזו את הסליידר וצפו בשינוי.
            </p>
            <div className="h-[380px] rounded-xl overflow-hidden border border-border bg-muted">
              <Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground">טוען הדמיה…</div>}>
                <NeighborhoodScene levels={levels} highlightId={indicator.id} compact controls />
              </Suspense>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">ניקוד {score}/{indicator.maxScore}</Label>
              <Slider value={[score]} onValueChange={([v]) => setScore(v)} min={0} max={indicator.maxScore} step={1} aria-label="ניקוד מדד" />
            </div>
          </div>
        )}

        {/* Last updated */}
        {data?.lastUpdated && (
          <p className="text-[11px] text-muted-foreground mt-2 font-mono-label">
            עודכן {new Date(data.lastUpdated).toLocaleString('he-IL')}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <Button onClick={handleSave} className="flex-1 shadow-sm">שמור</Button>
          <Button onClick={onClose} variant="outline" className="flex-1">ביטול</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IndicatorModal;
