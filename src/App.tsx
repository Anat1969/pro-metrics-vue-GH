import { useState, useEffect, useRef } from 'react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { type Project } from '@/data/indicators';
import HomeView from './pages/HomeView';
import DashboardView from './pages/DashboardView';
import NotFound from './pages/NotFound';

const STORAGE_KEY = 'shchuna360_projects';

export type SaveInfo = { at: number | null; error: boolean };
export interface AppProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  saved: SaveInfo;
}

const App = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [saved, setSaved] = useState<SaveInfo>({ at: null, error: false });
  const first = useRef(true);

  // כל שינוי נשמר מיד, עם חיווי "נשמר" בכפתור הלוגו ובכותרת הפרויקט.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      setSaved({ at: Date.now(), error: false });
    } catch {
      setSaved(s => ({ ...s, error: true }));
    }
  }, [projects]);

  const props = { projects, setProjects, saved };
  return (
    <TooltipProvider>
      <Sonner position="bottom-left" />
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomeView {...props} />} />
          <Route path="/project/:id" element={<DashboardView {...props} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  );
};

export default App;
