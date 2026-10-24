import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line, Sparkles } from '@react-three/drei';
import { Pick } from './pick';
import { facadeTextures, mulberry, spread, useClock } from './env';

/** Levels map: indicator id → 0..1 fulfilment */
export type Levels = Record<string, number>;
const L = (lv: Levels, id: string) => lv[id] ?? 0;

/* ───────────── shared geometries / materials ───────────── */

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
const sphere = new THREE.IcosahedronGeometry(1, 1);
const cone = new THREE.ConeGeometry(1, 1, 16, 1, true);

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

const M = {
  asphalt: mat('#3a3d42', { roughness: 0.95 }),
  sidewalk: mat('#cfc8bb'),
  curb: mat('#e8e3da'),
  stripe: mat('#f5f5f0'),
  bikeLane: mat('#2f9e6a', { roughness: 0.9 }),
  trunk: mat('#6b4a2f'),
  paving: mat('#e3d6c0'),
  plaza: mat('#d8c7a8'),
  wood: mat('#9a6b43'),
  steel: mat('#8c939b', { metalness: 0.6, roughness: 0.35 }),
  darkSteel: mat('#4a4f56', { metalness: 0.6, roughness: 0.4 }),
  glass: mat('#9fc4d8', { metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.55 }),
  pv: mat('#1d2f55', { metalness: 0.5, roughness: 0.2 }),
  roofDark: mat('#4f4f52'),
  roofCool: mat('#f3f1ec', { roughness: 0.6 }),
  roofGreen: mat('#5d9a45'),
  stone: mat('#cdb48c', { roughness: 0.95 }),
  rock: mat('#9a958c', { flatShading: true }),
  water: mat('#3d84b8', { metalness: 0.35, roughness: 0.06, transparent: true, opacity: 0.88 }),
  rainGarden: mat('#4e8a6a'),
  soilBad: mat('#6e5133', { roughness: 1 }),
  soil: mat('#8b6a45', { roughness: 1 }),
  grassLight: mat('#8fbf62'),
  field: mat('#4f9a52'),
  concrete: mat('#b9b4ab'),
  existing: mat('#9aa0a6'),
  white: mat('#fafafa'),
  skin: mat('#e0b48f'),
  orange: mat('#e8833a'),
  fence: mat('#7c5d3c'),
};

const FOLIAGE = ['#3f7d3a', '#4b8a3f', '#5b9844', '#2f6e3c', '#6aa04a'].map(c => mat(c, { flatShading: true }));
const CAR_COLORS = ['#c0392b', '#2c3e50', '#ecf0f1', '#7f8c8d', '#2980b9', '#16a085', '#f1c40f'].map(c => mat(c, { metalness: 0.5, roughness: 0.35 }));
const CLOTHES = ['#e74c3c', '#3498db', '#f39c12', '#8e44ad', '#16a085', '#34495e', '#d35400'].map(c => mat(c));
const BUILDING_COLORS = ['#efe7da', '#e9d8c3', '#d7dfe6', '#efe1cf', '#e3e7df', '#f1dccb'];

const Mesh: React.FC<{
  g?: THREE.BufferGeometry; m: THREE.Material; p?: [number, number, number]; s?: [number, number, number];
  r?: [number, number, number]; cast?: boolean; receive?: boolean;
}> = ({ g = box, m, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], cast = true, receive = true }) => (
  <mesh geometry={g} material={m} position={p} scale={s} rotation={r} castShadow={cast} receiveShadow={receive} />
);

/* ───────────── Streets ───────────── */

export const Streets: React.FC<{ lv: Levels }> = ({ lv }) => {
  const raised = L(lv, 'b02') >= 0.5;
  const zebra = (cx: number, cz: number, alongX: boolean) =>
    Array.from({ length: 6 }, (_, i) => {
      const o = -2.5 + i;
      return (
        <Mesh key={i} m={M.stripe} cast={false}
          p={alongX ? [cx + o, raised ? 0.2 : 0.03, cz] : [cx, raised ? 0.2 : 0.03, cz + o]}
          s={alongX ? [0.5, 0.02, 2.2] : [2.2, 0.02, 0.5]} />
      );
    });
  return (
    <group>
      {/* main E–W street and N–S cross street */}
      <Mesh m={M.asphalt} p={[0, 0.01, 0]} s={[110, 0.02, 6]} cast={false} />
      <Mesh m={M.asphalt} p={[0, 0.012, 0]} s={[6, 0.02, 110]} cast={false} />
      {/* sidewalks */}
      {[-4.25, 4.25].map(z => <Mesh key={'sx' + z} m={M.sidewalk} p={[0, 0.08, z]} s={[110, 0.16, 2.5]} cast={false} />)}
      {[-4.25, 4.25].map(x => <Mesh key={'sz' + x} m={M.sidewalk} p={[x, 0.081, 0]} s={[2.5, 0.16, 110]} cast={false} />)}
      {/* lane dashes */}
      {Array.from({ length: 26 }, (_, i) => -52 + i * 4).filter(x => Math.abs(x) > 6).map(x => (
        <Mesh key={'d' + x} m={M.stripe} p={[x, 0.025, 0]} s={[1.8, 0.01, 0.14]} cast={false} />
      ))}
      {/* traffic calming: raised crosswalks */}
      <Pick id="b02">
        {raised && [[-4.6, 0], [4.6, 0]].map(([x], i) => (
          <Mesh key={'rx' + i} m={M.paving} p={[x, 0.1, 0]} s={[2.6, 0.18, 6]} cast={false} />
        ))}
        {raised && [[0, -4.6], [0, 4.6]].map(([, z], i) => (
          <Mesh key={'rz' + i} m={M.paving} p={[0, 0.1, z]} s={[6, 0.18, 2.6]} cast={false} />
        ))}
        {zebra(-4.6, 0, false)}{zebra(4.6, 0, false)}{zebra(0, -4.6, true)}{zebra(0, 4.6, true)}
      </Pick>
    </group>
  );
};

/* ───────────── Bike network ───────────── */

