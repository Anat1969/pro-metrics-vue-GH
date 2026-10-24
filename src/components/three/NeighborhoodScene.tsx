import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Sky, Stars, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Pause, Play, RotateCcw, Sun, Moon } from 'lucide-react';
import { INDICATORS } from '@/data/indicators';
import { PRACTICES, type SceneZone } from '@/data/practices';
import { ClockContext, SEASON_LABELS, sunAltitudeDeg, sunVector, grassTexture, useClock, type Season, type SceneClock } from './env';
import { PickContext, createHoverStore, useHover, type HoverStore } from './pick';
import {
  type Levels, Streets, BikeNetwork, Traffic, Pedestrians, StreetTrees, Shade, Housing, Civic, Heritage,
  Park, Nature, Parking, StreetLights, ExistingCity, Remediation, Construction, PowerAndPollution,
  EnergyWaste, Innovation, WindFlow,
} from './parts';

/** Where the camera looks for each zone of the twin */
export const ZONE_POS: Record<SceneZone, [number, number, number]> = {
  civic: [15, 0, 14], housing: [-20, 0, -20], street: [0, 0, 0], transit: [-12, 0, 2], bike: [8, 0, -6],
  parking: [28, 0, 30], park: [-20, 0, 20], nature: [-30, 0, 31], water: [-20, 0, 20], energy: [22, 0, -22],
  waste: [11, 0, 28], edge: [-40, 0, 0], heritage: [-12, 0, 12], lights: [0, 0, 5], construction: [42, 0, -30],
  innovation: [40, 0, 4], wind: [0, 4, 0], trees: [-10, 0, 5], services: [16, 0, 22], school: [15, 0, -18],
  remediation: [42, 0, 34], power: [48, 0, -20],
};

const HOME_CAM = new THREE.Vector3(58, 52, 70);
const HOME_TARGET = new THREE.Vector3(0, 0, 0);

/* ───────────── Lighting driven by the real sun path ───────────── */

const SunRig: React.FC<{ compact: boolean; onTick?: (h: number) => void }> = ({ compact, onTick }) => {
  const clock = useClock();
  const light = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const [sunPos, setSunPos] = useState<[number, number, number]>([1, 1, 1]);
  const { scene } = useThree();
  const last = useRef({ hour: -1, season: '' as string, tick: 0 });
  const fogColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, dt) => {
    const c = clock.current;
    if (c.playing) {
      c.hour += dt * 0.6;
      if (c.hour > 20.5) c.hour = 4.5;
    }
    const v = sunVector(c.hour, c.season);
    const day = THREE.MathUtils.smoothstep(v.y, -0.08, 0.18);
    c.night = 1 - day;
    if (light.current) {
      light.current.position.set(v.x * 90, Math.max(v.y, 0.02) * 90, v.z * 90);
      light.current.intensity = day * 2.8;
      light.current.color.setHSL(0.09, 0.6, 0.55 + Math.min(v.y, 0.5) * 0.8);
    }
    if (hemi.current) hemi.current.intensity = 0.15 + day * 0.55;
    (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.12 + day * 0.55;
    if (scene.fog) {
      fogColor.setHSL(0.58, 0.35, 0.08 + day * 0.7);
      (scene.fog as THREE.Fog).color.copy(fogColor);
    }
    // the sky shader only needs updates when the sun moved noticeably
    if (Math.abs(last.current.hour - c.hour) > 0.05 || last.current.season !== c.season) {
      last.current.hour = c.hour; last.current.season = c.season;
      setSunPos([v.x * 100, v.y * 100, v.z * 100]);
    }
    last.current.tick += dt;
    if (onTick && last.current.tick > 0.15) { last.current.tick = 0; onTick(c.hour); }
  });

  const night = clock.current.night > 0.55;
  return (
    <>
      <Sky sunPosition={sunPos} turbidity={6} rayleigh={night ? 0.2 : 1.6} mieCoefficient={0.006} mieDirectionalG={0.85} distance={4500} />
      {night && <Stars radius={180} depth={40} count={2500} factor={4} fade speed={0.6} />}
      <hemisphereLight ref={hemi} args={['#dfefff', '#6b5a3e', 0.5]} />
      <directionalLight
        ref={light}
        castShadow
        shadow-mapSize={compact ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={70} shadow-camera-bottom={-70}
        shadow-camera-far={250} shadow-bias={-0.0004} shadow-normalBias={0.04}
      />
    </>
  );
};

