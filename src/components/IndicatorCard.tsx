import React from 'react';
import { type Indicator, type IndicatorData, CHAPTER_HEX, TOPIC_HEX, STATUS_LABELS } from '@/data/indicators';
import { getScoreColor, getScoreDotColor } from '@/lib/scoring';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface IndicatorCardProps {
  indicator: Indicator;
  data: IndicatorData | undefined;
  index: number;
  onClick: () => void;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ indicator, data, index, onClick }) => {
  const status = data?.status ?? 'not_started';
  const score = data?.score ?? 0;
  const truncatedGuidance = indicator.guidanceHe.length > 65
    ? indicator.guidanceHe.slice(0, 65) + '…'
    : indicator.guidanceHe;
  const progress = status === 'not_started' ? 0 : status === 'completed' ? 100 : 50;
  const chapterColor = CHAPTER_HEX[indicator.chapter];
  const topicColor = TOPIC_HEX[indicator.topic];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card
          className="card-elevated group cursor-pointer relative overflow-hidden"
          onClick={onClick}
          role="button"
          tabIndex={0}
          aria-label={`מדד: ${indicator.titleHe}`}
          onKeyDown={e => e.key === 'Enter' && onClick()}
        >
          {/* Chapter accent — top gradient stripe */}
          <div
            className="absolute top-0 inset-x-0 h-[3px]"
            style={{ background: `linear-gradient(90deg, ${chapterColor}, ${topicColor})` }}
          />

          <CardContent className="p-5 pt-6">
            {/* Index badge — styled with chapter tint */}
            <span
              className="absolute top-4 left-3 font-mono-label text-xs font-bold rounded-lg px-2 py-1"
              style={{ backgroundColor: chapterColor + '12', color: chapterColor }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span
                className="px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: chapterColor + '18', color: chapterColor }}
              >
                {indicator.chapter}
              </span>
              <span
                className="px-2.5 py-0.5 rounded-lg text-xs font-medium border"
                style={{ borderColor: topicColor + '40', color: topicColor, backgroundColor: topicColor + '08' }}
              >
                {indicator.topic}
              </span>
            </div>

            {/* Title */}
            <h4 className="text-base font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
              {indicator.titleHe}
            </h4>

            {/* Guidance */}
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {truncatedGuidance}
            </p>

            {/* Score + Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${getScoreDotColor(score, indicator.maxScore, status)}`} />
                <span className={`font-mono-label text-base font-bold ${getScoreColor(score, indicator.maxScore, status)}`}>
                  {status === 'not_started' ? '—' : `${score}/${indicator.maxScore}`}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {STATUS_LABELS[status]}
              </span>
            </div>

            {/* Last updated */}
            {data?.lastUpdated && (
              <p className="text-xs text-muted-foreground mt-2 opacity-70">
                עודכן {new Date(data.lastUpdated).toLocaleDateString('he-IL')}
              </p>
            )}

            {/* Progress bar — chapter-tinted */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-muted">
              <div
                className="h-full transition-all duration-700 ease-out"
                style={{
                  width: `${progress}%`,
                  background: progress === 100
                    ? `linear-gradient(90deg, ${chapterColor}, ${topicColor})`
                    : chapterColor,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm bg-card border-border text-foreground p-4 shadow-lg">
        <p className="text-sm leading-relaxed">{indicator.guidanceHe}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default IndicatorCard;