export const BikeNetwork: React.FC<{ lv: Levels }> = ({ lv }) => {
  const lane = L(lv, 'b04');
  const racks = Math.round(L(lv, 'b05') * 8);
  const riders = useRef<THREE.Group>(null);
  const n = Math.round(lane * 5);
  useFrame((_, dt) => {
    riders.current?.children.forEach((c, i) => {
      c.position.x += (i % 2 ? -1 : 1) * dt * 4.5;
      if (c.position.x > 52) c.position.x = -52;
      if (c.position.x < -52) c.position.x = 52;
    });
  });
  return (
    <group>
      <Pick id="b04">
        {lane > 0 && (
          <>
            <Mesh m={M.bikeLane} p={[0, 0.17, -6.2]} s={[110 * Math.max(0.35, lane), 0.02, 1.8]} cast={false} />
            {Array.from({ length: 14 }, (_, i) => -45 + i * 7).map(x => (
              <Mesh key={x} m={M.stripe} p={[x, 0.185, -6.2]} s={[1, 0.005, 0.08]} cast={false} />
            ))}
          </>
        )}
        <group ref={riders}>
          {Array.from({ length: n }, (_, i) => (
            <group key={i} position={[-50 + i * 21, 0.18, -6.2 + (i % 2 ? 0.4 : -0.4)]} rotation={[0, i % 2 ? Math.PI : 0, 0]}>
              <Mesh g={cyl} m={M.darkSteel} p={[0.45, 0.35, 0]} s={[0.33, 0.05, 0.33]} r={[Math.PI / 2, 0, 0]} />
              <Mesh g={cyl} m={M.darkSteel} p={[-0.45, 0.35, 0]} s={[0.33, 0.05, 0.33]} r={[Math.PI / 2, 0, 0]} />
              <Mesh m={CLOTHES[i % CLOTHES.length]} p={[0, 1.05, 0]} s={[0.3, 0.6, 0.3]} />
              <Mesh g={sphere} m={M.skin} p={[0.05, 1.5, 0]} s={[0.15, 0.15, 0.15]} />
            </group>
          ))}
        </group>
      </Pick>
      <Pick id="b05">
        {Array.from({ length: racks }, (_, i) => (
          <mesh key={i} position={[9 + i * 0.9, 0.5, 6.4]} castShadow>
            <torusGeometry args={[0.35, 0.04, 6, 16, Math.PI]} />
            <meshStandardMaterial color="#5d6670" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </Pick>
    </group>
  );
};

/* ───────────── Traffic: cars + buses ───────────── */

export const Traffic: React.FC<{ lv: Levels }> = ({ lv }) => {
  const buses = Math.round(L(lv, 'b03') * 3);
  const calm = L(lv, 'b02');
  const parkingReduction = L(lv, 'b06');
  const cars = Math.round(9 - parkingReduction * 4);
  const ref = useRef<THREE.Group>(null);
  const speedCar = 11 - calm * 5;
  useFrame((_, dt) => {
    ref.current?.children.forEach(c => {
      const dir = c.userData.dir as number;
      c.position.x += dir * dt * (c.userData.bus ? 6 : speedCar);
      if (c.position.x > 55) c.position.x = -55;
      if (c.position.x < -55) c.position.x = 55;
    });
  });
  const { day } = facadeTextures();
  const busMat = useMemo(() => {
    const t = day.clone(); t.repeat.set(2, 0.25); t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color: '#2fa36b', map: t, roughness: 0.4, metalness: 0.2 });
  }, [day]);
  return (
    <group>
      <group ref={ref}>
        {Array.from({ length: cars }, (_, i) => {
          const dir = i % 2 ? -1 : 1;
          return (
            <group key={'c' + i} position={[-50 + i * 12.3, 0, dir * 1.5]} userData={{ dir }} rotation={[0, dir > 0 ? 0 : Math.PI, 0]}>
              <Mesh m={CAR_COLORS[i % CAR_COLORS.length]} p={[0, 0.55, 0]} s={[2.6, 0.6, 1.3]} />
              <Mesh m={M.glass} p={[-0.15, 1.05, 0]} s={[1.4, 0.5, 1.15]} />
              {[[-0.85, 0.6], [0.85, 0.6], [-0.85, -0.6], [0.85, -0.6]].map(([x, z], k) => (
                <Mesh key={k} g={cyl} m={M.darkSteel} p={[x, 0.3, z]} s={[0.3, 0.15, 0.3]} r={[Math.PI / 2, 0, 0]} />
              ))}
            </group>
          );
        })}
        {Array.from({ length: buses }, (_, i) => {
          const dir = i % 2 ? -1 : 1;
          return (
            <Pick key={'b' + i} id="b03">
              <group position={[-30 + i * 37, 0, dir * 1.5]} userData={{ dir, bus: true }} rotation={[0, dir > 0 ? 0 : Math.PI, 0]}>
                <mesh geometry={box} material={busMat} position={[0, 1.45, 0]} scale={[7, 2.3, 2.1]} castShadow receiveShadow />
                <Mesh m={M.white} p={[0, 2.66, 0]} s={[6.6, 0.12, 1.9]} />
                {[-2.4, 2.4].map(x => [-0.95, 0.95].map(z => (
                  <Mesh key={x + '' + z} g={cyl} m={M.darkSteel} p={[x, 0.4, z]} s={[0.42, 0.2, 0.42]} r={[Math.PI / 2, 0, 0]} />
                )))}
              </group>
            </Pick>
          );
        })}
      </group>
      {/* bus shelters */}
      <Pick id="b03">
        {buses > 0 && [[-14, 5.2], [14, -5.2]].map(([x, z], i) => (
          <group key={i} position={[x, 0.16, z]}>
            <Mesh m={M.glass} p={[0, 1.2, z > 0 ? 0.6 : -0.6]} s={[3.2, 2.2, 0.06]} />
            <Mesh m={M.darkSteel} p={[0, 2.35, 0]} s={[3.6, 0.1, 1.6]} />
            {[-1.6, 1.6].map(px => <Mesh key={px} g={cyl} m={M.steel} p={[px, 1.2, 0]} s={[0.05, 2.3, 0.05]} />)}
            <Mesh m={M.wood} p={[0, 0.5, z > 0 ? 0.3 : -0.3]} s={[2.4, 0.08, 0.4]} />
          </group>
        ))}
      </Pick>
    </group>
  );
};

/* ───────────── Pedestrians ───────────── */

export const Pedestrians: React.FC<{ lv: Levels }> = ({ lv }) => {
  const n = Math.round(4 + ((L(lv, 'a14') + L(lv, 'b01')) / 2) * 22);
  const ref = useRef<THREE.Group>(null);
  const people = useMemo(() => {
    const r = mulberry(11);
    return Array.from({ length: n }, (_, i) => {
      const alongX = i % 2 === 0;
      const side = r() < 0.5 ? -1 : 1;
      const lane = side * (3.6 + r() * 1.2);
      return { alongX, lane, start: -48 + r() * 96, dir: r() < 0.5 ? -1 : 1, speed: 1 + r() * 0.8, phase: r() * 6, c: i % CLOTHES.length };
    });
  }, [n]);
  useFrame(({ clock }, dt) => {
    ref.current?.children.forEach((c, i) => {
      const p = people[i];
      if (!p) return;
      const key = p.alongX ? 'x' : 'z';
      c.position[key] += p.dir * p.speed * dt;
      if (c.position[key] > 50) c.position[key] = -50;
      if (c.position[key] < -50) c.position[key] = 50;
      c.position.y = 0.16 + Math.abs(Math.sin(clock.elapsedTime * 7 + p.phase)) * 0.06;
    });
  });
  return (
    <Pick id="a14">
      <group ref={ref}>
        {people.map((p, i) => (
          <group key={i}
            position={p.alongX ? [p.start, 0.16, p.lane] : [p.lane, 0.16, p.start]}
            rotation={[0, p.alongX ? (p.dir > 0 ? 0 : Math.PI) : (p.dir > 0 ? -Math.PI / 2 : Math.PI / 2), 0]}>
            <Mesh m={M.darkSteel} p={[0, 0.4, 0]} s={[0.22, 0.8, 0.2]} />
            <Mesh m={CLOTHES[p.c]} p={[0, 1.1, 0]} s={[0.36, 0.65, 0.24]} />
            <Mesh g={sphere} m={M.skin} p={[0, 1.6, 0]} s={[0.17, 0.17, 0.17]} />
          </group>
        ))}
      </group>
    </Pick>
  );
};

/* ───────────── Trees + shade ───────────── */

const Tree: React.FC<{ p: [number, number, number]; s?: number; f?: number }> = ({ p, s = 1, f = 0 }) => (
  <group position={p} scale={s}>
    <Mesh g={cyl} m={M.trunk} p={[0, 0.9, 0]} s={[0.14, 1.8, 0.14]} />
    <Mesh g={sphere} m={FOLIAGE[f % FOLIAGE.length]} p={[0, 2.4, 0]} s={[1.25, 1.05, 1.25]} />
    <Mesh g={sphere} m={FOLIAGE[(f + 2) % FOLIAGE.length]} p={[0.35, 3.05, 0.2]} s={[0.75, 0.7, 0.75]} />
  </group>
);

const STREET_TREE_SLOTS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (let x = -50; x <= 50; x += 4) if (Math.abs(x) > 7) { out.push([x, 0.16, 5.1]); out.push([x, 0.16, -5.1 + 0.0]); }
  for (let z = -50; z <= 50; z += 4) if (Math.abs(z) > 7) { out.push([5.1, 0.16, z]); out.push([-5.1, 0.16, z]); }
  return out;
})();

