import { Recommendation } from "./types";

export interface StoredIntervention {
  zoneId: string;
  recommendation: Recommendation;
  appliedAt: number;
}

type Listener = (item: StoredIntervention) => void;

const interventions: StoredIntervention[] = [];
const listeners = new Set<Listener>();

export function getAll(): StoredIntervention[] {
  return [...interventions];
}

export function add(zoneId: string, recommendation: Recommendation): StoredIntervention {
  const item: StoredIntervention = { zoneId, recommendation, appliedAt: Date.now() };
  interventions.push(item);
  for (const fn of listeners) fn(item);
  return item;
}

export function addListener(fn: Listener): void {
  listeners.add(fn);
}

export function removeListener(fn: Listener): void {
  listeners.delete(fn);
}
