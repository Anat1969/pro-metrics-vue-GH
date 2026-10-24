import * as THREE from 'three';
import { createContext, useContext } from 'react';

/** Ashdod latitude — the sun path in the twin is computed for the real site */
export const LATITUDE = 31.8;

export type Season = 'summer' | 'equinox' | 'winter';

export const SEASON_DECLINATION: Record<Season, number> = {
  summer: 23.44,
  equinox: 0,
  winter: -23.44,
};

export const SEASON_LABELS: Record<Season, string> = {
  summer: 'קיץ · 21 ביוני',
  equinox: 'שוויון · 21 במרץ',
  winter: 'חורף · 21 בדצמבר',
};

const D2R = Math.PI / 180;

/**
 * Unit vector pointing at the sun. Scene axes: +x = east, -z = north, +y = up.
 */
export function sunVector(hour: number, season: Season): THREE.Vector3 {
  const lat = LATITUDE * D2R;
  const decl = SEASON_DECLINATION[season] * D2R;
  const H = (hour - 12) * 15 * D2R;
  const alt = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H));
  // azimuth measured from south, positive towards west
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat));
  return new THREE.Vector3(
    -Math.sin(az) * Math.cos(alt),
    Math.sin(alt),
    Math.cos(az) * Math.cos(alt),
  );
}

export function sunAltitudeDeg(hour: number, season: Season): number {
  return Math.asin(sunVector(hour, season).y) / D2R;
}

/** Mutable per-scene state shared with every animated part without React re-renders */
export interface SceneClock {
  hour: number;
  season: Season;
  playing: boolean;
  /** 0 = full day, 1 = full night */
  night: number;
}

export const ClockContext = createContext<{ current: SceneClock } | null>(null);
export const useClock = () => useContext(ClockContext)!;

/* ───────────── Procedural textures (no network assets) ───────────── */

let facadeCache: { day: THREE.CanvasTexture; lit: THREE.CanvasTexture } | null = null;

/** One floor × four bays façade tile; `lit` has random warm windows for the night emissive map */
export function facadeTextures() {
  if (facadeCache) return facadeCache;
  const make = (lit: boolean) => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = lit ? '#000' : '#f4efe6';
    g.fillRect(0, 0, 256, 256);
    // 4 bays × 4 floors per tile
    for (let fy = 0; fy < 4; fy++) {
      for (let bx = 0; bx < 4; bx++) {
        const x = bx * 64 + 12, y = fy * 64 + 14;
        if (lit) {
          const on = Math.random() < 0.45;
          g.fillStyle = on ? `hsl(${32 + Math.random() * 14}, 90%, ${55 + Math.random() * 20}%)` : '#000';
          g.fillRect(x, y, 40, 34);
        } else {
          const grad = g.createLinearGradient(x, y, x + 40, y + 34);
          grad.addColorStop(0, '#5f7d8f');
          grad.addColorStop(1, '#2c3e4c');
          g.fillStyle = grad;
          g.fillRect(x, y, 40, 34);
          g.fillStyle = 'rgba(255,255,255,0.25)';
          g.fillRect(x + 2, y + 2, 14, 30);
          g.fillStyle = '#d9d2c4';
          g.fillRect(x - 4, y + 36, 48, 5); // balcony ledge
        }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  facadeCache = { day: make(false), lit: make(true) };
  return facadeCache;
}

let groundCache: THREE.CanvasTexture | null = null;

/** Subtle noisy grass texture */
export function grassTexture() {
  if (groundCache) return groundCache;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7fa35a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const l = 30 + Math.random() * 22;
    g.fillStyle = `hsla(${85 + Math.random() * 25}, 38%, ${l}%, 0.5)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 30);
  t.colorSpace = THREE.SRGBColorSpace;
  groundCache = t;
  return t;
}

/** Deterministic PRNG so the twin is stable between renders */
export function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Evenly spread subset: take `count` items out of `list` without clustering */
export function spread<T>(list: T[], count: number): T[] {
  if (count >= list.length) return list;
  if (count <= 0) return [];
  const out: T[] = [];
  const step = list.length / count;
  for (let i = 0; i < count; i++) out.push(list[Math.floor(i * step)]);
  return out;
}