export const StreetTrees: React.FC<{ lv: Levels }> = ({ lv }) => {
  const level = L(lv, 'b14');
  const slots = useMemo(() => spread(STREET_TREE_SLOTS, Math.round(level * STREET_TREE_SLOTS.length)), [level]);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    ref.current?.children.forEach((c, i) => {
      c.rotation.z = Math.sin(clock.elapsedTime * 1.3 + i) * 0.025;
    });
  });
  return (
    <Pick id="b14">
      <group ref={ref}>
        {slots.map((p, i) => <Tree key={p.join()} p={p} s={0.85 + ((i * 7) % 5) * 0.06} f={i} />)}
      </group>
    </Pick>
  );
};

const Pergola: React.FC<{ p: [number, number, number]; rot?: number }> = ({ p, rot = 0 }) => (
  <group position={p} rotation={[0, rot, 0]}>
    {[[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]].map(([x, z], i) => (
      <Mesh key={i} m={M.wood} p={[x, 1.3, z]} s={[0.14, 2.6, 0.14]} />
    ))}
    {Array.from({ length: 7 }, (_, i) => (
      <Mesh key={i} m={M.wood} p={[-1.5 + i * 0.5, 2.65, 0]} s={[0.12, 0.1, 2.4]} />
    ))}
    <Mesh m={M.wood} p={[0, 0.45, 0]} s={[2.2, 0.08, 0.5]} />
  </group>
);

export const Shade: React.FC<{ lv: Levels }> = ({ lv }) => {
  const slots: [number, number, number][] = [[12, 0.16, 10], [18, 0.16, 10], [12, 0.16, 18], [18, 0.16, 18], [-14, 0.16, 26], [-24, 0.16, 12], [8, 0.16, -8.5], [-8, 0.16, 8.5]];
  const n = Math.round(L(lv, 'b15') * slots.length);
  return (
    <Pick id="b15">
      {slots.slice(0, n).map((p, i) => <Pergola key={i} p={p} rot={i % 2 ? Math.PI / 2 : 0} />)}
    </Pick>
  );
};

/* ───────────── Buildings ───────────── */

interface Plot { x: number; z: number; front: boolean }
const HOUSING_PLOTS: Plot[] = [
  { x: -12, z: -12, front: true }, { x: -20, z: -12, front: true }, { x: -28, z: -12, front: true },
  { x: -12, z: -20, front: false }, { x: -20, z: -20, front: false }, { x: -28, z: -20, front: false },
  { x: -12, z: -28, front: false }, { x: -20, z: -28, front: false }, { x: -28, z: -28, front: false },
  { x: 28, z: -12, front: true }, { x: 28, z: -20, front: false }, { x: 28, z: -28, front: false },
  { x: 12, z: -30, front: false }, { x: 20, z: -30, front: false },
  { x: -12, z: -36, front: false }, { x: -24, z: -36, front: false }, { x: 28, z: -36, front: false },
];

