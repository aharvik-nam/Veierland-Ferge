import React, { useState, useEffect } from 'react';
import { Ship, Info, Calendar, Clock, Phone, MapPin, ArrowRight, Timer, Car, Footprints } from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  stopsMap,
  stopCoords,
  monFriLoops,
  satLoops,
  sunLoops,
  FerryLoop,
  StopId,
  rules
} from './data';

import FerjeMap from './components/FerjeMap';
import WeatherWidget from './components/WeatherWidget';

export const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export default function App() {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
      <div className="min-h-screen bg-[#F5F5F0] text-[#424231] font-sans flex flex-col">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end p-6 sm:p-8 pb-4 max-w-4xl mx-auto w-full gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#E8E8DF] border border-[#D6D6C2] rounded-full text-[#5A5A40] shrink-0">
            <Ship className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#2D2D24] mb-1">Veierland Ferge</h1>
            <p className="text-[#7A7A66] text-xs sm:text-sm tracking-wide uppercase font-medium">M/F JUTØYA Ruteplanlegger</p>
          </div>
        </div>
        <WeatherWidget />
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 flex-1 flex flex-col min-h-0">
        <div className="bg-white rounded-[32px] shadow-sm border border-[#ECECE0] overflow-hidden mb-8">
          <DeparturePlanner />
        </div>

        <div className="mt-2 flex flex-col gap-4">
          <a 
            href="tel:91888219"
            className="flex items-center justify-center gap-3 px-6 py-5 bg-[#5A5A40] text-white rounded-[24px] font-bold text-lg tracking-wide hover:bg-[#424231] transition-all shadow-sm w-full"
          >
            <Phone className="w-5 h-5 opacity-90" />
            Ring Fergen: 918 88 219
          </a>
          <RulesDropdown />
        </div>
      </main>
    </div>
    </APIProvider>
  );
}

