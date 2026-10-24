import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { CHAPTERS, CHAPTER_HEX, INDICATORS, TOPIC_HEX, STATUS_LABELS, type Project } from '@/data/indicators';
import { chapterEarnedScore, chapterMaxScore } from '@/lib/scoring';

const UNIT = 1.25;
const COLS: Record<string, number> = { 'תשתית ובינוי': 5, 'מרחב טבעי וציבורי': 5, 'שימוש יעיל במשאבים': 3 };
const DISTRICT_X: Record<string, number> = { 'תשתית ובינוי': 12, 'מרחב טבעי וציבורי': -4, 'שימוש יעיל במשאבים': -17 };

const Tower: React.FC<{
  id: string; title: string; position: [number, number, number]; max: number; score: number;
  status: string; color: string; topicColor: string; onSelect?: (id: string) => void; index: number;
}> = ({ id, title, position, max, score, status, color, topicColor, onSelect, index }) => {
  const solid = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const target = status === 'not_relevant' ? 0.15 : Math.max(0.05, score * UNIT);
  const current = useRef(0.05);
  const delay = useRef(index * 0.04);
  useFrame((_, dt) => {
    if (delay.current > 0) { delay.current -= dt; return; }
    current.current = THREE.MathUtils.damp(current.current, target, 4, dt);
    if (solid.current) {
      solid.current.scale.y = current.current;
      solid.current.position.y = current.current / 2 + 0.2;
    }
  });
  const pct = max ? Math.round((score / max) * 100) : 0;
  const full = status !== 'not_relevant' && score >= max;
  return (
    <group
      position={position}
      onClick={e => { e.stopPropagation(); onSelect?.(id); }}
      onPointerOver={e => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
    >
      {/* base tile tinted by topic */}
      <RoundedBox args={[2.1, 0.2, 2.1]} radius={0.06} position={[0, 0.1, 0]} receiveShadow>
        <meshStandardMaterial color={topicColor} roughness={0.6} />
      </RoundedBox>
      {/* ghost = maximum achievable */}
      <mesh position={[0, (max * UNIT) / 2 + 0.2, 0]}>
        <boxGeometry args={[1.6, max * UNIT, 1.6]} />
        <meshStandardMaterial color={color} transparent opacity={hover ? 0.22 : 0.1} depthWrite={false} />
      </mesh>
      <lineSegments position={[0, (max * UNIT) / 2 + 0.2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.6, max * UNIT, 1.6)]} />
        <lineBasicMaterial color={color} transparent opacity={0.5} />
      </lineSegments>
      {/* solid = earned */}
      <mesh ref={solid} castShadow>
        <boxGeometry args={[1.5, 1, 1.5]} />
        <meshPhysicalMaterial
          color={status === 'not_relevant' ? '#9ca3af' : color}
          roughness={0.25} metalness={0.15} clearcoat={0.6}
          emissive={full ? color : '#000'} emissiveIntensity={full ? 0.35 : 0}
        />
      </mesh>
      {hover && (
        <Html position={[0, max * UNIT + 1.4, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div dir="rtl" className="px-3 py-2 rounded-lg bg-white/95 dark:bg-zinc-900/95 shadow-xl border border-border text-xs whitespace-nowrap text-foreground">
            <div className="font-bold text-sm">{title}</div>
            <div className="text-muted-foreground">{score}/{max} · {pct}% · {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? ''}</div>
          </div>
        </Html>
      )}
    </group>
  );
};

const ScoreCity: React.FC<{ project: Project; onSelect?: (id: string) => void; className?: string }> = ({ project, onSelect, className = '' }) => {
  const towers = useMemo(() => {
    const out: React.ComponentProps<typeof Tower>[] = [];
    CHAPTERS.forEach(ch => {
      const list = INDICATORS.filter(i => i.chapter === ch);
      const cols = COLS[ch];
      list.forEach((ind, k) => {
        const d = project.indicators[ind.id];
        const col = k % cols, row = Math.floor(k / cols);
        out.push({
          id: ind.id, title: ind.titleHe, index: INDICATORS.indexOf(ind),
          position: [DISTRICT_X[ch] - col * 2.6 + ((cols - 1) * 2.6) / 2, 0, -5 + row * 2.6],
          max: ind.maxScore, score: d?.score ?? 0, status: d?.status ?? 'not_started',
          color: CHAPTER_HEX[ch], topicColor: TOPIC_HEX[ind.topic], onSelect,
        });
      });
    });
    return out;
  }, [project, onSelect]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [-6, 22, 30], fov: 40 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <color attach="background" args={['#0f1720']} />
        <fog attach="fog" args={['#0f1720', 45, 90]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[-15, 30, 20]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
        <Environment resolution={64} frames={1}>
          <Lightformer intensity={2} position={[0, 10, -10]} scale={[30, 6, 1]} />
          <Lightformer intensity={1} position={[-20, 4, 6]} scale={[10, 10, 1]} color="#c4b5fd" />
          <Lightformer intensity={1} position={[20, 4, 6]} scale={[10, 10, 1]} color="#fde68a" />
        </Environment>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#17212c" roughness={0.9} />
        </mesh>
        <gridHelper args={[80, 40, '#2b3a4a', '#1d2935']} position={[0, 0.01, 0]} />
        {CHAPTERS.map(ch => (
          <Html key={ch} position={[DISTRICT_X[ch], 0.2, 8.5]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div dir="rtl" className="text-center select-none rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur" style={{ color: CHAPTER_HEX[ch] }}>
              <div className="text-sm font-black whitespace-nowrap">{ch}</div>
              <div className="text-xs font-mono-label opacity-90">{chapterEarnedScore(project, ch)} / {chapterMaxScore(ch)}</div>
            </div>
          </Html>
        ))}
        {towers.map(t => <Tower key={t.id} {...t} />)}
        <ContactShadows position={[0, 0.02, 0]} opacity={0.5} scale={60} blur={2.4} far={20} />
        <OrbitControls makeDefault autoRotate autoRotateSpeed={0.4} enableDamping maxPolarAngle={Math.PI / 2.2} minDistance={10} maxDistance={70} />
      </Canvas>
      <div dir="rtl" className="absolute top-3 right-3 rounded-lg bg-black/55 backdrop-blur px-3 py-2 text-xs text-white/85 space-y-1 pointer-events-none">
        <div>גובה מלא שקוף = ניקוד מירבי · גוש צבעוני = ניקוד שהושג</div>
        <div>מגדל זוהר = מדד שהושג במלואו · אפור = לא רלוונטי</div>
      </div>
    </div>
  );
};

export default ScoreCity;