const Building: React.FC<{
  p: [number, number, number]; w: number; d: number; floors: number; color: string;
  roof: 'dark' | 'cool' | 'green'; solar: boolean; affordable: boolean; shopfront: boolean; seed: number;
}> = ({ p, w, d, floors, color, roof, solar, affordable, shopfront, seed }) => {
  const clock = useClock();
  const h = floors * 1.15;
  const { day, lit } = facadeTextures();
  const material = useMemo(() => {
    const map = day.clone(); map.repeat.set(w / 2.6, floors / 4); map.offset.set(seed * 0.13, 0); map.needsUpdate = true;
    const em = lit.clone(); em.repeat.copy(map.repeat); em.offset.set(seed * 0.37 % 1, (seed * 0.21) % 1); em.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      color, map, emissiveMap: em, emissive: new THREE.Color('#ffc477'), emissiveIntensity: 0, roughness: 0.75,
    });
  }, [day, lit, w, floors, color, seed]);
  useFrame(() => { material.emissiveIntensity = clock.current.night * 1.6; });
  const roofMat = roof === 'green' ? M.roofGreen : roof === 'cool' ? M.roofCool : M.roofDark;
  const panels = solar ? Math.max(1, Math.floor((w - 1) / 1.3)) : 0;
  return (
    <group position={p}>
      <mesh geometry={box} material={material} position={[0, h / 2 + 0.16, 0]} scale={[w, h, d]} castShadow receiveShadow />
      <Mesh m={roofMat} p={[0, h + 0.22, 0]} s={[w + 0.15, 0.12, d + 0.15]} />
      {affordable && <Mesh m={M.orange} p={[0, h + 0.05, 0]} s={[w + 0.08, 0.35, d + 0.08]} />}
      {roof === 'green' && Array.from({ length: 3 }, (_, i) => (
        <Mesh key={i} g={sphere} m={FOLIAGE[i]} p={[-w / 3 + i * (w / 3), h + 0.5, d / 4]} s={[0.4, 0.3, 0.4]} />
      ))}
      {Array.from({ length: panels }, (_, i) => (
        <Mesh key={i} m={M.pv} p={[-w / 2 + 0.9 + i * 1.3, h + 0.6, -d / 6]} s={[1.1, 0.06, d * 0.55]} r={[-0.45, 0, 0]} />
      ))}
      {shopfront && (
        <>
          <Mesh m={M.glass} p={[0, 0.9, d / 2 + 0.02]} s={[w * 0.9, 1.3, 0.05]} />
          <Mesh m={CLOTHES[seed % CLOTHES.length]} p={[0, 1.75, d / 2 + 0.5]} s={[w * 0.9, 0.08, 1]} r={[0.25, 0, 0]} />
        </>
      )}
    </group>
  );
};

export const Housing: React.FC<{ lv: Levels }> = ({ lv }) => {
  const density = L(lv, 'a12');
  const variety = L(lv, 'a08');
  const frontage = L(lv, 'a13');
  const affordable = L(lv, 'a09');
  const green = L(lv, 'c01');
  const cool = L(lv, 'b13');
  const solar = L(lv, 'c02');
  const buildings = useMemo(() => {
    const r = mulberry(42);
    const visible = Math.round(7 + density * (HOUSING_PLOTS.length - 7));
    return HOUSING_PLOTS.slice(0, visible).map((plot, i) => {
      const roll = r();
      const varied = r() < variety;
      let w = 6, d = 5.5, floors = Math.round(4 + density * 3);
      if (varied) {
        if (roll < 0.25) { w = 4.2; d = 4.2; floors = Math.round(10 + density * 8); }       // tower
        else if (roll < 0.55) { w = 6.5; d = 4; floors = Math.round(5 + density * 3); }     // slab
        else if (roll < 0.8) { w = 6.5; d = 6; floors = 3; }                                  // garden houses
      }
      const isFront = plot.front && frontage >= 0.5;
      const zShift = isFront ? (plot.z < 0 ? 2.2 : -2.2) : 0;
      return {
        key: i,
        p: [plot.x, 0, plot.z + zShift] as [number, number, number],
        w: isFront ? 7.4 : w, d, floors: isFront ? Math.max(floors, 5) : floors,
        color: varied ? BUILDING_COLORS[i % BUILDING_COLORS.length] : '#ece6db',
        roof: (r() < green ? 'green' : r() < cool ? 'cool' : 'dark') as 'green' | 'cool' | 'dark',
        solar: r() < solar,
        affordable: r() < affordable * 0.6,
        shopfront: isFront,
      };
    });
  }, [density, variety, frontage, affordable, green, cool, solar]);
  return (
    <Pick id="a08">
      {buildings.map(b => <Building key={b.key} seed={b.key} {...b} />)}
    </Pick>
  );
};

/* ───────────── Civic plaza, services, school, heritage ───────────── */

