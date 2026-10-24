import React, { createContext, useContext, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

type Hover = { id: string; point: THREE.Vector3 } | null;

/** Tiny store so hovering an object re-renders only the label, not the whole twin */
export function createHoverStore() {
  let value: Hover = null;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (v: Hover) => { value = v; subs.forEach(s => s()); },
    subscribe: (s: () => void) => { subs.add(s); return () => { subs.delete(s); }; },
  };
}
export type HoverStore = ReturnType<typeof createHoverStore>;

export const PickContext = createContext<{ onSelect?: (id: string) => void; hover: HoverStore } | null>(null);

export const useHover = (store: HoverStore) => useSyncExternalStore(store.subscribe, store.get, store.get);

/** Makes any 3D group clickable: click → open the indicator it represents */
export const Pick: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const ctx = useContext(PickContext);
  if (!ctx?.onSelect) return <group>{children}</group>;
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); ctx.onSelect?.(id); }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        ctx.hover.set({ id, point: e.point.clone() });
      }}
      onPointerOut={() => { document.body.style.cursor = ''; ctx.hover.set(null); }}
    >
      {children}
    </group>
  );
};
