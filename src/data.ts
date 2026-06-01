export type StopId = 'buss_tbg' | 'tenvik' | 'vestgarden' | 'engo' | 'tangen' | 'buss_tenv';

export const stopsMap: Record<StopId, string> = {
  buss_tbg: "Buss fra Tønsberg",
  tenvik: "Tenvik",
  vestgarden: "Vestgården",
  engo: "Engø",
  tangen: "Tangen",
  buss_tenv: "Buss til Tønsberg (fra Tenvik)"
};

export const stopCoords: Record<StopId, {lat: number, lng: number} | null> = {
  buss_tbg: { lat: 59.2675, lng: 10.4076 },
  tenvik: { lat: 59.1843, lng: 10.3772 },
  vestgarden: { lat: 59.1578, lng: 10.3456 },
  engo: { lat: 59.1517, lng: 10.2736 },
  tangen: { lat: 59.1450, lng: 10.3471 },
  buss_tenv: { lat: 59.2675, lng: 10.4076 }
};

export interface FerryLoop {
   id: string;
   bussTbg: string | null;
   tenvikUt: string | null;
   vestgardenUt: string | null;
   engoUt: string | null;
   tangenUt: string | null;
   tangenInn: string | null;
   engoInn: string | null;
   vestgardenInn: string | null;
   tenvikInn: string | null;
   bussTenvik: string | null;
}

export const monFriLoops: FerryLoop[] = [
  { id: "mf-0", bussTbg: null, tenvikUt: null, vestgardenUt: null, engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: "06:10", tenvikInn: "06:20", bussTenvik: "06:43" },
  { id: "mf-1", bussTbg: null, tenvikUt: "06:20", vestgardenUt: "06:30", engoUt: null, tangenUt: "06:40", tangenInn: "06:40", engoInn: null, vestgardenInn: "06:50", tenvikInn: "07:00", bussTenvik: "07:08" },
  { id: "mf-2", bussTbg: "06:40", tenvikUt: "07:15", vestgardenUt: "07:25", engoUt: "07:35", tangenUt: "07:45", tangenInn: "07:45", engoInn: null, vestgardenInn: "07:55", tenvikInn: "08:05", bussTenvik: "08:13" },
  { id: "mf-3", bussTbg: "07:45", tenvikUt: "08:15", vestgardenUt: "08:25", engoUt: null, tangenUt: "08:35", tangenInn: "08:45", engoInn: null, vestgardenInn: "08:55", tenvikInn: "09:05", bussTenvik: "09:13" },
  { id: "mf-4", bussTbg: "08:45", tenvikUt: "09:15", vestgardenUt: "09:25", engoUt: null, tangenUt: "09:35", tangenInn: "09:45", engoInn: null, vestgardenInn: "09:55", tenvikInn: "10:05", bussTenvik: "10:13" },
  { id: "mf-5", bussTbg: null, tenvikUt: "10:05", vestgardenUt: "10:15", engoUt: "10:35", tangenUt: "10:45", tangenInn: "10:45", engoInn: null, vestgardenInn: "10:55", tenvikInn: "11:05", bussTenvik: "11:13" },
  { id: "mf-6", bussTbg: "10:45", tenvikUt: "11:15", vestgardenUt: "11:25", engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: "11:25", tenvikInn: "11:35", bussTenvik: "11:43" },
  { id: "mf-7", bussTbg: "13:15", tenvikUt: "13:45", vestgardenUt: "13:55", engoUt: null, tangenUt: "14:05", tangenInn: "14:05", engoInn: null, vestgardenInn: "14:15", tenvikInn: "14:25", bussTenvik: "14:43" },
  { id: "mf-8", bussTbg: "14:15", tenvikUt: "14:45", vestgardenUt: "14:55", engoUt: "15:05", tangenUt: "15:15", tangenInn: "15:15", engoInn: null, vestgardenInn: "15:25", tenvikInn: "15:35", bussTenvik: "15:43" },
  { id: "mf-9", bussTbg: "15:15", tenvikUt: "15:45", vestgardenUt: "15:55", engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: "15:55", tenvikInn: "16:05", bussTenvik: "16:13" },
  { id: "mf-10", bussTbg: "15:45", tenvikUt: "16:15", vestgardenUt: "16:25", engoUt: null, tangenUt: "16:35", tangenInn: "16:35", engoInn: "16:45", vestgardenInn: "16:55", tenvikInn: "17:05", bussTenvik: "17:13" },
  { id: "mf-11", bussTbg: "16:45", tenvikUt: "17:10", vestgardenUt: "17:20", engoUt: null, tangenUt: "17:30", tangenInn: "17:30", engoInn: null, vestgardenInn: "17:40", tenvikInn: "17:50", bussTenvik: "17:58" },
  { id: "mf-12", bussTbg: "18:30", tenvikUt: "19:00", vestgardenUt: "19:10", engoUt: "19:20", tangenUt: "19:30", tangenInn: "19:30", engoInn: null, vestgardenInn: "19:40", tenvikInn: "19:50", bussTenvik: "19:58" },
  { id: "mf-13", bussTbg: "19:30", tenvikUt: "20:00", vestgardenUt: "20:10", engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: null, tenvikInn: null, bussTenvik: null },
  { id: "mf-14", bussTbg: null, tenvikUt: null, vestgardenUt: null, engoUt: null, tangenUt: null, tangenInn: "20:30", engoInn: null, vestgardenInn: "20:40", tenvikInn: "20:50", bussTenvik: null },
  { id: "mf-15", bussTbg: null, tenvikUt: "21:45", vestgardenUt: "21:55", engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: null, tenvikInn: null, bussTenvik: null }
];

