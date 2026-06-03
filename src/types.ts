export type StopId = 'buss_tbg' | 'tenvik' | 'vestgarden' | 'engo' | 'tangen' | 'buss_tenv';

export interface TripWarning {
  type: 'booking' | 'engo';
  text: string;
  deadline?: string;
}

export interface TripEvent {
  key: string;
  time: string;
  stopId: StopId;
  name: string;
}

export interface Trip {
  id: string;
  subpath: TripEvent[];
  duration: number;
  startTime: string;
  startStop: StopId;
  endTime: string;
  warnings: TripWarning[];
  dateStr: string;
  dayLabel: string;
}

export type ThemeKey = 'fjord' | 'driftwood' | 'midnattsol' | 'lanterne';
export type StyleKey = 'sjokart' | 'tavle' | 'mykt';

export interface Theme {
  label: string;
  deep: string;
  deep2: string;
  onDeep: string;
  onDeepDim: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkDim: string;
  line: string;
  accent: string;
  accentInk: string;
  accent2: string;
  good: string;
  warn: string;
  bad: string;
  swatch: string[];
}

export interface VisualStyle {
  label: string;
  numeral: 'serif' | 'mono';
  texture: boolean;
  radius: number;
}

export interface Weather {
  temp: number;
  wind: number;
  code: number;
}

export type Screen = 'home' | 'results' | 'detail';
export type TransportMode = 'drive' | 'bus' | 'walk';