export const Civic: React.FC<{ lv: Levels }> = ({ lv }) => {
  const participants = Math.round(3 + L(lv, 'a02') * 9);
  const shops = Math.round(1 + L(lv, 'a10') * 6);
  const school = L(lv, 'a11');
  return (
    <group>
      {/* plaza */}
      <Mesh m={M.plaza} p={[15, 0.1, 14]} s={[16, 0.2, 12]} cast={false} />
      <Pick id="a02">
        <group position={[15, 0.2, 14]}>
          <Mesh g={cyl} m={M.wood} p={[0, 0.75, 0]} s={[1.4, 0.08, 1.4]} />
          <Mesh g={cyl} m={M.darkSteel} p={[0, 0.38, 0]} s={[0.12, 0.75, 0.12]} />
          {Array.from({ length: participants }, (_, i) => {
            const a = (i / participants) * Math.PI * 2;
            return (
              <group key={i} position={[Math.cos(a) * 2.1, 0, Math.sin(a) * 2.1]} rotation={[0, -a - Math.PI / 2, 0]}>
                <Mesh m={CLOTHES[i % CLOTHES.length]} p={[0, 0.85, 0]} s={[0.36, 0.7, 0.26]} />
                <Mesh g={sphere} m={M.skin} p={[0, 1.38, 0]} s={[0.17, 0.17, 0.17]} />
                <Mesh m={M.darkSteel} p={[0, 0.25, 0]} s={[0.25, 0.5, 0.2]} />
              </group>
            );
          })}
        </group>
      </Pick>
      {/* shops along plaza */}
      <Pick id="a10">
        {Array.from({ length: shops }, (_, i) => (
          <group key={i} position={[8.5 + i * 3.3, 0.2, 22]}>
            <Mesh m={M.white} p={[0, 1.3, 0]} s={[3, 2.6, 3]} />
            <Mesh m={M.glass} p={[0, 1.1, -1.52]} s={[2.4, 1.6, 0.04]} />
            <Mesh m={CLOTHES[(i + 2) % CLOTHES.length]} p={[0, 2.35, -2]} s={[3, 0.08, 1.1]} r={[-0.3, 0, 0]} />
          </group>
        ))}
      </Pick>
      {/* school + community dome */}
      <Pick id="a11">
        <group position={[15, 0.16, -18]} scale={0.6 + school * 0.4}>
          <Mesh m={mat(school > 0 ? '#f6efe2' : '#c9c9c9')} p={[0, 2, -2]} s={[10, 4, 4]} />
          <Mesh m={mat(school > 0 ? '#f6efe2' : '#c9c9c9')} p={[-3.5, 2, 2]} s={[3, 4, 5]} />
          <Mesh m={M.orange} p={[0, 4.1, -2]} s={[10.2, 0.25, 4.2]} />
          {school > 0.3 && <Mesh m={M.field} p={[2, 0.05, 3]} s={[6, 0.1, 4]} cast={false} />}
          {school > 0.6 && (
            <mesh position={[7, 0, 3]} castShadow>
              <sphereGeometry args={[2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#e8f1f5" roughness={0.3} metalness={0.2} />
            </mesh>
          )}
        </group>
      </Pick>
    </group>
  );
};

export const Heritage: React.FC<{ lv: Levels }> = ({ lv }) => {
  const level = L(lv, 'a07');
  const clock = useClock();
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => { if (glow.current) glow.current.emissiveIntensity = clock.current.night * level * 2; });
  return (
    <Pick id="a07">
      <group position={[-12, 0, 12]}>
        {level > 0.3 && <Mesh g={cyl} m={M.paving} p={[0, 0.1, 0]} s={[4, 0.2, 4]} cast={false} />}
        <Mesh g={cyl} m={M.stone} p={[0, 3, 0]} s={[1.3, 6, 1.3]} />
        <Mesh g={cyl} m={M.stone} p={[0, 6.3, 0]} s={[1.6, 0.6, 1.6]} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <Mesh key={i} m={M.stone} p={[Math.cos(a) * 1.45, 6.9, Math.sin(a) * 1.45]} s={[0.4, 0.6, 0.4]} />;
        })}
        <mesh position={[0, 4.5, 1.31]}>
          <boxGeometry args={[0.5, 0.9, 0.05]} />
          <meshStandardMaterial ref={glow} color="#3b2c1c" emissive="#ffb35c" emissiveIntensity={0} />
        </mesh>
      </group>
    </Pick>
  );
};

/* ───────────── Park, nature, water ───────────── */

export const Park: React.FC<{ lv: Levels }> = ({ lv }) => {
  const park = L(lv, 'b07');
  const bushes = Math.round(L(lv, 'b11') * 16);
  const irrigation = L(lv, 'b12');
  const runoff = L(lv, 'b10');
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (water.current) water.current.position.y = 0.17 + Math.sin(clock.elapsedTime * 1.4) * 0.015;
  });
  const parkTrees = useMemo(() => {
    const r = mulberry(5);
    return Array.from({ length: 6 + Math.round(park * 12) }, () => [-31 + r() * 22, 0.1, 9 + r() * 22] as [number, number, number])
      .filter(([x, , z]) => Math.hypot(x + 20, z - 20) > 6.5 && Math.hypot(x + 12, z - 12) > 3);
  }, [park]);
  const pondR = 2.5 + runoff * 3;
  return (
    <group>
      <Pick id="b07">
        <Mesh m={M.grassLight} p={[-20, 0.06, 20]} s={[24 * (0.65 + park * 0.35), 0.1, 24 * (0.65 + park * 0.35)]} cast={false} />
        {parkTrees.map((p, i) => <Tree key={i} p={p} s={1.1} f={i + 1} />)}
        {park > 0.4 && (
          <group position={[-27, 0.1, 13]}>
            {/* playground */}
            <Mesh m={M.orange} p={[0, 1, 0]} s={[2, 0.2, 2]} />
            {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([x, z], i) => (
              <Mesh key={i} g={cyl} m={M.steel} p={[x, 0.5, z]} s={[0.06, 1, 0.06]} />
            ))}
            <Mesh m={mat('#3498db')} p={[1.7, 0.55, 0]} s={[1.8, 0.08, 0.7]} r={[0, 0, -0.55]} />
          </group>
        )}
      </Pick>
      <Pick id="b11">
        {Array.from({ length: bushes }, (_, i) => {
          const a = (i / Math.max(1, bushes)) * Math.PI * 2;
          return (
            <group key={i} position={[-20 + Math.cos(a) * (pondR + 1.6), 0.1, 20 + Math.sin(a) * (pondR + 1.6)]}>
              <Mesh g={sphere} m={FOLIAGE[i % 5]} p={[0, 0.35, 0]} s={[0.55, 0.4, 0.55]} />
              <Mesh g={sphere} m={CLOTHES[(i * 3) % CLOTHES.length]} p={[0.2, 0.7, 0.1]} s={[0.12, 0.12, 0.12]} />
            </group>
          );
        })}
      </Pick>
      {irrigation > 0 && (
        <Pick id="b12">
          <Sparkles count={Math.round(20 + irrigation * 40)} scale={[pondR * 3, 1.2, pondR * 3]} position={[-20, 0.7, 20]} size={2} speed={0.4} color="#9fd8ff" />
        </Pick>
      )}
      <Pick id="b10">
        <mesh ref={water} position={[-20, 0.17, 20]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={M.water}>
          <circleGeometry args={[pondR, 48]} />
        </mesh>
        <Mesh g={cyl} m={M.rock} p={[-20, 0.05, 20]} s={[pondR + 0.35, 0.1, pondR + 0.35]} cast={false} />
        {/* rain gardens along the cross street */}
        {Array.from({ length: Math.round(runoff * 6) }, (_, i) => (
          <Mesh key={i} m={M.rainGarden} p={[-6.3, 0.12, 10 + i * 5]} s={[1.2, 0.12, 3.5]} cast={false} />
        ))}
      </Pick>
    </group>
  );
};

