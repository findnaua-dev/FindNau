import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  ArrowLeft, MapPin, Video, ChevronRight, Navigation, Layers,
  ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, X, Clock,
  Expand, Map as MapIcon, Search, ArrowUp, Info, Eye, EyeOff,
} from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useOffices } from '../../hooks/useOffices';
import { useMapSettingsRealtime, MapFloor } from '../../services/mapService';
import { useBuildingTourRealtime, VRTour, VRHotspot } from '../../services/vrTourService';
import EquirectangularViewer, { EquirectangularViewerHandle } from './EquirectangularViewer';
import { useVRGaze } from '../../hooks/useVRGaze';
import { useVRInfoPanel } from '../../hooks/useVRInfoPanel';
import {
  useVRHotspotLabels, useHotspotScreenLabels, HotspotLabelItem,
} from '../../hooks/useVRHotspotLabels';

type ExtendedVRHotspot = Omit<VRHotspot, 'x' | 'y' | 'size'> &
  Partial<{ x: number; y: number; size: number }> & {
    type?: VRHotspot['type'] | 'label';
  };

function getTouchDistance(touches: React.TouchList | TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function optimizeImg(url: string, low = false): string {
  if (!url) return url;
  if (url.includes('res.cloudinary.com')) {
    const clean = url.replace(/\/upload\/[^/]*?\//, '/upload/');
    return clean.replace('/upload/', `/upload/${low ? 'q_auto:low,w_1920,f_auto' : 'q_auto:good,w_4096,f_auto'}/`);
  }
  if (url.includes('imgix.net')) {
    const base = url.split('?')[0];
    return `${base}?${low ? 'w=1920&q=50&auto=format,compress' : 'w=4096&q=80&auto=format,compress'}`;
  }
  if (url.includes('b-cdn.net') || url.includes('bunnycdn.com')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${low ? 'width=1920&quality=55&format=webp' : 'width=4096&quality=80&format=webp'}`;
  }
  return url;
}

const DEFAULT_DOT_COLOR = '#9CA3AF';

const ZOOM_IN_MS = 320;
const ZOOM_OUT_MS = 460;

export default function MapScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useApp();
  const [activeTab, setActiveTab] = useState<'2d' | 'vr'>('2d');
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const { offices, loading } = useOffices();
  const [activeFloor, setActiveFloor] = useState('ground');
  const [floorMaps, setFloorMaps] = useState<MapFloor[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [mapZoom, setMapZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapFullscreenRef = useRef<HTMLDivElement>(null);
  const mapPinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showAllLabels, setShowAllLabels] = useState(false);

  const [vrTour, setVrTour] = useState<VRTour | null>(null);
  const [isTourLoading, setIsTourLoading] = useState(true);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showOfficePopup, setShowOfficePopup] = useState<string | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState<string | null>(null);
  const [vrMode, setVrMode] = useState(false);
  const viewerRef = useRef<EquirectangularViewerHandle>(null);
  const vrContainerRef = useRef<HTMLDivElement>(null);

  const [zoomPhase, setZoomPhase] = useState<'idle' | 'in' | 'out'>('idle');
  const pendingSceneIndexRef = useRef<number | null>(null);

  const [loadedLowUrls, setLoadedLowUrls] = useState<Set<string>>(new Set());
  const [loadedHighUrls, setLoadedHighUrls] = useState<Set<string>>(new Set());

  const [pendingVROfficeId, setPendingVROfficeId] = useState<string | null>(null);

  const [isMinimapExpanded, setIsMinimapExpanded] = useState(false);
  const [minimapZoom, setMinimapZoom] = useState(1);
  const [minimapPan, setMinimapPan] = useState({ x: 0, y: 0 });
  const [isMinimapPanning, setIsMinimapPanning] = useState(false);
  const minimapPanStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const minimapContainerRef = useRef<HTMLDivElement>(null);
  const minimapPinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  const [facingDirection, setFacingDirection] = useState(0);

  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  const lastClosedAtRef = useRef<number>(0);
  const lastClosedHotspotRef = useRef<string | null>(null);
  const REOPEN_COOLDOWN_MS = 2500;

  useEffect(() => {
    if (!vrTour?.scenes?.length) return;
    let cancelled = false;
    vrTour.scenes.forEach((scene, idx) => {
      const lowUrl = optimizeImg(scene.url, true);
      const img = new Image();
      img.decoding = 'async';
      if (idx === 0) (img as any).fetchPriority = 'high';
      img.onload = img.onerror = () => {
        if (cancelled) return;
        setLoadedLowUrls((prev) => {
          if (prev.has(lowUrl)) return prev;
          const next = new Set(prev);
          next.add(lowUrl);
          return next;
        });
      };
      img.src = lowUrl;
    });
    return () => { cancelled = true; };
  }, [vrTour]);

  useEffect(() => {
    if (!vrTour?.scenes?.length) return;
    if (!vrTour.scenes.every((s) => loadedLowUrls.has(optimizeImg(s.url, true)))) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      vrTour.scenes.forEach((scene) => {
        const hi = optimizeImg(scene.url, false);
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          setLoadedHighUrls((prev) => {
            if (prev.has(hi)) return prev;
            const next = new Set(prev);
            next.add(hi);
            return next;
          });
        };
        img.src = hi;
      });
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [vrTour, loadedLowUrls]);

  const currentSceneRaw = vrTour?.scenes?.[currentSceneIndex]?.url || '';
  const displayUrl = useMemo(() => {
    if (!currentSceneRaw) return '';
    const hi = optimizeImg(currentSceneRaw, false);
    if (loadedHighUrls.has(hi)) return hi;
    return optimizeImg(currentSceneRaw, true);
  }, [currentSceneRaw, loadedHighUrls]);

  const resetVRExitState = useCallback(() => {
    setVrMode(false);
    setShowInfoPopup(null);
    setShowOfficePopup(null);
    setZoomPhase('idle');
    setTimeout(() => setWindowWidth(window.innerWidth), 100);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsMapFullscreen(!!document.fullscreenElement);
      setTimeout(() => setWindowWidth(window.innerWidth), 100);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange as EventListener);
    };
  }, []);

  const toggleMapFullscreen = useCallback(async () => {
    const el = mapFullscreenRef.current;
    if (!el) return;
    if (isMapFullscreen && !document.fullscreenElement) { setIsMapFullscreen(false); return; }
    try {
      if (!document.fullscreenElement) {
        const req = (el as any).requestFullscreen || (el as any).webkitRequestFullscreen;
        if (typeof req === 'function') { await req.call(el); setIsMapFullscreen(true); }
        else setIsMapFullscreen(true);
      } else {
        const exit = (document as any).exitFullscreen || (document as any).webkitExitFullscreen;
        if (typeof exit === 'function') await exit.call(document);
        setIsMapFullscreen(false);
      }
    } catch { setIsMapFullscreen((prev) => !prev); }
  }, [isMapFullscreen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const xr: any = (navigator as any).xr;
    if (!xr || typeof xr.requestSession !== 'function') return;
    const original = xr.requestSession.bind(xr);
    const patched = async (...args: any[]) => {
      const session = await original(...args);
      try { session.addEventListener('end', () => resetVRExitState()); } catch {}
      return session;
    };
    try { xr.requestSession = patched; } catch {}
    return () => { try { xr.requestSession = original; } catch {} };
  }, [resetVRExitState]);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const tab = p.get('tab');
    const officeId = p.get('officeId');
    if (tab === 'vr') {
      setActiveTab('vr');
      if (officeId) { setPendingVROfficeId(officeId); setSelectedOffice(officeId); }
    } else if (officeId) {
      const office = offices.find((o) => o.id === officeId);
      if (office) {
        setSelectedOffice(officeId);
        const floorId = office.floorId || 'ground';
        if (floorId !== activeFloor) setActiveFloor(floorId);
        setMapZoom(1); setPanOffset({ x: 0, y: 0 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, offices]);

  useEffect(() => {
    const unsub = useBuildingTourRealtime((data) => { setVrTour(data); setIsTourLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = useMapSettingsRealtime((s) => setFloorMaps(s.floors));
    return () => unsub();
  }, []);

  useEffect(() => () => { viewerRef.current?.exitVR().catch(() => {}); }, []);

  useEffect(() => {
    if (!isMinimapExpanded) return;
    const el = minimapContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setMinimapZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isMinimapExpanded]);

  const selectedOfficeData = offices.find((o) => o.id === selectedOffice);
  const floorOffices = offices.filter((o) => (o.floorId || 'ground') === activeFloor);
  const activeFloorMap = floorMaps.find((f) => f.id === activeFloor);
  const currentScene = vrTour?.scenes?.[currentSceneIndex];
  const extendedHotspots = (currentScene?.hotspots as ExtendedVRHotspot[]) || [];

  const clickableHotspots = useMemo(
    () => extendedHotspots.filter((h) => (h as any).type !== 'label'),
    [extendedHotspots]
  );

  const findSceneForOffice = useCallback(
    (officeId: string): number => {
      if (!vrTour) return -1;
      const office = offices.find((o) => o.id === officeId);
      if ((office as any)?.vrSceneId) {
        const idx = vrTour.scenes.findIndex((s) => s.id === (office as any).vrSceneId);
        if (idx >= 0) return idx;
      }
      const idx = vrTour.scenes.findIndex((scene) =>
        scene.hotspots?.some((h: any) =>
          (h.type === 'office' || h.type === 'info') && h.targetOfficeId === officeId
        )
      );
      if (idx >= 0) return idx;
      if (office) {
        const floorId = office.floorId || 'ground';
        const floorIdx = vrTour.scenes.findIndex((s) => s.floorId === floorId);
        if (floorIdx >= 0) return floorIdx;
      }
      return -1;
    }, [vrTour, offices]
  );

  useEffect(() => {
    if (!pendingVROfficeId || !vrTour || vrTour.scenes.length === 0) return;
    const idx = findSceneForOffice(pendingVROfficeId);
    if (idx >= 0) {
      setCurrentSceneIndex(idx);
      const scene = vrTour.scenes[idx];
      setActiveFloor(scene.floorId || 'ground');
    }
    setPendingVROfficeId(null);
  }, [pendingVROfficeId, vrTour, findSceneForOffice]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return offices.map((o) => {
      const matchedServices = (o.services || []).filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nameFilipino && s.nameFilipino.toLowerCase().includes(q))
      );
      const officeNameMatch =
        o.name.toLowerCase().includes(q) ||
        o.nameFilipino.toLowerCase().includes(q) ||
        o.shortName.toLowerCase().includes(q);
      if (officeNameMatch || matchedServices.length > 0) return { ...o, matchedServices };
      return null;
    }).filter(Boolean).slice(0, 6);
  }, [offices, searchQuery]);

  const handleSearchSelect = (officeId: string) => {
    const office = offices.find((o) => o.id === officeId);
    if (!office) return;
    setSearchQuery('');
    setActiveTab('2d');
    const floorId = office.floorId || 'ground';
    if (floorId !== activeFloor) setActiveFloor(floorId);
    setSelectedOffice(officeId);
    setMapZoom(1); setPanOffset({ x: 0, y: 0 });
  };

  const findSceneIndexForFloor = useCallback(
    (floorId: string) => {
      if (!vrTour) return -1;
      return vrTour.scenes.findIndex((scene) => scene.floorId === floorId);
    }, [vrTour]
  );

  const goToScene = useCallback(
    (index: number) => {
      if (!vrTour || index < 0 || index >= vrTour.scenes.length) return;
      if (index === currentSceneIndex) return;

      setZoomPhase('in');
      pendingSceneIndexRef.current = index;

      setTimeout(() => {
        const pendingIdx = pendingSceneIndexRef.current;
        if (pendingIdx === null) return;
        setCurrentSceneIndex(pendingIdx);
        setShowOfficePopup(null);
        setShowInfoPopup(null);
        const scene = vrTour.scenes[pendingIdx];
        setActiveFloor(scene.floorId || 'ground');
        pendingSceneIndexRef.current = null;

        setZoomPhase('out');
        setTimeout(() => setZoomPhase('idle'), ZOOM_OUT_MS);
      }, ZOOM_IN_MS);
    }, [vrTour, currentSceneIndex]
  );

  const handleTabChange = async (tab: '2d' | 'vr') => {
    setActiveTab(tab);
    if (tab === 'vr') {
      if (selectedOffice) {
        const idx = findSceneForOffice(selectedOffice);
        if (idx >= 0) {
          setCurrentSceneIndex(idx);
          const scene = vrTour?.scenes[idx];
          if (scene) setActiveFloor(scene.floorId || 'ground');
        }
      } else if (vrTour) {
        const idx = findSceneIndexForFloor(activeFloor);
        if (idx >= 0) setCurrentSceneIndex(idx);
        else if (vrTour.scenes.length > 0) setCurrentSceneIndex(0);
      }
    }
  };

  const handleViewerHotspotClick = (hotspot: any) => {
    setShowOfficePopup(null);
    if (!hotspot) return;
    if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
      const idx = vrTour?.scenes.findIndex((s) => s.id === hotspot.targetSceneId);
      if (idx !== undefined && idx >= 0) goToScene(idx);
      return;
    }
    if (hotspot.type === 'office' && hotspot.targetOfficeId) { handleViewIn360(hotspot.targetOfficeId); return; }
    if (hotspot.type === 'info') {
      const now = Date.now();
      if (lastClosedHotspotRef.current === hotspot.id && now - lastClosedAtRef.current < REOPEN_COOLDOWN_MS) return;
      setShowInfoPopup(hotspot.id);
    }
  };

  const handleSceneClick = () => { setShowOfficePopup(null); setShowInfoPopup(null); };

  const handleCloseInfoPanel = useCallback(() => {
    lastClosedAtRef.current = Date.now();
    lastClosedHotspotRef.current = showInfoPopup;
    setShowInfoPopup(null);
  }, [showInfoPopup]);

  const labelHotspotItems = useMemo<HotspotLabelItem[]>(() => {
    if (!extendedHotspots.length) return [];
    return extendedHotspots
      .filter((h) => (h as any).type === 'label' && !!h.label && h.latitude !== undefined && h.longitude !== undefined)
      .map((h) => ({
        id: h.id || `${h.latitude}-${h.longitude}`,
        text: h.label,
        latitude: h.latitude as number,
        longitude: h.longitude as number,
        size: h.size || 1,
        labelBgColor: (h as any).labelBgColor || '#fde047',
      }));
  }, [extendedHotspots]);

  const showVRLabels = activeTab === 'vr' && vrMode && !showInfoPopup;
  useVRHotspotLabels({ viewerRef, vrMode, visible: showVRLabels, labels: labelHotspotItems, offsetY: 0.7, angularSize: 0.055 });

  const showHTMLLabels = activeTab === 'vr' && !vrMode && !showInfoPopup;
  const screenLabelPositions = useHotspotScreenLabels({ viewerRef, active: showHTMLLabels, labels: labelHotspotItems });

  const showInfoInVR = activeTab === 'vr' && vrMode && !!showInfoPopup;
  const infoHotspotForVR = showInfoInVR ? extendedHotspots.find((h) => h.id === showInfoPopup) : null;
  const infoTargetOfficeForVR = infoHotspotForVR?.targetOfficeId
    ? offices.find((o) => o.id === infoHotspotForVR.targetOfficeId) : null;

  const infoPanelTitle = infoTargetOfficeForVR
    ? (lang === 'en' ? infoTargetOfficeForVR.name : infoTargetOfficeForVR.nameFilipino)
    : (infoHotspotForVR?.label || 'Information');

  const infoPanelDescription = infoTargetOfficeForVR
    ? (lang === 'en' ? (infoTargetOfficeForVR.description || '') : (infoTargetOfficeForVR.descriptionFilipino || ''))
    : (infoHotspotForVR?.description || '');

  const infoPanelServices = useMemo<string[]>(() => {
    if (!infoTargetOfficeForVR) return [];
    const list = infoTargetOfficeForVR.services || [];
    return list.map((s: any) => (lang === 'en' ? s.name : (s.nameFilipino || s.name)));
  }, [infoTargetOfficeForVR, lang]);

  const infoPanelListHeader = infoPanelServices.length > 0 ? (lang === 'en' ? 'List of Services' : 'Listahan ng Serbisyo') : undefined;

  useVRInfoPanel({
    viewerRef, visible: showInfoInVR, title: infoPanelTitle,
    description: infoPanelDescription, listHeader: infoPanelListHeader,
    lines: infoPanelServices, onClose: handleCloseInfoPanel,
    dwellTime: 1500, distance: 1.8, panelWidth: 1.9, panelHeight: 1.25,
  });

  useVRGaze({
    viewerRef, vrMode, hotspots: showInfoPopup ? [] : clickableHotspots,
    onReticleHit: () => {}, onHotspotGaze: (hotspot) => handleViewerHotspotClick(hotspot),
    gazeTimeout: 3000,
  });

  const handleVRButtonClick = async () => {
    if (vrMode) {
      try { await viewerRef.current?.exitVR(); } catch {} finally { resetVRExitState(); }
    } else {
      try { await viewerRef.current?.enterVR(); setVrMode(true); } catch { resetVRExitState(); }
    }
  };

  const handleZoomIn = () => setMapZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setMapZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetView = () => { setMapZoom(1); setPanOffset({ x: 0, y: 0 }); };

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    panStartRef.current = { x: clientX, y: clientY, panX: panOffset.x, panY: panOffset.y };
    setIsPanning(true);
  };

  const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - panStartRef.current.x;
    const dy = clientY - panStartRef.current.y;
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgDx = dx * (100 / rect.width);
    const svgDy = dy * (100 / rect.height);
    setPanOffset({ x: panStartRef.current.panX + svgDx, y: panStartRef.current.panY + svgDy });
  };

  const handlePanEnd = () => setIsPanning(false);

  const handleMapTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      mapPinchStartRef.current = { dist: getTouchDistance(e.touches), zoom: mapZoom };
      setIsPanning(false);
    } else if (e.touches.length === 1) handlePanStart(e);
  };

  const handleMapTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && mapPinchStartRef.current) {
      const d = getTouchDistance(e.touches);
      const ratio = d / mapPinchStartRef.current.dist;
      const nz = Math.min(Math.max(mapPinchStartRef.current.zoom * ratio, 0.5), 3);
      setMapZoom(nz);
    } else if (e.touches.length === 1 && isPanning) handlePanMove(e);
  };

  const handleMapTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) mapPinchStartRef.current = null;
    if (e.touches.length === 0) handlePanEnd();
  };

  const handleMinimapPanStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button !== 0) return;
    if ('touches' in e && e.touches.length !== 1) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    minimapPanStartRef.current = { x: clientX, y: clientY, panX: minimapPan.x, panY: minimapPan.y };
    setIsMinimapPanning(true);
  };

  const handleMinimapPanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMinimapPanning) return;
    if ('touches' in e && e.touches.length !== 1) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - minimapPanStartRef.current.x;
    const dy = clientY - minimapPanStartRef.current.y;
    const rect = minimapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgDx = dx * (100 / rect.width);
    const svgDy = dy * (100 / rect.height);
    setMinimapPan({ x: minimapPanStartRef.current.panX + svgDx, y: minimapPanStartRef.current.panY + svgDy });
  };

  const handleMinimapPanEnd = () => setIsMinimapPanning(false);

  const handleMinimapTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      minimapPinchStartRef.current = { dist: getTouchDistance(e.touches), zoom: minimapZoom };
      setIsMinimapPanning(false);
    } else if (e.touches.length === 1) handleMinimapPanStart(e);
  };

  const handleMinimapTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && minimapPinchStartRef.current) {
      const d = getTouchDistance(e.touches);
      const ratio = d / minimapPinchStartRef.current.dist;
      const nz = Math.min(Math.max(minimapPinchStartRef.current.zoom * ratio, 0.5), 5);
      setMinimapZoom(nz);
    } else if (e.touches.length === 1 && isMinimapPanning) handleMinimapPanMove(e);
  };

  const handleMinimapTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) minimapPinchStartRef.current = null;
    if (e.touches.length === 0) handleMinimapPanEnd();
  };

  const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isMinimapExpanded || !viewerRef.current || !activeFloorMap) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const point = svg.createSVGPoint();
    point.x = e.clientX; point.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const transformed = point.matrixTransform(ctm.inverse());
    const clickX = transformed.x;
    const clickY = transformed.y;
    const viewBoxHeight = Math.round(100 / (activeFloorMap.width / activeFloorMap.height));
    const entrance = activeFloorMap.entrance || { x: 50, y: viewBoxHeight / 2 };
    const dx = clickX - entrance.x;
    const dy = clickY - entrance.y;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI);
    deg = -deg;
    viewerRef.current.setDirection(deg);
  };

  const toggleMinimapExpanded = () => {
    setIsMinimapExpanded((prev) => !prev);
    if (isMinimapExpanded) { setMinimapZoom(1); setMinimapPan({ x: 0, y: 0 }); }
  };

  const getConnectionPoint = (floorId: string): { x: number; y: number } | null => {
    const floor = floorMaps.find((f) => f.id === floorId);
    if (floor?.stairs) return floor.stairs;
    if (floor?.entrance) return floor.entrance;
    return null;
  };

  const handleViewIn360 = (officeId: string) => {
    const office = offices.find((o) => o.id === officeId);
    if (!office) return;
    setSelectedOffice(officeId);
    setActiveTab('vr');
    const sceneIdx = findSceneForOffice(officeId);
    if (sceneIdx >= 0) {
      setCurrentSceneIndex(sceneIdx);
      const scene = vrTour?.scenes[sceneIdx];
      if (scene) setActiveFloor(scene.floorId || 'ground');
      return;
    }
    const officeFloor = office.floorId || 'ground';
    const targetSceneIdx = findSceneIndexForFloor(officeFloor);
    if (targetSceneIdx >= 0) setCurrentSceneIndex(targetSceneIdx);
    else if (vrTour?.scenes.length) setCurrentSceneIndex(0);
  };

  /* ✅ Path points — para sa 2D map at VR minimap (hindi sa 360 image mismo) */
  const getPathPoints = (officeId: string | null): { x: number; y: number }[] | null => {
    if (!officeId || !activeFloorMap) return null;
    const office = offices.find((o) => o.id === officeId);
    if (!office) return null;
    const officeFloor = office.floorId || 'ground';
    const currentFloor = activeFloor;
    if (officeFloor !== currentFloor) {
      const connection = getConnectionPoint(currentFloor);
      if (!connection) return null;
      const connectionPath = (activeFloorMap as MapFloor & { connectionPath?: { x: number; y: number }[] }).connectionPath;
      if (connectionPath && connectionPath.length >= 2) return connectionPath;
      const start = activeFloorMap.entrance || connection;
      return [start, connection];
    }
    const savedPath = activeFloorMap.paths?.find((p) => p.officeId === officeId);
    if (savedPath && savedPath.points.length >= 2) return savedPath.points;
    const entrance = activeFloorMap.entrance;
    if (entrance && office.mapX !== undefined && office.mapY !== undefined) {
      return [entrance, { x: office.mapX, y: office.mapY }];
    }
    return null;
  };

  /* ✅ Path points — ginagamit sa 2D map AT VR minimap (hindi sa 360 image view) */
  const pathPointsForMap = getPathPoints(selectedOffice);

  const labeledOffices = useMemo(() => {
    const wrapText = (text: string, maxChars: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      words.forEach((word) => {
        if ((currentLine + ' ' + word).trim().length <= maxChars) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };
    const fontSize = 1.6;
    const lineHeight = fontSize * 1.2;
    const maxCharsPerLine = 20;
    return floorOffices.map((office) => {
      const name = lang === 'en' ? office.name : office.nameFilipino;
      const lines = wrapText(name, maxCharsPerLine);
      const maxLineWidth = Math.max(...lines.map(line => line.length * fontSize * 0.6));
      const blockWidth = maxLineWidth;
      return { office, lines, blockWidth, lineHeight };
    });
  }, [floorOffices, lang]);

  const visibleLabeledOffices = useMemo(() => {
    if (showAllLabels) return labeledOffices;
    if (!selectedOffice) return [];
    return labeledOffices.filter(({ office }) => office.id === selectedOffice);
  }, [labeledOffices, showAllLabels, selectedOffice]);

  const renderOfficeLabel = (office: any, lines: string[], blockWidth: number, lineHeight: number, viewBoxWidth: number) => {
    const fontSize = 1.6;
    const isSelected = selectedOffice === office.id;
    const gap = 1.6;
    const padX = 0.9;
    const padY = 0.35;
    const labelW = blockWidth + padX * 2;
    const labelH = lines.length * lineHeight + padY * 2;
    const placeLeft = office.mapX + gap + labelW > viewBoxWidth - 1 && office.mapX - gap - labelW > 1;
    const anchorX = placeLeft ? office.mapX - gap - labelW : office.mapX + gap;
    const anchorY = office.mapY - labelH / 2;
    return (
      <g key={`label-${office.id}`} style={{ pointerEvents: 'none' }}>
        <rect x={anchorX} y={anchorY} width={labelW} height={labelH} rx={0.9} fill="white" opacity={isSelected ? 0.98 : 0.94} />
        <rect x={anchorX} y={anchorY} width={labelW} height={labelH} rx={0.9} fill="none"
          stroke={isSelected ? office.iconBg : '#D1D5DB'} strokeOpacity={isSelected ? 0.9 : 1}
          strokeWidth={isSelected ? 0.18 : 0.1} />
        {lines.map((line, index) => (
          <text key={index} x={anchorX + padX} y={anchorY + padY + (index + 0.5) * lineHeight}
            dominantBaseline="central" textAnchor="start" fontSize={fontSize} fill="#111827"
            fontWeight={isSelected ? '700' : '500'}>
            {line}
          </text>
        ))}
      </g>
    );
  };

  const minimapLabeledOffices = useMemo(() => {
    if (!isMinimapExpanded) return [];
    const wrapText = (text: string, maxChars: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      words.forEach((word) => {
        if ((currentLine + ' ' + word).trim().length <= maxChars) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };
    const fontSize = 0.9;
    const lineHeight = fontSize * 1.2;
    const maxCharsPerLine = 15;
    return floorOffices.map((office) => {
      const name = lang === 'en' ? office.name : office.nameFilipino;
      const lines = wrapText(name, maxCharsPerLine);
      const maxLineWidth = Math.max(...lines.map(line => line.length * fontSize * 0.6));
      const blockWidth = maxLineWidth;
      return { office, lines, blockWidth, lineHeight };
    });
  }, [floorOffices, lang, isMinimapExpanded]);

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

  const EXPANDED_HEADER_HEIGHT = 40;
  const expandedWidthPx = Math.min(windowWidth - 90, 768);
  const expandedHeightPx = expandedWidthPx * (VIEWBOX_HEIGHT / VIEWBOX_WIDTH) + EXPANDED_HEADER_HEIGHT;

  const zoomScale = zoomPhase === 'in' ? 1.22 : zoomPhase === 'out' ? 1.08 : 1;
  const zoomOpacity = zoomPhase === 'in' ? 0.25 : 1;
  const zoomDuration = zoomPhase === 'in' ? ZOOM_IN_MS : zoomPhase === 'out' ? ZOOM_OUT_MS : 0;
  const zoomTransitionStyle: React.CSSProperties = {
    transform: `scale(${zoomScale})`,
    opacity: zoomOpacity,
    transition: zoomDuration > 0
      ? `transform ${zoomDuration}ms cubic-bezier(0.34, 0.02, 0.2, 1), opacity ${zoomDuration}ms cubic-bezier(0.34, 0.02, 0.2, 1)`
      : 'none',
    transformOrigin: 'center center',
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
  };

  // ============ VR TAB ============
  if (activeTab === 'vr') {
    return (
      <div ref={vrContainerRef} className="fixed inset-0 z-[9999] bg-black flex flex-col">
        {isTourLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-black">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm">Loading virtual tour...</p>
          </div>
        ) : !vrTour || vrTour.scenes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-black">
            <Video size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-400">Virtual tour not available yet.</p>
            <button onClick={() => setActiveTab('2d')} className="mt-4 bg-white text-black px-4 py-2 rounded-xl text-sm font-medium">
              Go back to Map
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 relative">
            <div className="flex-1 bg-black relative overflow-hidden">
              <div className="absolute inset-0" style={zoomTransitionStyle}>
                {displayUrl ? (
                  <EquirectangularViewer
                    ref={viewerRef}
                    sceneUrl={displayUrl}
                    hotspots={clickableHotspots.map((h) => {
                      const isInfoHotspot = h.type === 'info' || h.type === 'office';
                      return {
                        id: h.id,
                        longitude: h.longitude ?? 0,
                        latitude: h.latitude ?? 0,
                        type: h.type,
                        label: h.label,
                        color: isInfoHotspot ? '#3B82F6' : vrMode ? h.color || '#F97316' : 'rgba(249, 115, 22, 0.32)',
                        size: isInfoHotspot ? (h.size || 1) * (vrMode ? 0.5 : 0.8) : vrMode ? (h.size || 1) * 0.7 : (h.size || 1) * 1.2,
                        description: h.description,
                        targetSceneId: h.targetSceneId,
                        targetOfficeId: h.targetOfficeId,
                        shape: (h.shape || 'circle') as any,
                        direction: h.direction ?? 0,
                      };
                    })}
                    onHotspotClick={handleViewerHotspotClick}
                    onClickScene={handleSceneClick}
                    enableReticle={true}
                    isAdmin={false}
                    onVRReady={() => setVrMode(true)}
                    currentIndex={currentSceneIndex}
                    totalScenes={vrTour.scenes.length}
                    onSceneChange={(dir) => {
                      const newIdx = currentSceneIndex + dir;
                      if (newIdx >= 0 && newIdx < vrTour.scenes.length) goToScene(newIdx);
                    }}
                    preloadUrls={[]}
                    onRotate={setFacingDirection}
                    /* ❌ WALANG pathPoints prop — hindi na nagre-render ng line sa 360 image */
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {zoomPhase !== 'idle' && (
                <div
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.6) 100%)',
                    opacity: zoomPhase === 'in' ? 1 : 0.35,
                    transition: `opacity ${zoomDuration}ms cubic-bezier(0.34, 0.02, 0.2, 1)`,
                  }}
                />
              )}

              {showHTMLLabels &&
                screenLabelPositions.map((pos) => {
                  if (!pos.visible) return null;
                  const fontPx = Math.max(8, Math.min(48, (pos.size ?? 1) * 16));
                  const paddingY = Math.max(4, Math.round(fontPx * 0.22));
                  const paddingX = Math.max(10, Math.round(fontPx * 0.5));
                  const lines = pos.text.split('\n');
                  const bg = pos.labelBgColor || '#fde047';
                  return (
                    <div key={pos.id} className="absolute pointer-events-none z-30"
                      style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translate(-50%, -220%)', opacity: Math.max(0.6, 0.95 - Math.abs(pos.depth) * 0.4) }}>
                      <div className="backdrop-blur-sm text-gray-900 font-bold rounded-2xl shadow-md border border-black/10"
                        style={{ fontSize: `${fontPx}px`, paddingLeft: `${paddingX}px`, paddingRight: `${paddingX}px`, paddingTop: `${paddingY}px`, paddingBottom: `${paddingY}px`, lineHeight: 1.25, backgroundColor: hexToRgba(bg, 0.55) }}>
                        {lines.map((line, idx) => (<div key={idx} style={{ whiteSpace: 'nowrap' }}>{line || '\u00A0'}</div>))}
                      </div>
                    </div>
                  );
                })}

              {/* ✅ VR Minimap — may path line (para 2D reference lang ito) */}
              {activeFloorMap && !showInfoPopup && (
                <div ref={minimapContainerRef}
                  className="absolute z-30 bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ top: '16px', left: '16px', width: isMinimapExpanded ? `${expandedWidthPx}px` : '144px', height: isMinimapExpanded ? `${expandedHeightPx}px` : '96px', transform: 'none', touchAction: 'none' }}>
                  <div className={`absolute inset-0 transition-opacity duration-300 ${isMinimapExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="w-full h-full cursor-pointer" onClick={() => toggleMinimapExpanded()}>
                      {activeFloorMap.url ? (
                        <image href={activeFloorMap.url} x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} opacity="0.85" />
                      ) : (
                        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#E5E7EB" opacity="0.5" />
                      )}
                      {/* ✅ Path line sa compact minimap */}
                      {pathPointsForMap && pathPointsForMap.length > 1 && (
                        <polyline points={pathPointsForMap.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#F97316" strokeOpacity="0.6" strokeWidth="0.5" strokeDasharray="1.5,1" strokeLinecap="round" />
                      )}
                      {floorOffices.map((o) => {
                        const isSelected = selectedOffice === o.id;
                        return (<circle key={o.id} cx={o.mapX} cy={o.mapY} r={isSelected ? 1.4 : 0.9} fill={isSelected ? o.iconBg : DEFAULT_DOT_COLOR} fillOpacity={isSelected ? 1 : 0.7} />);
                      })}
                      {activeFloorMap.stairs && (
                        <g transform={`translate(${activeFloorMap.stairs.x},${activeFloorMap.stairs.y})`}>
                          <circle r="1.8" fill="#8B5CF6" fillOpacity="0.8" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
                          <text y="-1.5" textAnchor="middle" fontSize="2" fill="#7C3AED" fontWeight="bold">⬆</text>
                        </g>
                      )}
                      <g transform={`translate(${userPosition.x},${userPosition.y})`}>
                        <circle r="1.5" fill="#3B82F6" stroke="white" strokeOpacity="0.6" strokeWidth="0.4" />
                        <path d="M0,-2.5 L1.5,1.5 L0,0.8 L-1.5,1.5 Z" fill="#3B82F6" transform={`rotate(${facingDirection})`} />
                      </g>
                    </svg>
                    <button onClick={(e) => { e.stopPropagation(); toggleMinimapExpanded(); }} className="absolute bottom-1 right-1 bg-white/60 text-gray-600 rounded-md p-0.5 hover:bg-white/80" title="Expand minimap">
                      <Expand size={12} />
                    </button>
                  </div>

                  <div className={`absolute inset-0 transition-opacity duration-300 ${isMinimapExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between px-4 py-2 bg-white/50 backdrop-blur flex-shrink-0 border-b border-white/40">
                        <span className="text-sm font-semibold flex items-center gap-1"><MapIcon size={14} className="text-gray-500" /> {activeFloorMap.label}</span>
                        <button onClick={() => toggleMinimapExpanded()} className="text-gray-500 hover:text-gray-700"><X size={16} /></button>
                      </div>
                      <div className="relative flex-1" style={{ touchAction: 'none' }}
                        onMouseDown={handleMinimapPanStart} onMouseMove={handleMinimapPanMove} onMouseUp={handleMinimapPanEnd} onMouseLeave={handleMinimapPanEnd}
                        onTouchStart={handleMinimapTouchStart} onTouchMove={handleMinimapTouchMove} onTouchEnd={handleMinimapTouchEnd}>
                        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" onClick={handleMinimapClick}>
                          <g transform={`translate(${minimapPan.x},${minimapPan.y}) scale(${minimapZoom})`}>
                            <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#fff" opacity="0.5" />
                            {activeFloorMap.url ? (
                              <image href={activeFloorMap.url} x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} opacity="0.85" />
                            ) : (
                              <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#E5E7EB" opacity="0.4" />
                            )}
                            {/* ✅ Path line sa expanded minimap */}
                            {pathPointsForMap && pathPointsForMap.length > 1 && (
                              <polyline points={pathPointsForMap.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#F97316" strokeOpacity="0.6" strokeWidth="0.5" strokeDasharray="1.5,1" strokeLinecap="round" />
                            )}
                            {minimapLabeledOffices.map(({ office, lines, blockWidth, lineHeight }) => {
                              const fontSize = 0.9;
                              const gap = 1.0;
                              const padX = 0.5;
                              const padY = 0.2;
                              const labelW = blockWidth + padX * 2;
                              const labelH = lines.length * lineHeight + padY * 2;
                              const placeLeft = office.mapX + gap + labelW > VIEWBOX_WIDTH - 0.5 && office.mapX - gap - labelW > 0.5;
                              const anchorX = placeLeft ? office.mapX - gap - labelW : office.mapX + gap;
                              const anchorY = office.mapY - labelH / 2;
                              const isSelected = selectedOffice === office.id;
                              return (
                                <g key={office.id} style={{ pointerEvents: 'none' }}>
                                  <circle cx={office.mapX} cy={office.mapY} r={1.1} fill={isSelected ? office.iconBg : DEFAULT_DOT_COLOR} fillOpacity={isSelected ? 1 : 0.75} stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
                                  <rect x={anchorX} y={anchorY} width={labelW} height={labelH} rx={0.4} fill="white" opacity={isSelected ? 0.95 : 0.85} stroke={isSelected ? office.iconBg : '#E5E7EB'} strokeWidth={0.08} />
                                  {lines.map((line, index) => (
                                    <text key={index} x={anchorX + padX} y={anchorY + padY + (index + 0.5) * lineHeight} dominantBaseline="central" textAnchor="start" fontSize={fontSize} fill="#1F2937" fontWeight={isSelected ? '700' : '500'}>
                                      {line}
                                    </text>
                                  ))}
                                </g>
                              );
                            })}
                            {activeFloorMap.stairs && (
                              <g transform={`translate(${activeFloorMap.stairs.x},${activeFloorMap.stairs.y})`}>
                                <circle r="1.8" fill="#8B5CF6" fillOpacity="0.8" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
                                <text y="-1.5" textAnchor="middle" fontSize="2" fill="#7C3AED" fontWeight="bold">⬆</text>
                              </g>
                            )}
                            <g transform={`translate(${userPosition.x},${userPosition.y})`}>
                              <circle r="1.5" fill="#3B82F6" stroke="white" strokeOpacity="0.6" strokeWidth="0.4" />
                              <path d="M0,-2.5 L1.5,1.5 L0,0.8 L-1.5,1.5 Z" fill="#3B82F6" transform={`rotate(${facingDirection})`} />
                            </g>
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!showInfoPopup && (
                <>
                  <div className="absolute bottom-24 right-4 z-30 flex flex-col gap-2">
                    <button onClick={handleVRButtonClick}
                      className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all ${vrMode ? 'bg-green-500/90 text-white hover:bg-green-600' : 'bg-white/80 backdrop-blur text-gray-800 hover:bg-white'}`}
                      title={vrMode ? 'Exit VR' : 'Enter VR'}>
                      {vrMode ? <span className="text-xs font-bold">VR</span> : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-2-3h-4l-2 3H4a2 2 0 0 1-2-2V8z" />
                          <circle cx="8" cy="11" r="1.5" />
                          <circle cx="16" cy="11" r="1.5" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <button onClick={() => handleTabChange('2d')} className="absolute top-4 right-4 z-40 bg-black/50 backdrop-blur text-white p-2 rounded-full hover:bg-black/70 transition-colors" title="Exit VR">
                    <X size={20} />
                  </button>

                  {currentScene && (
                    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white px-5 py-2 rounded-xl text-center max-w-xs z-20">
                      <p className="text-xs font-medium">{currentScene.label}</p>
                      {currentScene.description && (<p className="text-[11px] mt-0.5 opacity-80">{currentScene.description}</p>)}
                    </div>
                  )}
                </>
              )}

              {!vrMode && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/40 backdrop-blur px-4 py-2 flex gap-2 overflow-x-auto"
                  style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
                  {vrTour.scenes.map((scene, idx) => (
                    <button key={scene.id} onClick={() => goToScene(idx)}
                      className={`flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${idx === currentSceneIndex ? 'border-orange-400 shadow-md' : 'border-white/20 opacity-60 hover:opacity-100'}`}>
                      <img src={optimizeImg(scene.url, true)} alt={scene.label} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              )}

              {showInfoPopup && !vrMode &&
                (() => {
                  const hotspot = extendedHotspots.find((h) => h.id === showInfoPopup);
                  if (!hotspot) return null;
                  const targetOffice = hotspot.targetOfficeId ? offices.find((o) => o.id === hotspot.targetOfficeId) : null;

                  if (targetOffice) {
                    return (
                      <div className="absolute inset-x-3 bottom-3 z-40 rounded-2xl border border-white/25 overflow-hidden flex flex-col"
                        style={{ height: 'clamp(180px, 26vh, 240px)', background: 'linear-gradient(180deg, rgba(10,15,30,0.35) 0%, rgba(10,15,30,0.55) 100%)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                        <div className="flex-shrink-0 p-3 pb-2 border-b border-white/10 relative">
                          <button onClick={() => setShowInfoPopup(null)} className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white transition-colors" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                            <X size={14} />
                          </button>
                          <div className="flex items-center gap-2.5 pr-8">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: targetOffice.iconBg, boxShadow: '0 3px 10px rgba(0,0,0,0.3)' }}>
                              {targetOffice.shortName?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h2 className="text-sm font-bold text-white leading-tight truncate" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
                                {lang === 'en' ? targetOffice.name : targetOffice.nameFilipino}
                              </h2>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[9px] font-semibold text-white/90 flex items-center gap-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                  <MapPin size={8} />{targetOffice.floor}
                                </span>
                                <span className="text-white/40 text-[9px]">·</span>
                                <span className="text-[9px] font-semibold text-orange-200" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                  {targetOffice.services.length} {t('services', 'serbisyo')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 py-2">
                          {(targetOffice.description || targetOffice.descriptionFilipino) && (
                            <p className="text-[11px] text-white/85 leading-relaxed line-clamp-3 mb-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                              {lang === 'en' ? targetOffice.description : targetOffice.descriptionFilipino}
                            </p>
                          )}
                          {targetOffice.services.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {targetOffice.services.slice(0, 4).map((service: any) => (
                                <span key={service.id} className="text-[10px] font-medium text-white/90 bg-white/10 border border-white/15 backdrop-blur px-2 py-0.5 rounded-full" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                  {lang === 'en' ? service.name : (service.nameFilipino || service.name)}
                                </span>
                              ))}
                              {targetOffice.services.length > 4 && (
                                <span className="text-[10px] font-medium text-orange-200 bg-orange-500/20 border border-orange-300/25 px-2 py-0.5 rounded-full" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                  +{targetOffice.services.length - 4} {t('more', 'pa')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 px-3 pb-3 pt-1">
                          <button onClick={() => { setShowInfoPopup(null); navigate(`/office/${targetOffice.id}`); }}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5" style={{ boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)' }}>
                            <Navigation size={12} />{t('View Full Details & Guide', 'Tingnan ang Buong Detalye at Gabay')}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="absolute inset-x-3 bottom-3 z-40 rounded-2xl border border-white/25 overflow-hidden flex flex-col"
                      style={{ height: 'clamp(120px, 18vh, 170px)', background: 'linear-gradient(180deg, rgba(10,15,30,0.35) 0%, rgba(10,15,30,0.55) 100%)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                      <div className="flex-shrink-0 p-3 pb-2 border-b border-white/10 relative">
                        <button onClick={() => setShowInfoPopup(null)} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white transition-colors">
                          <X size={14} />
                        </button>
                        <h3 className="text-sm font-bold text-white pr-8 truncate" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>{hotspot.label}</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto px-3 py-2">
                        <p className="text-[11px] text-white/85 leading-relaxed" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                          {hotspot.description || 'No additional information.'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ 2D MAP TAB ============
  return (
    <UserScreenLayout>
      {!isMapFullscreen && (
        <div className="bg-white px-4 pt-5 pb-0 border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-full bg-gray-50 border flex items-center justify-center hover:bg-gray-100 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-semibold">{t('Building Navigation', 'Navigation ng Gusali')}</h1>
              <p className="text-xs text-gray-400">{t('Municipal Building of Naujan', 'Municipal Building ng Naujan')}</p>
            </div>
          </div>
          <div className="flex border-b">
            {(['2d', 'vr'] as const).map((tab) => (
              <button key={tab} onClick={() => handleTabChange(tab)}
                className={`flex-1 py-2.5 text-xs font-semibold relative transition-colors ${activeTab === tab ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}>
                {tab === '2d' ? t('2D Map', '2D Mapa') : '360° Virtual Tour'}
                {activeTab === tab && (<div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-full" />)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`flex flex-col flex-1 ${isMapFullscreen ? 'fixed inset-0 z-[9999] bg-white' : ''}`}>
        {!isMapFullscreen && (
          <>
            <div className="px-4 py-3 bg-white border-b">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('Search office or service…', 'Maghanap ng opisina o serbisyo…')}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
                {searchQuery && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-50 max-h-60 overflow-y-auto">
                    {searchResults.map((o: any) => (
                      <button key={o.id} onClick={() => handleSearchSelect(o.id)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: o.iconBg }}>
                          {o.shortName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lang === 'en' ? o.name : o.nameFilipino}</p>
                          <p className="text-xs text-gray-400">{o.floor}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 bg-white border-b">
              <div className="flex gap-2 overflow-x-auto">
                {floorMaps.length === 0 && (<span className="text-xs text-gray-400 py-2">No floors available yet.</span>)}
                {floorMaps.map((f) => (
                  <button key={f.id}
                    onClick={() => { setActiveFloor(f.id); setSelectedOffice(null); handleResetView(); }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors ${activeFloor === f.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    <Layers size={12} />{f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-2 flex items-center justify-between bg-white border-b">
              <span className="text-xs text-gray-400">{Math.round(mapZoom * 100)}%</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowAllLabels((v) => !v)}
                  className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-[11px] font-medium transition-colors ${showAllLabels ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                  {showAllLabels ? <EyeOff size={12} /> : <Eye size={12} />}
                  <span className="hidden sm:inline">{showAllLabels ? t('Hide labels', 'Itago') : t('Labels', 'Pangalan')}</span>
                </button>
                <button onClick={handleZoomOut} className="w-8 h-8 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100"><ZoomOut size={14} /></button>
                <button onClick={handleZoomIn} className="w-8 h-8 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100"><ZoomIn size={14} /></button>
                <button onClick={handleResetView} className="w-8 h-8 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100" title="Reset view"><RotateCcw size={14} /></button>
                <button onClick={toggleMapFullscreen} className="w-8 h-8 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100" title="Fullscreen"><Maximize2 size={14} /></button>
              </div>
            </div>
          </>
        )}

        <div ref={(el) => { mapContainerRef.current = el; mapFullscreenRef.current = el; }}
          className={isMapFullscreen ? 'fixed inset-0 z-[9999] bg-white flex flex-col' : 'mx-4 mt-4 bg-white rounded-2xl border overflow-hidden cursor-grab active:cursor-grabbing relative'}
          style={{ touchAction: 'none' }}
          onMouseDown={handlePanStart} onMouseMove={handlePanMove} onMouseUp={handlePanEnd} onMouseLeave={handlePanEnd}
          onTouchStart={handleMapTouchStart} onTouchMove={handleMapTouchMove} onTouchEnd={handleMapTouchEnd}>

          {!isMapFullscreen && !isPanning && !showAllLabels && floorOffices.length > 0 && (
            <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur rounded-full border border-gray-200 shadow-sm px-3 py-1.5 flex items-center gap-1.5 text-[10px] text-gray-600 pointer-events-none">
              <Info size={11} className="text-orange-500" />{t('Tap a dot to see office name', 'I-tap ang dot para makita ang pangalan')}
            </div>
          )}

          {isMapFullscreen && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white/90 backdrop-blur rounded-xl border shadow-lg p-1.5">
              <button onClick={() => setShowAllLabels((v) => !v)}
                className={`h-9 px-2.5 rounded-lg border flex items-center gap-1.5 text-[11px] font-medium transition-colors ${showAllLabels ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                {showAllLabels ? <EyeOff size={13} /> : <Eye size={13} />}<span>{showAllLabels ? t('Hide', 'Itago') : t('Labels', 'Pangalan')}</span>
              </button>
              <button onClick={handleZoomOut} className="w-9 h-9 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100"><ZoomOut size={16} /></button>
              <button onClick={handleZoomIn} className="w-9 h-9 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100"><ZoomIn size={16} /></button>
              <button onClick={handleResetView} className="w-9 h-9 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100"><RotateCcw size={16} /></button>
              <button onClick={toggleMapFullscreen} className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-100"><Minimize2 size={16} /></button>
            </div>
          )}

          {isMapFullscreen ? (
            <div className="relative flex-1 w-full">
              <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
                <g transform={`translate(${panOffset.x / mapZoom},${panOffset.y / mapZoom}) scale(${mapZoom})`}>
                  <rect x="-100" y="-100" width={VIEWBOX_WIDTH + 200} height={VIEWBOX_HEIGHT + 200} fill="#FFFFFF" />
                  {activeFloorMap?.url ? (<image href={activeFloorMap.url} x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} />) : (<text x={VIEWBOX_WIDTH / 2} y={VIEWBOX_HEIGHT / 2} textAnchor="middle" fontSize="3" fill="#9CA3AF">No map uploaded</text>)}
                  {/* ✅ Path line sa 2D fullscreen */}
                  {selectedOfficeData && pathPointsForMap && pathPointsForMap.length > 1 && (
                    <polyline points={pathPointsForMap.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#F97316" strokeOpacity="0.75" strokeWidth="0.9" strokeDasharray="3,2" strokeLinecap="round" />
                  )}
                  {floorOffices.map((o) => {
                    const isSelected = selectedOffice === o.id;
                    const dotColor = isSelected ? o.iconBg : DEFAULT_DOT_COLOR;
                    return (
                      <g key={`dot-${o.id}`}>
                        {isSelected && (
                          <>
                            <circle cx={o.mapX} cy={o.mapY} r={3.2} fill={o.iconBg} fillOpacity="0.25" />
                            <circle cx={o.mapX} cy={o.mapY} r={2.4} fill="none" stroke={o.iconBg} strokeOpacity="0.6" strokeWidth="0.5" />
                          </>
                        )}
                        <circle cx={o.mapX} cy={o.mapY} r={isSelected ? 1.6 : 1.0} fill={dotColor} stroke="white" strokeOpacity="0.9" strokeWidth={isSelected ? 0.5 : 0.35} style={{ cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); if (!o.id) return; setSelectedOffice(o.id === selectedOffice ? null : o.id); }} />
                      </g>
                    );
                  })}
                  {visibleLabeledOffices.map(({ office, lines, blockWidth, lineHeight }) => renderOfficeLabel(office, lines, blockWidth, lineHeight, VIEWBOX_WIDTH))}
                  <g transform={`translate(${userPosition.x},${userPosition.y})`}>
                    <circle r="4" fill="#3B82F6" opacity="0.25" />
                    <circle r="2" fill="#3B82F6" stroke="white" strokeWidth="0.8" />
                  </g>
                </g>
              </svg>
            </div>
          ) : (
            <div className="relative w-full" style={{ paddingBottom: `${(VIEWBOX_HEIGHT / VIEWBOX_WIDTH) * 100}%` }}>
              <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="absolute inset-0 w-full h-full">
                <g transform={`translate(${panOffset.x / mapZoom},${panOffset.y / mapZoom}) scale(${mapZoom})`}>
                  <rect x="-100" y="-100" width={VIEWBOX_WIDTH + 200} height={VIEWBOX_HEIGHT + 200} fill="#FFFFFF" />
                  {activeFloorMap?.url ? (<image href={activeFloorMap.url} x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} />) : (<text x={VIEWBOX_WIDTH / 2} y={VIEWBOX_HEIGHT / 2} textAnchor="middle" fontSize="3" fill="#9CA3AF">No map uploaded</text>)}
                  {/* ✅ Path line sa 2D */}
                  {selectedOfficeData && pathPointsForMap && pathPointsForMap.length > 1 && (
                    <polyline points={pathPointsForMap.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#F97316" strokeOpacity="0.75" strokeWidth="0.9" strokeDasharray="3,2" strokeLinecap="round" />
                  )}
                  {floorOffices.map((o) => {
                    const isSelected = selectedOffice === o.id;
                    const dotColor = isSelected ? o.iconBg : DEFAULT_DOT_COLOR;
                    return (
                      <g key={`dot-${o.id}`}>
                        {isSelected && (
                          <>
                            <circle cx={o.mapX} cy={o.mapY} r={3.2} fill={o.iconBg} fillOpacity="0.25" />
                            <circle cx={o.mapX} cy={o.mapY} r={2.4} fill="none" stroke={o.iconBg} strokeOpacity="0.6" strokeWidth="0.5" />
                          </>
                        )}
                        <circle cx={o.mapX} cy={o.mapY} r={isSelected ? 1.6 : 1.0} fill={dotColor} stroke="white" strokeOpacity="0.9" strokeWidth={isSelected ? 0.5 : 0.35} style={{ cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); if (!o.id) return; setSelectedOffice(o.id === selectedOffice ? null : o.id); }} />
                      </g>
                    );
                  })}
                  {visibleLabeledOffices.map(({ office, lines, blockWidth, lineHeight }) => renderOfficeLabel(office, lines, blockWidth, lineHeight, VIEWBOX_WIDTH))}
                  <g transform={`translate(${userPosition.x},${userPosition.y})`}>
                    <circle r="4" fill="#3B82F6" opacity="0.25" />
                    <circle r="2" fill="#3B82F6" stroke="white" strokeWidth="0.8" />
                  </g>
                </g>
              </svg>
            </div>
          )}
        </div>

        {!isMapFullscreen && (
          <>
            {selectedOfficeData && (
              <div className="mx-4 mt-3 bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: selectedOfficeData.iconBg }}>
                    {selectedOfficeData.shortName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{lang === 'en' ? selectedOfficeData.name : selectedOfficeData.nameFilipino}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-gray-400" /><p className="text-xs text-gray-400">{selectedOfficeData.floor}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedOffice(null)} className="w-7 h-7 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => navigate(`/office/${selectedOfficeData.id}`)} className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-orange-600">
                    <Navigation size={12} /> {t('Go', 'Punta')}
                  </button>
                  <button onClick={() => handleViewIn360(selectedOfficeData.id!)} className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-blue-600">
                    <Video size={12} /> {t('View in 360', 'Tingnan sa 360')}
                  </button>
                </div>
              </div>
            )}

            <div className="px-4 mt-4 mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">{activeFloorMap?.label || t('Offices', 'Mga Tanggapan')}</p>
              <div className="space-y-2">
                {floorOffices.map((o) => {
                  const isSelected = selectedOffice === o.id;
                  return (
                    <button key={o.id} id={`office-item-${o.id}`}
                      onClick={() => setSelectedOffice(isSelected ? null : (o.id ?? null))}
                      className={`w-full flex items-center gap-3 bg-white rounded-xl border p-3 text-left transition-all ${isSelected ? 'border-orange-300 bg-orange-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: isSelected ? o.iconBg : DEFAULT_DOT_COLOR }}>
                        {o.shortName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold truncate">{lang === 'en' ? o.name : o.nameFilipino}</p>
                        <p className="text-[11px] text-gray-400">{o.floor}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300" />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </UserScreenLayout>
  );
}