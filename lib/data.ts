import { LiveState, Incident, School } from "./types";

export async function loadSchools(): Promise<School[]> {
  try {
    const res = await fetch("/mock/schools.json");
    if (!res.ok) throw new Error(`Failed to load schools: ${res.status}`);
    return (await res.json()) as School[];
  } catch {
    return [];
  }
}

export async function loadLiveState(snapshot: string): Promise<LiveState | null> {
  try {
    const res = await fetch(`/mock/${snapshot}`);
    if (!res.ok) throw new Error(`Failed to load live state: ${res.status}`);
    return (await res.json()) as LiveState;
  } catch {
    return null;
  }
}

export async function loadIncidents(): Promise<Incident[]> {
  try {
    const res = await fetch("/mock/incidents.json");
    if (!res.ok) throw new Error(`Failed to load incidents: ${res.status}`);
    return (await res.json()) as Incident[];
  } catch {
    return [];
  }
}
