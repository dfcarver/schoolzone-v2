export interface MetricsSnapshot {
  fetchCount: number;
  fetchErrorCount: number;
  lastFetchMs: number;
  lastFetchAt: string | null;
  snapshotRotations: number;
  demoMutationsApplied: number;
  validationFailures: number;
}

const state: MetricsSnapshot = {
  fetchCount: 0,
  fetchErrorCount: 0,
  lastFetchMs: 0,
  lastFetchAt: null,
  snapshotRotations: 0,
  demoMutationsApplied: 0,
  validationFailures: 0,
};

export function recordFetch(durationMs: number, ok: boolean): void {
  state.fetchCount++;
  state.lastFetchMs = durationMs;
  state.lastFetchAt = new Date().toISOString();
  if (!ok) state.fetchErrorCount++;
}

export function recordRotation(): void {
  state.snapshotRotations++;
}

export function recordDemoMutation(): void {
  state.demoMutationsApplied++;
}

export function recordValidationFailure(): void {
  state.validationFailures++;
}

export function getMetrics(): Readonly<MetricsSnapshot> {
  return { ...state };
}

export function resetMetrics(): void {
  state.fetchCount = 0;
  state.fetchErrorCount = 0;
  state.lastFetchMs = 0;
  state.lastFetchAt = null;
  state.snapshotRotations = 0;
  state.demoMutationsApplied = 0;
  state.validationFailures = 0;
}
