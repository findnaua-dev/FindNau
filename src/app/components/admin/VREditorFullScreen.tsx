import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  Save,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Navigation,
  Building2,
  Circle,
  Square,
  Diamond,
  Hexagon,
  ArrowUp,
  Palette,
  Trash2,
  Plus,
} from 'lucide-react';
import { VRTour, VRHotspot } from '../../../services/vrTourService';
import EquirectangularViewer from '../EquirectangularViewer';
import { SHAPES, HOTSPOT_COLORS, ARROW_DIRECTIONS } from './mapConstants';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface SceneWithHotspots {
  id: string;
  url: string;
  label: string;
  description?: string;
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
  const [localSelectedSceneId, setLocalSelectedSceneId] = useState<string | null>(
    propSelectedSceneId
  );
  const [brightness, setBrightness] = useState(1);
  const [newHotspotTemp, setNewHotspotTemp] = useState<{
    lon: number;
    lat: number;
  } | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [hotspotLabel, setHotspotLabel] = useState('');
  const [hotspotType, setHotspotType] = useState<'navigation' | 'office' | 'info'>('info');
  const [hotspotColor, setHotspotColor] = useState('#F97316');
  const [hotspotShape, setHotspotShape] = useState<
    'circle' | 'square' | 'diamond' | 'hexagon' | 'rounded' | 'arrow'
  >('circle');
  const [hotspotSize, setHotspotSize] = useState(1);
  const [hotspotDirection, setHotspotDirection] = useState(0);
  const [hotspotTargetScene, setHotspotTargetScene] = useState<string>('');
  const [hotspotTargetOffice, setHotspotTargetOffice] = useState<string>('');
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [hotspotListCollapsed, setHotspotListCollapsed] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [hotspotToDelete, setHotspotToDelete] = useState<string | null>(null);

  const scenes = (tour as TourWithScenes)?.scenes || [];
  const currentScene = scenes.find((s) => s.id === localSelectedSceneId);
  const currentIndex = scenes.findIndex((s) => s.id === localSelectedSceneId);

  const scenesRef = useRef(scenes);
  useEffect(() => { scenesRef.current = scenes; }, [scenes]);

  const syncFormFromHotspot = useCallback((hotspot: VRHotspot | undefined) => {
    if (!hotspot) {
      resetHotspotForm();
      return;
    }
    setHotspotLabel(hotspot.label);
    setHotspotType(hotspot.type as any);
    setHotspotColor(hotspot.color || '#F97316');
    setHotspotShape((hotspot.shape as any) || 'circle');
    setHotspotSize(hotspot.size || 1);
    setHotspotDirection(hotspot.direction || 0);
    setHotspotTargetScene(hotspot.targetSceneId || '');
    setHotspotTargetOffice(hotspot.targetOfficeId || '');
  }, []);

  useEffect(() => {
    setLocalSelectedSceneId(propSelectedSceneId);
  }, [propSelectedSceneId]);

  useEffect(() => {
    const handleWindowDragEnd = () => setIsDragging(false);
    window.addEventListener('dragend', handleWindowDragEnd);
    return () => window.removeEventListener('dragend', handleWindowDragEnd);
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

  useEffect(() => {
    setSelectedHotspotId(null);
    setNewHotspotTemp(null);
  }, [localSelectedSceneId]);

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
    setHotspotShape('circle');
    setHotspotSize(1);
    setHotspotDirection(0);
    setHotspotTargetScene('');
    setHotspotTargetOffice('');
  };

  const confirmNewHotspot = () => {
    if (!newHotspotTemp || !localSelectedSceneId) return;
    const newHotspot: VRHotspot = {
      id: Date.now().toString(),
      longitude: newHotspotTemp.lon,
      latitude: newHotspotTemp.lat,
      type: hotspotType,
      label: hotspotLabel || 'Hotspot',
      color: hotspotColor,
      shape: hotspotShape,
      size: hotspotSize,
      // Only include direction if shape is arrow
      ...(hotspotShape === 'arrow' ? { direction: hotspotDirection } : {}),
      targetSceneId: hotspotType === 'navigation' ? hotspotTargetScene || undefined : undefined,
      targetOfficeId: hotspotType === 'office' ? hotspotTargetOffice || undefined : undefined,
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
        direction: 0, // arrow shape, so direction is valid
      };
      const updated = scenesRef.current.map((s) =>
        s.id === localSelectedSceneId
          ? { ...s, hotspots: [...s.hotspots, newHotspot] }
          : s
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

  const handleDragOverFilmstrip = (e: React.DragEvent) => e.preventDefault();

  const handleDropFilmstrip = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragSceneId || dragSceneId === targetId) return;
    const idxDrag = scenesRef.current.findIndex((s) => s.id === dragSceneId);
    const idxTarget = scenesRef.current.findIndex((s) => s.id === targetId);
    if (idxDrag < 0 || idxTarget < 0) return;
    const updated = [...scenesRef.current];
    const [moved] = updated.splice(idxDrag, 1);
    updated.splice(idxTarget, 0, moved);
    updateTourLocal(updated);
    setDragSceneId(null);
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    setTimeout(() => setIsDragging(false), 0);
    setDragSceneId(null);
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

  const selectedHotspot = currentScene?.hotspots.find((h) => h.id === selectedHotspotId);
  const overlayStyle = isDragging
    ? ({ pointerEvents: 'none' } as React.CSSProperties)
    : {};

  const shapeIconMap: Record<string, React.ElementType> = {
    circle: Circle,
    square: Square,
    diamond: Diamond,
    hexagon: Hexagon,
    rounded: Square,
    arrow: ArrowUp,
  };

  const typeBadgeMap = {
    info: { label: 'Info', icon: <Info size={10} />, color: 'bg-blue-100 text-blue-700' },
    navigation: {
      label: 'Nav',
      icon: <Navigation size={10} />,
      color: 'bg-green-100 text-green-700',
    },
    office: {
      label: 'Office',
      icon: <Building2 size={10} />,
      color: 'bg-orange-100 text-orange-700',
    },
  };

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
            size: h.size,
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

        {/* Scene info panel (top left) */}
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

        {/* Hotspot list (top right) */}
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
                        onClick={() => {
                          handleHotspotClick(h);
                        }}
                        className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-orange-100' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: h.color || '#F97316' }}
                        />
                        <span className="flex-1 truncate font-medium">{h.label}</span>
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
                  <input
                    value={hotspotLabel}
                    onChange={(e) => setHotspotLabel(e.target.value)}
                    placeholder="Label"
                    className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                  />
                  <select
                    value={hotspotType}
                    onChange={(e) => {
                      setHotspotType(e.target.value as any);
                      setHotspotTargetScene('');
                      setHotspotTargetOffice('');
                    }}
                    className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
                  >
                    <option value="info">ℹ️ Info</option>
                    <option value="navigation">🧭 Navigation</option>
                    <option value="office">🏢 Office</option>
                  </select>
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
                  {hotspotType === 'office' && (
                    <select
                      value={hotspotTargetOffice}
                      onChange={(e) => setHotspotTargetOffice(e.target.value)}
                      className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
                    >
                      <option value="">Select office</option>
                      {offices.map((o: any) => (
                        <option key={o.id} value={o.id}>
                          {o.shortName}
                        </option>
                      ))}
                    </select>
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
                  <div>
                    <label className="text-[10px] text-gray-500 flex items-center justify-between">
                      Size <span className="font-medium">{hotspotSize.toFixed(1)}</span>
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
                      disabled={!hotspotLabel.trim()}
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
                  <input
                    value={hotspotLabel}
                    onChange={(e) => handleUpdateHotspot('label', e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                  />
                  <textarea
                    value={selectedHotspot.description || ''}
                    onChange={(e) => handleUpdateHotspot('description', e.target.value)}
                    rows={2}
                    className="w-full text-xs border rounded-lg px-3 py-1.5 resize-none focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    placeholder="Description"
                  />
                  <select
                    value={hotspotType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setHotspotType(val);
                      handleUpdateHotspot('type', val);
                      if (val !== 'navigation') handleUpdateHotspot('targetSceneId', undefined);
                      if (val !== 'office') handleUpdateHotspot('targetOfficeId', undefined);
                    }}
                    className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
                  >
                    <option value="info">ℹ️ Info</option>
                    <option value="navigation">🧭 Navigation</option>
                    <option value="office">🏢 Office</option>
                  </select>
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
                  {hotspotType === 'office' && (
                    <select
                      value={selectedHotspot.targetOfficeId || ''}
                      onChange={(e) =>
                        handleUpdateHotspot('targetOfficeId', e.target.value || undefined)
                      }
                      className="w-full text-xs border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white"
                    >
                      <option value="">Select office</option>
                      {offices.map((o: any) => (
                        <option key={o.id} value={o.id}>
                          {o.shortName}
                        </option>
                      ))}
                    </select>
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
                  <div>
                    <label className="text-[10px] text-gray-500 flex items-center justify-between">
                      Size{' '}
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

        {/* Filmstrip (bottom) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 bg-white/95 backdrop-blur border-t flex items-center px-4 gap-2 overflow-x-auto z-20"
          style={overlayStyle}
        >
          {scenes.map((scene, idx) => (
            <div
              key={scene.id}
              className={`flex-shrink-0 w-20 text-center cursor-pointer rounded-lg p-1 transition-all ${
                localSelectedSceneId === scene.id
                  ? 'ring-2 ring-orange-500 shadow-md'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => {
                if (!isDragging && !newHotspotTemp && !selectedHotspotId) {
                  setLocalSelectedSceneId(scene.id);
                  propOnSelectScene(scene.id);
                }
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, scene.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOverFilmstrip}
              onDrop={(e) => handleDropFilmstrip(e, scene.id)}
            >
              <div className="w-full h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={scene.url} alt={scene.label} className="w-full h-full object-cover" />
              </div>
              <p className="text-[10px] mt-1 truncate font-medium text-gray-700">
                {scene.label}
              </p>
              <span className="text-[9px] text-gray-400">{idx + 1}</span>
            </div>
          ))}
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