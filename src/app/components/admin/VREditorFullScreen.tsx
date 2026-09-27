import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import {
  X, ChevronLeft, Save, CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  Info, Navigation, Building2, Circle, Square, Diamond, Hexagon, ArrowUp,
  Palette, Trash2, Plus, DoorOpen, ChevronRight,
} from 'lucide-react';
import { VRTour, VRHotspot, VRScene } from '../../../services/vrTourService';
import { useMapSettingsRealtime, MapFloor } from '../../../services/mapService';
import EquirectangularViewer, { EquirectangularViewerHandle } from '../EquirectangularViewer';
import { SHAPES, HOTSPOT_COLORS, ARROW_DIRECTIONS } from './mapConstants';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ======================= CUSTOM SVG ICONS =======================
const GeoAltIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 16 16">
    <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10"/>
    <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
  </svg>
);

const BullseyeIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 16 16">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
    <path d="M8 13A5 5 0 1 1 8 3a5 5 0 0 1 0 10m0 1A6 6 0 1 0 8 2a6 6 0 0 0 0 12"/>
    <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 4m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/>
    <path d="M9.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
  </svg>
);

const InfoCircleFillIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 16 16">
    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"/>
  </svg>
);

const DoorOpenIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 16 16">
    <path d="M8.5 10c-.276 0-.5-.448-.5-1s.224-1 .5-1 .5.448.5 1-.224 1-.5 1"/>
    <path d="M10.828.122A.5.5 0 0 1 11 .5V1h.5A1.5 1.5 0 0 1 13 2.5V15h1.5a.5.5 0 0 1 0 1h-13a.5.5 0 0 1 0-1H3V1.5a.5.5 0 0 1 .43-.495l7-1a.5.5 0 0 1 .398.117M11.5 2H11v13h1V2.5a.5.5 0 0 0-.5-.5M4 1.934V15h6V1.077z"/>
  </svg>
);

const TagIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={color} viewBox="0 0 16 16">
    <path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
  </svg>
);

// ✅ Label background color palette (all work well with dark gray text)
const LABEL_BG_COLORS = [
  '#fde047', // yellow-300 (default)
  '#fbbf24', // amber-400
  '#fb923c', // orange-400
  '#fca5a5', // red-300
  '#f9a8d4', // pink-300
  '#c4b5fd', // violet-300
  '#93c5fd', // blue-300
  '#5eead4', // teal-300
  '#86efac', // green-300
  '#fef3c7', // amber-100 (cream)
  '#e5e7eb', // gray-200
  '#ffffff', // white
];

