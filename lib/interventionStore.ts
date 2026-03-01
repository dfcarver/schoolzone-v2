import { Recommendation } from "./types";

// Supabase-backed persistence replaced the in-memory store.
// This file is kept for the shared StoredIntervention type only.

export interface StoredIntervention {
  zoneId: string;
  recommendation: Recommendation;
  appliedAt: number; // epoch ms
}
