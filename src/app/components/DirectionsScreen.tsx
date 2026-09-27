import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  LocateFixed,
  Navigation,
  Phone,
  Search,
  ShieldAlert,
  X,
  MapPin,
} from "lucide-react";
import {
  MapContainer,
  Polyline,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
// @ts-expect-error - side-effect stylesheet import is handled by Vite.
import "leaflet/dist/leaflet.css";
import UserScreenLayout from "./UserScreenLayout";
import { useApp } from "../context/AppContext";

// --- Fix Leaflet default marker icons ---
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// --- Custom Icons Generator based on Type ---
const getDestinationIcon = (category: string) => {
  let color = "orange";
  if (category === "emergency") color = "red";
  else if (category === "utility") color = "blue";
  else if (category === "health") color = "red";
  else if (category === "government") color = "orange";

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

const userIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type DestinationCategory =
  | "government"
  | "emergency"
  | "utility"
  | "health";

type Destination = {
  id: number;
  name: string;
  nameFilipino: string;
  address: string;
  plusCode: string;
  lat: number;
  lng: number;
  category: DestinationCategory;
  hotlines?: string[];
};

type RouteData = {
  distance: number;
  duration: number;
  geometry: [number, number][];
};

const DESTINATIONS: Destination[] = [
  {
    id: 1,
    name: "New Naujan Municipal Hall",
    nameFilipino: "Bagong Munisipyo ng Naujan",
    address: "Barangay Santiago, Naujan, Oriental Mindoro 5204",
    plusCode: "7Q53874V+W3R",
    lat: 13.307255,
    lng: 121.292625,
    category: "government",
  },
  {
    id: 2,
    name: "Naujan Municipal Police Station",
    nameFilipino: "Presinto ng Pulisya ng Naujan",
    address: "Municipal Compound, Mabini St., Poblacion 1, Naujan, Oriental Mindoro 5204",
    plusCode: "7Q5388F2+QWV",
    lat: 13.32438,
    lng: 121.302252,
    category: "emergency",
    hotlines: ["0917 743 0311", "0998 598 5821", "(043) 208-3362"],
  },
  {
    id: 3,
    name: "Naujan Fire Station",
    nameFilipino: "Istasyon ng Bumbero ng Naujan",
    address: "Genilo St., Naujan, Oriental Mindoro 5204",
    plusCode: "7Q5388F3+MC",
    lat: 13.32418,
    lng: 121.30362,
    category: "emergency",
    hotlines: ["0956 660 0630"],
  },
  {
    id: 4,
    name: "MDRRMO / Rescue",
    nameFilipino: "MDRRMO / Rescue",
    address: "MDRRMO Operation Center, Naujan, Oriental Mindoro 5204",
    plusCode: "7Q538892+FGV",
    lat: 13.31863,
    lng: 121.301252,
    category: "emergency",
    hotlines: ["0975 229 0120", "0960 542 2200"],
  },
  {
    id: 5,
    name: "Naujan Community Hospital",
    nameFilipino: "Ospital ng Bayan ng Naujan",
    address: "Barangay Santiago, Naujan, Oriental Mindoro 5204",
    plusCode: "7Q5377WP+GGW",
    lat: 13.296255,
    lng: 121.286253,
    category: "health",
    hotlines: ["0936 308 5380", "(043) 208-3457"],
  },
  {
    id: 6,
    name: "Naujan Municipal Health Office",
    nameFilipino: "Municipal Health Office ng Naujan",
    address: "Mabini St., Barangay Santiago, Naujan, Oriental Mindoro 5204",
    plusCode: "7Q538892+J6V",
    lat: 13.319005,
    lng: 121.300502,
    category: "health",
    hotlines: ["0985 402 5204"],
  },
  {
    id: 7,
    name: "ORMECO Naujan",
    nameFilipino: "ORMECO Naujan",
    address: "Naujan, Oriental Mindoro 5204",
    plusCode: "7Q537778+233",
    lat: 13.2625,
    lng: 121.265127,
    category: "utility",
    hotlines: ["0912 283 3435"],
  },
];

const DEFAULT_CENTER: [number, number] = [13.3048, 121.295];

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

function UpdateMapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
}

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
  }, [map, points]);
  return null;
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatDuration(durationSeconds: number) {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}