export const satLoops: FerryLoop[] = [
  { id: "sa-0", bussTbg: null, tenvikUt: null, vestgardenUt: null, engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: "07:50", tenvikInn: "08:00", bussTenvik: null },
  { id: "sa-1", bussTbg: null, tenvikUt: "08:10", vestgardenUt: "08:20", engoUt: null, tangenUt: "08:30", tangenInn: "08:30", engoInn: null, vestgardenInn: "08:40", tenvikInn: "08:50", bussTenvik: "08:58" },
  { id: "sa-2", bussTbg: "08:30", tenvikUt: "09:00", vestgardenUt: "09:10", engoUt: "09:20", tangenUt: "09:30", tangenInn: "09:30", engoInn: null, vestgardenInn: "09:40", tenvikInn: "09:50", bussTenvik: "09:58" },
  { id: "sa-3", bussTbg: "09:30", tenvikUt: "10:30", vestgardenUt: "10:40", engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: "10:40", tenvikInn: "10:50", bussTenvik: "10:58" },
  { id: "sa-4", bussTbg: "10:30", tenvikUt: "11:00", vestgardenUt: "11:10", engoUt: "11:20", tangenUt: "11:30", tangenInn: "11:30", engoInn: null, vestgardenInn: "11:40", tenvikInn: "11:50", bussTenvik: "11:58" },
  { id: "sa-5", bussTbg: "11:30", tenvikUt: "12:00", vestgardenUt: "12:10", engoUt: "12:20", tangenUt: "12:30", tangenInn: "12:30", engoInn: null, vestgardenInn: "12:40", tenvikInn: "12:50", bussTenvik: "12:58" },
  { id: "sa-6", bussTbg: "12:30", tenvikUt: "13:00", vestgardenUt: "13:10", engoUt: null, tangenUt: "13:20", tangenInn: "14:30", engoInn: null, vestgardenInn: "14:40", tenvikInn: "14:50", bussTenvik: "14:58" },
  { id: "sa-7", bussTbg: null, tenvikUt: "15:00", vestgardenUt: "15:10", engoUt: "15:20", tangenUt: "15:30", tangenInn: "16:30", engoInn: null, vestgardenInn: "16:40", tenvikInn: "16:50", bussTenvik: "16:58" },
  { id: "sa-8", bussTbg: null, tenvikUt: "17:00", vestgardenUt: "17:10", engoUt: "17:20", tangenUt: "17:30", tangenInn: "17:30", engoInn: null, vestgardenInn: "17:40", tenvikInn: "17:50", bussTenvik: "17:58" },
  { id: "sa-9", bussTbg: null, tenvikUt: "18:30", vestgardenUt: "18:40", engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: "18:40", tenvikInn: "18:50", bussTenvik: "18:58" }
];

