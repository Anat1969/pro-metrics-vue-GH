import React from 'react';
import { type Project, TOTAL_MAX_SCORE, INDICATORS } from '@/data/indicators';
import { calcFinalScore, countEvaluated } from '@/lib/scoring';
import ScoreRing from './ScoreRing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronLeft } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onDelete }) => {
  const score = calcFinalScore(project);
  const evaluated = countEvaluated(project);
  const totalIndicators = INDICATORS.length;
  const progress = Math.round((evaluated / totalIndicators) * 100);
  const scorePct = Math.round((score / TOTAL_MAX_SCORE) * 100);

  const statusLabel = evaluated === 0 ? 'טרם החל' : evaluated === totalIndicators ? 'הושלם' : 'בתהליך';
  const statusClasses = evaluated === 0
    ? 'bg-muted text-muted-foreground'
    : evaluated === totalIndicators
      ? 'bg-primary/10 text-primary'
      : 'bg-secondary/10 text-secondary';

  return (
    <Card className="card-elevated group cursor-pointer" onClick={() => onOpen(project.id)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <p className="text-base text-muted-foreground">{project.city} · {project.year}</p>
          </div>
          <ScoreRing score={scorePct} size={68} strokeWidth={5} />
        </div>

        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{evaluated}/{totalIndicators} מדדים</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${statusClasses}`}>
              {statusLabel}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: 'var(--gradient-hero)',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(project.createdAt).toLocaleDateString('he-IL')} · {score}/{TOTAL_MAX_SCORE} נק׳
          </p>
        </div>

        <div className="mt-5 flex gap-2" onClick={e => e.stopPropagation()}>
          <Button
            onClick={() => onOpen(project.id)}
            className="flex-1 gap-2 text-sm"
            size="sm"
          >
            פתח פרויקט
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onDelete(project.id)}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