export const Nature: React.FC<{ lv: Levels }> = ({ lv }) => {
  const protectedArea = L(lv, 'b08');
  const matureTree = L(lv, 'b09');
  const rocks = useMemo(() => {
    const r = mulberry(99);
    return Array.from({ length: 10 }, () => ({ p: [-30 + (r() - 0.5) * 9, 0.2, 31 + (r() - 0.5) * 9] as [number, number, number], s: 0.3 + r() * 0.6 }));
  }, []);
  return (
    <group>
      <Pick id="b08">
        <Mesh m={mat('#a3a85f')} p={[-30, 0.05, 31]} s={[11, 0.1, 11]} cast={false} />
        {rocks.map((r, i) => <Mesh key={i} g={sphere} m={M.rock} p={r.p} s={[r.s, r.s * 0.7, r.s]} />)}
        {protectedArea > 0 && Array.from({ length: 20 }, (_, i) => {
          const side = Math.floor(i / 5), t = (i % 5) / 5;
          const pts: [number, number][] = [[-35.5 + t * 11, 25.5], [-24.5, 25.5 + t * 11], [-24.5 - t * 11, 36.5], [-35.5, 36.5 - t * 11]];
          const [x, z] = pts[side];
          return <Mesh key={i} m={M.fence} p={[x, 0.5, z]} s={[0.12, 1, 0.12]} />;
        })}
      </Pick>
      {matureTree > 0 && (
        <Pick id="b09">
          <Tree p={[-30, 0.1, 31]} s={2.1} f={3} />
        </Pick>
      )}
    </group>
  );
};

/* ───────────── Parking ───────────── */

export const Parking: React.FC<{ lv: Levels }> = ({ lv }) => {
  const reduction = L(lv, 'b06');
  const solarCarport = L(lv, 'c02') > 0.5;
  const parked = Math.round((1 - reduction) * 12);
  const greenTrees = Math.round(reduction * 6);
  return (
    <Pick id="b06">
      <group position={[28, 0, 30]}>
        <Mesh m={M.asphalt} p={[0, 0.06, 0]} s={[16, 0.1, 12]} cast={false} />
        {reduction > 0 && <Mesh m={M.grassLight} p={[0, 0.08, 6 - reduction * 6]} s={[16, 0.1, reduction * 12]} cast={false} />}
        {Array.from({ length: parked }, (_, i) => (
          <group key={i} position={[-6.5 + (i % 6) * 2.6, 0, -3.5 + Math.floor(i / 6) * 5]}>
            <Mesh m={CAR_COLORS[i % CAR_COLORS.length]} p={[0, 0.55, 0]} s={[1.3, 0.6, 2.6]} />
            <Mesh m={M.glass} p={[0, 1.05, 0.1]} s={[1.15, 0.5, 1.4]} />
          </group>
        ))}
        {Array.from({ length: greenTrees }, (_, i) => <Tree key={i} p={[-6 + i * 2.4, 0.1, 4]} f={i} />)}
        {solarCarport && (
          <Pick id="c02">
            <group position={[0, 0, -3.5]}>
              {[-7, 0, 7].map(x => <Mesh key={x} g={cyl} m={M.steel} p={[x, 1.6, 0]} s={[0.12, 3.2, 0.12]} />)}
              <Mesh m={M.pv} p={[0, 3.3, 0]} s={[16, 0.1, 4]} r={[0.15, 0, 0]} />
            </group>
          </Pick>
        )}
      </group>
    </Pick>
  );
};

/* ───────────── Street lights (night) ───────────── */

export const StreetLights: React.FC<{ lv: Levels }> = ({ lv }) => {
  const shielded = L(lv, 'b19') >= 0.5;
  const smart = L(lv, 'c04');
  const clock = useClock();
  const headMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#fff', emissive: new THREE.Color(shielded ? '#ffb45a' : '#d9ecff'), emissiveIntensity: 0,
  }), [shielded]);
  const beamMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: shielded ? '#ffb45a' : '#d9ecff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  }), [shielded]);
  useFrame(() => {
    const n = clock.current.night;
    headMat.emissiveIntensity = n * (shielded ? 4 : 6) * (1 - smart * 0.25);
    beamMat.opacity = n * (shielded ? 0.16 : 0.07);
  });
  const slots: [number, number][] = [];
  for (let x = -46; x <= 46; x += 9) if (Math.abs(x) > 6) { slots.push([x, 5.5]); slots.push([x + 4.5, -5.5]); }
  return (
    <Pick id="b19">
      {slots.map(([x, z], i) => (
        <group key={i} position={[x, 0.16, z]}>
          <Mesh g={cyl} m={M.darkSteel} p={[0, 2.4, 0]} s={[0.07, 4.8, 0.07]} />
          <Mesh m={M.darkSteel} p={[0, 4.8, z > 0 ? -0.5 : 0.5]} s={[0.12, 0.08, 1.1]} />
          <mesh geometry={shielded ? box : sphere} material={headMat}
            position={[0, 4.7, z > 0 ? -0.95 : 0.95]} scale={shielded ? [0.4, 0.1, 0.25] : [0.25, 0.25, 0.25]} />
          {/* light beam: tight cone when shielded, wide halo when not */}
          <mesh geometry={cone} material={beamMat} position={[0, shielded ? 2.35 : 4.7, z > 0 ? -0.95 : 0.95]}
            scale={shielded ? [1.8, 4.7, 1.8] : [2.6, 2.6, 2.6]} rotation={shielded ? [0, 0, 0] : [Math.PI, 0, 0]} />
        </group>
      ))}
    </Pick>
  );
};

/* ───────────── Edges: existing city, connectors ───────────── */

export const ExistingCity: React.FC<{ lv: Levels }> = ({ lv }) => {
  const contiguity = L(lv, 'a03');
  const connectors = Math.round(L(lv, 'a15') * 2);
  const offset = -48 + contiguity * 9;
  const blocks = useMemo(() => {
    const r = mulberry(3);
    const out: { p: [number, number, number]; h: number }[] = [];
    for (let z = -48; z <= 48; z += 9) for (let k = 0; k < 2; k++) {
      if (Math.abs(z) < 6) continue;
      out.push({ p: [k * -9, 0, z], h: 3 + r() * 8 });
    }
    return out;
  }, []);
  return (
    <group>
      <Pick id="a03">
        <group position={[offset, 0, 0]}>
          {blocks.map((b, i) => <Mesh key={i} m={M.existing} p={[b.p[0], b.h / 2, b.p[2]]} s={[6.5, b.h, 6.5]} />)}
        </group>
      </Pick>
      <Pick id="a15">
        {[-20, 20].slice(0, connectors).map(z => (
          <group key={z}>
            <Mesh m={M.asphalt} p={[-42, 0.02, z]} s={[26, 0.02, 4]} cast={false} />
            <Mesh m={M.sidewalk} p={[-42, 0.08, z + 2.6]} s={[26, 0.14, 1.2]} cast={false} />
          </group>
        ))}
      </Pick>
    </group>
  );
};