export const sunLoops: FerryLoop[] = [
  { id: "su-1", bussTbg: null, tenvikUt: "10:30", vestgardenUt: "10:40", engoUt: "10:50", tangenUt: "11:00", tangenInn: "11:00", engoInn: null, vestgardenInn: "11:10", tenvikInn: "11:20", bussTenvik: null },
  { id: "su-2", bussTbg: null, tenvikUt: "11:30", vestgardenUt: "11:40", engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: "11:40", tenvikInn: "11:50", bussTenvik: null },
  { id: "su-3", bussTbg: null, tenvikUt: "12:00", vestgardenUt: "12:10", engoUt: "12:20", tangenUt: "12:30", tangenInn: "12:30", engoInn: null, vestgardenInn: "12:40", tenvikInn: "12:50", bussTenvik: null },
  { id: "su-4", bussTbg: null, tenvikUt: "13:00", vestgardenUt: "13:10", engoUt: "13:20", tangenUt: "13:30", tangenInn: "13:30", engoInn: null, vestgardenInn: "13:40", tenvikInn: "13:50", bussTenvik: null },
  { id: "su-5", bussTbg: null, tenvikUt: "14:00", vestgardenUt: "14:10", engoUt: null, tangenUt: "14:20", tangenInn: "15:30", engoInn: null, vestgardenInn: "15:40", tenvikInn: "15:50", bussTenvik: null },
  { id: "su-6", bussTbg: null, tenvikUt: "16:00", vestgardenUt: "16:10", engoUt: "16:20", tangenUt: "16:30", tangenInn: "16:30", engoInn: null, vestgardenInn: "16:40", tenvikInn: "16:50", bussTenvik: null },
  { id: "su-7", bussTbg: null, tenvikUt: "17:00", vestgardenUt: "17:10", engoUt: null, tangenUt: "17:20", tangenInn: "17:30", engoInn: null, vestgardenInn: "17:40", tenvikInn: "17:50", bussTenvik: null },
  { id: "su-8", bussTbg: null, tenvikUt: "19:00", vestgardenUt: "19:10", engoUt: "19:20", tangenUt: "19:30", tangenInn: "19:30", engoInn: null, vestgardenInn: "19:40", tenvikInn: "19:50", bussTenvik: null },
  { id: "su-9", bussTbg: null, tenvikUt: "20:00", vestgardenUt: "20:10", engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: null, tenvikInn: null, bussTenvik: null },
  { id: "su-10", bussTbg: null, tenvikUt: null, vestgardenUt: null, engoUt: null, tangenUt: null, tangenInn: "20:30", engoInn: null, vestgardenInn: "20:40", tenvikInn: "20:50", bussTenvik: null },
  { id: "su-11", bussTbg: null, tenvikUt: "21:30", vestgardenUt: "21:40", engoUt: null, tangenUt: null, tangenInn: null, engoInn: null, vestgardenInn: null, tenvikInn: null, bussTenvik: null }
];

export const rules = [
  { text: "Røde avganger til/fra Engø kjøres kun i perioden 1. april – 28. september. Enkeltavganger kan forhåndsbestilles hele året ved å ringe fergen." },
  { text: "ALL RETUR TIL ENGØ GÅR FRA VESTGÅRDEN!", alert: true },
  { text: "Hverdager: Avgang 20:30 fra Tangen og 20:40 fra Vestgården MÅ bestilles før kl 18:00. Siste avgang 21:45 fra Tenvik MÅ bestilles før 18:00." },
  { text: "Lørdag: Avgang Vestgården 07:50 MÅ bestilles kvelden før innen 20:00." },
  { text: "Søndag: Avgang 20:30 fra Tangen og 20:40 fra Vestgården MÅ bestilles før 18:00. Siste avgang 21:30 fra Tenvik MÅ bestilles før 18:00." },
  { text: "Telefon Fergen: 91888219" }
];