/* ───────────── Camera flights ───────────── */

const CameraRig: React.FC<{ focus: [number, number, number] | null; autoRotate: boolean; nonce: number }> = ({ focus, autoRotate, nonce }) => {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void } | null };
  const flight = useRef<{ t: number; fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 } | null>(null);

  useEffect(() => {
    if (!controls) return;
    const toTarget = focus ? new THREE.Vector3(...focus) : HOME_TARGET.clone();
    const toPos = focus ? toTarget.clone().add(new THREE.Vector3(26, 30, 36)) : HOME_CAM.clone();
    flight.current = { t: 0, fromPos: camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget };
  }, [focus, controls, camera, nonce]);

  useFrame((_, dt) => {
    const f = flight.current;
    if (!f || !controls) return;
    f.t = Math.min(1, f.t + dt / 1.4);
    const e = 1 - Math.pow(1 - f.t, 3);
    camera.position.lerpVectors(f.fromPos, f.toPos, e);
    controls.target.lerpVectors(f.fromTarget, f.toTarget, e);
    controls.update();
    if (f.t >= 1) flight.current = null;
  });

  return (
    <OrbitControls
      makeDefault
      autoRotate={autoRotate}
      autoRotateSpeed={0.35}
      enableDamping
      maxPolarAngle={Math.PI / 2.15}
      minDistance={8}
      maxDistance={170}
    />
  );
};

/* ───────────── Highlight + hover label ───────────── */

const HighlightRing: React.FC<{ pos: [number, number, number]; label: string }> = ({ pos, label }) => {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.12;
    ring.current.scale.set(s, s, s);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(clock.elapsedTime * 3) * 0.25;
  });
  return (
    <group position={[pos[0], 0.3, pos[2]]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7, 7.6, 64]} />
        <meshBasicMaterial color="#ffd166" transparent opacity={0.7} depthWrite={false} />
      </mesh>
      <Html position={[0, 9, 0]} center zIndexRange={[20, 0]}>
        <div dir="rtl" className="px-3 py-1.5 rounded-lg bg-black/75 text-white text-sm font-semibold whitespace-nowrap shadow-lg border border-amber-300/50">
          {label}
        </div>
      </Html>
    </group>
  );
};

