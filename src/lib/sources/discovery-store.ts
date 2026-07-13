"use client";

import { useSyncExternalStore } from "react";
import type { DiscoveredSourceView } from "@/app/(app)/projects/[projectId]/sources/actions";

export type DiscoveryStatus = "idle" | "loading" | "error" | "results";

export interface DiscoveryState {
  status: DiscoveryStatus;
  suggestions: DiscoveredSourceView[] | null;
  error: string | null;
  addedKeys: Set<string>;
}

const IDLE_STATE: DiscoveryState = {
  status: "idle",
  suggestions: null,
  error: null,
  addedKeys: new Set(),
};

// Module-scoped (not component state) so a scan survives the founder
// switching to another tab (Signals, Dashboard, ...) and back. Next.js
// client-side nav unmounts AiDiscoveryPanel but never reloads this module,
// so the in-flight "loading" status and the eventual results are still
// here when the Sources page remounts — instead of silently vanishing and
// forcing a re-scan (and a second AI call) just to see what already ran.
const store = new Map<string, DiscoveryState>();
const listeners = new Map<string, Set<() => void>>();

function notify(projectId: string) {
  listeners.get(projectId)?.forEach((listener) => listener());
}

export function getDiscoveryState(projectId: string): DiscoveryState {
  return store.get(projectId) ?? IDLE_STATE;
}

export function setDiscoveryState(projectId: string, update: Partial<DiscoveryState>) {
  store.set(projectId, { ...getDiscoveryState(projectId), ...update });
  notify(projectId);
}

export function useDiscoveryState(projectId: string): DiscoveryState {
  return useSyncExternalStore(
    (onStoreChange) => {
      let set = listeners.get(projectId);
      if (!set) {
        set = new Set();
        listeners.set(projectId, set);
      }
      set.add(onStoreChange);
      return () => set.delete(onStoreChange);
    },
    () => getDiscoveryState(projectId),
    () => IDLE_STATE
  );
}
