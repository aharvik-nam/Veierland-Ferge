import React, { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { StopId, stopsMap, stopCoords } from '../data';
import { Navigation, Car, Footprints, AlertCircle, Loader2 } from 'lucide-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export default function FerjeMap({ targetStop }: { targetStop: StopId }) {
  const [userLoc, setUserLoc] = useState<google.maps.LatLngLiteral | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

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

  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

  if (!hasValidKey) {
    return (
      <div className="bg-[#FFF8F8] border border-[#FFD0D0] p-6 rounded-[24px] text-center shadow-sm">
        <AlertCircle className="w-8 h-8 text-[#D32F2F] mx-auto mb-3" />
        <h3 className="font-bold text-[#D32F2F] mb-2">Kart krever oppsett</h3>
        <p className="text-sm text-[#8C4A4A]">Angi GOOGLE_MAPS_PLATFORM_KEY under secrets for å aktivere kartet.</p>
      </div>
    );
  }

  const destination = stopCoords[targetStop];
  if (!destination) return null;

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="bg-white rounded-[32px] overflow-hidden border border-[#ECECE0] shadow-sm flex flex-col h-[500px] mt-8">
        <div className="p-6 pb-4 flex justify-between items-center z-10 bg-white border-b border-[#ECECE0] shadow-sm">
           <div>
             <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40] flex items-center gap-2 m-0">
               <Navigation className="w-5 h-5 text-[#A3A38E]" />
               Veibeskrivelse til {stopsMap[targetStop]}
             </h3>
             <p className="text-xs font-semibold text-[#A3A38E] mt-1">Fra din nåværende posisjon</p>
           </div>
        </div>
        
        <div className="flex-1 relative">
           {(!userLoc && !geoError) && (
             <div className="absolute inset-0 bg-[#F9F9F7] flex flex-col items-center justify-center z-20">
               <Loader2 className="w-8 h-8 text-[#5A5A40] animate-spin mb-4" />
               <p className="text-sm font-bold text-[#A3A38E] uppercase tracking-widest">Henter posisjon...</p>
             </div>
           )}
           {geoError && (
             <div className="absolute inset-0 bg-[#FFF8F8] flex flex-col items-center justify-center z-20 p-8 text-center">
               <AlertCircle className="w-8 h-8 text-[#D32F2F] mb-4" />
               <p className="text-sm font-bold text-[#D32F2F]">{geoError}</p>
             </div>
           )}
           <Map
             defaultCenter={destination}
             defaultZoom={11}
             mapId="FERJE_MAP"
             internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
             style={{ width: '100%', height: '100%' }}
             disableDefaultUI={true}
             zoomControl={true}
           >
             {userLoc && (
               <AdvancedMarker position={userLoc} title="Din posisjon">
                 <div className="w-4 h-4 bg-[#4285F4] rounded-full border-2 border-white shadow-md shadow-blue-900/50" />
               </AdvancedMarker>
             )}
             <AdvancedMarker position={destination} title={stopsMap[targetStop]}>
               <Pin background="#8C4A4A" glyphColor="#fff" borderColor="#5A2E2E" />
             </AdvancedMarker>
             
             {userLoc && <RouteDisplay origin={userLoc} destination={destination} />}
           </Map>
        </div>
      </div>
    </APIProvider>
  );
}

function RouteDisplay({ origin, destination }: {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [driveInfo, setDriveInfo] = useState<{distance: string, text: string} | null>(null);
  const [walkInfo, setWalkInfo] = useState<{distance: string, text: string} | null>(null);

  useEffect(() => {
    if (!routesLib || !map) return;
    
    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeWeight: 5
      }
    });
    setDirectionsRenderer(renderer);

    return () => {
      renderer.setMap(null);
    };
  }, [routesLib, map]);

  useEffect(() => {
    if (!routesLib || !directionsRenderer) return;

    const directionsService = new routesLib.DirectionsService();

    const fetchRoutes = async () => {
      try {
        const driveResponse = await directionsService.route({
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING
        });
        
        directionsRenderer.setDirections(driveResponse);
        const driveLeg = driveResponse.routes[0]?.legs[0];
        if (driveLeg) {
          setDriveInfo({
            text: driveLeg.duration?.text || '',
            distance: driveLeg.distance?.text || ''
          });
        }
      } catch (e) {
        console.error("Driving direction failed", e);
      }

      try {
        const walkResponse = await directionsService.route({
          origin,
          destination,
          travelMode: google.maps.TravelMode.WALKING
        });
        const walkLeg = walkResponse.routes[0]?.legs[0];
        if (walkLeg) {
          setWalkInfo({
            text: walkLeg.duration?.text || '',
            distance: walkLeg.distance?.text || ''
          });
        }
      } catch (e) {
        console.error("Walking direction failed", e);
      }
    };

    fetchRoutes();
  }, [routesLib, directionsRenderer, origin, destination]);

  if (!driveInfo && !walkInfo) return null;

  return (
    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-md border border-[#ECECE0] z-10 flex flex-col gap-3 min-w-[200px]">
       {driveInfo && (
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E8E8DF] flex items-center justify-center text-[#5A5A40]">
               <Car className="w-4 h-4" />
            </div>
            <div>
               <div className="font-bold text-[#2D2D24] text-sm">{driveInfo.text}</div>
               <div className="text-[10px] font-bold text-[#A3A38E] uppercase tracking-widest">{driveInfo.distance} kjøring</div>
            </div>
         </div>
       )}
       {walkInfo && (
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E8E8DF] flex items-center justify-center text-[#5A5A40]">
               <Footprints className="w-4 h-4" />
            </div>
            <div>
               <div className="font-bold text-[#2D2D24] text-sm">{walkInfo.text}</div>
               <div className="text-[10px] font-bold text-[#A3A38E] uppercase tracking-widest">{walkInfo.distance} gange</div>
            </div>
         </div>
       )}
    </div>
  );
}