function RulesDropdown() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-[#ECECE0] overflow-hidden">
      <button 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left transition-colors hover:bg-[#F9F9F7]"
      >
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40] flex items-center gap-2 m-0">
          <Info className="w-5 h-5 text-[#A3A38E]" />
          Viktig Informasjon
        </h2>
        <div className={`shrink-0 ml-4 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${open ? '-rotate-90 bg-[#F0F0E8]' : 'rotate-90 bg-white border border-[#E0E0D6] shadow-sm'}`}>
          <ArrowRight className="w-4 h-4 text-[#5A5A40]" />
        </div>
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-dashed border-[#ECECE0]">
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {rules.map((rule, idx) => (
              <div key={idx} className={`p-5 sm:p-6 rounded-[24px] border border-[#ECECE0] flex items-start gap-3 shadow-sm ${rule.alert ? 'bg-[#FFF8F8] border-[#FFD0D0]' : 'bg-[#F9F9F7]'}`}>
                {rule.alert && <span className="w-3 h-3 mt-1.5 rounded-full bg-[#E57373] shrink-0" />}
                <p className={`text-base leading-relaxed ${rule.alert ? 'font-bold text-[#D32F2F]' : 'text-[#424231] font-medium'}`}>
                  {rule.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const sequenceKeys: (keyof FerryLoop)[] = [
  'bussTbg', 'tenvikUt', 'vestgardenUt', 'engoUt', 'tangenUt',
  'tangenInn', 'engoInn', 'vestgardenInn', 'tenvikInn', 'bussTenvik'
];

interface ResolvedEvent {
  key: string;
  time: string;
  stopId: StopId;
  name: string;
}

function getStopIdForKey(k: keyof FerryLoop): StopId | null {
  if (k === 'bussTbg') return 'buss_tbg';
  if (k === 'tenvikUt' || k === 'tenvikInn') return 'tenvik';
  if (k === 'vestgardenUt' || k === 'vestgardenInn') return 'vestgarden';
  if (k === 'engoUt' || k === 'engoInn') return 'engo';
  if (k === 'tangenUt' || k === 'tangenInn') return 'tangen';
  if (k === 'bussTenvik') return 'buss_tenv';
  return null;
}

function parseTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getOsloDate() {
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Oslo" });
  return new Date(dateStr);
}

function getOsloDateString(d: Date) {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function DeparturePlanner() {
  const routesLib = useMapsLibrary('routes');
  const [userLoc, setUserLoc] = useState<google.maps.LatLngLiteral | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [fromStop, setFromStop] = useState<StopId>('tenvik');
  const [toStop, setToStop] = useState<StopId>('vestgarden');
  
  const [driveResponse, setDriveResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [driveInfo, setDriveInfo] = useState<{distance: string, text: string, value: number} | null>(null);
  const [walkInfo, setWalkInfo] = useState<{distance: string, text: string, value: number} | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolokasjon støttes ikke av nettleseren.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      (err) => {
        setGeoError('Kunne ikke hente din posisjon.');
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!routesLib || !userLoc) return;
    const dest = stopCoords[fromStop];
    if (!dest) return;
    
    let isMounted = true;
    const directionsService = new routesLib.DirectionsService();

    const fetchRoutes = async () => {
      try {
        const dRes = await directionsService.route({
          origin: userLoc,
          destination: dest,
          travelMode: google.maps.TravelMode.DRIVING
        });
        if (isMounted) {
          setDriveResponse(dRes);
          const leg = dRes.routes[0]?.legs[0];
          if (leg) {
             setDriveInfo({ text: leg.duration?.text || '', distance: leg.distance?.text || '', value: leg.duration?.value || 0 });
          }
        }
      } catch (e) {
        console.error(e);
      }
      
      try {
        const wRes = await directionsService.route({
          origin: userLoc,
          destination: dest,
          travelMode: google.maps.TravelMode.WALKING
        });
        if (isMounted) {
          const leg = wRes.routes[0]?.legs[0];
          if (leg) {
             setWalkInfo({ text: leg.duration?.text || '', distance: leg.distance?.text || '', value: leg.duration?.value || 0 });
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchRoutes();
    
    return () => { isMounted = false; };
  }, [routesLib, userLoc, fromStop]);

  const [currentTime, setCurrentTime] = useState(getOsloDate());
  const todayStr = getOsloDateString(currentTime);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getOsloDate()), 10000); // 10s for UI freshness
    return () => clearInterval(timer);
  }, []);

  const getDayType = (dateStr: string): 'monfri' | 'sat' | 'sun' => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDay();
    if (day === 0) return 'sun';
    if (day === 6) return 'sat';
    return 'monfri';
  };

  const selectedDay = getDayType(selectedDateStr);
  const isToday = selectedDateStr === todayStr;
  const isPast = selectedDateStr < todayStr;
  
  const getActiveLoops = () => {
    switch (selectedDay) {
      case 'sat': return satLoops;
      case 'sun': return sunLoops;
      default: return monFriLoops;
    }
  };

  const loops = getActiveLoops();
  const currentHHMM = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

  // Find all valid trips between fromStop and toStop
  const validTrips = loops.map(loop => {
    const events: ResolvedEvent[] = [];
    sequenceKeys.forEach(k => {
      const time = loop[k];
      if (typeof time === 'string') {
        const sId = getStopIdForKey(k);
        if (sId) {
          events.push({ key: k, time, stopId: sId, name: stopsMap[sId] });
        }
      }
    });

    let bestSubpath: ResolvedEvent[] | null = null;
    let shortestDuration = Infinity;

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (events[i].stopId === fromStop && events[j].stopId === toStop) {
          let duration = parseTime(events[j].time) - parseTime(events[i].time);
          if (duration < 0) duration += 24 * 60; // Crosses midnight
          if (duration < shortestDuration) {
            shortestDuration = duration;
            bestSubpath = events.slice(i, j + 1);
          }
        }
      }
    }

    return bestSubpath ? { loop, subpath: bestSubpath, duration: shortestDuration } : null;
  }).filter(t => t !== null) as { loop: FerryLoop, subpath: ResolvedEvent[], duration: number }[];

  const filteredTrips = validTrips.map(t => {
     let engoText: string | null = null;
     let requestText: string | null = null;
     let isMissedBooking = false;
     
     const hasEngo = t.subpath.some(ev => ev.stopId === 'engo');
     if (hasEngo) {
         const [, mStr, dStr] = selectedDateStr.split('-');
         const m = parseInt(mStr, 10);
         const d = parseInt(dStr, 10);
         const isEngoSeason = (m > 4 && m < 9) || (m === 4) || (m === 9 && d <= 28);
         if (!isEngoSeason) {
             engoText = "Rød avgang: Kjøres normalt kun 1. april - 28. september. Om du reiser direkte, sjekk om forhåndsbestilling er påkrevd.";
         }
     }

     const st = t.subpath[0].time;
     const sId = t.subpath[0].stopId;
     
     if (selectedDay === 'monfri' || selectedDay === 'sun') {
         if ((sId === 'tangen' && st >= '20:30') || (sId === 'vestgarden' && st >= '20:40') || (sId === 'tenvik' && st >= '21:30')) {
             if (isPast || (isToday && currentTime.getHours() >= 18)) {
                 requestText = "Denne avgangen skulle ha vært forhåndsbestilt senest kl. 18:00.";
                 isMissedBooking = true;
             } else {
                 requestText = "OBS: Denne avgangen MÅ forhåndsbestilles senest kl. 18:00 avreisedagen.";
             }
         }
     } else if (selectedDay === 'sat') {
         if (sId === 'vestgarden' && st <= '07:50') {
             if (isPast || isToday) {
                 requestText = "Denne ruten skulle ha vært forhåndsbestilt kvelden før, innen kl. 20:00.";
                 isMissedBooking = true;
             } else {
                 requestText = "OBS: Denne avgangen MÅ forhåndsbestilles kvelden før, innen kl. 20:00.";
             }
         }
     }

     return { ...t, engoText, requestText, isMissedBooking };
  }).filter(t => {
    if (!isToday) return true;
    return t.subpath[0].time >= currentHHMM;
  });

  const stopOptions = Object.keys(stopsMap) as StopId[];

  const formatCountdown = (tripTime: string) => {
    const tripMins = parseTime(tripTime);
    const currMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    let diff = tripMins - currMins;
    if (diff < 0) diff += 24 * 60; // Just in case
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0) return `${h} t ${m} min`;
    return `${m} min`;
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#A3A38E] flex items-center gap-2">
          <MapPin className="text-[#5A5A40] w-5 h-5" />
          Finn reise {isToday ? '(Viser kun kommende)' : isPast ? '(Historisk)' : ''}
        </h2>
        <div className="relative shrink-0 w-full sm:w-auto">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5A5A40]" />
          <input
            type="date"
            value={selectedDateStr}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            className="pl-11 pr-4 py-3 bg-[#F9F9F7] rounded-xl border border-[#ECECE0] text-base text-[#424231] font-bold uppercase tracking-wide outline-none focus:ring-2 focus:ring-[#5A5A40] transition-shadow shadow-sm hover:shadow cursor-pointer block min-w-[180px] w-full sm:w-auto"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-[#A3A38E] pl-1">Reise fra</label>
          <div className="relative">
            <div className="absolute left-[18px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-[#5A5A40]"></div>
            <select
              value={fromStop}
              onChange={(e) => setFromStop(e.target.value as StopId)}
              className="w-full pl-12 pr-4 py-4 bg-[#F9F9F7] rounded-2xl border border-transparent text-base sm:text-lg text-[#2D2D24] focus:ring-2 focus:ring-[#5A5A40] outline-none font-bold cursor-pointer"
            >
              {stopOptions.map(s => <option key={s} value={s}>{stopsMap[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-[#A3A38E] pl-1">Reise til</label>
          <div className="relative">
            <div className="absolute left-[18px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-[2.5px] border-[#8C4A4A]"></div>
            <select
              value={toStop}
              onChange={(e) => setToStop(e.target.value as StopId)}
              className="w-full pl-12 pr-4 py-4 bg-[#F9F9F7] rounded-2xl border border-transparent text-base sm:text-lg text-[#2D2D24] focus:ring-2 focus:ring-[#8C4A4A] outline-none font-bold cursor-pointer"
            >
              {stopOptions.map(s => <option key={s} value={s}>{stopsMap[s]}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTrips.length === 0 ? (
          <div className="text-center py-10 bg-[#F9F9F7] rounded-[24px] border border-dashed border-[#D6D6C2]">
            <p className="text-[#8C8C73] text-sm font-medium">Ingen kommende ruter funnet for dette søket på valgt dag.</p>
          </div>
        ) : (
          filteredTrips.map((trip, idx) => {
            const isNext = isToday && idx === 0;
            const countdownText = isNext && !trip.isMissedBooking ? formatCountdown(trip.subpath[0].time) : undefined;
            return <TripResultCard 
              key={`${trip.loop.id}-${idx}`} 
              trip={trip as any} 
              isNext={isNext && !trip.isMissedBooking} 
              countdownText={countdownText} 
              driveInfo={isNext && !trip.isMissedBooking ? driveInfo : undefined}
              walkInfo={isNext && !trip.isMissedBooking ? walkInfo : undefined}
            />;
          })
        )}
      </div>
      
      {/* Map Section */}
      <FerjeMap 
        targetStop={fromStop} 
        userLoc={userLoc} 
        geoError={geoError} 
        driveResponse={driveResponse}
        driveInfo={driveInfo}
        walkInfo={walkInfo}
      />
    </div>
  );
}

function TripResultCard({ trip, isNext, countdownText, driveInfo, walkInfo }: { trip: { loop: FerryLoop, subpath: ResolvedEvent[], duration: number, engoText: string|null, requestText: string|null, isMissedBooking: boolean }; isNext?: boolean; countdownText?: string; driveInfo?: any; walkInfo?: any; }) {
  const [expanded, setExpanded] = useState(false);
  const start = trip.subpath[0];
  const end = trip.subpath[trip.subpath.length - 1];

  const fadeClass = trip.isMissedBooking ? 'opacity-50 grayscale' : '';

  return (
    <div className={`rounded-[24px] overflow-hidden transition-all duration-300 ${expanded ? 'bg-white border border-[#E0E0D6] shadow-md' : 'bg-[#F9F9F7] hover:bg-[#F0F0E8] border border-transparent'} ${isNext ? 'ring-2 ring-offset-2 ring-offset-white ring-[#5A5A40]' : ''}`}>
      {isNext && (
        <div className="bg-[#5A5A40] text-[#F5F5F0] text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2.5">
          <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start gap-4">
            <span className="flex items-center gap-1.5 shrink-0"><Timer className="w-3.5 h-3.5" /> Neste Avgang</span>
            <span className="flex items-center gap-1.5 opacity-90 text-[11px]"><Clock className="w-4 h-4" /> Går om {countdownText}</span>
          </div>
          {(driveInfo || walkInfo) && (
             <div className="flex items-center gap-3 text-white opacity-90 bg-black/20 px-3 py-1.5 rounded-lg w-full sm:w-auto justify-between sm:justify-end text-[10px]">
                {driveInfo && (
                  <span className="flex items-center gap-1.5">
                     <Car className="w-4 h-4 text-[#A3A38E]" /> {driveInfo.text} unna
                  </span>
                )}
                {walkInfo && (
                  <span className="flex items-center gap-1.5">
                     <Footprints className="w-4 h-4 text-[#A3A38E]" /> {walkInfo.text} unna
                  </span>
                )}
             </div>
          )}
        </div>
      )}
      {(trip.requestText || trip.engoText) && (
        <div className={`px-5 py-3 ${trip.isMissedBooking ? 'bg-[#ECECE0] text-[#7A7A66]' : 'bg-[#FFF8F8] border-b border-[#FFD0D0] text-[#D32F2F]'} text-xs font-semibold rounded-t-[24px] flex flex-col gap-1`}>
          {trip.requestText && <div className="flex items-center gap-2"><Info className="w-4 h-4 shrink-0" /> {trip.requestText}</div>}
          {trip.engoText && <div className="flex items-center gap-2"><Info className="w-4 h-4 shrink-0" /> {trip.engoText}</div>}
        </div>
      )}
      <button 
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 sm:p-5 text-left transition-colors font-sans ${fadeClass}`}
      >
        <div className="flex items-center gap-4 w-full">
          {/* Departure */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] uppercase font-bold text-[#A3A38E] tracking-widest mb-1.5">Avgang</span>
            <div className="bg-white border border-[#E0E0D6] text-[#2D2D24] font-serif font-bold text-2xl sm:text-3xl py-2.5 px-3 sm:px-5 rounded-xl min-w-[70px] sm:min-w-[90px] text-center shadow-sm">
              {start.time}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center min-w-[40px] px-2 pt-5">
             <div className="w-full border-t-2 border-dashed border-[#D6D6C2] relative flex justify-center">
               <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A38E] translate-x-1/2 bg-[transparent]" />
             </div>
             <span className="text-[11px] font-bold text-[#A3A38E] uppercase mt-2">{trip.duration} min</span>
          </div>

          {/* Arrival */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] uppercase font-bold text-[#A3A38E] tracking-widest mb-1.5">Ankomst</span>
            <div className="text-[#5A5A40] font-serif font-bold text-2xl sm:text-3xl py-2.5 px-3 sm:px-5 text-center min-w-[70px] sm:min-w-[90px]">
              {end.time}
            </div>
          </div>
        </div>

        <div className={`shrink-0 ml-4 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${expanded ? 'rotate-90 bg-[#F0F0E8]' : 'bg-white border border-[#E0E0D6] shadow-sm'}`}>
          <ArrowRight className="w-4 h-4 text-[#5A5A40]" />
        </div>
      </button>
      
      {expanded && (
        <div className="p-6 pt-2 bg-[#F5F5F0]/50 border-t border-dashed border-[#D6D6C2]">
          <div className="flex flex-col gap-4 sm:gap-5 relative">
            <div className="absolute left-[9px] top-4 bottom-4 w-0.5 bg-[#D6D6C2]"></div>
            {trip.subpath.map((ev, i) => {
              const isFirst = i === 0;
              const isLast = i === trip.subpath.length - 1;
              const isEngo = ev.stopId === 'engo';
              return (
                <div key={ev.key} className="flex items-center gap-5 relative z-10">
                  <div className={`w-5 h-5 rounded-full border-[3px] border-white shadow flex items-center justify-center shrink-0 ${isFirst || isLast ? 'bg-[#5A5A40]' : 'bg-[#D6D6C2]'}`}>
                  </div>
                  <div className="flex items-center justify-between w-full pr-2">
                     <span className={`text-base sm:text-lg tracking-wide ${isFirst || isLast ? 'font-bold text-[#424231]' : 'font-semibold text-[#7A7A66]'}`}>
                       {ev.name}
                     </span>
                     <span className={`font-serif text-lg sm:text-xl font-bold ${isFirst || isLast ? 'text-[#2D2D24]' : 'text-[#7A7A66]'} ${isEngo ? 'text-[#8C4A4A]' : ''}`}>
                       {ev.time}
                     </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


