import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  ArrowLeft,
  MapPin,
  Video,
  ChevronRight,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Clock,
} from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useOffices } from '../../hooks/useOffices';
import { useMapSettingsRealtime, MapFloor } from '../../services/mapService';
import { useBuildingTourRealtime, VRTour, VRHotspot } from '../../services/vrTourService';
import EquirectangularViewer, { EquirectangularViewerHandle } from './EquirectangularViewer';
import { useVRGaze } from '../../hooks/useVRGaze';

interface ExtendedVRHotspot extends VRHotspot {
  x?: number;
  y?: number;
  size?: number;
  shape?: string;
}

export default function MapScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useApp();
  const [activeTab, setActiveTab] = useState<'2d' | 'vr'>('2d');
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const { offices, loading } = useOffices();
  const [activeFloor, setActiveFloor] = useState('ground');
  const [floorMaps, setFloorMaps] = useState<MapFloor[]>([]);

  const [mapZoom, setMapZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [vrTour, setVrTour] = useState<VRTour | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showOfficePopup, setShowOfficePopup] = useState<string | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState<string | null>(null);
  const [vrMode, setVrMode] = useState(false);
  const viewerRef = useRef<EquirectangularViewerHandle>(null);
  const [reticleHit, setReticleHit] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const tab = p.get('tab');
    const officeId = p.get('officeId');
    if (tab === 'vr') setActiveTab('vr');
    if (officeId && vrTour) {
      const sceneIdx = vrTour.scenes.findIndex((scene) =>
        scene.hotspots?.some((h) => h.type === 'office' && h.targetOfficeId === officeId)
      );
      if (sceneIdx >= 0) {
        setCurrentSceneIndex(sceneIdx);
      }
    }
  }, [location.search, vrTour]);

  useEffect(() => {
    const unsub = useBuildingTourRealtime((data) => setVrTour(data));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = useMapSettingsRealtime((s) => setFloorMaps(s.floors));
    return () => unsub();
  }, []);

  useEffect(() => {
    return () => {
      viewerRef.current?.exitVR().catch(() => {});
    };
  }, []);

  const selectedOfficeData = offices.find((o) => o.id === selectedOffice);
  const floorOffices = offices.filter((o) => (o.floorId || 'ground') === activeFloor);
  const activeFloorMap = floorMaps.find((f) => f.id === activeFloor);
  const currentScene = vrTour?.scenes?.[currentSceneIndex];
  const extendedHotspots = (currentScene?.hotspots as ExtendedVRHotspot[]) || [];

  const getPreloadUrls = () => {
    if (!vrTour) return [];
    const urls: string[] = [];
    const prevIdx = currentSceneIndex - 1;
    const nextIdx = currentSceneIndex + 1;
    if (prevIdx >= 0) urls.push(vrTour.scenes[prevIdx].url);
    if (nextIdx < vrTour.scenes.length) urls.push(vrTour.scenes[nextIdx].url);
    return urls;
  };

  const goToScene = useCallback(
    (index: number) => {
      if (!vrTour || index < 0 || index >= vrTour.scenes.length) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSceneIndex(index);
        setShowOfficePopup(null);
        setShowInfoPopup(null);
        setReticleHit(null);
        setTimeout(() => setIsTransitioning(false), 300);
      }, 150);
    },
    [vrTour]
  );

  const handleViewerHotspotClick = (hotspot: any) => {
    setShowOfficePopup(null);
    setShowInfoPopup(null);
    setReticleHit(null);
    if (!hotspot) return;
    if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
      const idx = vrTour?.scenes.findIndex((s) => s.id === hotspot.targetSceneId);
      if (idx !== undefined && idx >= 0) goToScene(idx);
      return;
    }
    if (hotspot.type === 'office' && hotspot.targetOfficeId) {
      setShowOfficePopup(hotspot.targetOfficeId);
      return;
    }
    if (hotspot.type === 'info') {
      setShowInfoPopup(hotspot.id);
      return;
    }
  };

  const handleSceneClick = () => {
    setShowOfficePopup(null);
    setShowInfoPopup(null);
  };

  const handleReticleHit = (hotspot: any | null) => setReticleHit(hotspot);

    useVRGaze({
    viewerRef,
    vrMode,
    hotspots: extendedHotspots,
    onReticleHit: handleReticleHit,
    onHotspotGaze: (hotspot) => {
      handleViewerHotspotClick(hotspot);
    },
      gazeTimeout: 3000,
    });
  const handleVRButtonClick = async () => {
    if (vrMode) {
      await viewerRef.current?.exitVR();
      setVrMode(false);
    } else {
      await viewerRef.current?.enterVR();
      setVrMode(true);
    }
  };

  const handleZoomIn = () => setMapZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setMapZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetView = () => {
    setMapZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };
  const handlePanStart = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      (e.target as SVGElement).tagName === 'svg' ||
      (e.target as SVGElement).tagName === 'image'
    ) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };
  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  const handlePanEnd = () => setIsPanning(false);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: t.clientX - panOffset.x, y: t.clientY - panOffset.y });
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return;
    const t = e.touches[0];
    setPanOffset({ x: t.clientX - panStart.x, y: t.clientY - panStart.y });
  };
  const handleTouchEnd = () => setIsPanning(false);

  if (loading) {
    return (
      <UserScreenLayout>
        <div className="p-8 text-center text-gray-400">Loading…</div>
      </UserScreenLayout>
    );
  }

  const imgWidth = activeFloorMap?.width || 800;
  const imgHeight = activeFloorMap?.height || 600;
  const VIEWBOX_WIDTH = 100;
  const VIEWBOX_HEIGHT = Math.round(100 / (imgWidth / imgHeight));

  return (
    <UserScreenLayout>
      <div className="bg-white px-4 pt-5 pb-0 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/home')}
            className="w-9 h-9 rounded-full bg-gray-50 border flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold">
              {t('Building Navigation', 'Navigation ng Gusali')}
            </h1>
            <p className="text-xs text-gray-400">
              {t('Municipal Building of Naujan', 'Municipal Building ng Naujan')}
            </p>
          </div>
        </div>
        <div className="flex border-b">
          {(['2d', 'vr'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold relative transition-colors ${
                activeTab === tab ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === '2d' ? t('2D Map', '2D Mapa') : '360° Virtual Tour'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === '2d' && (
        <div className="flex flex-col flex-1">
          <div className="px-4 py-3 bg-white border-b">
            <div className="flex gap-2 overflow-x-auto">
              {floorMaps.length === 0 && (
                <span className="text-xs text-gray-400 py-2">No floors available yet.</span>
              )}
              {floorMaps.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFloor(f.id);
                    setSelectedOffice(null);
                    handleResetView();
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                    activeFloor === f.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <Layers size={12} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 flex items-center justify-between bg-white border-b">
            <span className="text-xs text-gray-400">{Math.round(mapZoom * 100)}%</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="w-8 h-8 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-orange-300 focus:outline-none"
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={handleZoomIn}
                className="w-8 h-8 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-orange-300 focus:outline-none"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={handleResetView}
                className="w-8 h-8 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-orange-300 focus:outline-none"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <div
            ref={mapContainerRef}
            className="mx-4 mt-4 bg-white rounded-2xl border overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="relative w-full"
              style={{ paddingBottom: `${(VIEWBOX_HEIGHT / VIEWBOX_WIDTH) * 100}%` }}
            >
              <svg
                viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                className="absolute inset-0 w-full h-full"
              >
                <g
                  transform={`translate(${panOffset.x / mapZoom},${panOffset.y / mapZoom}) scale(${mapZoom})`}
                >
                  <rect
                    x="-100"
                    y="-100"
                    width={VIEWBOX_WIDTH + 200}
                    height={VIEWBOX_HEIGHT + 200}
                    fill="#FFFFFF"
                  />
                  {activeFloorMap?.url ? (
                    <image
                      href={activeFloorMap.url}
                      x="0"
                      y="0"
                      width={VIEWBOX_WIDTH}
                      height={VIEWBOX_HEIGHT}
                    />
                  ) : (
                    <text
                      x={VIEWBOX_WIDTH / 2}
                      y={VIEWBOX_HEIGHT / 2}
                      textAnchor="middle"
                      fontSize="3"
                      fill="#9CA3AF"
                    >
                      No map uploaded
                    </text>
                  )}
                  {floorOffices.map((o) => (
                    <g key={o.id}>
                      <circle
                        cx={o.mapX}
                        cy={o.mapY}
                        r={selectedOffice === o.id ? 4 : 3}
                        fill={o.iconBg}
                        stroke="white"
                        strokeWidth="1"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOffice(o.id === selectedOffice ? null : o.id);
                        }}
                      />
                      <text
                        x={o.mapX}
                        y={o.mapY + 5}
                        textAnchor="middle"
                        fontSize="2.5"
                        fill="#374151"
                        fontWeight="600"
                        style={{ pointerEvents: 'none' }}
                      >
                        {o.shortName}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>
          {selectedOfficeData && (
            <div className="mx-4 mt-3 bg-white rounded-2xl border border-orange-100 shadow-sm p-4 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: selectedOfficeData.iconBg }}
                >
                  {selectedOfficeData.shortName?.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {lang === 'en' ? selectedOfficeData.name : selectedOfficeData.nameFilipino}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={11} className="text-gray-400" />
                    <p className="text-xs text-gray-400">{selectedOfficeData.floor}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/office/${selectedOfficeData.id}`)}
                  className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-orange-600 transition-colors focus:ring-2 focus:ring-orange-300 focus:outline-none"
                >
                  <Navigation size={12} /> {t('Go', 'Punta')}
                </button>
              </div>
            </div>
          )}
          <div className="px-4 mt-4 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
              {activeFloorMap?.label || t('Offices', 'Mga Tanggapan')}
            </p>
            <div className="space-y-2">
              {floorOffices.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOffice(o.id === selectedOffice ? null : o.id)}
                  className={`w-full flex items-center gap-3 bg-white rounded-xl border p-3 text-left transition-all ${
                    selectedOffice === o.id
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: o.iconBg }}
                  >
                    {o.shortName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold truncate">
                      {lang === 'en' ? o.name : o.nameFilipino}
                    </p>
                    <p className="text-[11px] text-gray-400">{o.floor}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vr' && (
        <div className="flex flex-col flex-1">
          {!vrTour || vrTour.scenes.length === 0 ? (
            <div className="text-center py-20">
              <Video size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-sm text-gray-400">Virtual tour not available yet.</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 relative">
              {isTransitioning && (
                <div className="absolute inset-0 bg-black z-50" style={{ opacity: 1 }} />
              )}

              <div className="flex-1 bg-black relative">
                <EquirectangularViewer
                  ref={viewerRef}
                  sceneUrl={currentScene?.url || ''}
                  hotspots={extendedHotspots.map((h) => ({
                    id: h.id,
                    longitude: h.longitude ?? 0,
                    latitude: h.latitude ?? 0,
                    type: h.type,
                    label: h.label,
                    color: h.color,
                    description: h.description,
                    targetSceneId: h.targetSceneId,
                    targetOfficeId: h.targetOfficeId,
                    shape: (h.shape || 'circle') as any,
                    size: h.size || 1,
                    direction: h.direction ?? 0,
                  }))}
                  onHotspotClick={handleViewerHotspotClick}
                  onClickScene={handleSceneClick}
                  onReticleHit={handleReticleHit}
                  enableReticle={true}
                  isAdmin={false}
                  onVRReady={() => setVrMode(true)}
                  currentIndex={currentSceneIndex}
                  totalScenes={vrTour.scenes.length}
                  onSceneChange={(dir) => {
                    setCurrentSceneIndex((prev) => {
                      const newIdx = prev + dir;
                      if (newIdx >= 0 && newIdx < vrTour.scenes.length) {
                        setShowOfficePopup(null);
                        setShowInfoPopup(null);
                        setReticleHit(null);
                        return newIdx;
                      }
                      return prev;
                    });
                  }}
                  preloadUrls={getPreloadUrls()}
                  showNavigationArrows={true}
                />

                {reticleHit && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[140%] bg-black/70 text-white px-3 py-1 rounded-full text-xs whitespace-nowrap pointer-events-none z-30">
                    {reticleHit.label}
                  </div>
                )}

                <div className="absolute bottom-24 right-4 z-30 flex flex-col gap-2">
                  <button
                    onClick={handleVRButtonClick}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all focus:ring-2 focus:ring-white focus:outline-none ${
                      vrMode
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-white text-gray-800 hover:bg-gray-100'
                    }`}
                    title={vrMode ? 'Exit VR' : 'Enter VR'}
                  >
                    {vrMode ? (
                      <span className="text-xs font-bold">VR</span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-2-3h-4l-2 3H4a2 2 0 0 1-2-2V8z" />
                        <circle cx="8" cy="11" r="1.5" />
                        <circle cx="16" cy="11" r="1.5" />
                      </svg>
                    )}
                  </button>
                </div>

                {currentScene && (
                  <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur text-white px-6 py-3 rounded-xl text-center max-w-xs z-20">
                    <p className="text-sm font-semibold">{currentScene.label}</p>
                    {currentScene.description && (
                      <p className="text-xs mt-1 opacity-90">{currentScene.description}</p>
                    )}
                  </div>
                )}

                {showOfficePopup &&
                  (() => {
                    const office = offices.find((o) => o.id === showOfficePopup);
                    if (!office) return null;
                    return (
                      <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 z-20 animate-in slide-in-from-bottom-4 duration-200">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                            style={{ backgroundColor: office.iconBg }}
                          >
                            {office.shortName?.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold">
                              {lang === 'en' ? office.name : office.nameFilipino}
                            </h3>
                            <p className="text-xs text-gray-500">{office.floor}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock size={11} className="text-gray-400" />
                              <p className="text-[11px] text-gray-500">
                                {(office as any).officeHours || '8:00 AM - 5:00 PM'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowOfficePopup(null)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <button
                          onClick={() => navigate(`/office/${office.id}`)}
                          className="mt-3 w-full bg-orange-500 text-white py-2 rounded-xl text-xs font-semibold hover:bg-orange-600 transition-colors focus:ring-2 focus:ring-orange-300 focus:outline-none"
                        >
                          View Full Details
                        </button>
                      </div>
                    );
                  })()}

                {showInfoPopup &&
                  (() => {
                    const hotspot = extendedHotspots.find((h) => h.id === showInfoPopup);
                    if (!hotspot) return null;
                    return (
                      <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 z-20 animate-in slide-in-from-bottom-4 duration-200">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-sm font-semibold">{hotspot.label}</h3>
                          <button
                            onClick={() => setShowInfoPopup(null)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          {hotspot.description || 'No additional information.'}
                        </p>
                      </div>
                    );
                  })()}

                <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur px-4 py-2 flex gap-2 overflow-x-auto">
                  {vrTour.scenes.map((scene, idx) => (
                    <button
                      key={scene.id}
                      onClick={() => goToScene(idx)}
                      className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentSceneIndex
                          ? 'border-orange-500 shadow-md'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={scene.url} alt={scene.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </UserScreenLayout>
  );
}