/* ───────────── Remediation (brownfield / contaminated soil) ───────────── */

export const Remediation: React.FC<{ lv: Levels }> = ({ lv }) => {
  const soil = L(lv, 'a05');
  const brownfield = L(lv, 'a04');
  const barrels = Math.round((1 - soil) * 7);
  return (
    <group position={[42, 0, 34]}>
      <Pick id="a05">
        <Mesh m={soil > 0.6 ? M.grassLight : soil > 0.2 ? M.soil : M.soilBad} p={[0, 0.06, 0]} s={[13, 0.12, 12]} cast={false} />
        {Array.from({ length: barrels }, (_, i) => (
          <Mesh key={i} g={cyl} m={mat(i % 2 ? '#c0392b' : '#d4ac0d', { metalness: 0.4 })} p={[-4 + (i % 4) * 1.4, 0.55, -2 + Math.floor(i / 4) * 1.6]} s={[0.45, 0.9, 0.45]} />
        ))}
        {soil > 0.6 && Array.from({ length: 4 }, (_, i) => <Tree key={i} p={[-4 + i * 2.6, 0.1, 3]} f={i} />)}
      </Pick>
      <Pick id="a04">
        {brownfield > 0 && <Mesh m={M.concrete} p={[4, 0.5, -3]} s={[3, 1, 3 * brownfield + 0.5]} />}
      </Pick>
    </group>
  );
};

/* ───────────── Construction site ───────────── */

export const Construction: React.FC<{ lv: Levels }> = ({ lv }) => {
  const site = L(lv, 'b18');
  const earth = L(lv, 'c05');
  const materials = L(lv, 'c06');
  const recycle = L(lv, 'c08');
  const jib = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (jib.current) jib.current.rotation.y += dt * 0.25; });
  const piles = Math.round((1 - earth) * 4) + 1;
  return (
    <group position={[42, 0, -30]}>
      <Pick id="b18">
        <Mesh m={M.soil} p={[0, 0.05, 0]} s={[14, 0.1, 12]} cast={false} />
        {/* building skeleton */}
        {[0, 1, 2, 3].map(f => (
          <group key={f} position={[0, f * 1.6, 0]}>
            <Mesh m={M.concrete} p={[0, 1.6, 0]} s={[6, 0.18, 5]} />
            {[[-2.8, -2.3], [2.8, -2.3], [-2.8, 2.3], [2.8, 2.3]].map(([x, z], i) => (
              <Mesh key={i} m={M.concrete} p={[x, 0.8, z]} s={[0.3, 1.6, 0.3]} />
            ))}
          </group>
        ))}
        {/* crane */}
        <Mesh m={mat('#f1c40f', { metalness: 0.4 })} p={[-5, 7, -4]} s={[0.5, 14, 0.5]} />
        <group ref={jib} position={[-5, 14, -4]}>
          <Mesh m={mat('#f1c40f', { metalness: 0.4 })} p={[4, 0, 0]} s={[12, 0.4, 0.4]} />
          <Mesh m={M.concrete} p={[-2.5, -0.3, 0]} s={[1.2, 0.8, 0.8]} />
          <Mesh g={cyl} m={M.darkSteel} p={[8, -2.5, 0]} s={[0.02, 5, 0.02]} />
        </group>
        {/* dust fence (only when the site is managed) or dust cloud (when not) */}
        {site > 0 ? (
          <>
            <Mesh m={mat('#2e7d5b')} p={[0, 1, 6]} s={[14, 2, 0.08]} />
            <Mesh m={mat('#2e7d5b')} p={[-7, 1, 0]} s={[0.08, 2, 12]} />
          </>
        ) : (
          <Sparkles count={60} scale={[14, 4, 12]} position={[0, 2, 0]} size={8} speed={0.6} color="#c8a97e" />
        )}
      </Pick>
      <Pick id="c05">
        {Array.from({ length: piles }, (_, i) => (
          <mesh key={i} position={[4.5, 0, -4 + i * 2]} castShadow>
            <coneGeometry args={[1.1, 1.3, 8]} />
            <meshStandardMaterial color="#8b6a45" flatShading roughness={1} />
          </mesh>
        ))}
      </Pick>
      <Pick id="c06">
        {Array.from({ length: 3 }, (_, i) => (
          <Mesh key={i} m={materials > 0.5 ? mat('#5aa469') : M.wood} p={[-3 + i * 1.5, 0.4, 4.5]} s={[1.2, 0.7, 1.2]} />
        ))}
      </Pick>
      {recycle > 0 && (
        <Pick id="c08">
          <group position={[4, 0, 4]}>
            <Mesh m={mat('#2f9e6a', { metalness: 0.3 })} p={[0, 1, 0]} s={[2.6, 1.6, 1.6]} />
            <Mesh m={M.darkSteel} p={[-1.8, 1.4, 0]} s={[1.3, 0.2, 0.9]} r={[0, 0, 0.5]} />
          </group>
        </Pick>
      )}
    </group>
  );
};

/* ───────────── Power line, factory, buffer ───────────── */

