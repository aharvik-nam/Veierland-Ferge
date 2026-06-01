import React, { useEffect, useRef, useState } from 'react';
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { StopId, stopsMap, stopCoords } from '../data';
import { Navigation, Car, Footprints, AlertCircle, Loader2 } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY } from '../App';

export default function FerjeMap({ 
    targetStop, 
    userLoc, 
    geoError, 
    driveResponse,
    walkInfo,
    driveInfo
}: { 
    targetStop: StopId;
    userLoc: google.maps.LatLngLiteral | null;
    geoError: string | null;
    driveResponse: google.maps.DirectionsResult | null;
    walkInfo: {distance: string, text: string} | null;
    driveInfo: {distance: string, text: string} | null;
}) {

  const hasValidKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY';

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
             
             {userLoc && (
               <RouteDisplay 
                 origin={userLoc} 
                 destination={destination} 
                 driveResponse={driveResponse}
                 driveInfo={driveInfo}
                 walkInfo={walkInfo}
               />
             )}
           </Map>
        </div>
      </div>
  );
}

function RouteDisplay({ origin, destination, driveResponse, driveInfo, walkInfo }: {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  driveResponse: google.maps.DirectionsResult | null;
  walkInfo: {distance: string, text: string} | null;
  driveInfo: {distance: string, text: string} | null;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

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
    if (directionsRenderer && driveResponse) {
       directionsRenderer.setDirections(driveResponse);
    }
  }, [directionsRenderer, driveResponse]);

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
