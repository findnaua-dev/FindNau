import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Expand,
  Map,
  Search,
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

  // ✨ SEARCH: state for search query
  const [searchQuery, setSearchQuery] = useState('');

  // 2D map state
  const [mapZoom, setMapZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // VR state
  const [vrTour, setVrTour] = useState<VRTour | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showOfficePopup, setShowOfficePopup] = useState<string | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState<string | null>(null);
  const [vrMode, setVrMode] = useState(false);
  const viewerRef = useRef<EquirectangularViewerHandle>(null);
  const [reticleHit, setReticleHit] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Minimap state
  const [isMinimapExpanded, setIsMinimapExpanded] = useState(false);
  const [minimapZoom, setMinimapZoom] = useState(1);
  const [minimapPan, setMinimapPan] = useState({ x: 0, y: 0 });
  const [isMinimapPanning, setIsMinimapPanning] = useState(false);
  const minimapPanStart = useRef({ x: 0, y: 0 });
  const minimapContainerRef = useRef<HTMLDivElement>(null);

  const [facingDirection, setFacingDirection] = useState(0);

  // VR path toggle (does NOT affect 2D map)
  const [showPathsInVR, setShowPathsInVR] = useState<boolean>(() => {
    const saved = localStorage.getItem('showPathsInVR');
    return saved !== null ? saved === 'true' : true;
  });

  // NEW: Track window width for expanded minimap dimensions
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    localStorage.setItem('showPathsInVR', String(showPathsInVR));
  }, [showPathsInVR]);

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // URL params sync
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

  // Subscriptions
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

  // ✨ SEARCH: compute search results (offices and matched services)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return offices
      .map((o) => {
        const matchedServices = (o.services || []).filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.nameFilipino && s.nameFilipino.toLowerCase().includes(q))
        );
        const officeNameMatch =
          o.name.toLowerCase().includes(q) ||
          o.nameFilipino.toLowerCase().includes(q) ||
          o.shortName.toLowerCase().includes(q);
        if (officeNameMatch || matchedServices.length > 0) {
          // Return a new object with matchedServices attached
          return { ...o, matchedServices };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 6); // Limit results for mobile UI
  }, [offices, searchQuery]);

  // ✨ SEARCH: handle selection from search results
  const handleSearchSelect = (officeId: string) => {
    const office = offices.find((o) => o.id === officeId);
    if (!office) return;

    // Clear search and switch to 2D tab
    setSearchQuery('');
    setActiveTab('2d');

    // Switch floor if needed
    const floorId = office.floorId || 'ground';
    if (floorId !== activeFloor) {
      setActiveFloor(floorId);
    }

    // Select the office
    setSelectedOffice(officeId);

    // Reset map view so the whole floor is visible
    setMapZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const getPreloadUrls = () => {
    if (!vrTour) return [];
    const urls: string[] = [];
    const prevIdx = currentSceneIndex - 1;
    const nextIdx = currentSceneIndex + 1;
    if (prevIdx >= 0) urls.push(vrTour.scenes[prevIdx].url);
    if (nextIdx < vrTour.scenes.length) urls.push(vrTour.scenes[nextIdx].url);
    return urls;
  };

  const findSceneIndexForFloor = useCallback((floorId: string) => {
    if (!vrTour) return -1;
    return vrTour.scenes.findIndex((scene) => scene.floorId === floorId);
  }, [vrTour]);

  const goToScene = useCallback(
    (index: number) => {
      if (!vrTour || index < 0 || index >= vrTour.scenes.length) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSceneIndex(index);
        setShowOfficePopup(null);
        setShowInfoPopup(null);
        setReticleHit(null);
        const scene = vrTour.scenes[index];
        if (scene.floorId) setActiveFloor(scene.floorId);
        setTimeout(() => setIsTransitioning(false), 300);
      }, 150);
    },
    [vrTour]
  );

  const handleTabChange = (tab: '2d' | 'vr') => {
    setActiveTab(tab);
    if (tab === 'vr' && vrTour) {
      const idx = findSceneIndexForFloor(activeFloor);
      if (idx >= 0) {
        setCurrentSceneIndex(idx);
      } else if (vrTour.scenes.length > 0 && currentSceneIndex >= vrTour.scenes.length) {
        setCurrentSceneIndex(0);
      }
    }
  };

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
      setSelectedOffice(hotspot.targetOfficeId);
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

  // ===== 2D Map Handlers =====
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

  // ===== Minimap Handlers =====
  const handleMinimapWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setMinimapZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  const handleMinimapPanStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsMinimapPanning(true);
    minimapPanStart.current = { x: e.clientX - minimapPan.x, y: e.clientY - minimapPan.y };
  };

  const handleMinimapPanMove = (e: React.MouseEvent) => {
    if (!isMinimapPanning) return;
    setMinimapPan({ x: e.clientX - minimapPanStart.current.x, y: e.clientY - minimapPanStart.current.y });
  };

  const handleMinimapPanEnd = () => setIsMinimapPanning(false);

  const handleMinimapTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsMinimapPanning(true);
      minimapPanStart.current = { x: e.touches[0].clientX - minimapPan.x, y: e.touches[0].clientY - minimapPan.y };
    }
  };

  const handleMinimapTouchMove = (e: React.TouchEvent) => {
    if (!isMinimapPanning || e.touches.length !== 1) return;
    setMinimapPan({ x: e.touches[0].clientX - minimapPanStart.current.x, y: e.touches[0].clientY - minimapPanStart.current.y });
  };

  const handleMinimapTouchEnd = () => setIsMinimapPanning(false);

  const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isMinimapExpanded || !viewerRef.current || !activeFloorMap) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const transformed = point.matrixTransform(ctm.inverse());
    const clickX = transformed.x;
    const clickY = transformed.y;

    const viewBoxWidth = 100;
    const viewBoxHeight = Math.round(100 / (activeFloorMap.width / activeFloorMap.height));
    const entrance = activeFloorMap.entrance || { x: 50, y: viewBoxHeight / 2 };
    const dx = clickX - entrance.x;
    const dy = clickY - entrance.y;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI);
    deg = -deg; // 3D convention
    viewerRef.current.setDirection(deg);
  };

  const toggleMinimapExpanded = () => {
    setIsMinimapExpanded((prev) => !prev);
    if (isMinimapExpanded) {
      setMinimapZoom(1);
      setMinimapPan({ x: 0, y: 0 });
    }
  };

  const handleViewIn360 = (officeId: string) => {
    const office = offices.find((o) => o.id === officeId);
    if (!office) return;
    if ((office as any).vrSceneId && vrTour) {
      const sceneIdx = vrTour.scenes.findIndex((s) => s.id === (office as any).vrSceneId);
      if (sceneIdx >= 0) {
        setCurrentSceneIndex(sceneIdx);
        setActiveTab('vr');
        return;
      }
    }
    const floorId = office.floorId || 'ground';
    const sceneIdx = findSceneIndexForFloor(floorId);
    if (sceneIdx >= 0) {
      setCurrentSceneIndex(sceneIdx);
      setActiveTab('vr');
    } else if (vrTour && vrTour.scenes.length > 0) {
      setCurrentSceneIndex(0);
      setActiveTab('vr');
    }
  };

  // Helper: get path points for selected office (used by 3D line in VR)
  const getPathPoints = (officeId: string | null): { x: number; y: number }[] | null => {
    if (!officeId || !activeFloorMap) return null;
    const office = offices.find((o) => o.id === officeId);
    if (!office) return null;

    const savedPath = activeFloorMap.paths?.find((p) => p.officeId === officeId);
    if (savedPath && savedPath.points.length >= 2) {
      return savedPath.points;
    }

    // Fallback: straight line from entrance to office
    const entrance = activeFloorMap.entrance;
    if (entrance && office.mapX !== undefined && office.mapY !== undefined) {
      return [
        { x: entrance.x, y: entrance.y },
        { x: office.mapX, y: office.mapY },
      ];
    }
    return null;
  };

  const pathPointsForVR = showPathsInVR ? getPathPoints(selectedOffice) : null;

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
  const userPosition = activeFloorMap?.entrance || { x: 50, y: VIEWBOX_HEIGHT / 2 };

  // ---------- ANIMATION DIMENSIONS ----------
  const EXPANDED_HEADER_HEIGHT = 40; // estimated height of the expanded minimap header
  const expandedWidthPx = Math.min(windowWidth * 0.9, 768); // 48rem = 768px
  const expandedHeightPx = expandedWidthPx * (VIEWBOX_HEIGHT / VIEWBOX_WIDTH) + EXPANDED_HEADER_HEIGHT;

  return (
    <UserScreenLayout>
      {/* Header with tabs */}
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
              onClick={() => handleTabChange(tab)}
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

      {/* ============ 2D MAP TAB ============ */}
      {activeTab === '2d' && (
        <div className="flex flex-col flex-1">
          {/* ✨ SEARCH BAR (visible only in 2D tab) */}
          <div className="px-4 py-3 bg-white border-b">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search office or service…', 'Maghanap ng opisina o serbisyo…')}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((o: any) => ( // Use any to accommodate matchedServices
                    <button
                      key={o.id}
                      onClick={() => handleSearchSelect(o.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ backgroundColor: o.iconBg }}
                      >
                        {o.shortName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {lang === 'en' ? o.name : o.nameFilipino}
                        </p>
                        {/* Show matched services if any */}
                        {o.matchedServices && o.matchedServices.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">
                            {o.matchedServices.map((s: any) => s.name).join(', ')}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">{o.floor}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 p-3 text-xs text-gray-400 z-50">
                  {t('No results found.', 'Walang nahanap.')}
                </div>
              )}
            </div>
          </div>

          {/* Floor selector */}
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

          {/* Zoom controls */}
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

          {/* Map display */}
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

                  {/* ===== 2D PATH LINE (always visible when office selected) ===== */}
                  {selectedOfficeData && (() => {
                    const savedPath = activeFloorMap?.paths?.find(p => p.officeId === selectedOfficeData.id);
                    if (savedPath && savedPath.points.length > 1) {
                      return (
                        <polyline
                          points={savedPath.points.map((p) => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="#F97316"
                          strokeWidth="1.2"
                        />
                      );
                    } else {
                      return (
                        <line
                          x1={userPosition.x}
                          y1={userPosition.y}
                          x2={selectedOfficeData.mapX}
                          y2={selectedOfficeData.mapY}
                          stroke="#F97316"
                          strokeWidth="1"
                          strokeDasharray="4,3"
                        />
                      );
                    }
                  })()}

                  {/* Office dots */}
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

                  {/* User location */}
                  <g transform={`translate(${userPosition.x},${userPosition.y})`}>
                    <circle r="4" fill="#3B82F6" opacity="0.25" />
                    <circle r="2" fill="#3B82F6" stroke="white" strokeWidth="0.8" />
                  </g>
                </g>
              </svg>
            </div>
          </div>

          {/* Selected office panel */}
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
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => navigate(`/office/${selectedOfficeData.id}`)}
                  className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-orange-600 transition-colors focus:ring-2 focus:ring-orange-300 focus:outline-none"
                >
                  <Navigation size={12} /> {t('Go', 'Punta')}
                </button>
                <button
                  onClick={() => handleViewIn360(selectedOfficeData.id!)}
                  className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-blue-600 transition-colors focus:ring-2 focus:ring-blue-300 focus:outline-none"
                >
                  <Video size={12} /> {t('View in 360', 'Tingnan sa 360')}
                </button>
              </div>
            </div>
          )}

          {/* Office list */}
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

      {/* ============ VR TAB ============ */}
      {activeTab === 'vr' && (
        <div className="flex flex-col flex-1 relative">
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
                        const scene = vrTour.scenes[newIdx];
                        if (scene.floorId) setActiveFloor(scene.floorId);
                        return newIdx;
                      }
                      return prev;
                    });
                  }}
                  preloadUrls={getPreloadUrls()}
                  showNavigationArrows={true}
                  onRotate={setFacingDirection}
                  pathPoints={pathPointsForVR}
                />

                {/* ===== ANIMATED MINIMAP OVERLAY ===== */}
                {activeFloorMap && (
                  <div
                    className="absolute z-30 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      top: isMinimapExpanded ? '64px' : '16px',
                      left: isMinimapExpanded ? '50%' : '16px',
                      width: isMinimapExpanded ? `${expandedWidthPx}px` : '144px',
                      height: isMinimapExpanded ? `${expandedHeightPx}px` : '96px',
                      transform: isMinimapExpanded ? 'translateX(-50%)' : 'none',
                    }}
                  >
                    {/* Collapsed layer */}
                    <div
                      className={`absolute inset-0 transition-opacity duration-300 ${
                        isMinimapExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                      }`}
                    >
                      <svg
                        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                        className="w-full h-full cursor-pointer"
                        onClick={() => toggleMinimapExpanded()}
                      >
                        {activeFloorMap.url ? (
                          <image
                            href={activeFloorMap.url}
                            x="0"
                            y="0"
                            width={VIEWBOX_WIDTH}
                            height={VIEWBOX_HEIGHT}
                          />
                        ) : (
                          <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#E5E7EB" />
                        )}

                        {showPathsInVR && selectedOfficeData && (() => {
                          const savedPath = activeFloorMap?.paths?.find(
                            (p) => p.officeId === selectedOfficeData.id
                          );
                          if (savedPath && savedPath.points.length > 1) {
                            return (
                              <polyline
                                points={savedPath.points.map((p) => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke="#F97316"
                                strokeWidth="0.4"
                                strokeDasharray="1.5,1"
                              />
                            );
                          } else {
                            return (
                              <line
                                x1={userPosition.x}
                                y1={userPosition.y}
                                x2={selectedOfficeData.mapX}
                                y2={selectedOfficeData.mapY}
                                stroke="#F97316"
                                strokeWidth="0.4"
                                strokeDasharray="2,1.5"
                              />
                            );
                          }
                        })()}

                        {floorOffices.map((o) => (
                          <circle key={o.id} cx={o.mapX} cy={o.mapY} r={1.2} fill={o.iconBg} />
                        ))}

                        <g transform={`translate(${userPosition.x},${userPosition.y})`}>
                          <circle r="2" fill="#3B82F6" stroke="white" strokeWidth="0.5" />
                          <path
                            d="M0,-3 L2,2 L0,1 L-2,2 Z"
                            fill="#3B82F6"
                            transform={`rotate(${facingDirection})`}
                          />
                        </g>
                      </svg>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMinimapExpanded();
                        }}
                        className="absolute bottom-1 right-1 bg-white/80 text-gray-600 rounded-md p-0.5"
                        title="Expand minimap"
                      >
                        <Expand size={12} />
                      </button>
                    </div>

                    {/* Expanded layer */}
                    <div
                      className={`absolute inset-0 transition-opacity duration-300 ${
                        isMinimapExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 flex-shrink-0">
                          <span className="text-sm font-semibold flex items-center gap-1">
                            <Map size={14} className="text-gray-500" /> {activeFloorMap.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowPathsInVR(!showPathsInVR)}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                showPathsInVR
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-200 text-gray-500'
                              }`}
                              title={showPathsInVR ? 'Hide path' : 'Show path'}
                            >
                              {showPathsInVR ? 'Path On' : 'Path Off'}
                            </button>
                            <button
                              onClick={() => toggleMinimapExpanded()}
                              className="text-gray-500 hover:text-gray-700"
                              title="Close"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        <div
                          className="relative flex-1"
                          onWheel={handleMinimapWheel}
                          onMouseDown={handleMinimapPanStart}
                          onMouseMove={handleMinimapPanMove}
                          onMouseUp={handleMinimapPanEnd}
                          onMouseLeave={handleMinimapPanEnd}
                          onTouchStart={handleMinimapTouchStart}
                          onTouchMove={handleMinimapTouchMove}
                          onTouchEnd={handleMinimapTouchEnd}
                        >
                          <svg
                            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
                            onClick={handleMinimapClick}
                          >
                            <g
                              transform={`translate(${minimapPan.x},${minimapPan.y}) scale(${minimapZoom})`}
                            >
                              <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#fff" />
                              {activeFloorMap.url ? (
                                <image
                                  href={activeFloorMap.url}
                                  x="0"
                                  y="0"
                                  width={VIEWBOX_WIDTH}
                                  height={VIEWBOX_HEIGHT}
                                />
                              ) : (
                                <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#E5E7EB" />
                              )}

                              {showPathsInVR && selectedOfficeData && (() => {
                                const savedPath = activeFloorMap?.paths?.find(
                                  (p) => p.officeId === selectedOfficeData.id
                                );
                                if (savedPath && savedPath.points.length > 1) {
                                  return (
                                    <polyline
                                      points={savedPath.points.map((p) => `${p.x},${p.y}`).join(' ')}
                                      fill="none"
                                      stroke="#F97316"
                                      strokeWidth="0.6"
                                      strokeDasharray="2,1"
                                    />
                                  );
                                } else {
                                  return (
                                    <line
                                      x1={userPosition.x}
                                      y1={userPosition.y}
                                      x2={selectedOfficeData.mapX}
                                      y2={selectedOfficeData.mapY}
                                      stroke="#F97316"
                                      strokeWidth="0.6"
                                      strokeDasharray="3,2"
                                    />
                                  );
                                }
                              })()}

                              {floorOffices.map((o) => (
                                <g key={o.id}>
                                  <circle
                                    cx={o.mapX}
                                    cy={o.mapY}
                                    r={1.5}
                                    fill={o.iconBg}
                                    stroke="white"
                                    strokeWidth="0.5"
                                  />
                                  <text
                                    x={o.mapX}
                                    y={o.mapY + 2}
                                    textAnchor="middle"
                                    fontSize="1.5"
                                    fill="#374151"
                                  >
                                    {o.shortName}
                                  </text>
                                </g>
                              ))}

                              <g transform={`translate(${userPosition.x},${userPosition.y})`}>
                                <circle r="2" fill="#3B82F6" stroke="white" strokeWidth="0.5" />
                                <path
                                  d="M0,-3 L2,2 L0,1 L-2,2 Z"
                                  fill="#3B82F6"
                                  transform={`rotate(${facingDirection})`}
                                />
                              </g>
                            </g>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reticle label */}
                {reticleHit && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[140%] bg-black/70 text-white px-3 py-1 rounded-full text-xs whitespace-nowrap pointer-events-none z-30">
                    {reticleHit.label}
                  </div>
                )}

                {/* VR button */}
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

                {/* Scene label */}
                {currentScene && (
                  <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur text-white px-6 py-3 rounded-xl text-center max-w-xs z-20">
                    <p className="text-sm font-semibold">{currentScene.label}</p>
                    {currentScene.description && (
                      <p className="text-xs mt-1 opacity-90">{currentScene.description}</p>
                    )}
                  </div>
                )}

                {/* Office popup */}
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

                {/* Info popup */}
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

                {/* Scene thumbnails */}
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