function getGoogleMapsUrl(userLocation: [number, number] | null, destination: Destination) {
  const destinationText = `${destination.lat},${destination.lng}`;
  if (userLocation) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${destinationText}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destinationText}&travelmode=driving`;
}

export default function DirectionsScreen() {
  const navigate = useNavigate();
  const { lang } = useApp();
  const isFilipino = lang === "fil";

  const [selectedDestination, setSelectedDestination] = useState<Destination>(DESTINATIONS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const [route, setRoute] = useState<RouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);

  // Filter destinations based on search
  const filteredDestinations = DESTINATIONS.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.nameFilipino.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(isFilipino ? "Hindi suportado ng browser ang location." : "Geolocation is not supported by this browser.");
      return;
    }
    setIsLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(location);
        setMapCenter(location);
        setIsLocating(false);
      },
      () => {
        setLocationError(isFilipino ? "Hindi makuha ang iyong kasalukuyang lokasyon." : "Unable to get your current location.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const selectDestination = (destination: Destination) => {
    setSelectedDestination(destination);
    setSearchQuery(isFilipino ? destination.nameFilipino : destination.name);
    setShowDropdown(false);
    setRouteError("");
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // --- OSRM Route Fetching ---
  useEffect(() => {
    const controller = new AbortController();

    const loadRoute = async () => {
      if (!userLocation || !selectedDestination) {
        setRoute(null);
        setIsRouting(false);
        return;
      }

      setIsRouting(true);
      setRouteError("");
      
      // Set initial straight line for immediate visual feedback
      setRoute({
        distance: 0,
        duration: 0,
        geometry: [userLocation, [selectedDestination.lat, selectedDestination.lng]],
      });

      try {
        const coordinates = `${userLocation[1]},${userLocation[0]};${selectedDestination.lng},${selectedDestination.lat}`;
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Routing request failed");

        const data = await response.json();

        if (data.code !== "Ok" || !Array.isArray(data.routes) || !data.routes.length) {
          throw new Error("No route found");
        }

        if (controller.signal.aborted) return;

        const osrmRoute = data.routes[0];
        const geometry: [number, number][] = osrmRoute.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        setRoute({
          distance: osrmRoute.distance,
          duration: osrmRoute.duration,
          geometry,
        });
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.warn("OSRM fetch error:", err);
        
        // Fallback: Calculate straight-line distance
        const R = 6371;
        const dLat = ((selectedDestination.lat - userLocation[0]) * Math.PI) / 180;
        const dLng = ((selectedDestination.lng - userLocation[1]) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLocation[0] * Math.PI) / 180) * Math.cos((selectedDestination.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c * 1000; // meters
        const mins = Math.round((dist / 1000 / 40) * 60); // 40 km/h average

        setRoute({
          distance: dist,
          duration: mins * 60,
          geometry: [userLocation, [selectedDestination.lat, selectedDestination.lng]],
        });
        setRouteError(
          isFilipino
            ? "Hindi makuha ang driving route. Ipinapakita ang direktang lokasyon."
            : "Unable to load the driving route. Showing direct location instead."
        );
      } finally {
        if (!controller.signal.aborted) setIsRouting(false);
      }
    };

    loadRoute();

    return () => controller.abort();
  }, [userLocation, selectedDestination, isFilipino]);

  const routePoints = useMemo(() => {
    if (route?.geometry?.length) return route.geometry;
    if (userLocation) {
      return [userLocation, [selectedDestination.lat, selectedDestination.lng]] as [number, number][];
    }
    return [[selectedDestination.lat, selectedDestination.lng]] as [number, number][];
  }, [route, userLocation, selectedDestination]);

  const openGoogleMaps = () => {
    window.open(getGoogleMapsUrl(userLocation, selectedDestination), "_blank", "noopener,noreferrer");
  };

  return (
    <UserScreenLayout>
      <div className="min-h-full bg-gray-50 pb-6">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-white px-4 pb-3 pt-5">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-600"
                aria-label={isFilipino ? "Bumalik" : "Go back"}
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="text-base font-semibold text-gray-800">
                  {isFilipino ? "Mga Direksyon" : "Directions"}
                </h1>
                <p className="text-xs text-gray-400">
                  {isFilipino ? "Maghanap ng lokasyon sa Naujan" : "Find a location in Naujan"}
                </p>
              </div>

              <button
                type="button"
                onClick={getUserLocation}
                disabled={isLocating}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-600 disabled:opacity-60"
                aria-label={isFilipino ? "Aking lokasyon" : "My location"}
                title={isFilipino ? "Aking lokasyon" : "My location"}
              >
                <LocateFixed size={17} className={isLocating ? "animate-pulse" : ""} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={isFilipino ? "Maghanap ng destinasyon..." : "Search destination..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              
              {/* Dropdown Results */}
              {showDropdown && searchQuery && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredDestinations.length === 0 ? (
                      <div className="p-3 text-xs text-gray-400 text-center">No results found</div>
                    ) : (
                      filteredDestinations.map((dest) => (
                        <button
                          key={dest.id}
                          onClick={() => selectDestination(dest)}
                          className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-3"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${dest.category === 'emergency' || dest.category === 'health' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                            {dest.category === 'emergency' || dest.category === 'health' ? <ShieldAlert size={14} /> : <MapPin size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{isFilipino ? dest.nameFilipino : dest.name}</p>
                            <p className="text-xs text-gray-500">{dest.address}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Quick Select Chips (Immediately Visible) */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {DESTINATIONS.map((dest) => (
                <button
                  key={dest.id}
                  onClick={() => selectDestination(dest)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedDestination.id === dest.id
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {dest.category === 'emergency' || dest.category === 'health' ? <ShieldAlert size={12} /> : <MapPin size={12} />}
                  {isFilipino ? dest.nameFilipino : dest.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-4">
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm relative">
            <div className="h-[50vh] min-h-[340px] w-full relative">
              <MapContainer
                center={mapCenter}
                zoom={14}
                scrollWheelZoom={true}
                zoomControl={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapResizeHandler />
                <UpdateMapCenter center={mapCenter} />
                <MapClickHandler onMapClick={() => setShowDropdown(false)} />

                {/* Destination Marker with Permanent Tooltip */}
                <Marker 
                  position={[selectedDestination.lat, selectedDestination.lng]} 
                  icon={getDestinationIcon(selectedDestination.category)}
                >
                  <Tooltip permanent direction="top" offset={[0, -40]} className="bg-white/95 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-md shadow-md border border-gray-100">
                    {isFilipino ? selectedDestination.nameFilipino : selectedDestination.name}
                  </Tooltip>
                </Marker>

                {/* User Marker */}
                {userLocation && (
                  <Marker position={userLocation} icon={userIcon}>
                    <Tooltip permanent direction="top" offset={[0, -40]} className="bg-white/95 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-md shadow-md border border-gray-100">
                      {isFilipino ? "Ikaw" : "You"}
                    </Tooltip>
                  </Marker>
                )}

                {/* Route Line */}
                {routePoints.length >= 2 && (
                  <>
                    <Polyline
                      positions={routePoints}
                      pathOptions={{ color: "#fed7aa", weight: 12, opacity: 0.5, lineCap: 'round', lineJoin: 'round' }}
                    />
                    <Polyline
                      positions={routePoints}
                      pathOptions={{ color: "#f97316", weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
                    />
                  </>
                )}

                <FitRoute points={routePoints} />
              </MapContainer>

              {/* Loading badge */}
              {isRouting && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-orange-100 rounded-full px-3 py-1.5 shadow-md z-[1000] flex items-center gap-2">
                  <Navigation size={12} className="text-orange-500 animate-spin" />
                  <span className="text-[11px] text-gray-600 font-medium">
                    {isFilipino ? "Kinakalkula ang ruta..." : "Calculating route..."}
                  </span>
                </div>
              )}
            </div>
          </section>

          {locationError && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">
              {locationError}
            </div>
          )}

          {/* Destination Details Card */}
          <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-gray-800">
                  {isFilipino ? selectedDestination.nameFilipino : selectedDestination.name}
                </h2>
                <p className="mt-0.5 text-xs leading-5 text-gray-500">
                  {selectedDestination.address}
                </p>
              </div>
            </div>

            <div className="mt-3 border-t border-gray-100 pt-3">
              {selectedDestination.hotlines && selectedDestination.hotlines.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {selectedDestination.hotlines.map((hotline) => (
                    <a
                      key={hotline}
                      href={`tel:${hotline.replace(/[^\d+]/g, "")}`}
                      className="inline-flex items-center gap-2 text-xs font-bold text-red-600 hover:underline"
                    >
                      <Phone size={12} />
                      {hotline}
                    </a>
                  ))}
                </div>
              )}

              {route && (
                <div className="mt-3 flex gap-6 border-t border-gray-100 pt-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Navigation size={12} />
                      {isFilipino ? "Distansya" : "Distance"}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800">
                      {formatDistance(route.distance)}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Clock size={12} />
                      {isFilipino ? "Oras" : "Time"}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-800">
                      {formatDuration(route.duration)}
                    </p>
                  </div>
                </div>
              )}

              {!userLocation && (
                <p className="mt-3 text-xs text-amber-700">
                  {isFilipino
                    ? "I-enable ang lokasyon para makuha ang driving route mula sa iyo."
                    : "Enable your location to calculate the driving route from you."}
                </p>
              )}

              {routeError && (
                <p className="mt-3 text-xs text-amber-700">{routeError}</p>
              )}

              <button
                type="button"
                onClick={openGoogleMaps}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                <ExternalLink size={16} />
                {isFilipino ? "Buksan sa Google Maps" : "Open in Google Maps"}
              </button>
            </div>
          </section>
        </main>
      </div>
    </UserScreenLayout>
  );
}