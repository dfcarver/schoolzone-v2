export interface ZoneDef {
  id: string;
  name: string;
  cityId: "springfield_il" | "khalifa_city_auh" | "mbz_city_auh";
  type: "elementary" | "middle" | "high";
  enrollment: number;
  cameras: number;
  lat: number;
  lng: number;
}

export const ZONES: ZoneDef[] = [
  // ── Springfield, IL ────────────────────────────────────────────────────────
  {
    id: "zone-001",
    name: "Lincoln Elementary",
    cityId: "springfield_il",
    type: "elementary",
    enrollment: 420,
    cameras: 4,
    lat: 39.7817,
    lng: -89.6501,
  },
  {
    id: "zone-002",
    name: "Roosevelt Middle School",
    cityId: "springfield_il",
    type: "middle",
    enrollment: 610,
    cameras: 5,
    lat: 39.79,
    lng: -89.644,
  },
  {
    id: "zone-003",
    name: "Jefferson High School",
    cityId: "springfield_il",
    type: "high",
    enrollment: 1050,
    cameras: 8,
    lat: 39.7755,
    lng: -89.658,
  },
  {
    id: "zone-004",
    name: "Washington Elementary",
    cityId: "springfield_il",
    type: "elementary",
    enrollment: 385,
    cameras: 3,
    lat: 39.7832,
    lng: -89.639,
  },
  {
    id: "zone-005",
    name: "Adams Middle School",
    cityId: "springfield_il",
    type: "middle",
    enrollment: 540,
    cameras: 5,
    lat: 39.795,
    lng: -89.652,
  },

  // ── Khalifa City, Abu Dhabi ────────────────────────────────────────────────
  {
    id: "khalifa-001",
    name: "Yasmina British Academy",
    cityId: "khalifa_city_auh",
    type: "high",
    enrollment: 1200,
    cameras: 8,
    lat: 24.4158592,
    lng: 54.5471628,
  },
  {
    id: "khalifa-002",
    name: "ADNOC Schools Khalifa",
    cityId: "khalifa_city_auh",
    type: "elementary",
    enrollment: 650,
    cameras: 5,
    lat: 24.411,
    lng: 54.542,
  },
  {
    id: "khalifa-003",
    name: "Khalifa International Academy",
    cityId: "khalifa_city_auh",
    type: "middle",
    enrollment: 820,
    cameras: 6,
    lat: 24.4195,
    lng: 54.5575,
  },

  // ── MBZ City, Abu Dhabi ────────────────────────────────────────────────────
  {
    id: "mbz-001",
    name: "Aldar Academies MBZ",
    cityId: "mbz_city_auh",
    type: "high",
    enrollment: 1100,
    cameras: 7,
    lat: 24.37056,
    lng: 54.563863,
  },
  {
    id: "mbz-002",
    name: "Al Bateen Academy",
    cityId: "mbz_city_auh",
    type: "elementary",
    enrollment: 540,
    cameras: 4,
    lat: 24.364,
    lng: 54.559,
  },
  {
    id: "mbz-003",
    name: "Emirates National School",
    cityId: "mbz_city_auh",
    type: "middle",
    enrollment: 780,
    cameras: 6,
    lat: 24.378,
    lng: 54.566,
  },
];
