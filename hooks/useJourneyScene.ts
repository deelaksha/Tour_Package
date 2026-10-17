"use client";

import { useSyncExternalStore } from "react";
import { getSceneIndex, subscribeScene } from "@/lib/animation/journeyStore";

/** Re-renders only when the active story scene changes. */
export function useJourneyScene() {
  return useSyncExternalStore(subscribeScene, getSceneIndex, () => 0);
}
