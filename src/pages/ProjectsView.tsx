import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Project, INDICATORS } from '@/data/indicators';
import ProjectCard from '@/components/ProjectCard';
import NewProjectModal from '@/components/NewProjectModal';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Building2 } from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, setProjects }) => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = (data: { name: string; city: string; compound: string; lot: string; year: number; manager: string; role: string }) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
      indicators: {},
    };
    setProjects(prev => [...prev, newProject]);
    setModalOpen(false);
    navigate(`/project/${newProject.id}`);
  };

  const handleDelete = () => {
    if (deleteId) {
      setProjects(prev => prev.filter(p => p.id !== deleteId));
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Nature gradient top */}
      <div className="absolute inset-x-0 top-0 h-80 gradient-nature-bg pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-5 py-16">
        {/* Header */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-0 left-0">
            <ThemeToggle />
          </div>

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-warm mb-6 shadow-md">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>

          <h1 className="font-display text-5xl md:text-7xl gradient-title mb-5 leading-tight">
            שכונה 360°
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed mb-2">
            מערכת הערכה מקיפה לתכנון ופיתוח עירוני בר-קיימא
          </p>
          <p className="font-mono-label text-sm text-primary font-medium">
            {INDICATORS.length} מדדים · {120} נקודות · 3 פרקים
          </p>
          <Button
            onClick={() => setModalOpen(true)}
            className="mt-8 gap-2 shadow-md hover:shadow-lg transition-all text-base px-8 py-3 h-auto"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            פרויקט חדש
          </Button>
        </div>

        {/* Projects */}
        {projects.length === 0 ? (
          <div className="text-center py-24 animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-muted mb-6">
              <Building2 className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-2">אין פרויקטים עדיין</p>
            <p className="text-base text-muted-foreground mb-8">צור את הפרויקט הראשון שלך להתחלת ההערכה</p>
            <Button onClick={() => setModalOpen(true)} size="lg" className="text-base px-8 py-3 h-auto">
              צור פרויקט ראשון
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="section-frame">
              <div className="section-frame-header">
                <div>
                  <h3 className="section-title">הפרויקטים שלי</h3>
                  <p className="section-rationale">ניהול וצפייה בכל הפרויקטים שנוצרו — לחץ על כרטיס לצפייה בפירוט</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((p, i) => (
                <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <ProjectCard
                    project={p}
                    onOpen={id => navigate(`/project/${id}`)}
                    onDelete={id => setDeleteId(id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-lg">מחיקת פרויקט</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base">
              האם אתה בטוח שברצונך למחוק את הפרויקט? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-base">ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground text-base">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectsView;
