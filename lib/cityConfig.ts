import { CorridorDef } from "./hooks/useCongestionEngine";

export type CityId = "springfield_il" | "khalifa_city_auh" | "mbz_city_auh";

export interface CityBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface CityConfig {
  id: CityId;
  label: string;
  corridors: CorridorDef[];
  overviewCenter: { lat: number; lng: number };
  overviewZoom: number;
  defaultZoom: number;
  bounds: CityBounds;
}

export const SPRINGFIELD_CORRIDORS: CorridorDef[] = [
  {
    id: "zone-001",
    name: "Oak Avenue Corridor",
    path: [
      { lat: 39.7852, lng: -89.6501 },
      { lat: 39.7817, lng: -89.6501 },
    ],
    school: { zone_id: "zone-001", name: "Lincoln Elementary", lat: 39.7817, lng: -89.6501, type: "elementary", enrollment: 485 },
    baselineCongestion: 0.08,
    peaks: [
      { centerMin: 7 * 60 + 45, spread: 20, intensity: 0.82 },
      { centerMin: 15 * 60, spread: 20, intensity: 0.88 },
    ],
  },
  {
    id: "zone-002",
    name: "Maple Drive Corridor",
    path: [
      { lat: 39.7900, lng: -89.6492 },
      { lat: 39.7900, lng: -89.6440 },
    ],
    school: { zone_id: "zone-002", name: "Washington Middle School", lat: 39.7900, lng: -89.6440, type: "middle", enrollment: 720 },
    baselineCongestion: 0.10,
    peaks: [
      { centerMin: 7 * 60 + 30, spread: 22, intensity: 0.70 },
      { centerMin: 15 * 60 + 15, spread: 22, intensity: 0.78 },
      { centerMin: 16 * 60 + 30, spread: 30, intensity: 0.35 },
    ],
  },
  {
    id: "zone-003",
    name: "Elm Street Corridor",
    path: [
      { lat: 39.7755, lng: -89.6635 },
      { lat: 39.7755, lng: -89.6535 },
    ],
    school: { zone_id: "zone-003", name: "Jefferson High School", lat: 39.7755, lng: -89.6580, type: "high", enrollment: 1100 },
    baselineCongestion: 0.12,
    peaks: [
      { centerMin: 7 * 60 + 15, spread: 25, intensity: 0.75 },
      { centerMin: 15 * 60 + 30, spread: 25, intensity: 0.85 },
      { centerMin: 17 * 60, spread: 35, intensity: 0.40 },
    ],
  },
  {
    id: "zone-004",
    name: "Pine Boulevard Corridor",
    path: [
      { lat: 39.7864, lng: -89.6390 },
      { lat: 39.7832, lng: -89.6390 },
    ],
    school: { zone_id: "zone-004", name: "Roosevelt Academy", lat: 39.7832, lng: -89.6390, type: "elementary", enrollment: 320 },
    baselineCongestion: 0.06,
    peaks: [
      { centerMin: 7 * 60 + 50, spread: 18, intensity: 0.65 },
      { centerMin: 14 * 60 + 50, spread: 18, intensity: 0.72 },
    ],
  },
  {
    id: "zone-005",
    name: "Cedar Lane Corridor",
    path: [
      { lat: 39.7950, lng: -89.6572 },
      { lat: 39.7950, lng: -89.6520 },
    ],
    school: { zone_id: "zone-005", name: "Adams Preparatory", lat: 39.7950, lng: -89.6520, type: "middle", enrollment: 610 },
    baselineCongestion: 0.09,
    peaks: [
      { centerMin: 7 * 60 + 25, spread: 22, intensity: 0.72 },
      { centerMin: 15 * 60 + 10, spread: 22, intensity: 0.80 },
      { centerMin: 16 * 60 + 45, spread: 30, intensity: 0.30 },
    ],
  },
];