const TypeDropdown = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const types = [
    { id: 'info', label: 'Info', icon: <InfoCircleFillIcon size={14} />, color: 'text-blue-600' },
    { id: 'navigation', label: 'Navigation', icon: <GeoAltIcon size={14} />, color: 'text-green-600' },
    { id: 'entrance', label: 'Entrance', icon: <DoorOpenIcon size={14} />, color: 'text-purple-600' },
    { id: 'label', label: 'Label', icon: <TagIcon size={14} />, color: 'text-yellow-600' },
  ];

  const selected = types.find((t) => t.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs border rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400"
      >
        <span className="flex items-center gap-1.5">
          {selected ? (
            <>
              <span className={selected.color}>{selected.icon}</span>
              {selected.label}
            </>
          ) : (
            'Select type'
          )}
        </span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border rounded-lg shadow-lg py-1">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onChange(t.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-100 ${
                value === t.id ? 'bg-orange-50' : ''
              }`}
            >
              <span className={t.color}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ======================= MAIN COMPONENT =======================
interface SceneWithHotspots extends VRScene {
  hotspots: VRHotspot[];
}

interface TourWithScenes extends VRTour {
  scenes: SceneWithHotspots[];
}

interface VREditorFullScreenProps {
  tour: VRTour | null;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  onTourUpdate: (updatedTour: VRTour) => void;
  onBack: () => void;
  onSave: () => Promise<void>;
  offices: any[];
  onDropScene?: (lon: number, lat: number, sceneId: string) => void;
}

function projectLatLonToScreen(
  camera: THREE.Camera,
  lat: number,
  lon: number,
  radius = 9.8
): { x: number; y: number; depth: number } | null {
  if (!camera) return null;
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);
  const pos = new THREE.Vector3(
    radius * Math.sin(theta) * Math.sin(phi),
    radius * Math.cos(phi),
    -radius * Math.cos(theta) * Math.sin(phi)
  );
  pos.project(camera);
  return {
    x: (pos.x * 0.5 + 0.5) * window.innerWidth,
    y: (-pos.y * 0.5 + 0.5) * window.innerHeight,
    depth: pos.z,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function VREditorFullScreen({
  tour,
  selectedSceneId: propSelectedSceneId,
  onSelectScene: propOnSelectScene,
  onTourUpdate,
  onBack,
  onSave,
  offices,
  onDropScene,
}: VREditorFullScreenProps) {
  const [localSelectedSceneId, setLocalSelectedSceneId] = useState<string | null>(propSelectedSceneId);
  const [brightness, setBrightness] = useState(1);
  const [newHotspotTemp, setNewHotspotTemp] = useState<{ lon: number; lat: number } | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [hotspotLabel, setHotspotLabel] = useState('');
  const [hotspotType, setHotspotType] = useState<'navigation' | 'info' | 'entrance' | 'label'>('info');
  const [hotspotColor, setHotspotColor] = useState('#F97316');
  // ✅ NEW: label background color
  const [hotspotLabelBg, setHotspotLabelBg] = useState('#fde047');
  const [hotspotShape, setHotspotShape] = useState<'circle' | 'square' | 'diamond' | 'hexagon' | 'rounded' | 'arrow'>('circle');
  const [hotspotSize, setHotspotSize] = useState(1);
  const [hotspotDirection, setHotspotDirection] = useState(0);
  const [hotspotTargetScene, setHotspotTargetScene] = useState('');
  const [hotspotTargetOffice, setHotspotTargetOffice] = useState('');
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [hotspotListCollapsed, setHotspotListCollapsed] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [hotspotToDelete, setHotspotToDelete] = useState<string | null>(null);

  const [floors, setFloors] = useState<MapFloor[]>([]);

  const adminViewerRef = useRef<EquirectangularViewerHandle>(null);

  const [labelPositions, setLabelPositions] = useState<
    {
      id: string;
      text: string;
      x: number;
      y: number;
      depth: number;
      size: number;
      labelBgColor: string;
      visible: boolean;
    }[]
  >([]);
  const labelRafRef = useRef<number>(0);

  const [draggingLabel, setDraggingLabel] = useState<{
    id: string;
    startX: number;
    startY: number;
    startLon: number;
    startLat: number;
  } | null>(null);
  const dragMovedRef = useRef(false);

  const scenes = (tour as TourWithScenes)?.scenes || [];
  const currentScene = scenes.find((s) => s.id === localSelectedSceneId);
  const currentIndex = scenes.findIndex((s) => s.id === localSelectedSceneId);

  const scenesRef = useRef(scenes);
  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  useEffect(() => {
    setLocalSelectedSceneId(propSelectedSceneId);
  }, [propSelectedSceneId]);

  useEffect(() => {
    const unsub = useMapSettingsRealtime((settings) => {
      if (settings.floors?.length) {
        setFloors(settings.floors);
      }
    });
    return () => unsub();
  }, []);

  const labelHotspots = useMemo(() => {
    if (!currentScene?.hotspots?.length) return [];
    return currentScene.hotspots
      .filter(
        (h) =>
          h.type === 'label' &&
          !!h.label &&
          h.latitude !== undefined &&
          h.longitude !== undefined
      )
      .map((h) => ({
        id: h.id || `${h.latitude}-${h.longitude}`,
        text: h.label,
        latitude: h.latitude as number,
        longitude: h.longitude as number,
        size: h.size || 1,
        // ✅ Read from hotspot with fallback
        labelBgColor: (h as any).labelBgColor || '#fde047',
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene?.hotspots]);

  const labelHotspotsRef = useRef(labelHotspots);
  useEffect(() => {
    labelHotspotsRef.current = labelHotspots;
  }, [labelHotspots]);

  useEffect(() => {
    const loop = () => {
      const camera = adminViewerRef.current?.getCamera?.();
      const latest = labelHotspotsRef.current;
      if (!camera || latest.length === 0) {
        setLabelPositions((prev) => (prev.length === 0 ? prev : []));
        labelRafRef.current = requestAnimationFrame(loop);
        return;
      }
      const result = latest.map((label) => {
        const proj = projectLatLonToScreen(camera, label.latitude, label.longitude);
        if (!proj) {
          return {
            id: label.id,
            text: label.text,
            x: 0,
            y: 0,
            depth: 0,
            size: label.size,
            labelBgColor: label.labelBgColor,
            visible: false,
          };
        }
        const inFront = proj.depth < 1 && proj.depth > -1;
        const onScreen =
          proj.x > -300 &&
          proj.x < window.innerWidth + 300 &&
          proj.y > -200 &&
          proj.y < window.innerHeight + 200;
        return {
          id: label.id,
          text: label.text,
          x: proj.x,
          y: proj.y,
          depth: proj.depth,
          size: label.size,
          labelBgColor: label.labelBgColor,
          visible: inFront && onScreen,
        };
      });
      setLabelPositions(result);
      labelRafRef.current = requestAnimationFrame(loop);
    };
    labelRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(labelRafRef.current);
  }, [currentScene?.id]);

  const syncFormFromHotspot = useCallback((hotspot: VRHotspot | undefined) => {
    if (!hotspot) {
      resetHotspotForm();
      return;
    }
    setHotspotLabel(hotspot.label);
    const t = (hotspot.type === 'office' ? 'info' : hotspot.type) as any;
    setHotspotType(t);
    setHotspotColor(hotspot.color || '#F97316');
    // ✅ Read label bg from saved hotspot
    setHotspotLabelBg((hotspot as any).labelBgColor || '#fde047');
    setHotspotShape((hotspot.shape as any) || 'circle');
    setHotspotSize(hotspot.size || 1);
    setHotspotDirection(hotspot.direction || 0);
    setHotspotTargetScene(hotspot.targetSceneId || '');
    setHotspotTargetOffice(hotspot.targetOfficeId || '');
  }, []);

  const updateTourLocal = useCallback(
    (updatedScenes: SceneWithHotspots[]) => {
      onTourUpdate({
        ...tour!,
        id: tour?.id || 'buildingTour',
        scenes: updatedScenes,
      });
    },
    [tour, onTourUpdate]
  );

  const goToScene = (index: number) => {
    if (index >= 0 && index < scenes.length) {
      const newId = scenes[index].id;
      setLocalSelectedSceneId(newId);
      propOnSelectScene(newId);
    }
  };

  const handleSphereClick = (lon: number, lat: number) => {
    setNewHotspotTemp({ lon, lat });
    setSelectedHotspotId(null);
    resetHotspotForm();
  };

  const resetHotspotForm = () => {
    setHotspotLabel('');
    setHotspotType('info');
    setHotspotColor('#F97316');
    setHotspotLabelBg('#fde047'); // ✅ reset default
    setHotspotShape('circle');
    setHotspotSize(1);
    setHotspotDirection(0);
    setHotspotTargetScene('');
    setHotspotTargetOffice('');
  };

  const confirmNewHotspot = () => {
    if (!newHotspotTemp || !localSelectedSceneId) return;
    const newHotspot: any = {
      id: Date.now().toString(),
      longitude: newHotspotTemp.lon,
      latitude: newHotspotTemp.lat,
      type: hotspotType,
      label: hotspotLabel || 'Hotspot',
      color: hotspotColor,
      shape: hotspotShape,
      size: hotspotSize,
      ...(hotspotShape === 'arrow' ? { direction: hotspotDirection } : {}),
      targetSceneId: hotspotType === 'navigation' ? hotspotTargetScene || undefined : undefined,
      targetOfficeId: hotspotType === 'info' ? hotspotTargetOffice || undefined : undefined,
      // ✅ Save label bg for label type
      ...(hotspotType === 'label' ? { labelBgColor: hotspotLabelBg } : {}),
    };
    const updated = scenesRef.current.map((s) =>
      s.id === localSelectedSceneId ? { ...s, hotspots: [...s.hotspots, newHotspot] } : s
    );
    updateTourLocal(updated);
    setNewHotspotTemp(null);
    setSelectedHotspotId(newHotspot.id);
    syncFormFromHotspot(newHotspot);
  };

  const handleViewerDrop = useCallback(
    (lon: number, lat: number, sceneId: string) => {
      if (!localSelectedSceneId) return;
      const targetScene = scenesRef.current.find((s) => s.id === sceneId);
      if (!targetScene) return;
      const newHotspot: VRHotspot = {
        id: Date.now().toString(),
        longitude: lon,
        latitude: lat,
        type: 'navigation',
        label: `Go to ${targetScene.label}`,
        targetSceneId: sceneId,
        color: '#3B82F6',
        shape: 'arrow',
        size: 1.2,
        direction: 0,
      };
      const updated = scenesRef.current.map((s) =>
        s.id === localSelectedSceneId ? { ...s, hotspots: [...s.hotspots, newHotspot] } : s
      );
      updateTourLocal(updated);
      setSelectedHotspotId(newHotspot.id);
      syncFormFromHotspot(newHotspot);
    },
    [localSelectedSceneId, updateTourLocal, syncFormFromHotspot]
  );

  const handleHotspotMove = useCallback(
    (id: string, newLon: number, newLat: number) => {
      if (!currentScene) return;
      const updated = scenesRef.current.map((s) =>
        s.id === currentScene.id
          ? {
              ...s,
              hotspots: s.hotspots.map((h) =>
                h.id === id ? { ...h, longitude: newLon, latitude: newLat } : h
              ),
            }
          : s
      );
      updateTourLocal(updated);
    },
    [currentScene, updateTourLocal]
  );

  const handleHotspotMoveEnd = useCallback(
    (id: string, newLon: number, newLat: number) => {
      handleHotspotMove(id, newLon, newLat);
    },
    [handleHotspotMove]
  );

  const handleHotspotClick = (hotspot: any) => {
    setNewHotspotTemp(null);
    const h = currentScene?.hotspots.find((h) => h.id === hotspot.id);
    setSelectedHotspotId(hotspot.id);
    syncFormFromHotspot(h);
  };

  const handleUpdateHotspot = (field: string, value: any) => {
    if (!currentScene || !selectedHotspotId) return;
    const updated = scenesRef.current.map((s) =>
      s.id === currentScene.id
        ? {
            ...s,
            hotspots: s.hotspots.map((h) =>
              h.id === selectedHotspotId ? { ...h, [field]: value } : h
            ),
          }
        : s
    );
    updateTourLocal(updated);
  };

  const handleDeleteHotspot = (id: string) => {
    setHotspotToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteHotspot = () => {
    if (!currentScene || !hotspotToDelete) return;
    const updated = scenesRef.current.map((s) =>
      s.id === currentScene.id
        ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== hotspotToDelete) }
        : s
    );
    updateTourLocal(updated);
    setSelectedHotspotId(null);
    setHotspotToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDragSceneId(sceneId);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sceneId);
  };

  const handleDragOverFilmstrip = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropFilmstrip = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = dragSceneId;
    if (!sourceId || sourceId === targetId) return;
    const sourceIdx = scenesRef.current.findIndex((s) => s.id === sourceId);
    const targetIdx = scenesRef.current.findIndex((s) => s.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const updated = [...scenesRef.current];
    const [moved] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, moved);
    updateTourLocal(updated);
    setDragSceneId(null);
    setIsDragging(false);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDragSceneId(null);
    setIsDragging(false);
    setDragOverId(null);
  };

  const handleDragEnterItem = (sceneId: string) => {
    setDragOverId(sceneId);
  };

  const handleDragLeaveItem = () => {
    setDragOverId(null);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await onSave();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleLabelPointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent, id: string) => {
      if ('button' in e && e.button !== 0) return;
      const h = currentScene?.hotspots.find((x) => x.id === id);
      if (!h || h.latitude === undefined || h.longitude === undefined) return;
      e.stopPropagation();
      if ('preventDefault' in e) e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      dragMovedRef.current = false;
      setDraggingLabel({
        id,
        startX: clientX,
        startY: clientY,
        startLon: h.longitude,
        startLat: h.latitude,
      });
    },
    [currentScene]
  );

  useEffect(() => {
    if (!draggingLabel) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - draggingLabel.startX;
      const dy = clientY - draggingLabel.startY;
      if (!dragMovedRef.current && Math.abs(dx) + Math.abs(dy) < 4) return;
      dragMovedRef.current = true;

      const dLon = dx * 0.18;
      const dLat = -dy * 0.18;

      let newLon = draggingLabel.startLon + dLon;
      let newLat = draggingLabel.startLat + dLat;
      if (newLon > 180) newLon -= 360;
      if (newLon < -180) newLon += 360;
      newLat = Math.max(-85, Math.min(85, newLat));

      handleHotspotMove(draggingLabel.id, newLon, newLat);
    };
    const onUp = () => {
      setDraggingLabel(null);
      setTimeout(() => {
        dragMovedRef.current = false;
      }, 100);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [draggingLabel, handleHotspotMove]);

  const selectedHotspot = currentScene?.hotspots.find((h) => h.id === selectedHotspotId);
  const overlayStyle = isDragging ? ({ pointerEvents: 'none' } as React.CSSProperties) : {};

  const shapeIconMap: Record<string, React.ElementType> = {
    circle: Circle,
    square: Square,
    diamond: Diamond,
    hexagon: Hexagon,
    rounded: Square,
    arrow: ArrowUp,
  };

  const typeBadgeMap = {
    info: { label: 'Info', icon: <InfoCircleFillIcon size={10} />, color: 'bg-blue-100 text-blue-700' },
    navigation: { label: 'Nav', icon: <GeoAltIcon size={10} />, color: 'bg-green-100 text-green-700' },
    office: { label: 'Info', icon: <InfoCircleFillIcon size={10} />, color: 'bg-blue-100 text-blue-700' },
    entrance: { label: 'Entrance', icon: <DoorOpenIcon size={10} />, color: 'bg-purple-100 text-purple-700' },
    label: { label: 'Label', icon: <TagIcon size={10} />, color: 'bg-yellow-100 text-yellow-700' },
  };

  const officesList = offices || [];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-12 bg-black/70 backdrop-blur flex items-center justify-between px-4 z-40"
        style={overlayStyle}
      >
        <button
          onClick={onBack}
          className="text-white/80 text-sm flex items-center gap-1 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} /> Media
        </button>
        <span className="text-white text-sm font-semibold">360° Tour Editor</span>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="text-white/80 text-sm flex items-center gap-1 hover:text-white transition-colors disabled:opacity-50"
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} /> Save
            </>
          )}
        </button>
      </div>

      {saveStatus !== 'idle' && saveStatus !== 'saving' && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
              saveStatus === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {saveStatus === 'success' ? (
              <><CheckCircle size={16} /> Tour saved!</>
            ) : (
              <><AlertCircle size={16} /> Save failed!</>
            )}
          </div>
        </div>
      )}

      {/* Viewer area */}
      <div className="flex-1 relative">
        <EquirectangularViewer
          ref={adminViewerRef}
          key={localSelectedSceneId || 'empty'}
          sceneUrl={currentScene?.url || ''}
          hotspots={currentScene?.hotspots.map((h) => ({
            id: h.id,
            longitude: h.longitude ?? 0,
            latitude: h.latitude ?? 0,
            type: h.type,
            label: h.label,
            color: h.color,
            description: h.description,
            targetSceneId: h.targetSceneId,
            targetOfficeId: h.targetOfficeId,
            shape: h.shape,
            size: h.type === 'label' ? 0.01 : h.size,
            direction: h.direction,
          }))}
          enableClickToPlace={true}
          onClickScene={handleSphereClick}
          onHotspotClick={handleHotspotClick}
          onDropScene={handleViewerDrop}
          onHotspotMove={handleHotspotMove}
          onHotspotMoveEnd={handleHotspotMoveEnd}
          isAdmin={true}
          brightness={brightness}
          onSceneChange={(dir) => goToScene(currentIndex + dir)}
          currentIndex={currentIndex}
          totalScenes={scenes.length}
          showNavigationArrows={true}
        />

        {/* ✅ Label pills — dynamic bg color + draggable + multi-line */}
        {labelPositions.map((pos) => {
          if (!pos.visible) return null;
          const fontPx = Math.max(8, Math.min(48, (pos.size ?? 1) * 16));
          const paddingY = Math.max(4, Math.round(fontPx * 0.22));
          const paddingX = Math.max(10, Math.round(fontPx * 0.5));
          const isSelected = selectedHotspotId === pos.id;
          const isDraggingThis = draggingLabel?.id === pos.id;
          const lines = pos.text.split('\n');
          const bg = pos.labelBgColor || '#fde047';
          return (
            <div
              key={pos.id}
              className="absolute z-30"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'translate(-50%, -220%)',
                pointerEvents: 'auto',
                cursor: isDraggingThis ? 'grabbing' : 'grab',
                opacity: Math.max(0.6, 0.95 - Math.abs(pos.depth) * 0.4),
                userSelect: 'none',
                touchAction: 'none',
              }}
              onMouseDown={(e) => handleLabelPointerDown(e, pos.id)}
              onTouchStart={(e) => handleLabelPointerDown(e, pos.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (dragMovedRef.current) return;
                const h = currentScene?.hotspots.find((x) => x.id === pos.id);
                if (h) handleHotspotClick(h);
              }}
            >
              <div
                className={`backdrop-blur-sm text-gray-900 font-bold rounded-2xl shadow-md transition-all ${
                  isSelected
                    ? 'border-2 border-orange-500 ring-2 ring-orange-300'
                    : 'border border-black/10 hover:border-black/30'
                }`}
                style={{
                  fontSize: `${fontPx}px`,
                  paddingLeft: `${paddingX}px`,
                  paddingRight: `${paddingX}px`,
                  paddingTop: `${paddingY}px`,
                  paddingBottom: `${paddingY}px`,
                  lineHeight: 1.25,
                  backgroundColor: hexToRgba(bg, 0.55),
                }}
              >
                {lines.map((line, idx) => (
                  <div key={idx} style={{ whiteSpace: 'nowrap' }}>
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Scene info panel */}
        {currentScene && (
          <div
            className="absolute top-14 left-4 bg-white/90 backdrop-blur rounded-xl p-3 w-56 shadow-lg z-20"
            style={overlayStyle}
          >
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Scene Info</h4>
            <input
              value={currentScene.label}
              onChange={(e) => {
                const updated = scenesRef.current.map((s) =>
                  s.id === currentScene.id ? { ...s, label: e.target.value } : s
                );
                updateTourLocal(updated);
              }}
              className="w-full text-xs border rounded px-2 py-1 mb-1 focus:ring-2 focus:ring-orange-400 focus:outline-none"
              placeholder="Scene name"
            />
            <textarea
              value={currentScene.description || ''}
              onChange={(e) => {
                const updated = scenesRef.current.map((s) =>
                  s.id === currentScene.id
                    ? { ...s, description: e.target.value }
                    : s
                );
                updateTourLocal(updated);
              }}
              rows={2}
              className="w-full text-xs border rounded px-2 py-1 resize-none focus:ring-2 focus:ring-orange-400 focus:outline-none"
              placeholder="Description"
            />

            <div className="mt-2">
              <label className="text-[10px] text-gray-500 block mb-1">Floor</label>
              <select
                value={currentScene.floorId || ''}
                onChange={(e) => {
                  const updated = scenesRef.current.map((s) =>
                    s.id === currentScene.id
                      ? { ...s, floorId: e.target.value || undefined }
                      : s
                  );
                  updateTourLocal(updated);
                }}
                className="w-full text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
              >
                <option value="">None</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2">
              <label className="text-[10px] text-gray-500">Brightness</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
          </div>
        )}

        {/* Hotspot list */}
        {currentScene && (
          <div
            className="absolute top-14 right-4 bg-white/90 backdrop-blur rounded-xl shadow-lg z-20 w-56 max-h-72 overflow-hidden"
            style={overlayStyle}
          >
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setHotspotListCollapsed(!hotspotListCollapsed)}
            >
              <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                Hotspots{' '}
                <span className="text-gray-400 font-normal">
                  ({currentScene.hotspots.length})
                </span>
              </h4>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                {hotspotListCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>
            {!hotspotListCollapsed && (
              <div className="max-h-56 overflow-y-auto px-1 pb-2">
                {currentScene.hotspots.length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-3">No hotspots yet</p>
                ) : (
                  currentScene.hotspots.map((h) => {
                    const badge =
                      typeBadgeMap[h.type as keyof typeof typeBadgeMap] || typeBadgeMap.info;
                    const isSelected = selectedHotspotId === h.id;
                    return (
                      <div
                        key={h.id}
                        onClick={() => handleHotspotClick(h)}
                        className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-orange-100' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: h.color || '#F97316' }}
                        />
                        <span className="flex-1 truncate font-medium">
                          {h.label.split('\n')[0]}
                        </span>
                        <span
                          className={`text-[8px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${badge.color}`}
                        >
                          {badge.icon} {badge.label}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHotspot(h.id);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Hotspot editor (bottom left) */}
        {(newHotspotTemp || selectedHotspot) && (
          <div
            className="absolute bottom-24 left-4 bg-white/95 backdrop-blur rounded-xl p-4 w-64 shadow-xl z-20 max-h-[55vh] overflow-y-auto border border-gray-200"
            style={overlayStyle}
          >
            {newHotspotTemp ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Plus size={14} className="text-orange-500" /> New Hotspot
                  </h4>
                  <div
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: hotspotColor }}
                  />
                </div>
                <div className="space-y-2">
                  {hotspotType === 'label' ? (
                    <textarea
                      value={hotspotLabel}
                      onChange={(e) => setHotspotLabel(e.target.value)}
                      rows={3}
                      placeholder={'e.g. Comfort Room\nExit, Water Station'}
                      className="w-full text-xs border rounded-lg px-3 py-1.5 resize-none focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    />
                  ) : (
                    <input
                      value={hotspotLabel}
                      onChange={(e) => setHotspotLabel(e.target.value)}
                      placeholder="Label"
                      className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    />
                  )}
                  <TypeDropdown value={hotspotType} onChange={(val) => setHotspotType(val as any)} />
                  {hotspotType === 'navigation' && (
                    <select
                      value={hotspotTargetScene}
                      onChange={(e) => setHotspotTargetScene(e.target.value)}
                      className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
                    >
                      <option value="">Select target scene</option>
                      {scenes
                        .filter((s) => s.id !== currentScene?.id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                    </select>
                  )}
                  {hotspotType === 'info' && (
                    <>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                          <InfoCircleFillIcon size={10} color="#1d4ed8" /> Pumili ng opisina — awtomatikong ipapakita ang impormasyon, serbisyo, at proseso nito sa user.
                        </p>
                      </div>
                      <select
                        value={hotspotTargetOffice}
                        onChange={(e) => setHotspotTargetOffice(e.target.value)}
                        className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
                      >
                        <option value="">Select office (required)</option>
                        {officesList.map((o: any) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Shape</label>
                    <div className="flex gap-1">
                      {SHAPES.map((s) => {
                        const IconComponent = shapeIconMap[s.id] || Circle;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setHotspotShape(s.id)}
                            className={`w-7 h-7 rounded-lg border text-xs flex items-center justify-center transition-all ${
                              hotspotShape === s.id
                                ? 'border-orange-500 bg-orange-50 text-orange-600'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            title={s.label}
                          >
                            <IconComponent size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {hotspotShape === 'arrow' && (
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Direction</label>
                      <div className="flex gap-1">
                        {ARROW_DIRECTIONS.map((dir) => {
                          const DirIcon = dir.Icon;
                          return (
                            <button
                              key={dir.angle}
                              onClick={() => setHotspotDirection(dir.angle)}
                              className={`w-7 h-7 text-xs border rounded-lg flex items-center justify-center transition-all ${
                                hotspotDirection === dir.angle
                                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <DirIcon size={14} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Color</label>
                    <div className="flex gap-1 flex-wrap">
                      {HOTSPOT_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setHotspotColor(c)}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${
                            hotspotColor === c
                              ? 'border-gray-800 scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* ✅ Label background color picker — only for label type */}
                  {hotspotType === 'label' && (
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Label Background Color</label>
                      <div className="flex gap-1 flex-wrap">
                        {LABEL_BG_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setHotspotLabelBg(c)}
                            className={`w-6 h-6 rounded-md border-2 transition-all ${
                              hotspotLabelBg === c
                                ? 'border-orange-500 scale-110 ring-2 ring-orange-200'
                                : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-gray-500 flex items-center justify-between">
                      {hotspotType === 'label' ? 'Font Size' : 'Size'}{' '}
                      <span className="font-medium">{hotspotSize.toFixed(1)}</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={hotspotSize}
                      onChange={(e) => setHotspotSize(parseFloat(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={confirmNewHotspot}
                      disabled={
                        !hotspotLabel.trim() ||
                        (hotspotType === 'info' && !hotspotTargetOffice)
                      }
                      className="flex-1 bg-orange-500 text-white text-xs font-medium py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setNewHotspotTemp(null);
                        resetHotspotForm();
                      }}
                      className="px-3 border text-xs py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            ) : selectedHotspot ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Palette size={14} className="text-orange-500" /> Edit Hotspot
                  </h4>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedHotspot.color || '#F97316' }}
                  />
                </div>
                <div className="space-y-2">
                  {hotspotType === 'label' ? (
                    <textarea
                      value={selectedHotspot.label}
                      onChange={(e) => handleUpdateHotspot('label', e.target.value)}
                      rows={3}
                      placeholder={'Type text, Enter for new line'}
                      className="w-full text-xs border rounded-lg px-3 py-1.5 resize-none focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    />
                  ) : (
                    <input
                      value={selectedHotspot.label}
                      onChange={(e) => handleUpdateHotspot('label', e.target.value)}
                      className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    />
                  )}
                  <textarea
                    value={selectedHotspot.description || ''}
                    onChange={(e) => handleUpdateHotspot('description', e.target.value)}
                    rows={2}
                    className="w-full text-xs border rounded-lg px-3 py-1.5 resize-none focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    placeholder="Description (optional)"
                  />
                  <TypeDropdown
                    value={hotspotType}
                    onChange={(val) => {
                      setHotspotType(val as any);
                      handleUpdateHotspot('type', val);
                      if (val !== 'navigation') handleUpdateHotspot('targetSceneId', undefined);
                      if (val !== 'info') handleUpdateHotspot('targetOfficeId', undefined);
                    }}
                  />
                  {hotspotType === 'navigation' && (
                    <select
                      value={selectedHotspot.targetSceneId || ''}
                      onChange={(e) =>
                        handleUpdateHotspot('targetSceneId', e.target.value || undefined)
                      }
                      className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
                    >
                      <option value="">Select target scene</option>
                      {scenes
                        .filter((s) => s.id !== currentScene?.id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                    </select>
                  )}
                  {hotspotType === 'info' && (
                    <>
                      
                      <select
                        value={selectedHotspot.targetOfficeId || ''}
                        onChange={(e) =>
                          handleUpdateHotspot('targetOfficeId', e.target.value || undefined)
                        }
                        className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
                      >
                        <option value="">Select office (required)</option>
                        {officesList.map((o: any) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                 
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Shape</label>
                    <div className="flex gap-1">
                      {SHAPES.map((s) => {
                        const IconComponent = shapeIconMap[s.id] || Circle;
                        return (
                          <button
                            key={s.id}
                            onClick={() => handleUpdateHotspot('shape', s.id)}
                            className={`w-7 h-7 rounded-lg border text-xs flex items-center justify-center transition-all ${
                              (selectedHotspot.shape || 'circle') === s.id
                                ? 'border-orange-500 bg-orange-50 text-orange-600'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            title={s.label}
                          >
                            <IconComponent size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {selectedHotspot.shape === 'arrow' && (
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Direction</label>
                      <div className="flex gap-1">
                        {ARROW_DIRECTIONS.map((dir) => {
                          const DirIcon = dir.Icon;
                          return (
                            <button
                              key={dir.angle}
                              onClick={() => handleUpdateHotspot('direction', dir.angle)}
                              className={`w-7 h-7 text-xs border rounded-lg flex items-center justify-center transition-all ${
                                (selectedHotspot.direction || 0) === dir.angle
                                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <DirIcon size={14} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Color</label>
                    <div className="flex gap-1 flex-wrap">
                      {HOTSPOT_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => handleUpdateHotspot('color', c)}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${
                            selectedHotspot.color === c
                              ? 'border-gray-800 scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* ✅ Label background color picker in Edit form */}
                  {hotspotType === 'label' && (
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Label Background Color</label>
                      <div className="flex gap-1 flex-wrap">
                        {LABEL_BG_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => handleUpdateHotspot('labelBgColor', c)}
                            className={`w-6 h-6 rounded-md border-2 transition-all ${
                              ((selectedHotspot as any).labelBgColor || '#fde047') === c
                                ? 'border-orange-500 scale-110 ring-2 ring-orange-200'
                                : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-gray-500 flex items-center justify-between">
                      {hotspotType === 'label' ? 'Font Size' : 'Size'}{' '}
                      <span className="font-medium">
                        {(selectedHotspot.size || 1).toFixed(1)}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={selectedHotspot.size || 1}
                      onChange={(e) => handleUpdateHotspot('size', parseFloat(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleDeleteHotspot(selectedHotspot.id)}
                      className="flex-1 bg-red-50 text-red-600 text-xs font-medium py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                    <button
                      onClick={() => setSelectedHotspotId(null)}
                      className="px-3 border text-xs py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Filmstrip */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 bg-white/95 backdrop-blur border-t flex items-center px-4 gap-2 overflow-x-auto z-20"
          onDragOver={handleDragOverFilmstrip}
        >
          {scenes.map((scene, idx) => {
            const isDraggingThis = scene.id === dragSceneId;
            const isDragOver = scene.id === dragOverId;
            return (
              <div
                key={scene.id}
                className={`flex-shrink-0 w-20 text-center cursor-grab rounded-lg p-1 transition-all ${
                  localSelectedSceneId === scene.id
                    ? 'ring-2 ring-orange-500 shadow-md'
                    : 'hover:bg-gray-100'
                } ${isDraggingThis ? 'opacity-30 scale-95' : ''} ${
                  isDragOver ? 'border-2 border-dashed border-orange-400' : ''
                }`}
                draggable={!newHotspotTemp && !selectedHotspotId}
                onDragStart={(e) => handleDragStart(e, scene.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  e.preventDefault();
                  handleDragEnterItem(scene.id);
                }}
                onDragLeave={handleDragLeaveItem}
                onDrop={(e) => handleDropFilmstrip(e, scene.id)}
                onClick={() => {
                  if (!isDragging && !newHotspotTemp && !selectedHotspotId) {
                    setLocalSelectedSceneId(scene.id);
                    propOnSelectScene(scene.id);
                  }
                }}
              >
                <div className="w-full h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={scene.url} alt={scene.label} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] mt-1 truncate font-medium text-gray-700">
                  {scene.label}
                </p>
                <span className="text-[9px] text-gray-400">{idx + 1}</span>
              </div>
            );
          })}
          {scenes.length === 0 && (
            <p className="text-xs text-gray-400 w-full text-center">No scenes uploaded yet</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onConfirm={confirmDeleteHotspot}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setHotspotToDelete(null);
        }}
        title="Delete Hotspot"
        message="This hotspot will be permanently removed. Are you sure?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}