const HoverLabel: React.FC<{ store: HoverStore; levels: Levels }> = ({ store, levels }) => {
  const hover = useHover(store);
  if (!hover) return null;
  const ind = INDICATORS.find(i => i.id === hover.id);
  if (!ind) return null;
  const lv = Math.round((levels[hover.id] ?? 0) * 100);
  return (
    <Html position={[hover.point.x, hover.point.y + 1.5, hover.point.z]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div dir="rtl" className="px-3 py-2 rounded-lg bg-white/95 dark:bg-zinc-900/95 text-foreground shadow-xl border border-border text-xs whitespace-nowrap">
        <div className="font-bold text-sm">{ind.titleHe}</div>
        <div className="text-muted-foreground">{ind.topic} · מימוש {lv}% · לחץ לפתיחה</div>
      </div>
    </Html>
  );
};

/* ───────────── Public component ───────────── */

export interface NeighborhoodSceneProps {
  levels: Levels;
  highlightId?: string | null;
  onSelect?: (id: string) => void;
  autoRotate?: boolean;
  /** time-of-day / season control bar */
  controls?: boolean;
  /** lighter rendering for small embeds (dialogs, hero) */
  compact?: boolean;
  /** start with the day–night cycle running */
  cycle?: boolean;
  initialHour?: number;
  className?: string;
}

const NeighborhoodScene: React.FC<NeighborhoodSceneProps> = ({
  levels, highlightId = null, onSelect, autoRotate = false, controls = true, compact = false,
  cycle = false, initialHour = 15.5, className = '',
}) => {
  const clock = useRef<SceneClock>({ hour: initialHour, season: 'summer', playing: cycle, night: 0 });
  const hover = useMemo(() => createHoverStore(), []);
  const [hour, setHour] = useState(initialHour);
  const [season, setSeason] = useState<Season>('summer');
  const [playing, setPlaying] = useState(cycle);
  const [focusNonce, setFocusNonce] = useState(0);

  const highlight = highlightId ? INDICATORS.find(i => i.id === highlightId) : null;
  const zone = highlight ? PRACTICES[highlight.id]?.zone : null;
  const focus = zone ? ZONE_POS[zone] : null;

  const setH = (h: number) => { clock.current.hour = h; setHour(h); };
  const setS = (s: Season) => { clock.current.season = s; setSeason(s); };
  const togglePlay = () => { clock.current.playing = !clock.current.playing; setPlaying(clock.current.playing); };

  const alt = sunAltitudeDeg(hour, season);
  const hh = Math.floor(hour), mm = Math.round((hour - hh) * 60);
  const timeLabel = `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <Canvas
        shadows
        dpr={compact ? [1, 1.5] : [1, 2]}
        camera={{ position: HOME_CAM.toArray(), fov: 42, near: 0.5, far: 1200 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
        onPointerMissed={() => hover.set(null)}
      >
        <ClockContext.Provider value={clock}>
          <PickContext.Provider value={{ onSelect, hover }}>
            <fog attach="fog" args={['#cfe3f2', 110, 300]} />
            <SunRig compact={compact} onTick={playing ? setHour : undefined} />
            <Environment resolution={64} frames={1}>
              <Lightformer intensity={1.6} position={[0, 10, -20]} scale={[60, 10, 1]} color="#ffffff" />
              <Lightformer intensity={0.8} position={[-30, 5, 10]} scale={[20, 20, 1]} color="#ffe6c4" />
              <Lightformer intensity={0.6} position={[30, 5, 10]} scale={[20, 20, 1]} color="#cfe6ff" />
            </Environment>

            {/* terrain */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[1600, 1600]} />
              <meshStandardMaterial map={grassTexture()} roughness={1} color="#cfdcb4" />
            </mesh>

            <Streets lv={levels} />
            <BikeNetwork lv={levels} />
            <Traffic lv={levels} />
            <Pedestrians lv={levels} />
            <StreetTrees lv={levels} />
            <Shade lv={levels} />
            <Housing lv={levels} />
            <Civic lv={levels} />
            <Heritage lv={levels} />
            <Park lv={levels} />
            <Nature lv={levels} />
            <Parking lv={levels} />
            <StreetLights lv={levels} />
            <ExistingCity lv={levels} />
            <Remediation lv={levels} />
            <Construction lv={levels} />
            <PowerAndPollution lv={levels} />
            <EnergyWaste lv={levels} />
            <Innovation lv={levels} />
            <WindFlow lv={levels} />

            {highlight && zone && <HighlightRing pos={ZONE_POS[zone]} label={highlight.titleHe} />}
            <HoverLabel store={hover} levels={levels} />
            <CameraRig focus={focus} autoRotate={autoRotate} nonce={focusNonce} />

            {!compact && (
              <EffectComposer multisampling={4}>
                <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
                <Vignette offset={0.25} darkness={0.55} />
              </EffectComposer>
            )}
          </PickContext.Provider>
        </ClockContext.Provider>
      </Canvas>

      {controls && (
        <div dir="rtl" className="absolute bottom-3 inset-x-3 flex flex-wrap items-center gap-3 rounded-xl bg-background/80 backdrop-blur-md border border-border px-3 py-2 shadow-lg text-sm">
          <button onClick={togglePlay} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 font-semibold" aria-label={playing ? 'עצור מחזור יום' : 'הפעל מחזור יום'}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {playing ? 'עצור' : 'מחזור יום'}
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            {alt > 0 ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            <input
              type="range" min={4.5} max={20.5} step={0.05} value={hour}
              onChange={e => { if (clock.current.playing) togglePlay(); setH(parseFloat(e.target.value)); }}
              className="flex-1 accent-[hsl(var(--primary))]" aria-label="שעה ביום"
            />
            <span className="font-mono-label tabular-nums w-12 text-center">{timeLabel}</span>
          </div>
          <div className="flex gap-1">
            {(Object.keys(SEASON_LABELS) as Season[]).map(s => (
              <button key={s} onClick={() => setS(s)}
                className={`rounded-md px-2 py-1 text-xs font-medium border ${season === s ? 'bg-accent text-accent-foreground border-primary/40' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {SEASON_LABELS[s].split(' · ')[0]}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-mono-label hidden md:inline">
            גובה שמש {alt.toFixed(0)}° · אשדוד 31.8°N
          </span>
          <button onClick={() => setFocusNonce(n => n + 1)} className="text-muted-foreground hover:text-foreground" aria-label="איפוס מצלמה">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default NeighborhoodScene;