export const KHALIFA_CORRIDORS: CorridorDef[] = [
  {
    id: "khalifa-001",
    name: "Yasmina Academy Corridor",
    path: [
      { lat: 24.4242, lng: 54.5472 },
      { lat: 24.4159, lng: 54.5472 },
    ],
    school: { zone_id: "khalifa-001", name: "Yasmina British Academy", lat: 24.4158592, lng: 54.5471628, type: "high", enrollment: 1200 },
    baselineCongestion: 0.09,
    peaks: [
      { centerMin: 7 * 60 + 15, spread: 25, intensity: 0.82 },
      { centerMin: 14 * 60 + 30, spread: 25, intensity: 0.87 },
    ],
  },
  {
    id: "khalifa-002",
    name: "ADNOC Schools Corridor",
    path: [
      { lat: 24.4167, lng: 54.504 },
      { lat: 24.4167, lng: 54.5149 },
    ],
    school: { zone_id: "khalifa-002", name: "ADNOC Schools Khalifa City", lat: 24.416729, lng: 54.514899, type: "elementary", enrollment: 650 },
    baselineCongestion: 0.07,
    peaks: [
      { centerMin: 7 * 60 + 30, spread: 22, intensity: 0.74 },
      { centerMin: 14 * 60 + 15, spread: 22, intensity: 0.79 },
    ],
  },
  {
    id: "khalifa-003",
    name: "ISC Khalifa City Corridor",
    path: [
      { lat: 24.4280, lng: 54.5663 },
      { lat: 24.4145, lng: 54.5663 },
    ],
    school: { zone_id: "khalifa-003", name: "Int'l School of Choueifat", lat: 24.41446, lng: 54.56633, type: "middle", enrollment: 820 },
    baselineCongestion: 0.08,
    peaks: [
      { centerMin: 7 * 60 + 45, spread: 20, intensity: 0.71 },
      { centerMin: 14 * 60 + 45, spread: 20, intensity: 0.81 },
    ],
  },
];

export const MBZ_CORRIDORS: CorridorDef[] = [
  {
    id: "mbz-001",
    name: "Aldar Academies MBZ Corridor",
    path: [
      { lat: 24.3706, lng: 54.550 },
      { lat: 24.3706, lng: 54.5639 },
    ],
    school: { zone_id: "mbz-001", name: "Aldar Academies MBZ", lat: 24.370560, lng: 54.563863, type: "high", enrollment: 1100 },
    baselineCongestion: 0.10,
    peaks: [
      { centerMin: 7 * 60 + 20, spread: 24, intensity: 0.83 },
      { centerMin: 14 * 60 + 30, spread: 25, intensity: 0.88 },
    ],
  },
  {
    id: "mbz-002",
    name: "ADIS MBZ Corridor",
    path: [
      { lat: 24.358, lng: 54.5415 },
      { lat: 24.3463, lng: 54.5415 },
    ],
    school: { zone_id: "mbz-002", name: "Abu Dhabi Int'l School MBZ", lat: 24.346302, lng: 54.541512, type: "elementary", enrollment: 540 },
    baselineCongestion: 0.08,
    peaks: [
      { centerMin: 7 * 60 + 40, spread: 18, intensity: 0.70 },
      { centerMin: 14 * 60 + 20, spread: 20, intensity: 0.75 },
    ],
  },
  {
    id: "mbz-003",
    name: "Emirates National School Corridor",
    path: [
      { lat: 24.361, lng: 54.537 },
      { lat: 24.361, lng: 54.5510 },
    ],
    school: { zone_id: "mbz-003", name: "Emirates National School MBZ", lat: 24.360989, lng: 54.550989, type: "middle", enrollment: 780 },
    baselineCongestion: 0.09,
    peaks: [
      { centerMin: 7 * 60 + 30, spread: 22, intensity: 0.77 },
      { centerMin: 14 * 60 + 45, spread: 22, intensity: 0.84 },
    ],
  },
];

export const CITIES: CityConfig[] = [
  {
    id: "springfield_il",
    label: "Springfield, IL",
    corridors: SPRINGFIELD_CORRIDORS,
    overviewCenter: { lat: 39.7860, lng: -89.6480 },
    overviewZoom: 15,
    defaultZoom: 19,
    bounds: { north: 39.8077, south: 39.7643, east: -89.6197, west: -89.6763 },
  },
  {
    id: "khalifa_city_auh",
    label: "Khalifa City, AUH",
    corridors: KHALIFA_CORRIDORS,
    overviewCenter: { lat: 24.416, lng: 54.549 },
    overviewZoom: 14,
    defaultZoom: 17,
    bounds: { north: 24.445, south: 24.390, east: 54.600, west: 54.495 },
  },
  {
    id: "mbz_city_auh",
    label: "MBZ City, AUH",
    corridors: MBZ_CORRIDORS,
    overviewCenter: { lat: 24.360, lng: 54.552 },
    overviewZoom: 14,
    defaultZoom: 17,
    bounds: { north: 24.400, south: 24.325, east: 54.600, west: 54.510 },
  },
];