export const PowerAndPollution: React.FC<{ lv: Levels }> = ({ lv }) => {
  const radiation = L(lv, 'b20');
  const pollution = L(lv, 'b17');
  const x = 47 + radiation * 6;
  const towers = [-48, -32, -16, 0, 16, 32, 48];
  const smoke = useRef<THREE.Group>(null);
  const puffs = Math.round((1 - pollution) * 14);
  useFrame((_, dt) => {
    smoke.current?.children.forEach((c, i) => {
      c.position.y += dt * 1.2;
      c.position.x -= dt * 0.6;
      const s = 0.6 + (c.position.y - 9) * 0.25;
      c.scale.setScalar(Math.max(0.4, s));
      if (c.position.y > 22) { c.position.set(0, 9 + (i % 3) * 0.2, 0); }
    });
  });
  return (
    <group>
      <Pick id="b20">
        {towers.map(z => (
          <group key={z} position={[x, 0, z]}>
            <Mesh m={M.steel} p={[0, 5, 0]} s={[0.35, 10, 0.35]} />
            <Mesh m={M.steel} p={[0, 9.6, 0]} s={[0.25, 0.25, 4]} />
            <Mesh m={M.steel} p={[0, 8, 0]} s={[0.25, 0.25, 3]} />
          </group>
        ))}
        {[-1.8, 1.8].map(dz => (
          <Line key={dz} points={towers.map(z => [x, 9.5, z + dz] as [number, number, number])} color="#444" lineWidth={1} />
        ))}
      </Pick>
      <Pick id="b17">
        <group position={[52, 0, -50]}>
          <Mesh m={M.concrete} p={[0, 2, 0]} s={[6, 4, 5]} />
          <Mesh g={cyl} m={mat('#a35d4c')} p={[1.5, 5, 0]} s={[0.5, 10, 0.5]} />
          <group ref={smoke} position={[1.5, 0, 0]}>
            {Array.from({ length: puffs }, (_, i) => (
              <mesh key={i} position={[-(i * 0.5), 9 + i * 0.9, 0]} geometry={sphere}>
                <meshStandardMaterial color="#9a9a9a" transparent opacity={0.45} depthWrite={false} />
              </mesh>
            ))}
          </group>
        </group>
        {pollution > 0 && Array.from({ length: Math.round(pollution * 8) }, (_, i) => (
          <Tree key={i} p={[38, 0.1, -48 + i * 4]} f={i} s={1.2} />
        ))}
      </Pick>
    </group>
  );
};

/* ───────────── Energy, waste, innovation, wind ───────────── */

export const EnergyWaste: React.FC<{ lv: Levels }> = ({ lv }) => {
  const storage = L(lv, 'c02') > 0.6;
  const sep = Math.round(L(lv, 'c07') * 4);
  const clock = useClock();
  const led = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock: c }) => {
    if (led.current) led.current.emissiveIntensity = 1.5 + Math.sin(c.elapsedTime * 3) * 1 + clock.current.night * 2;
  });
  const bins = ['#2980b9', '#f39c12', '#27ae60', '#7f8c8d'];
  return (
    <group>
      {storage && (
        <Pick id="c02">
          <group position={[30, 0.1, 13]}>
            <Mesh m={mat('#ecf0f1', { metalness: 0.3, roughness: 0.4 })} p={[0, 1.3, 0]} s={[5, 2.6, 2.4]} />
            <mesh position={[0, 2, 1.22]}>
              <boxGeometry args={[1.6, 0.25, 0.05]} />
              <meshStandardMaterial ref={led} color="#1e8449" emissive="#2ecc71" emissiveIntensity={2} />
            </mesh>
          </group>
        </Pick>
      )}
      <Pick id="c07">
        {(sep ? bins.slice(0, sep) : ['#555']).map((c, i) => (
          <group key={i} position={[9 + i * 1.4, 0.1, 28]}>
            <Mesh m={mat(c, { roughness: 0.5 })} p={[0, 0.7, 0]} s={[1.1, 1.4, 1.1]} />
            <Mesh m={mat(c, { roughness: 0.5 })} p={[0, 1.45, 0]} s={[1.15, 0.1, 1.15]} />
          </group>
        ))}
      </Pick>
    </group>
  );
};

const Turbine: React.FC<{ p: [number, number, number] }> = ({ p }) => {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.z += dt * 1.6; });
  return (
    <group position={p}>
      <Mesh g={cyl} m={M.white} p={[0, 6, 0]} s={[0.25, 12, 0.25]} />
      <Mesh m={M.white} p={[0, 12, 0.2]} s={[0.6, 0.6, 1.4]} />
      <group ref={rotor} position={[0, 12, 0.95]}>
        {[0, 1, 2].map(i => (
          <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
            <Mesh m={M.white} p={[0, 2.6, 0]} s={[0.35, 5.2, 0.08]} />
          </group>
        ))}
      </group>
    </group>
  );
};

export const Innovation: React.FC<{ lv: Levels }> = ({ lv }) => {
  const n = Math.round(L(lv, 'c09') * 3);
  const drone = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!drone.current) return;
    const t = clock.elapsedTime * 0.4;
    drone.current.position.set(Math.cos(t) * 18, 12 + Math.sin(t * 3) * 0.6, Math.sin(t) * 18);
  });
  return (
    <Pick id="c09">
      {[[40, 0, -6], [40, 0, 4], [40, 0, 14]].slice(0, n).map((p, i) => <Turbine key={i} p={p as [number, number, number]} />)}
      {n >= 2 && (
        <group ref={drone}>
          <Mesh m={M.darkSteel} p={[0, 0, 0]} s={[0.8, 0.18, 0.8]} />
          {[[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].map(([x, z], i) => (
            <Mesh key={i} g={cyl} m={M.glass} p={[x, 0.15, z]} s={[0.4, 0.02, 0.4]} />
          ))}
        </group>
      )}
    </Pick>
  );
};

export const WindFlow: React.FC<{ lv: Levels }> = ({ lv }) => {
  const level = L(lv, 'b16');
  const n = Math.round(6 + level * 26);
  const ref = useRef<THREE.Group>(null);
  const streaks = useMemo(() => {
    const r = mulberry(21);
    return Array.from({ length: n }, () => ({
      x: -55 + r() * 110, y: 1.5 + r() * 7, z: (r() < 0.6 ? (r() - 0.5) * 6 : -40 + r() * 80), s: 4 + r() * 6,
    }));
  }, [n]);
  useFrame((_, dt) => {
    ref.current?.children.forEach((c, i) => {
      c.position.x += dt * streaks[i].s;
      if (c.position.x > 55) c.position.x = -55;
    });
  });
  return (
    <Pick id="b16">
      <group ref={ref}>
        {streaks.map((s, i) => (
          <mesh key={i} position={[s.x, s.y, s.z]} scale={[2.5 + level * 2, 0.04, 0.04]} geometry={box}>
            <meshBasicMaterial color="#e8f6ff" transparent opacity={0.35 + level * 0.3} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </Pick>
  );
};
