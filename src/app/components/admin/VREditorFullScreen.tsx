import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { VRTour, VRHotspot } from '../../../services/vrTourService';
import EquirectangularViewer from '../EquirectangularViewer';
import { SHAPES, HOTSPOT_COLORS } from './mapConstants';

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
  // No longer need onDropScene
}

export default function VREditorFullScreen({
  tour,
  selectedSceneId,
  onSelectScene,
  onTourUpdate,
  onBack,
  onSave,
  offices,
}: VREditorFullScreenProps) {
  const [brightness, setBrightness] = useState(1);
  const [newHotspotTemp, setNewHotspotTemp] = useState<{ lon: number; lat: number } | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [hotspotLabel, setHotspotLabel] = useState('');
  const [hotspotType, setHotspotType] = useState<'navigation' | 'office' | 'info'>('info');
  const [hotspotColor, setHotspotColor] = useState('#F97316');
  const [hotspotShape, setHotspotShape] = useState<'circle' | 'square' | 'diamond' | 'hexagon' | 'rounded' | 'arrow'>('circle');
  const [hotspotSize, setHotspotSize] = useState(1);
  const [dragSceneId, setDragSceneId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const scenes = (tour as TourWithScenes)?.scenes || [];
  const currentScene = scenes.find((s) => s.id === selectedSceneId);
  const currentIndex = scenes.findIndex((s) => s.id === selectedSceneId);

  useEffect(() => {
    const handleWindowDragEnd = () => setIsDragging(false);
    window.addEventListener('dragend', handleWindowDragEnd);
    return () => window.removeEventListener('dragend', handleWindowDragEnd);
  }, []);

  // Helper to update tour
  const updateTourLocal = useCallback(
    (updatedScenes: SceneWithHotspots[]) => {
      onTourUpdate({ ...tour!, id: tour?.id || 'buildingTour', scenes: updatedScenes });
    },
    [tour, onTourUpdate]
  );

  useEffect(() => {
    setSelectedHotspotId(null);
    setNewHotspotTemp(null);
  }, [selectedSceneId]);

  const goToScene = (index: number) => {
    if (index >= 0 && index < scenes.length) {
      onSelectScene(scenes[index].id);
    }
  };

  const handleSphereClick = (lon: number, lat: number) => {
    setNewHotspotTemp({ lon, lat });
    setSelectedHotspotId(null);
    setHotspotLabel('');
    setHotspotType('info');
    setHotspotColor('#F97316');
    setHotspotShape('circle');
    setHotspotSize(1);
  };

  const confirmNewHotspot = () => {
    if (!newHotspotTemp || !selectedSceneId) return;
    const newHotspot: VRHotspot = {
      id: Date.now().toString(),
      longitude: newHotspotTemp.lon,
      latitude: newHotspotTemp.lat,
      type: hotspotType,
      label: hotspotLabel || 'Hotspot',
      color: hotspotColor,
      shape: hotspotShape,
      size: hotspotSize,
    };
    const updated = scenes.map((s) =>
      s.id === selectedSceneId ? { ...s, hotspots: [...s.hotspots, newHotspot] } : s
    );
    updateTourLocal(updated);
    setNewHotspotTemp(null);
  };

  // Drop from filmstrip – create navigation hotspot on current scene
  const handleDropScene = useCallback(
    (lon: number, lat: number, sceneId: string) => {
      if (!selectedSceneId) return;
      const targetScene = scenes.find((s) => s.id === sceneId);
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
      };
      const updated = scenes.map((s) =>
        s.id === selectedSceneId ? { ...s, hotspots: [...s.hotspots, newHotspot] } : s
      );
      updateTourLocal(updated);
    },
    [scenes, selectedSceneId, updateTourLocal]
  );

  const handleHotspotClick = (hotspot: any) => {
    setNewHotspotTemp(null);
    setSelectedHotspotId(hotspot.id);
    const h = currentScene?.hotspots.find((h) => h.id === hotspot.id);
    if (h) {
      setHotspotLabel(h.label);
      setHotspotType(h.type as any);
      setHotspotColor(h.color || '#F97316');
      setHotspotShape((h.shape as any) || 'circle');
      setHotspotSize(h.size || 1);
    }
  };

  const handleUpdateHotspot = (field: string, value: any) => {
    if (!currentScene || !selectedHotspotId) return;
    const updated = scenes.map((s) =>
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
    if (!currentScene) return;
    const updated = scenes.map((s) =>
      s.id === currentScene.id ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== id) } : s
    );
    updateTourLocal(updated);
    setSelectedHotspotId(null);
  };

  // Called only when drag ends – updates state once
  const handleHotspotMoveEnd = (id: string, newLon: number, newLat: number) => {
    if (!currentScene) return;
    const updated = scenes.map((s) =>
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
  };

  // Filmstrip drag & drop reordering
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
    const idxDrag = scenes.findIndex((s) => s.id === dragSceneId);
    const idxTarget = scenes.findIndex((s) => s.id === targetId);
    if (idxDrag < 0 || idxTarget < 0) return;
    const updated = [...scenes];
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
  const overlayStyle = isDragging ? { pointerEvents: 'none' as React.CSSProperties['pointerEvents'] } : {};

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-black/60 flex items-center justify-between px-4 z-30" style={overlayStyle}>
        <button onClick={onBack} className="text-white text-sm flex items-center gap-1 hover:text-gray-300">
          <ChevronLeft size={16} /> Media
        </button>
        <span className="text-white text-sm font-semibold">360° Tour Editor</span>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="text-white text-sm flex items-center gap-1 hover:text-gray-300 disabled:opacity-50"
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

      {/* Save toast */}
      {saveStatus !== 'idle' && saveStatus !== 'saving' && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
              saveStatus === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {saveStatus === 'success' ? (
              <>
                <CheckCircle size={16} /> Tour saved!
              </>
            ) : (
              <>
                <AlertCircle size={16} /> Save failed!
              </>
            )}
          </div>
        </div>
      )}

      {/* Viewer */}
      <div className="flex-1 relative">
        <EquirectangularViewer
          key={selectedSceneId || 'empty'}
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
          }))}
          enableClickToPlace={true}
          onClickScene={handleSphereClick}
          onHotspotClick={handleHotspotClick}
          onDropScene={handleDropScene}
          onHotspotMoveEnd={handleHotspotMoveEnd} // only on drag end
          isAdmin={true}
          brightness={brightness}
        />

        {/* Scene info panel */}
        {currentScene && (
          <div className="absolute top-14 left-4 bg-white/90 backdrop-blur rounded-xl p-3 w-56 shadow-lg z-20" style={overlayStyle}>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Scene Info</h4>
            <input
              value={currentScene.label}
              onChange={(e) => {
                const updated = scenes.map((s) =>
                  s.id === currentScene.id ? { ...s, label: e.target.value } : s
                );
                updateTourLocal(updated);
              }}
              className="w-full text-xs border rounded px-2 py-1 mb-1"
              placeholder="Scene name"
            />
            <textarea
              value={currentScene.description || ''}
              onChange={(e) => {
                const updated = scenes.map((s) =>
                  s.id === currentScene.id ? { ...s, description: e.target.value } : s
                );
                updateTourLocal(updated);
              }}
              rows={2}
              className="w-full text-xs border rounded px-2 py-1 resize-none"
              placeholder="Description"
            />
            <div className="mt-2">
              <label className="text-[10px] text-gray-500">Brightness</label>
              <input type="range" min="0" max="2" step="0.1" value={brightness} onChange={(e) => setBrightness(parseFloat(e.target.value))} className="w-full" />
            </div>
          </div>
        )}

        {/* Hotspot list */}
        {currentScene && (
          <div className="absolute top-14 right-4 bg-white/90 backdrop-blur rounded-xl p-3 w-52 shadow-lg z-20 max-h-64 overflow-y-auto" style={overlayStyle}>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Hotspots ({currentScene.hotspots.length})</h4>
            {currentScene.hotspots.map((h) => (
              <div
                key={h.id}
                onClick={() => { setSelectedHotspotId(h.id); setNewHotspotTemp(null); }}
                className={`flex items-center justify-between text-xs py-1 px-2 rounded cursor-pointer mb-1 ${selectedHotspotId === h.id ? 'bg-orange-100' : 'hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.color || '#F97316' }} />
                  <span className="truncate">{h.label}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteHotspot(h.id); }} className="text-red-400"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {/* New/Edit Hotspot Panel */}
        {(newHotspotTemp || selectedHotspot) && (
          <div className="absolute bottom-24 left-4 bg-white/95 backdrop-blur rounded-xl p-3 w-60 shadow-lg z-20 max-h-[50vh] overflow-y-auto" style={overlayStyle}>
            {newHotspotTemp ? (
              <>
                <h4 className="text-xs font-semibold mb-2">New Hotspot</h4>
                <input value={hotspotLabel} onChange={(e) => setHotspotLabel(e.target.value)} placeholder="Label" className="w-full text-xs border rounded px-2 py-1 mb-1" />
                <select value={hotspotType} onChange={(e) => setHotspotType(e.target.value as any)} className="w-full text-xs border rounded px-2 py-1 mb-1">
                  <option value="info">Info</option>
                  <option value="navigation">Navigation</option>
                  <option value="office">Office</option>
                </select>
                <div className="flex gap-1 mt-1">
                  {SHAPES.map((s) => (
                    <button key={s.id} onClick={() => setHotspotShape(s.id)} className={`w-6 h-6 rounded border text-[10px] ${hotspotShape === s.id ? 'border-gray-800' : 'border-gray-200'}`}>{s.icon}</button>
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {HOTSPOT_COLORS.slice(0, 8).map((c) => (
                    <button key={c} onClick={() => setHotspotColor(c)} className={`w-4 h-4 rounded-full border ${hotspotColor === c ? 'border-gray-800' : ''}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-[10px] text-gray-500">Size: {hotspotSize.toFixed(1)}</label>
                  <input type="range" min="0.5" max="3" step="0.1" value={hotspotSize} onChange={(e) => setHotspotSize(parseFloat(e.target.value))} className="w-full" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={confirmNewHotspot} className="flex-1 bg-gray-800 text-white text-xs py-1 rounded">Add</button>
                  <button onClick={() => setNewHotspotTemp(null)} className="flex-1 border text-xs py-1 rounded">Cancel</button>
                </div>
              </>
            ) : selectedHotspot ? (
              <>
                <h4 className="text-xs font-semibold mb-2">Edit Hotspot</h4>
                <input value={selectedHotspot.label} onChange={(e) => handleUpdateHotspot('label', e.target.value)} className="w-full text-xs border rounded px-2 py-1 mb-1" />
                <textarea value={selectedHotspot.description || ''} onChange={(e) => handleUpdateHotspot('description', e.target.value)} rows={2} className="w-full text-xs border rounded px-2 py-1 resize-none mb-1" />
                <select value={selectedHotspot.type} onChange={(e) => handleUpdateHotspot('type', e.target.value)} className="w-full text-xs border rounded px-2 py-1 mb-1">
                  <option value="info">Info</option>
                  <option value="navigation">Navigation</option>
                  <option value="office">Office</option>
                </select>
                {selectedHotspot.type === 'navigation' && (
                  <select value={selectedHotspot.targetSceneId || ''} onChange={(e) => handleUpdateHotspot('targetSceneId', e.target.value || undefined)} className="w-full text-xs border rounded px-2 py-1 mb-1">
                    <option value="">Select target scene</option>
                    {scenes.filter((s) => s.id !== currentScene?.id).map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                )}
                {selectedHotspot.type === 'office' && (
                  <select value={selectedHotspot.targetOfficeId || ''} onChange={(e) => handleUpdateHotspot('targetOfficeId', e.target.value || undefined)} className="w-full text-xs border rounded px-2 py-1 mb-1">
                    <option value="">Select office</option>
                    {offices.map((o: any) => (
                      <option key={o.id} value={o.id}>{o.shortName}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-1 mt-1">
                  {SHAPES.map((s) => (
                    <button key={s.id} onClick={() => handleUpdateHotspot('shape', s.id)} className={`w-6 h-6 rounded border text-[10px] ${(selectedHotspot.shape || 'circle') === s.id ? 'border-gray-800' : 'border-gray-200'}`}>{s.icon}</button>
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {HOTSPOT_COLORS.slice(0, 8).map((c) => (
                    <button key={c} onClick={() => handleUpdateHotspot('color', c)} className={`w-4 h-4 rounded-full border ${selectedHotspot.color === c ? 'border-gray-800' : ''}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-[10px] text-gray-500">Size: {selectedHotspot.size?.toFixed(1) || '1.0'}</label>
                  <input type="range" min="0.5" max="3" step="0.1" value={selectedHotspot.size || 1} onChange={(e) => handleUpdateHotspot('size', parseFloat(e.target.value))} className="w-full" />
                </div>
                <button onClick={() => handleDeleteHotspot(selectedHotspot.id)} className="w-full text-xs text-red-500 mt-2">Delete Hotspot</button>
                <button onClick={() => setSelectedHotspotId(null)} className="w-full border text-xs py-1 rounded mt-1">Close</button>
              </>
            ) : null}
          </div>
        )}

        {/* Navigation arrows */}
        {scenes.length > 1 && (
          <>
            <button onClick={() => goToScene(currentIndex - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white w-10 h-10 rounded-full flex items-center justify-center z-20 hover:bg-black/80" disabled={currentIndex === 0} style={overlayStyle}><ChevronLeft size={20} /></button>
            <button onClick={() => goToScene(currentIndex + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white w-10 h-10 rounded-full flex items-center justify-center z-20 hover:bg-black/80" disabled={currentIndex === scenes.length - 1} style={overlayStyle}><ChevronRight size={20} /></button>
          </>
        )}
      </div>

      {/* Filmstrip (reorderable) */}
      <div className="h-24 bg-white/90 border-t flex items-center px-4 gap-2 overflow-x-auto">
        {scenes.map((scene, idx) => (
          <div
            key={scene.id}
            className={`flex-shrink-0 w-20 text-center cursor-pointer rounded-lg p-1 ${selectedSceneId === scene.id ? 'ring-2 ring-orange-500' : 'hover:bg-gray-100'}`}
            onClick={() => { if (!isDragging) onSelectScene(scene.id); }}
            draggable
            onDragStart={(e) => handleDragStart(e, scene.id)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOverFilmstrip}
            onDrop={(e) => handleDropFilmstrip(e, scene.id)}
          >
            <div className="w-full h-12 rounded overflow-hidden border border-gray-200">
              <img src={scene.url} alt={scene.label} className="w-full h-full object-cover" />
            </div>
            <p className="text-[10px] mt-1 truncate">{scene.label}</p>
            <span className="text-[10px] text-gray-400">{idx + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}