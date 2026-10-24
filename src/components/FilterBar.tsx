import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CHAPTERS, TOPICS } from '@/data/indicators';
import { Search } from 'lucide-react';

export type SortOption = 'booklet' | 'chapter' | 'topic' | 'status' | 'score_desc' | 'score_asc' | 'chronological';

interface FilterBarProps {
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  activeChapter: string;
  onChapterChange: (v: string) => void;
  activeTopic: string;
  onTopicChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  sortBy, onSortChange,
  activeChapter, onChapterChange,
  activeTopic, onTopicChange,
  search, onSearchChange,
}) => {
  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'booklet', label: 'סדר החוברת (1-44)' },
    { value: 'chapter', label: 'פרק' },
    { value: 'topic', label: 'נושא' },
    { value: 'status', label: 'סטטוס' },
    { value: 'score_desc', label: 'ניקוד — גבוה לנמוך' },
    { value: 'score_asc', label: 'ניקוד — נמוך לגבוה' },
    { value: 'chronological', label: 'סדר כרונולוגי' },
  ];

  const pillClass = (active: boolean) =>
    `pill ${active ? 'pill-active' : ''}`;

  return (
    <div className="space-y-4">
      {/* Row 1: Sort + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-48">
          <Select value={sortBy} onValueChange={v => onSortChange(v as SortOption)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="מיון לפי" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="חפש לפי שם, מספר מדד או נושא..."
            className="h-9 text-xs pr-9"
            aria-label="חיפוש מדד"
          />
        </div>
      </div>

      {/* Row 2: Chapter pills */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-2 tracking-wide">פרקים</p>
        <div className="flex flex-wrap gap-2">
          <button className={pillClass(activeChapter === 'הכל')} onClick={() => onChapterChange('הכל')}>הכל</button>
          {CHAPTERS.map(ch => (
            <button key={ch} className={pillClass(activeChapter === ch)} onClick={() => onChapterChange(ch)}>
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: Topic pills */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-2 tracking-wide">נושאים</p>
        <div className="flex flex-wrap gap-2">
          <button className={pillClass(activeTopic === 'הכל')} onClick={() => onTopicChange('הכל')}>הכל</button>
          {TOPICS.map(topic => (
            <button key={topic} className={pillClass(activeTopic === topic)} onClick={() => onTopicChange(topic)}>
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
